"""Bước world.heightfield (EP-WLD-02, MOD-WLD-04, PSC-WLD-04; T-0007).

Đọc lát `world.json` trong ctx, sinh heightfield thủ tục tất định từ ctx.seed (= deriveSeed(world.seed, stepId, '', 0),
QT-WLD-01), ghi bundle DTO-WLD-02 vào outDir/hf/. Nguồn real/mixed, preset `ant`: phiếu sau → thoát 5.
Chạy: uv run python -I main.py --ctx ctx.json (IF-CLI-02).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "py"))

import gsio  # noqa: E402

gsio.single_thread_env()  # trước import numpy (rule engine-build: numpy một luồng)

import numpy as np  # noqa: E402

from heightfield.io import write_hf  # noqa: E402
from heightfield.png import write_png  # noqa: E402
from heightfield.procedural import UnsupportedPreset, build, hillshade  # noqa: E402

DATA = "/world.json/"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ctx", required=True)
    ctx = gsio.load_ctx(ap.parse_args().ctx)
    d = ctx["inputs"]["data"]
    source = d.get(DATA + "source", "procedural")
    if source != "procedural":
        gsio.log_error(f"world.heightfield: nguồn '{source}' chưa hỗ trợ (phiếu sau)")
        return 5
    if DATA + "procedural" not in d or DATA + "playArea" not in d:
        gsio.log_error("world.heightfield: thiếu world.procedural hoặc world.playArea")
        return 4
    world = {
        "playArea": d[DATA + "playArea"],
        "procedural": d[DATA + "procedural"],
        "heightScale": d.get(DATA + "heightScale", 1),
        "smoothing": d.get(DATA + "smoothing", 0),
    }
    cell_m = float(ctx["inputs"]["params"].get("cellM", 2))
    gsio.progress(5, f"preset {world['procedural']['preset']}, ô {cell_m:g} m")
    try:
        h, meta, masks = build(world, int(ctx["seed"]), cell_m)
    except UnsupportedPreset as e:
        gsio.log_error(str(e))
        return 5
    gsio.progress(60, f"lưới {meta.width}x{meta.height}")
    hf = Path(ctx["outDir"]) / "hf"
    write_hf(hf, h, meta)
    for k, m in masks.items():
        write_png(hf / f"mask-{k}.png", m)
    gsio.write_json(hf / "vectors.geojson", {"type": "FeatureCollection", "features": []})
    gsio.progress(80, "preview")
    rgb = hillshade(h, cell_m, masks["water"])
    k = max(1, round(cell_m))  # preview 1 m/px (DTO-WLD-02)
    if k > 1:
        rgb = np.repeat(np.repeat(rgb, k, axis=0), k, axis=1)
    write_png(hf / "preview" / "top.png", rgb)
    sea = int(np.count_nonzero(masks["water"]))
    gsio.write_partial_report(
        Path(ctx["outDir"]),
        metrics={"width": meta.width, "height": meta.height, "minH": meta.minH, "maxH": meta.maxH, "seaCells": sea},
        artifacts=["hf/preview/top.png"],
        summary=f"heightfield {meta.width}x{meta.height} ô {cell_m:g} m, cao {meta.minH:.1f}..{meta.maxH:.1f} m",
    )
    gsio.progress(100, "xong")
    return 0


if __name__ == "__main__":
    sys.exit(main())
