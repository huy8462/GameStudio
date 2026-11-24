"""TST-GEN-02 / TC-GEN-02: báº£n Python khá»›p vector chuáº©n vÃ  vector tham chiáº¿u cá»§a pcg32 gá»‘c."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from gsrng import Pcg32, derive_seed

VECTORS: dict[str, Any] = json.loads(
    (Path(__file__).resolve().parents[3] / "shared" / "rng" / "vectors.json").read_text(encoding="utf-8")
)


def test_reference_pcg32_demo() -> None:
    # pcg32-demo cá»§a pcg-c-basic: srandom(42, 54) â†’ 6 giÃ¡ trá»‹ Ä‘áº§u.
    r = Pcg32(42, 54)
    assert [r.next_u32() for _ in range(6)] == [
        0xA15C02B7, 0x7B47F409, 0xBA1D3330, 0x83D2F293, 0xBFA4784B, 0xCBED606E,
    ]


@pytest.mark.parametrize("case", VECTORS["sequences"], ids=lambda c: f"{c['seed']}/{c['stream']}")
def test_sequences(case: dict[str, Any]) -> None:
    r = Pcg32(case["seed"], case["stream"])
    assert [r.next_u32() for _ in range(len(case["u32"]))] == case["u32"]


def test_ints_and_bounds() -> None:
    spec = VECTORS["ints"]
    r = Pcg32(spec["seed"], spec["stream"])
    for c in spec["cases"]:
        got = [r.randint(c["min"], c["max"]) for _ in range(len(c["values"]))]
        assert got == c["values"]
        assert all(c["min"] <= v <= c["max"] for v in got)
    with pytest.raises(ValueError):
        r.randint(3, 2)


def test_derive_seed() -> None:
    for c in VECTORS["deriveSeed"]:
        assert derive_seed(*c["parts"]) == c["value"]
    # Sá»‘ vÃ  chuá»—i cÃ¹ng biá»ƒu diá»…n cho cÃ¹ng seed.
    assert derive_seed("42", "vegetation", "z1", "7") == derive_seed(42, "vegetation", "z1", 7)


def test_fork() -> None:
    f = VECTORS["fork"]
    parent = Pcg32(f["parent"]["seed"], f["parent"]["stream"])
    child = parent.fork(f["id"])
    assert parent.next_u32() == f["parentNextAfterFork"]
    assert [child.next_u32() for _ in range(10)] == f["child"]


def test_float_shuffle_pick() -> None:
    r = Pcg32(9, 9)
    vals = [r.float() for _ in range(1000)]
    assert all(0.0 <= v < 1.0 for v in vals)
    items = list(range(20))
    r.shuffle_in_place(items)
    assert sorted(items) == list(range(20))
    assert r.pick(["a"]) == "a"
    with pytest.raises(ValueError):
        r.pick([])
