"""T-0007: heightfield io (MOD-WLD-02), nhiễu và địa hình thủ tục (PSC-WLD-04), PNG; tất định (TC-WLD-02)."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from heightfield.io import HfMeta, read_hf, sample_bilinear, write_hf
from heightfield.noise import fbm, make_perm, simplex2
from heightfield.png import decode_png, encode_png
from heightfield.procedural import PRESETS, SEA_H, UnsupportedPreset, build, grid_for, hillshade, smooth3

SQUARE = [[-250.0, -250.0], [250.0, -250.0], [250.0, 250.0], [-250.0, 250.0]]


def world(preset: str = "doi", **over: Any) -> dict[str, Any]:
    w: dict[str, Any] = {
        "playArea": SQUARE,
        "procedural": {"preset": preset, "maxHeight": 40, "roughness": 0.5, "features": []},
        "heightScale": 1,
        "smoothing": 0,
    }
    w.update(over)
    return w


def test_hf_roundtrip_and_bilinear(tmp_path: Path) -> None:
    h = np.arange(12, dtype=np.float32).reshape(3, 4)
    meta = HfMeta(width=4, height=3, cellM=2.0, originLocal=(-4.0, -2.0), minH=0.0, maxH=11.0)
    write_hf(tmp_path, h, meta)
    assert (tmp_path / "height.r32").stat().st_size == 12 * 4
    h2, m2 = read_hf(tmp_path)
    assert np.array_equal(h, h2)
    assert m2 == meta
    assert sample_bilinear(h2, m2, -4.0, -2.0) == 0.0  # góc Tây Bắc = ô (0, 0)
    assert sample_bilinear(h2, m2, -3.0, -2.0) == pytest.approx(0.5)  # giữa cột 0 và 1
    assert sample_bilinear(h2, m2, -4.0, 0.0) == pytest.approx(4.0)  # hàng 1
    assert sample_bilinear(h2, m2, 100.0, 100.0) == 11.0  # kẹp biên
    with pytest.raises(ValueError, match="float32"):
        write_hf(tmp_path, h.astype(np.float64), meta)


def test_noise_range_determinism_continuity() -> None:
    x, z = np.meshgrid(np.linspace(-50, 50, 201), np.linspace(-50, 50, 201))
    p = make_perm(42)
    a = simplex2(x, z, p)
    assert a.min() >= -1.0 and a.max() <= 1.0
    assert a.std() > 0.1  # có biến thiên
    assert np.array_equal(a, simplex2(x, z, make_perm(42)))
    assert not np.array_equal(a, simplex2(x, z, make_perm(43)))
    fx, fz = np.meshgrid(np.linspace(0, 2, 201), np.linspace(0, 2, 201))
    fine = simplex2(fx, fz, p)
    assert np.abs(np.diff(fine, axis=1)).max() < 0.1  # liên tục: bước 0,01 đơn vị đổi ít
    assert np.abs(np.diff(fine, axis=0)).max() < 0.1
    r = fbm(x * 40, z * 40, p, octaves=5, persistence=0.5, ridged=True)
    assert r.min() >= 0.0 and r.max() <= 1.0


@pytest.mark.parametrize("preset", sorted(PRESETS))
def test_presets_shape_and_determinism(preset: str) -> None:
    h1, meta, masks = build(world(preset), 7, 2.0)
    h2, _, _ = build(world(preset), 7, 2.0)
    assert h1.dtype == np.float32 and h1.shape == (251, 251)
    assert meta.originLocal == (-250.0, -250.0) and meta.cellM == 2.0
    assert hashlib.sha256(h1.tobytes()).digest() == hashlib.sha256(h2.tobytes()).digest()
    assert np.isfinite(h1).all()
    assert meta.minH == float(h1.min()) and meta.maxH == float(h1.max())
    assert set(masks) == {"road", "water", "farm", "forest", "building"}
    amp = PRESETS[preset][0]
    if preset != "ven_bien":
        assert h1.min() >= 0.0 and h1.max() <= 40 * amp * (2 if preset == "thung_lung" else 1) + 1e-3


def test_preset_specifics() -> None:
    flat, _, _ = build(world("dong_bang"), 7, 2.0)
    hills, _, _ = build(world("doi"), 7, 2.0)
    assert np.ptp(flat) < np.ptp(hills)
    coast, _, masks = build(world("ven_bien"), 7, 2.0)
    assert (coast[:, :20] == SEA_H).mean() > 0.5  # biển ở phía Tây
    assert (coast[:, -20:] > 0).all()
    assert (masks["water"] > 0).sum() == (coast <= SEA_H).sum()
    valley, _, _ = build(world("thung_lung"), 7, 2.0)
    mid = valley.shape[1] // 2
    assert valley[:, mid - 5 : mid + 5].mean() < valley[:, :20].mean()  # trục giữa thấp hơn hai bên
    with pytest.raises(UnsupportedPreset):
        build(world("ant"), 7, 2.0)


def test_seed_height_scale_smoothing() -> None:
    a, _, _ = build(world(), 1, 4.0)
    assert not np.array_equal(a, build(world(), 2, 4.0)[0])
    scaled, _, _ = build(world(heightScale=2), 1, 4.0)
    assert np.allclose(scaled, a * 2, atol=1e-4)
    sm, _, _ = build(world(smoothing=3), 1, 4.0)
    assert np.abs(np.diff(sm, axis=1)).mean() < np.abs(np.diff(a, axis=1)).mean()
    const = np.full((5, 5), 3.0)
    assert np.array_equal(smooth3(const, 2), const)


def test_grid_snaps_to_cells() -> None:
    g = grid_for([[-3.0, -3.0], [3.0, -3.0], [3.0, 5.0]], 2.0)
    assert g.meta_origin == (-4.0, -4.0) and (g.width, g.height) == (5, 6)
    assert g.x[0, 0] == -4.0 and g.z[-1, 0] == 6.0


def test_png_roundtrip_and_hillshade() -> None:
    gray = (np.arange(30, dtype=np.uint16).reshape(5, 6) * 8).astype(np.uint8)
    data = encode_png(gray)
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    assert np.array_equal(decode_png(data), gray)
    assert encode_png(gray) == data  # byte tất định
    h, meta, masks = build(world("ven_bien"), 3, 4.0)
    rgb = hillshade(h, meta.cellM, masks["water"])
    assert rgb.shape == (*h.shape, 3) and rgb.dtype == np.uint8
    assert np.array_equal(decode_png(encode_png(rgb)), rgb)
    assert tuple(rgb[0, 0]) == (40, 90, 150)  # góc Tây Bắc là biển
    with pytest.raises(ValueError, match="uint8"):
        encode_png(gray.astype(np.int32))
