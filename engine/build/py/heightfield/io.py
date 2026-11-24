"""Heightfield bundle (MOD-WLD-02, DTO-WLD-02 / SCH-WLD-02).

`height.r32`: float32 little-endian, hàng trước cột, hàng 0 ở Bắc (z nhỏ nhất), cột 0 ở Tây (x nhỏ nhất).
Ô (r, c) ở toạ độ cục bộ x = originLocal[0] + c·cellM, z = originLocal[1] + r·cellM (z = −Bắc, PSC-WLD-01).
`height.meta.json`: {width, height, cellM, originLocal, minH, maxH, crs, origin}.
"""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import numpy.typing as npt

from gsio import write_json

F32 = npt.NDArray[np.float32]


@dataclass(frozen=True)
class HfMeta:
    width: int
    height: int
    cellM: float  # tên trường theo DTO-WLD-02 (camelCase)
    originLocal: tuple[float, float]
    minH: float
    maxH: float
    crs: str = "LOCAL"
    origin: dict[str, float] | None = None


def write_hf(out_dir: Path, h: F32, meta: HfMeta) -> None:
    if h.dtype != np.float32 or h.shape != (meta.height, meta.width):
        raise ValueError(f"heightfield cần float32 {meta.height}x{meta.width}, nhận {h.dtype} {h.shape}")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "height.r32").write_bytes(h.astype("<f4", copy=False).tobytes(order="C"))
    d = asdict(meta)
    d["originLocal"] = list(meta.originLocal)
    write_json(out_dir / "height.meta.json", d)


def read_hf(hf_dir: Path) -> tuple[F32, HfMeta]:
    d = json.loads((hf_dir / "height.meta.json").read_text(encoding="utf-8"))
    meta = HfMeta(
        width=int(d["width"]),
        height=int(d["height"]),
        cellM=float(d["cellM"]),
        originLocal=(float(d["originLocal"][0]), float(d["originLocal"][1])),
        minH=float(d["minH"]),
        maxH=float(d["maxH"]),
        crs=str(d.get("crs", "LOCAL")),
        origin=d.get("origin"),
    )
    raw = np.frombuffer((hf_dir / "height.r32").read_bytes(), dtype="<f4")
    if raw.size != meta.width * meta.height:
        raise ValueError(f"height.r32 có {raw.size} giá trị, meta cần {meta.width * meta.height}")
    return raw.reshape(meta.height, meta.width).astype(np.float32), meta


def sample_bilinear(h: F32, meta: HfMeta, x: float, z: float) -> float:
    """Độ cao tại (x, z) cục bộ, nội suy song tuyến; ngoài lưới thì kẹp vào biên."""
    fc = min(max((x - meta.originLocal[0]) / meta.cellM, 0.0), meta.width - 1.0)
    fr = min(max((z - meta.originLocal[1]) / meta.cellM, 0.0), meta.height - 1.0)
    c0, r0 = math.floor(fc), math.floor(fr)
    c1, r1 = min(c0 + 1, meta.width - 1), min(r0 + 1, meta.height - 1)
    tc, tr = fc - c0, fr - r0
    top = float(h[r0, c0]) * (1 - tc) + float(h[r0, c1]) * tc
    bot = float(h[r1, c0]) * (1 - tc) + float(h[r1, c1]) * tc
    return top * (1 - tr) + bot * tr
