"""Đồ thị vật liệu thủ tục → bộ map PBR (T-0025; DDD-03 MOD-AST-11, PSC-AST-09, DTO-AST-06; FR-AST-14, 15).

Công thức (recipe) dạng JSON:
  {id, size?, tiling: [u, v], sharp?: [...], paletteRole?, graph: [{id, op, ...tham số}], height: <nút>,
   baseColor: {node, ramp: [[vị trí, màu], ...], tint?: {node, amount}}, roughness: {node?, range: [a, b]} | số,
   metallic?: số, ao?: {strength, radius}, normal?: {strength}, heightMap?: bool}
`op` sinh: noise|voronoi|brick|wood|cloth (tham số theo texproc.nodes); biến đổi: levels {in}, blend {a, b, mask?}.
Màu: "#rrggbb" hoặc "palette:<id màu>" (tra palette.json). Mỗi nút sinh có seed riêng = derive_seed(seed, id nút).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import numpy.typing as npt

from gsrng import Pcg32, derive_seed
from texproc import nodes

F64 = npt.NDArray[np.float64]
U8 = npt.NDArray[np.uint8]

TRANSFORMS = ("levels", "blend")


class RecipeError(ValueError):
    """Công thức sai (thoát 4)."""


@dataclass(frozen=True)
class Maps:
    base_color: U8  # (N, N, 3) sRGB
    normal: U8  # (N, N, 3) OpenGL (+Y), như glTF và Unity
    orm: U8  # (N, N, 3) R=AO, G=roughness, B=metallic (glTF)
    height: U8 | None  # (N, N) khi heightMap
    roughness_range: tuple[float, float]


def hex_rgb(s: str) -> tuple[float, float, float]:
    h = s.lstrip("#")
    if len(h) != 6:
        raise RecipeError(f"màu cần #rrggbb: {s}")
    return int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0


def resolve_color(c: str, palette: dict[str, str]) -> tuple[float, float, float]:
    if c.startswith("palette:"):
        key = c.split(":", 1)[1]
        if key not in palette:
            raise RecipeError(f"palette không có màu '{key}'")
        return hex_rgb(palette[key])
    return hex_rgb(c)


def evaluate(graph: list[dict[str, Any]], size: int, seed: int) -> dict[str, F64]:
    out: dict[str, F64] = {}

    def ref(name: Any, at: str) -> F64:
        if not isinstance(name, str) or name not in out:
            raise RecipeError(f"{at}: tham chiếu nút chưa có '{name}'")
        return out[name]

    for node in graph:
        nid, op = node.get("id"), node.get("op")
        if not isinstance(nid, str) or nid in out:
            raise RecipeError(f"nút thiếu id hoặc trùng id: {nid}")
        args = {k: v for k, v in node.items() if k not in ("id", "op", "in", "a", "b", "mask")}
        try:
            if op in nodes.GENERATORS:
                out[nid] = nodes.GENERATORS[op](size, Pcg32(derive_seed(seed, nid)), **args)
            elif op == "levels":
                out[nid] = nodes.levels(ref(node.get("in"), nid), **args)
            elif op == "blend":
                t = ref(node["mask"], nid) if "mask" in node else float(args.pop("t", 0.5))
                args.pop("t", None)
                out[nid] = nodes.blend(ref(node.get("a"), nid), ref(node.get("b"), nid), t=t, **args)
            else:
                raise RecipeError(f"nút {nid}: op không hỗ trợ '{op}'")
        except TypeError as e:
            raise RecipeError(f"nút {nid}: tham số sai ({e})") from e
    return out


def ramp(x: F64, stops: list[tuple[float, tuple[float, float, float]]]) -> F64:
    """Dải màu tuyến tính theo vị trí (đã sắp), trả (N, N, 3)."""
    stops = sorted(stops, key=lambda s: s[0])
    pos = np.array([s[0] for s in stops])
    rgb = np.array([s[1] for s in stops])
    out = np.empty((*x.shape, 3))
    for c in range(3):
        out[..., c] = np.interp(x, pos, rgb[:, c])
    return out


def box_blur_wrap(x: F64, r: int) -> F64:
    """Làm mờ hộp (2r+1)² có quấn mép, bằng tổng cộng dồn (tất định)."""
    if r <= 0:
        return x
    acc = np.zeros_like(x)
    for d in range(-r, r + 1):
        acc += np.roll(x, d, axis=0)
    acc2 = np.zeros_like(x)
    for d in range(-r, r + 1):
        acc2 += np.roll(acc, d, axis=1)
    out: F64 = acc2 / float((2 * r + 1) ** 2)
    return out


def normal_from_height(h: F64, strength: float) -> U8:
    """Sobel quấn mép (PSC-AST-09 'normal từ height'); hàng ảnh đi xuống nên dy đổi dấu cho quy ước +Y lên."""
    n = h.shape[0]
    k = strength * n / 256.0

    def at(dy: int, dx: int) -> F64:
        return np.roll(np.roll(h, -dy, axis=0), -dx, axis=1)

    gx = (at(-1, 1) + 2 * at(0, 1) + at(1, 1)) - (at(-1, -1) + 2 * at(0, -1) + at(1, -1))
    gy = (at(1, -1) + 2 * at(1, 0) + at(1, 1)) - (at(-1, -1) + 2 * at(-1, 0) + at(-1, 1))
    nx, ny, nz = -gx * k, gy * k, np.ones_like(h)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    return to_u8(np.stack([nx * inv, ny * inv, nz * inv], axis=-1) * 0.5 + 0.5)


def to_u8(x: F64) -> U8:
    out: U8 = np.floor(np.clip(x, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)
    return out


def build_maps(recipe: dict[str, Any], palette: dict[str, str], seed: int, size: int) -> Maps:
    g = evaluate(recipe.get("graph") or [], size, seed)

    def node(name: Any, at: str) -> F64:
        if not isinstance(name, str) or name not in g:
            raise RecipeError(f"{recipe.get('id')}.{at}: cần tên nút có trong graph, nhận '{name}'")
        return g[name]

    h = node(recipe.get("height"), "height")
    bc = recipe.get("baseColor") or {}
    stops = [(float(p), resolve_color(str(c), palette)) for p, c in bc.get("ramp") or []]
    if len(stops) < 1:
        raise RecipeError(f"{recipe.get('id')}.baseColor.ramp: cần ít nhất một màu")
    color = ramp(node(bc.get("node", recipe.get("height")), "baseColor.node"), stops)
    tint = bc.get("tint")
    if tint:
        tv = node(tint.get("node"), "baseColor.tint.node")
        color = color * (1.0 + float(tint.get("amount", 0.1)) * (tv[..., None] - 0.5) * 2.0)

    rspec = recipe.get("roughness", 0.8)
    if isinstance(rspec, (int, float)):
        rough = np.full_like(h, float(rspec))
        rr = (float(rspec), float(rspec))
    else:
        a, b = (float(v) for v in rspec.get("range", [0.6, 0.9]))
        rough = a + (b - a) * (node(rspec["node"], "roughness.node") if "node" in rspec else h)
        rr = (min(a, b), max(a, b))
    metal = np.full_like(h, float(recipe.get("metallic", 0.0)))
    ao_spec = recipe.get("ao") or {}
    cavity = np.maximum(0.0, box_blur_wrap(h, int(ao_spec.get("radius", 4))) - h)
    ao = 1.0 - float(ao_spec.get("strength", 2.0)) * cavity
    nstr = float((recipe.get("normal") or {}).get("strength", 4.0))
    return Maps(
        base_color=to_u8(color),
        normal=normal_from_height(h, nstr),
        orm=to_u8(np.stack([ao, rough, metal], axis=-1)),
        height=to_u8(h) if recipe.get("heightMap") else None,
        roughness_range=rr,
    )


def material_json(recipe: dict[str, Any], maps: Maps) -> dict[str, Any]:
    """DTO-AST-06."""
    files = {"baseColor": "baseColor.png", "normal": "normal.png", "orm": "orm.png"}
    if maps.height is not None:
        files["height"] = "height.png"
    out: dict[str, Any] = {
        "id": recipe["id"],
        "maps": files,
        "tiling": list(recipe.get("tiling") or [1, 1]),
        "sharp": sorted(recipe.get("sharp") or []),
        "roughnessRange": [round(maps.roughness_range[0], 4), round(maps.roughness_range[1], 4)],
        "source": "procedural",
    }
    if recipe.get("paletteRole"):
        out["paletteRole"] = recipe["paletteRole"]
    return out


def seam_delta(img: U8) -> float:
    """Chênh trung bình giữa cột/hàng mép đối diện, chia cho chênh hai cột liền kề bên trong (≈ 1 khi liền)."""
    f = img.astype(np.float64)
    edge = (np.abs(f[:, 0] - f[:, -1]).mean() + np.abs(f[0] - f[-1]).mean()) / 2
    inner = (np.abs(f[:, 1] - f[:, 0]).mean() + np.abs(f[1] - f[0]).mean()) / 2
    return float(edge / max(inner, 1e-9))
