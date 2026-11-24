"""Bước world.fetch (EP-WLD-01, MOD-WLD-03, PSC-WLD-02; T-0007).

Nguồn `procedural`: không có dữ liệu thật để tải → ghi `fetch.json` {source, bbox: null} và `fetch.provenance.json`
với `sources: []` (DTO-WLD-07). Nguồn `real`/`mixed` (DEM Copernicus, OSM): phiếu sau → thoát 5.
Chạy: uv run python -I main.py --ctx ctx.json (IF-CLI-02).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

# -I bỏ thư mục script khỏi sys.path: thêm engine/build/py (gsio, gsrng, heightfield).
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "py"))

import gsio  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ctx", required=True)
    ctx = gsio.load_ctx(ap.parse_args().ctx)
    data = ctx["inputs"]["data"]
    source = data.get("/world.json/source", "procedural")
    bbox = data.get("/world.json/bbox")
    out = Path(ctx["outDir"])
    gsio.progress(10, f"nguồn {source}")
    if source != "procedural":
        gsio.log_error(f"world.fetch: nguồn '{source}' chưa hỗ trợ (DEM/OSM thật ở phiếu sau)")
        return 5
    key = hashlib.sha256(json.dumps({"source": source, "bbox": bbox}, sort_keys=True).encode("utf-8")).hexdigest()
    gsio.write_json(out / "fetch.json", {"source": source, "bbox": None})
    gsio.write_json(out / "fetch.provenance.json", {"type": "map", "sources": [], "cacheKey": f"sha256:{key}"})
    gsio.write_partial_report(out, metrics={"sources": 0}, summary="world.fetch: procedural, không tải dữ liệu")
    gsio.progress(100, "xong")
    return 0


if __name__ == "__main__":
    sys.exit(main())
