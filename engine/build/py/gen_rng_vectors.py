"""Sinh vector chuẩn RNG `engine/shared/rng/vectors.json` (TST-GEN-02, TC-GEN-02).

Chạy: uv run python engine/build/py/gen_rng_vectors.py
Nguồn sự thật là bản Python (số nguyên lớn, khó sai); TS kiểm khớp. Sinh lại chỉ khi đổi thuật toán (phiếu riêng).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from gsrng import Pcg32, derive_seed

OUT = Path(__file__).resolve().parents[2] / "shared" / "rng" / "vectors.json"
STREAMS: list[tuple[int, int]] = [(42, 54), (0, 0), (1, 1), (3117254481, 7), (4294967295, 4294967295)]
COUNT = 1000


def main() -> None:
    seq = []
    for seed, stream in STREAMS:
        r = Pcg32(seed, stream)
        seq.append({"seed": seed, "stream": stream, "u32": [r.next_u32() for _ in range(COUNT)]})

    ints = Pcg32(7, 3)
    int_cases = [{"min": lo, "max": hi, "values": [ints.randint(lo, hi) for _ in range(50)]}
                 for lo, hi in [(0, 9), (-5, 5), (1, 6), (0, 4294967295), (100, 100), (0, 1000003)]]

    parent = Pcg32(42, 54)
    child = parent.fork("vegetation")
    derive_cases: list[dict[str, Any]] = [
        {"parts": ["42", "vegetation", "z1", "7"]},
        {"parts": [42, "vegetation", "z1", 7]},
        {"parts": ["vegetation"]},
        {"parts": [""]},
        {"parts": ["làng", "cây-tre", "z2"]},
    ]
    for c in derive_cases:
        c["value"] = derive_seed(*c["parts"])

    sh = Pcg32(11, 5)
    shuffle_cases = []
    for n in (1, 2, 10, 52):
        items = list(range(n))
        sh.shuffle_in_place(items)
        shuffle_cases.append({"n": n, "result": items})
    pk = Pcg32(11, 6)
    pick_items = list(range(100, 110))
    pick_values = [pk.pick(pick_items) for _ in range(20)]

    data = {
        "//": "Sinh bởi engine/build/py/gen_rng_vectors.py (ALG-GEN-01). Không sửa tay.",
        "algorithm": "pcg32-xsh-rr; seed theo pcg32_srandom_r(seed, stream) với seed/stream uint32",
        "sequences": seq,
        "ints": {"seed": 7, "stream": 3, "cases": int_cases},
        "deriveSeed": derive_cases,
        "shuffle": {"seed": 11, "stream": 5, "cases": shuffle_cases},
        "pick": {"seed": 11, "stream": 6, "items": pick_items, "values": pick_values},
        "fork": {"parent": {"seed": 42, "stream": 54}, "id": "vegetation",
                 "parentNextAfterFork": parent.next_u32(), "child": [child.next_u32() for _ in range(10)]},
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"đã ghi {OUT} ({OUT.stat().st_size} byte)")


if __name__ == "__main__":
    main()
