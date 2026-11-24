"""Bước terrain.erode (EP-WLD-03, MOD-WLD-06, PSC-WLD-06; T-0008).

Đọc bundle hf/ của world.heightfield (upstream), xói mòn hạt + nhiệt (numba một luồng, hạt từ Pcg32(ctx.seed)),
ghi hf/ mới (độ cao đã xói, mask và vectors chuyển tiếp nguyên byte, preview), flow.r8, sediment.r8.
Chạy: uv run python -I main.py --ctx ctx.json (IF-CLI-02).
"""

from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "py"))

import gsio  # noqa: E402

gsio.single_thread_env()  # trước import numpy/numba

import numpy as np  # noqa: E402

from heightfield.erode import ErodeParams, erode  # noqa: E402
from heightfield.io import read_hf, write_hf  # noqa: E402
from heightfield.png import decode_png, write_png  # noqa: E402
from heightfield.procedural import hillshade  # noqa: E402

PASS_THROUGH = ["mask-road.png", "mask-water.png", "mask-farm.png", "mask-forest.png", "mask-building.png"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ctx", required=True)
    ctx = gsio.load_ctx(ap.parse_args().ctx)
    up = ctx["upstream"].get("world.heightfield")
    if up is None:
        gsio.log_error("terrain.erode: thiếu upstream world.heightfield")
        return 4
    src = Path(up["outDir"]) / "hf"
    h, meta = read_hf(src)
    ero = ctx["inputs"]["data"].get("/world.json/erosion", {"iterations": 0, "strength": 0})
    p = ctx["inputs"]["params"]
    params = ErodeParams(
        inertia=float(p.get("inertia", 0.05)),
        capacity=float(p.get("capacity", 4)),
        deposition=float(p.get("deposition", 0.3)),
        evaporation=float(p.get("evaporation", 0.01)),
        radius=int(p.get("radius", 3)),
        talus_deg=float(p.get("talusDeg", 35)),
    )
    if ero.get("mask"):
        gsio.progress(1, "erosion.mask chưa hỗ trợ, xói toàn vùng")
    gsio.progress(5, f"lưới {meta.width}x{meta.height}, {ero['iterations']} lượt, cường độ {ero['strength']}")
    h2, flow, sed, n = erode(
        h,
        iterations=int(ero["iterations"]),
        strength=float(ero["strength"]),
        seed=int(ctx["seed"]),
        cell_m=meta.cellM,
        params=params,
    )
    gsio.progress(80, f"{n} hạt xong, ghi bundle")
    out = Path(ctx["outDir"])
    hf = out / "hf"
    write_hf(hf, h2, replace(meta, minH=float(h2.min()), maxH=float(h2.max())))
    for f in [*PASS_THROUGH, "vectors.geojson"]:
        shutil.copyfile(src / f, hf / f)
    (out / "flow.r8").write_bytes(flow.tobytes(order="C"))
    (out / "sediment.r8").write_bytes(sed.tobytes(order="C"))
    sea = decode_png((src / "mask-water.png").read_bytes())
    rgb = hillshade(h2, meta.cellM, sea)
    k = max(1, round(meta.cellM))
    if k > 1:
        rgb = np.repeat(np.repeat(rgb, k, axis=0), k, axis=1)
    write_png(hf / "preview" / "top.png", rgb)
    diff = np.abs(h2.astype(np.float64) - h.astype(np.float64))
    gsio.write_partial_report(
        out,
        metrics={"particles": n, "maxDeltaM": float(diff.max()), "meanDeltaM": float(diff.mean())},
        artifacts=["hf/preview/top.png"],
        summary=f"terrain.erode: {n} hạt, đổi tối đa {float(diff.max()):.2f} m",
    )
    gsio.progress(100, "xong")
    return 0


if __name__ == "__main__":
    sys.exit(main())
