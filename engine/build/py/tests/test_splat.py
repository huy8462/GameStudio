"""T-0011: splat (PSC-WLD-08, DTO-WLD-03, 06): inRange, trọng số, top-K, bề mặt, atan tất định, PNG RGBA."""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from heightfield.io import HfMeta
from heightfield.png import decode_png, encode_png
from heightfield.splat import (
    DEFAULT_LAYERS,
    DEFAULT_RULES,
    SURFACE,
    atan_nonneg,
    dilate,
    in_range,
    keep_top_k,
    layer_weights,
    sample_grid,
    slope_deg,
    surface_of,
    texels_for,
)


def arr(*v: float) -> np.ndarray[Any, np.dtype[np.float64]]:
    return np.array(v, dtype=np.float64)


def test_in_range_smoothstep_edges() -> None:
    r = in_range(arr(-3, -2, -1, 0, 5, 10, 11, 12, 13), [0, 10])
    assert r.tolist()[:2] == [0.0, 0.0]
    assert r[2] == 0.5 and r[3] == 1.0 and r[4] == 1.0 and r[5] == 1.0
    assert r[6] == 0.5 and r[7] == 0.0 and r[8] == 0.0


def test_atan_matches_math_and_is_bounded() -> None:
    t = np.linspace(0, 50, 5001)
    a = atan_nonneg(t)
    assert max(abs(float(a[i]) - math.atan(float(t[i]))) for i in range(0, 5001, 7)) < 2e-5
    h = np.zeros((5, 5), dtype=np.float32)
    h[:, :] = np.arange(5, dtype=np.float32) * 2.0  # dốc 2 m mỗi ô 2 m → 45°
    assert abs(float(slope_deg(h, 2.0)[2, 2]) - 45.0) < 1e-3


def test_weights_topk_and_surface() -> None:
    h = arr(0.5, 10.0, 10.0, -3.0).reshape(1, 4)
    slope = arr(5.0, 5.0, 45.0, 2.0).reshape(1, 4)
    zero = np.zeros((1, 4))
    masks = {
        "road": zero,
        "water": arr(0, 0, 0, 1).reshape(1, 4),
        "shore": arr(1, 0, 0, 1).reshape(1, 4),
        "farm": zero,
        "forest": zero,
    }
    x = z = np.zeros((1, 4))
    w = layer_weights(h, slope, masks, x, z, DEFAULT_LAYERS, DEFAULT_RULES, 1)
    ids = [layer["id"] for layer in DEFAULT_LAYERS]
    assert int(np.argmax(w[:, 0, 1])) == ids.index("co")  # bằng, cao → cỏ
    assert int(np.argmax(w[:, 0, 2])) == ids.index("da")  # dốc 45° → đá
    assert int(np.argmax(w[:, 0, 0])) == ids.index("cat")  # thấp, trong dải bờ → cát
    inland = layer_weights(h, slope, {**masks, "shore": zero}, x, z, DEFAULT_LAYERS, DEFAULT_RULES, 1)
    assert inland[ids.index("cat"), 0, 0] == 0.0  # không có bờ → không có cát (đồng bằng thấp không thành bãi cát)
    n = keep_top_k(w, 2)
    assert np.allclose(n.sum(axis=0), 1.0)
    assert ((n > 0).sum(axis=0) <= 2).all()
    road = arr(0, 0, 1, 0).reshape(1, 4)
    s = surface_of(n, DEFAULT_LAYERS, masks["water"], np.maximum(-h, 0), road)
    assert s.tolist() == [[SURFACE["cat"], SURFACE["co"], SURFACE["duong"], SURFACE["nuoc_sau"]]]
    shallow = surface_of(n, DEFAULT_LAYERS, masks["water"], np.full((1, 4), 0.5), np.zeros((1, 4)))
    assert shallow[0, 3] == SURFACE["nuoc_nong"]


def test_no_layer_falls_back_to_layer0_and_determinism() -> None:
    w = np.zeros((4, 2, 2))
    assert keep_top_k(w, 4)[0].tolist() == [[1.0, 1.0], [1.0, 1.0]]
    h = np.random.default_rng(0).random((1, 50)) * 30
    s = np.random.default_rng(1).random((1, 50)) * 60
    zero = np.zeros((1, 50))
    m = {"road": zero, "water": zero, "farm": zero, "forest": zero}
    x, z = np.meshgrid(np.arange(50.0), np.zeros(1))
    a = layer_weights(h, s, m, x, z, DEFAULT_LAYERS, DEFAULT_RULES, 9)
    b = layer_weights(h, s, m, x, z, DEFAULT_LAYERS, DEFAULT_RULES, 9)
    assert a.tobytes() == b.tobytes()
    assert a.tobytes() != layer_weights(h, s, m, x, z, DEFAULT_LAYERS, DEFAULT_RULES, 10).tobytes()


def test_texels_and_sampling() -> None:
    t = texels_for((-250.0, -250.0, 250.0, 250.0), 0.5)
    assert (t.width, t.height) == (1000, 1000)
    gx, gz = t.rows(0, 2)
    assert gx[0, 0] == -249.75 and gz[1, 0] == -249.25
    assert sum(r1 - r0 for r0, r1 in t.blocks()) == 1000
    meta = HfMeta(width=3, height=2, cellM=2.0, originLocal=(0.0, 0.0), minH=0, maxH=5)
    g = np.array([[0, 2, 4], [1, 3, 5]], dtype=np.float32)
    assert sample_grid(g, meta, arr(1.0), arr(1.0)).tolist() == [1.5]


def test_dilate() -> None:
    m = np.zeros((7, 7), dtype=np.uint8)
    m[3, 3] = 255
    assert int((dilate(m, 1) > 0).sum()) == 9
    assert int((dilate(m, 2) > 0).sum()) == 25
    assert np.array_equal(dilate(m, 0), m)


def test_png_rgba_roundtrip() -> None:
    img = (np.arange(2 * 3 * 4, dtype=np.uint16).reshape(2, 3, 4) * 9).astype(np.uint8)
    assert np.array_equal(decode_png(encode_png(img)), img)


def test_step_json_params_match_module_defaults() -> None:
    """Luật mặc định nằm trong step.json params để vào inputHash (đổi luật → build lại); mã Python phải khớp."""
    import json
    from pathlib import Path

    p = Path(__file__).resolve().parents[2] / "steps" / "terrain-splat" / "step.json"
    params = json.loads(p.read_text(encoding="utf-8"))["inputs"]["params"]
    assert params["layers"] == DEFAULT_LAYERS
    assert params["rules"] == DEFAULT_RULES
