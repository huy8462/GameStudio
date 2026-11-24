"""T-0008: xói mòn hạt + nhiệt (PSC-WLD-06, CFG-WLD-04); tất định (TC-WLD-02)."""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from gsrng import Pcg32
from heightfield.erode import ErodeParams, _thermal, erode, particle_count, particle_starts, to_r8
from heightfield.procedural import build

SQUARE = [[-100.0, -100.0], [100.0, -100.0], [100.0, 100.0], [-100.0, 100.0]]


def terrain(preset: str = "nui") -> np.ndarray[Any, np.dtype[np.float32]]:
    w = {"playArea": SQUARE, "procedural": {"preset": preset, "maxHeight": 60, "roughness": 0.6}}
    h, _, _ = build(w, 11, 2.0)
    return h


def test_particle_count_and_starts_match_gsrng() -> None:
    assert particle_count(40, 0.3, 251, 251) == int(40 * 0.3 * 251 * 251 / 64)
    xs, zs = particle_starts(5, 101, 51, 99)
    rng = Pcg32(99)
    for k in range(5):
        assert xs[k] == rng.float() * 100
        assert zs[k] == rng.float() * 50
    assert (xs < 100).all() and (zs < 50).all()


def test_erode_deterministic_and_pure() -> None:
    h = terrain()
    before = h.copy()
    a = erode(h, iterations=20, strength=0.5, seed=7, cell_m=2.0)
    b = erode(h, iterations=20, strength=0.5, seed=7, cell_m=2.0)
    assert np.array_equal(h, before)  # không sửa đầu vào
    assert a[0].tobytes() == b[0].tobytes()
    assert a[1].tobytes() == b[1].tobytes()
    assert a[2].tobytes() == b[2].tobytes()
    assert a[3] == particle_count(20, 0.5, 101, 101)
    c = erode(h, iterations=20, strength=0.5, seed=8, cell_m=2.0)
    assert c[0].tobytes() != a[0].tobytes()


def test_erode_changes_terrain_and_maps() -> None:
    h = terrain()
    h2, flow, sed, n = erode(h, iterations=40, strength=0.6, seed=3, cell_m=2.0)
    assert n > 0 and np.isfinite(h2).all()
    delta = np.abs(h2.astype(np.float64) - h)
    assert delta.max() > 0.01
    assert flow.dtype == np.uint8 and flow.shape == h.shape and flow.max() == 255
    assert sed.max() == 255
    # Xói mòn làm địa hình mượt hơn: độ dốc trung bình giảm.
    assert np.abs(np.diff(h2, axis=1)).mean() < np.abs(np.diff(h, axis=1)).mean()


def test_zero_iterations_is_identity() -> None:
    h = terrain("doi")
    h2, flow, sed, n = erode(h, iterations=0, strength=0.5, seed=1, cell_m=2.0)
    assert n == 0 and np.array_equal(h2, h)
    assert flow.max() == 0 and sed.max() == 0


def test_mask_zero_blocks_particles() -> None:
    h = terrain()
    m = np.zeros(h.shape, dtype=np.uint8)
    h2, flow, _, _ = erode(h, iterations=20, strength=0.5, seed=7, cell_m=2.0, mask=m, params=ErodeParams())
    assert flow.max() == 0
    # Chỉ còn bước nhiệt; vẫn tất định.
    h3, _, _, _ = erode(h, iterations=20, strength=0.5, seed=7, cell_m=2.0, mask=m)
    assert h2.tobytes() == h3.tobytes()


def test_thermal_flattens_spike() -> None:
    g = np.zeros((7, 7), dtype=np.float64)
    g[3, 3] = 20.0
    talus = math.tan(math.radians(35)) * 2.0
    _thermal(g, talus, 10)
    assert g[3, 3] < 20.0
    assert math.isclose(g.sum(), 20.0, rel_tol=1e-12)  # nhiệt bảo toàn khối lượng


def test_to_r8() -> None:
    assert to_r8(np.zeros((2, 2))).max() == 0
    assert to_r8(np.array([[0.0, 2.0, 4.0]])).tolist() == [[0, 128, 255]]
