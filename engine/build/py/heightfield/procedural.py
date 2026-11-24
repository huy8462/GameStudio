"""Địa hình thủ tục (PSC-WLD-04, ALG-WLD-04; MOD-WLD-04) và hậu xử lý heightScale/smoothing (PSC-WLD-02 dòng cuối).

Lưới phủ hộp bao `playArea` (mét cục bộ, x = Đông, z = −Bắc), ô `cell_m`; hàng 0 ở Bắc (z nhỏ nhất).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import numpy as np
import numpy.typing as npt

from heightfield.io import F32, HfMeta
from heightfield.noise import F64, fbm, make_perm

# PRESET: (amp, octaves, kiểu) theo PSC-WLD-04.
PRESETS: dict[str, tuple[float, int, str]] = {
    "dong_bang": (0.05, 3, "fbm"),
    "doi": (0.35, 5, "fbm"),
    "nui": (1.0, 7, "ridged"),
    "ven_bien": (0.3, 5, "coast"),
    "thung_lung": (0.6, 5, "valley"),
}
SEA_H = -2.0


class UnsupportedPreset(ValueError):
    """Preset chưa hỗ trợ ở phiếu này (vd 'ant' cần Blender)."""


@dataclass(frozen=True)
class Grid:
    x: F64  # (h, w) toạ độ x mỗi ô
    z: F64
    meta_origin: tuple[float, float]
    width: int
    height: int
    cell_m: float


def grid_for(play_area: list[list[float]], cell_m: float) -> Grid:
    xs = [p[0] for p in play_area]
    zs = [p[1] for p in play_area]
    x0, z0 = math.floor(min(xs) / cell_m) * cell_m, math.floor(min(zs) / cell_m) * cell_m
    x1, z1 = math.ceil(max(xs) / cell_m) * cell_m, math.ceil(max(zs) / cell_m) * cell_m
    w, h = round((x1 - x0) / cell_m) + 1, round((z1 - z0) / cell_m) + 1
    cols = x0 + np.arange(w, dtype=np.float64) * cell_m
    rows = z0 + np.arange(h, dtype=np.float64) * cell_m
    gx, gz = np.meshgrid(cols, rows)
    return Grid(gx, gz, (x0, z0), w, h, cell_m)


def smooth3(h: F64, times: int) -> F64:
    """Lọc Gauss 3×3 ([1,2,1]/4 tách được, biên lặp) `times` lần."""
    for _ in range(times):
        p = np.pad(h, 1, mode="edge")
        hx = (p[:, :-2] + 2.0 * p[:, 1:-1] + p[:, 2:]) * 0.25
        h = (hx[:-2, :] + 2.0 * hx[1:-1, :] + hx[2:, :]) * 0.25
    return h


def generate(proc: dict[str, Any], seed: int, g: Grid) -> F64:
    preset = str(proc["preset"])
    if preset not in PRESETS:
        raise UnsupportedPreset(f"preset '{preset}' chưa hỗ trợ (ant cần Blender, phiếu sau)")
    amp, octaves, kind = PRESETS[preset]
    max_h = float(proc["maxHeight"])
    rough = float(proc["roughness"])
    persistence = 0.35 + (0.65 - 0.35) * rough
    perm = make_perm(seed)
    n = fbm(g.x, g.z, perm, octaves=octaves, persistence=persistence, ridged=(kind == "ridged"))
    if kind == "ridged":
        return max_h * amp * n
    if kind == "coast":
        span = max(float(g.x.max() - g.x.min()), 1.0)
        x_norm = (g.x - g.x.min()) / span
        h = max_h * amp * n + max_h * (x_norm - 0.3)
        out: F64 = np.where(h < 0.0, SEA_H, h)
        return out
    base = (n + 1.0) * 0.5  # fbm [-1,1] → [0,1] để đồng bằng/đồi không âm
    if kind == "valley":
        # Trục thung lũng: đường Bắc–Nam qua giữa vùng; W = 1/4 bề rộng.
        cx = (float(g.x.min()) + float(g.x.max())) * 0.5
        width = max((float(g.x.max()) - float(g.x.min())) * 0.25, g.cell_m)
        d = np.abs(g.x - cx)
        t = np.clip(d / width, 0.0, 1.0)
        return max_h * amp * (base + t * t * (3.0 - 2.0 * t))
    return max_h * amp * base


def build(world: dict[str, Any], seed: int, cell_m: float) -> tuple[F32, HfMeta, dict[str, npt.NDArray[np.uint8]]]:
    """Heightfield + mask từ world.json (nguồn procedural). Trả (H float32, meta, masks)."""
    g = grid_for(world["playArea"], cell_m)
    h = generate(world["procedural"], seed, g)
    h = h * float(world.get("heightScale", 1.0))
    h = smooth3(h, int(world.get("smoothing", 0)))
    h32 = h.astype(np.float32)
    zero = np.zeros((g.height, g.width), dtype=np.uint8)
    masks = {k: zero.copy() for k in ("road", "water", "farm", "forest", "building")}
    masks["water"][h32 <= SEA_H] = 255
    meta = HfMeta(
        width=g.width,
        height=g.height,
        cellM=cell_m,
        originLocal=g.meta_origin,
        minH=float(h32.min()),
        maxH=float(h32.max()),
    )
    return h32, meta, masks


def hillshade(h: F32, cell_m: float, sea: npt.NDArray[np.uint8]) -> npt.NDArray[np.uint8]:
    """Ảnh xem nhanh RGB: tô bóng (đèn Tây Bắc, cao 45°) trên dải màu theo độ cao; biển màu xanh."""
    hz, hx = np.gradient(h.astype(np.float64), cell_m)
    nx, nz = -hx, -hz
    norm = np.sqrt(nx * nx + nz * nz + 1.0)
    lx, ly, lz = -0.5, math.sqrt(0.5), -0.5  # từ Tây (−x) và Bắc (−z)
    shade = np.clip((nx * lx + ly + nz * lz) / norm, 0.0, 1.0)
    span = max(float(h.max() - h.min()), 1e-6)
    t = (h.astype(np.float64) - float(h.min())) / span
    low, high = np.array([86.0, 125.0, 70.0]), np.array([196.0, 178.0, 140.0])
    rgb = (low + (high - low) * t[..., None]) * (0.35 + 0.65 * shade[..., None])
    rgb[sea > 0] = (40.0, 90.0, 150.0)
    out: npt.NDArray[np.uint8] = np.clip(np.rint(rgb), 0, 255).astype(np.uint8)
    return out
