"""Bước terrain.splat (EP-WLD-05, MOD-WLD-08, PSC-WLD-08; FR-WLD-15, 16; T-0011). perZone.

Đọc hf/ của terrain.erode (độ cao đã xói, mask), sinh cho zone: splat-0.png (RGBA, 0,5 m/px; splat-1.png khi > 4 lớp),
surface.png (chỉ số bề mặt, 1 m/px), layers.json (DTO-WLD-03), preview/splat.png. Luật lấy từ world.json `splat`
nếu có, không thì bộ mặc định (heightfield.splat). Dep `materials` tạm bỏ (bước chưa có).
Chạy: uv run python -I main.py --ctx ctx.json (IF-CLI-02).
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "py"))

import gsio  # noqa: E402

gsio.single_thread_env()

import numpy as np  # noqa: E402

from heightfield.io import read_hf  # noqa: E402
from heightfield.png import decode_png, write_png  # noqa: E402
from heightfield.splat import (  # noqa: E402
    DEFAULT_LAYERS,
    DEFAULT_RULES,
    SEA_LEVEL,
    SHORE_M,
    dilate,
    keep_top_k,
    layer_weights,
    sample_grid,
    sample_nearest,
    slope_deg,
    surface_of,
    texels_for,
)

MASKS = ("road", "water", "farm", "forest")
# Màu xem nhanh theo lớp (3 màu đầu lấy từ palette mẫu: Cỏ, Đất, Đá).
PREVIEW = {"co": (95, 122, 58), "dat": (107, 91, 69), "da": (138, 134, 121), "cat": (216, 199, 154)}


def zone_bbox(zones: Any, zone_id: str | None) -> tuple[float, float, float, float] | None:
    for z in zones if isinstance(zones, list) else []:
        if isinstance(z, dict) and z.get("id") == zone_id:
            xs = [float(p[0]) for p in z["polygon"]]
            zs = [float(p[1]) for p in z["polygon"]]
            return math.floor(min(xs)), math.floor(min(zs)), math.ceil(max(xs)), math.ceil(max(zs))
    return None


def main() -> int:  # noqa: PLR0915 (luồng một bước)
    ap = argparse.ArgumentParser()
    ap.add_argument("--ctx", required=True)
    ctx = gsio.load_ctx(ap.parse_args().ctx)
    up = ctx["upstream"].get("terrain.erode")
    data, p = ctx["inputs"]["data"], ctx["inputs"]["params"]
    bbox = zone_bbox(data.get("/world.json/zones"), ctx["zone"])
    if up is None or bbox is None:
        gsio.log_error(f"terrain.splat: thiếu upstream terrain.erode hoặc zone '{ctx['zone']}'")
        return 4
    cfg = data.get("/world.json/splat") or {}
    layers: list[dict[str, Any]] = cfg.get("layers") or p.get("layers") or DEFAULT_LAYERS
    rules: list[dict[str, Any]] = cfg.get("rules") or p.get("rules") or DEFAULT_RULES
    k = int(p.get("maxLayers", 4))
    seed = int(ctx["seed"])
    hf_dir = Path(up["outDir"]) / "hf"
    h, meta = read_hf(hf_dir)
    slope = slope_deg(h, meta.cellM)
    mask_px = {m: decode_png((hf_dir / f"mask-{m}.png").read_bytes()) for m in MASKS}
    mask_px["shore"] = dilate(mask_px["water"], math.ceil(SHORE_M / meta.cellM))
    out = Path(ctx["outDir"])

    def fields(x: np.ndarray[Any, Any], z: np.ndarray[Any, Any]) -> tuple[Any, Any, dict[str, Any]]:
        hh = sample_grid(h, meta, x, z)
        ss = sample_grid(slope, meta, x, z)
        mm = {m: (sample_nearest(mask_px[m], meta, x, z) > 127).astype(np.float64) for m in mask_px}
        return hh, ss, mm

    # Splat (0,5 m/px): RGBA 8 bit mỗi 4 lớp.
    tx = texels_for(bbox, float(p.get("splatPx", 0.5)))
    n_img = (len(layers) + 3) // 4
    splat = np.zeros((n_img, tx.height, tx.width, 4), dtype=np.uint8)
    for r0, r1 in tx.blocks():
        x, z = tx.rows(r0, r1)
        hh, ss, mm = fields(x, z)
        w = keep_top_k(layer_weights(hh, ss, mm, x, z, layers, rules, seed), k)
        q = np.rint(np.clip(w, 0.0, 1.0) * 255.0).astype(np.uint8)
        for li in range(len(layers)):
            splat[li // 4, r0:r1, :, li % 4] = q[li]
        gsio.progress(5 + 60 * r1 / tx.height, f"splat {r1}/{tx.height} hàng")
    for i in range(n_img):
        write_png(out / f"splat-{i}.png", splat[i])

    # Bề mặt (1 m/px) + ảnh xem nhanh.
    ts = texels_for(bbox, float(p.get("surfacePx", 1.0)))
    surface = np.zeros((ts.height, ts.width), dtype=np.uint8)
    preview = np.zeros((ts.height, ts.width, 3), dtype=np.uint8)
    colors = np.array([PREVIEW.get(str(layer["id"]), (128, 128, 128)) for layer in layers], dtype=np.float64)
    counts = np.zeros(len(layers) + 1, dtype=np.int64)
    for r0, r1 in ts.blocks():
        x, z = ts.rows(r0, r1)
        hh, ss, mm = fields(x, z)
        w = keep_top_k(layer_weights(hh, ss, mm, x, z, layers, rules, seed), k)
        depth = np.maximum(SEA_LEVEL - hh, 0.0)
        surface[r0:r1] = surface_of(w, layers, mm["water"], depth, mm["road"])
        rgb = np.zeros((*w.shape[1:], 3), dtype=np.float64)
        for li in range(len(layers)):  # cộng tường minh, không einsum/BLAS (tất định giữa CPU)
            rgb += w[li][..., None] * colors[li]
        rgb[mm["water"] > 0.5] = (61, 107, 120)  # màu Nước của palette mẫu
        preview[r0:r1] = np.clip(np.rint(rgb), 0, 255).astype(np.uint8)
        counts[: len(layers)] += np.bincount(np.argmax(w, axis=0).ravel(), minlength=len(layers))[: len(layers)]
    write_png(out / "surface.png", surface)
    write_png(out / "preview" / "splat.png", preview)
    gsio.write_json(out / "layers.json", {"layers": layers, "rules": rules})
    share = {
        f"share_{layer['id']}": float(counts[i] / max(1, counts[: len(layers)].sum())) for i, layer in enumerate(layers)
    }
    gsio.write_partial_report(
        out,
        metrics={"splatW": tx.width, "splatH": tx.height, "layers": len(layers), "maxLayers": k, **share},
        artifacts=["preview/splat.png"],
        summary=f"terrain.splat {ctx['zone']}: {len(layers)} lớp, splat {tx.width}x{tx.height} ({tx.px:g} m/px)",
    )
    gsio.progress(100, "xong")
    return 0


if __name__ == "__main__":
    sys.exit(main())
