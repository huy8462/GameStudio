"""Splat map và bản đồ bề mặt (ALG-WLD-08, PSC-WLD-08, MOD-WLD-08; FR-WLD-15, 16; DTO-WLD-03, 06).

w[l] = Σ_rule(layer = l) weight · inRange(dốc, slope) · inRange(cao, height) · mask · (1 + amp · noise)
→ chuẩn hoá, giữ K lớn nhất, chuẩn hoá lại. inRange(v, [a, b]) = smoothstep(a − 2, a, v) · (1 − smoothstep(b, b + 2, v)).
surface = SURFACE[argmax w], đè: mask nước (sâu < 1,2 m → nuoc_nong, ≥ 1,2 m → nuoc_sau), mask đường → duong.
Lấy mẫu theo khối hàng để bộ nhớ có giới hạn với vùng 4 km²; mọi phép tính tất định (numpy phần tử, không rút gọn song song).
"""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

import numpy as np
import numpy.typing as npt

from gsrng import derive_seed
from heightfield.io import F32, HfMeta
from heightfield.noise import F64, make_perm, simplex2

U8 = npt.NDArray[np.uint8]

# SRS-02 §6.4 (0…7) + `duong` theo DTO-WLD-06.
SURFACE: dict[str, int] = {
    "dat": 0,
    "co": 1,
    "da": 2,
    "cat": 3,
    "bun": 4,
    "go": 5,
    "nuoc_nong": 6,
    "nuoc_sau": 7,
    "duong": 8,
}
SHALLOW_M = 1.2
SHORE_M = 12.0  # bề rộng dải bờ quanh mask nước (mask "shore" cho lớp cát)
SEA_LEVEL = 0.0
BLOCK_ROWS = 256

# Bộ lớp và luật mặc định (DTO-WLD-03) khi world.json chưa có `splat`; materialRef giữ chỗ tới khi có bước materials.
DEFAULT_LAYERS: list[dict[str, Any]] = [
    {"id": "co", "materialRef": "asset:dat-co@1", "tiling": 4},
    {"id": "dat", "materialRef": "asset:dat-tran@1", "tiling": 4},
    {"id": "da", "materialRef": "asset:da-nui@1", "tiling": 6},
    {"id": "cat", "materialRef": "asset:cat-bai@1", "tiling": 4},
]
DEFAULT_RULES: list[dict[str, Any]] = [
    {"layer": "co", "slope": [0, 22], "height": [0.5, 1000], "weight": 1.0, "noise": {"scale": 40, "amp": 0.4, "seedKey": "co"}},
    {"layer": "dat", "slope": [14, 34], "height": [-1000, 1000], "weight": 0.8, "noise": {"scale": 25, "amp": 0.5, "seedKey": "dat"}},
    {"layer": "dat", "slope": [0, 90], "height": [-1000, 1000], "mask": "farm", "weight": 1.5},
    {"layer": "dat", "slope": [0, 90], "height": [-1000, 1000], "weight": 0.35, "noise": {"scale": 30, "amp": 1.0, "seedKey": "dat-vet"}},
    {"layer": "da", "slope": [30, 90], "height": [-1000, 1000], "weight": 1.2, "noise": {"scale": 15, "amp": 0.3, "seedKey": "da"}},
    {"layer": "cat", "slope": [0, 18], "height": [-1000, 3], "mask": "shore", "weight": 1.6},
]  # fmt: skip


def dilate(mask: U8, cells: int) -> U8:
    """Nở mask nhị phân `cells` ô (lân cận 8, max 3×3 lặp lại); tất định."""
    m = mask > 127
    for _ in range(cells):
        p = np.pad(m, 1, mode="edge")
        acc = p[1:-1, 1:-1].copy()
        for dr in (0, 1, 2):
            for dc in (0, 1, 2):
                acc |= p[dr : dr + m.shape[0], dc : dc + m.shape[1]]
        m = acc
    out: U8 = np.where(m, 255, 0).astype(np.uint8)
    return out


def smoothstep(a: float, b: float, v: F64) -> F64:
    t = np.clip((v - a) / (b - a), 0.0, 1.0)
    out: F64 = t * t * (3.0 - 2.0 * t)
    return out


def in_range(v: F64, rng: list[float]) -> F64:
    a, b = float(rng[0]), float(rng[1])
    out: F64 = smoothstep(a - 2.0, a, v) * (1.0 - smoothstep(b, b + 2.0, v))
    return out


def sample_grid(arr: npt.NDArray[Any], meta: HfMeta, x: F64, z: F64) -> F64:
    """Lấy mẫu song tuyến mảng cùng lưới heightfield tại (x, z) cục bộ, kẹp biên (vector hoá)."""
    fc = np.clip((x - meta.originLocal[0]) / meta.cellM, 0.0, meta.width - 1.0)
    fr = np.clip((z - meta.originLocal[1]) / meta.cellM, 0.0, meta.height - 1.0)
    c0 = np.floor(fc).astype(np.int64)
    r0 = np.floor(fr).astype(np.int64)
    c1 = np.minimum(c0 + 1, meta.width - 1)
    r1 = np.minimum(r0 + 1, meta.height - 1)
    tc, tr = fc - c0, fr - r0
    a = arr.astype(np.float64, copy=False)
    top = a[r0, c0] * (1 - tc) + a[r0, c1] * tc
    bot = a[r1, c0] * (1 - tc) + a[r1, c1] * tc
    out: F64 = top * (1 - tr) + bot * tr
    return out


def sample_nearest(arr: U8, meta: HfMeta, x: F64, z: F64) -> U8:
    c = np.clip(np.rint((x - meta.originLocal[0]) / meta.cellM), 0, meta.width - 1).astype(np.int64)
    r = np.clip(np.rint((z - meta.originLocal[1]) / meta.cellM), 0, meta.height - 1).astype(np.int64)
    out: U8 = arr[r, c]
    return out


@dataclass(frozen=True)
class Texels:
    """Lưới texel phủ hộp bao [x0, x1) × [z0, z1) với bước `px` (m), tâm texel."""

    x0: float
    z0: float
    width: int
    height: int
    px: float

    def rows(self, r0: int, r1: int) -> tuple[F64, F64]:
        xs = self.x0 + (np.arange(self.width, dtype=np.float64) + 0.5) * self.px
        zs = self.z0 + (np.arange(r0, r1, dtype=np.float64) + 0.5) * self.px
        gx, gz = np.meshgrid(xs, zs)
        return gx, gz

    def blocks(self) -> Iterator[tuple[int, int]]:
        for r0 in range(0, self.height, BLOCK_ROWS):
            yield r0, min(r0 + BLOCK_ROWS, self.height)


def texels_for(bbox: tuple[float, float, float, float], px: float) -> Texels:
    x0, z0, x1, z1 = bbox
    return Texels(x0, z0, round((x1 - x0) / px), round((z1 - z0) / px), px)


def layer_weights(  # noqa: PLR0913 (đầu vào PSC-WLD-08)
    h: F64,
    slope: F64,
    masks: dict[str, F64],
    x: F64,
    z: F64,
    layers: list[dict[str, Any]],
    rules: list[dict[str, Any]],
    seed: int,
) -> F64:
    """Trọng số thô (n_layers, rows, cols) theo luật; chưa chuẩn hoá."""
    ids = [str(layer["id"]) for layer in layers]
    w = np.zeros((len(ids), *h.shape), dtype=np.float64)
    for rule in rules:
        li = ids.index(str(rule["layer"]))
        v = float(rule.get("weight", 1.0)) * in_range(slope, rule.get("slope", [0, 90]))
        v = v * in_range(h, rule.get("height", [-1e6, 1e6]))
        if "mask" in rule:
            v = v * masks.get(str(rule["mask"]), np.zeros_like(h))
        nz = rule.get("noise")
        if nz:
            perm = make_perm(derive_seed(seed, str(nz.get("seedKey", rule["layer"]))))
            sc = float(nz.get("scale", 20.0))
            v = v * (1.0 + float(nz.get("amp", 0.3)) * simplex2(x / sc, z / sc, perm))
        w[li] += np.maximum(v, 0.0)
    return w


def keep_top_k(w: F64, k: int) -> F64:
    """Chuẩn hoá, giữ K lớp lớn nhất mỗi texel (hoà theo chỉ số lớp nhỏ), chuẩn hoá lại; texel không lớp nào → lớp 0."""
    n = w.shape[0]
    s = w.sum(axis=0)
    w = np.where(s > 0, w / np.where(s > 0, s, 1.0), 0.0)
    w[0] = np.where(s > 0, w[0], 1.0)
    if k < n:
        order = np.argsort(-w, axis=0, kind="stable")
        drop = order[k:]
        np.put_along_axis(w, drop, 0.0, axis=0)
    s2 = w.sum(axis=0)
    out: F64 = w / np.where(s2 > 0, s2, 1.0)
    return out


def surface_of(w: F64, layers: list[dict[str, Any]], water: F64, depth: F64, road: F64) -> U8:
    ids = [SURFACE.get(str(layer["id"]), 0) for layer in layers]
    lut = np.array(ids, dtype=np.uint8)
    surf: U8 = lut[np.argmax(w, axis=0)]
    surf = np.where(water > 0.5, np.where(depth < SHALLOW_M, SURFACE["nuoc_nong"], SURFACE["nuoc_sau"]), surf)
    surf = np.where(road > 0.5, SURFACE["duong"], surf).astype(np.uint8)
    return surf


def atan_nonneg(t: F64) -> F64:
    """atan(t), t ≥ 0, chỉ bằng + − × ÷ (Abramowitz–Stegun 4.4.49, sai số ≤ 1e-5 rad).

    Không dùng np.arctan/np.hypot: numpy chọn nhân SIMD theo CPU (SVML trên AVX-512) nên bit cuối có thể khác giữa máy,
    làm outputHash lệch. + − × ÷ và sqrt luôn làm tròn đúng theo IEEE 754.
    """
    inv = t > 1.0
    u = np.where(inv, 1.0 / np.where(inv, t, 1.0), t)
    u2 = u * u
    p = u * (0.9998660 + u2 * (-0.3302995 + u2 * (0.1801410 + u2 * (-0.0851330 + u2 * 0.0208351))))
    out: F64 = np.where(inv, np.pi / 2 - p, p)
    return out


def slope_deg(h: F32, cell_m: float) -> F64:
    gz, gx = np.gradient(h.astype(np.float64), cell_m)
    out: F64 = atan_nonneg(np.sqrt(gx * gx + gz * gz)) * (180.0 / np.pi)
    return out
