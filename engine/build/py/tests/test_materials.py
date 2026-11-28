"""T-0025: detmath, texproc (liền mép, tất định, map PBR), hdri (RGBE, cubemap, GGX, SH). PSC-AST-09, 10; TC-AST."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pytest

import detmath
from gsrng import Pcg32
from hdri import cube, prefilter, rgbe, sky
from texproc import graph, nodes

N = 64


def test_detmath_khop_libm() -> None:
    a = np.linspace(-20.0, 20.0, 4001)
    s, c = detmath.sincos(a)
    assert np.abs(s - np.sin(a)).max() < 1e-12
    assert np.abs(c - np.cos(a)).max() < 1e-12
    y, x = np.meshgrid(np.linspace(-3, 3, 61), np.linspace(-3, 3, 61))
    assert np.abs(detmath.atan2(y, x) - np.arctan2(y, x)).max() < 1e-9
    assert float(detmath.atan2(0.0, 0.0)) == 0.0
    v = np.linspace(-1, 1, 201)
    assert np.abs(detmath.asin(v) - np.arcsin(v)).max() < 1e-7


@pytest.mark.parametrize(
    ("op", "args"),
    [
        ("noise", {"scale": 4, "octaves": 4}),
        ("noise", {"scale": 3, "octaves": 2, "ridged": True}),
        ("voronoi", {"cells": 6}),
        ("voronoi", {"cells": 6, "mode": "edge"}),
        ("brick", {"rows": 8, "cols": 4}),
        ("wood", {"rings": 6}),
        ("cloth", {"threads": 8}),
    ],
)
def test_nut_lien_mep_va_tat_dinh(op: str, args: dict[str, object]) -> None:
    gen = nodes.GENERATORS[op]
    a = gen(N, Pcg32(7), **args)
    b = gen(N, Pcg32(7), **args)
    assert a.shape == (N, N)
    assert np.array_equal(a, b)
    assert a.min() >= 0.0 and a.max() <= 1.0
    # Ghép 2×2 bản sao: chênh qua mép ghép không lớn hơn chênh trong ảnh nhiều.
    edge = (np.abs(a[:, 0] - a[:, -1]).mean() + np.abs(a[0] - a[-1]).mean()) / 2
    inner = (np.abs(np.diff(a, axis=1)).mean() + np.abs(np.diff(a, axis=0)).mean()) / 2
    assert edge <= 2.0 * inner + 1e-9, (op, edge, inner)


def test_seed_khac_cho_anh_khac() -> None:
    assert not np.array_equal(nodes.noise(N, Pcg32(1)), nodes.noise(N, Pcg32(2)))


RECIPE = {
    "id": "thu",
    "tiling": [2, 2],
    "graph": [
        {"id": "n", "op": "noise", "scale": 4, "octaves": 3},
        {"id": "v", "op": "voronoi", "cells": 5},
        {"id": "h", "op": "blend", "a": "n", "b": "v", "t": 0.5},
        {"id": "l", "op": "levels", "in": "h", "lo": 0.2, "hi": 0.8, "smooth": True},
    ],
    "height": "l",
    "baseColor": {"node": "l", "ramp": [[0, "#000000"], [1, "palette:nen-co"]], "tint": {"node": "n", "amount": 0.1}},
    "roughness": {"node": "n", "range": [0.9, 0.6]},
    "metallic": 0.0,
    "heightMap": True,
}


def test_build_maps_pbr() -> None:
    m = graph.build_maps(RECIPE, {"nen-co": "#5f7a3a"}, 3, N)
    assert m.base_color.shape == (N, N, 3) and m.base_color.dtype == np.uint8
    assert m.normal.shape == (N, N, 3) and m.orm.shape == (N, N, 3)
    assert m.height is not None and m.height.shape == (N, N)
    assert int(m.orm[..., 2].max()) == 0  # metallic 0
    g = m.orm[..., 1] / 255.0
    assert 0.59 <= g.min() and g.max() <= 0.91
    assert m.normal[..., 2].min() >= 128  # mặt hướng +Z
    mj = graph.material_json(RECIPE, m)
    assert sorted(mj["maps"]) == ["baseColor", "height", "normal", "orm"]
    assert mj["source"] == "procedural" and mj["roughnessRange"] == [0.6, 0.9]
    assert graph.seam_delta(m.base_color) < 2.0
    again = graph.build_maps(RECIPE, {"nen-co": "#5f7a3a"}, 3, N)
    assert np.array_equal(m.normal, again.normal)


@pytest.mark.parametrize(
    "bad",
    [
        {**RECIPE, "height": "khong-co"},
        {**RECIPE, "graph": [{"id": "x", "op": "la"}]},
        {**RECIPE, "baseColor": {"ramp": [[0, "palette:khong-co"]]}},
        {**RECIPE, "graph": [{"id": "n", "op": "noise", "sai": 1}]},
    ],
)
def test_cong_thuc_sai(bad: dict[str, object]) -> None:
    with pytest.raises(graph.RecipeError):
        graph.build_maps(bad, {"nen-co": "#5f7a3a"}, 3, 16)


def test_rgbe_khu_hoi(tmp_path: Path) -> None:
    img = np.abs(np.random.default_rng(0).normal(size=(8, 16, 3))) * 10  # noqa: S311 (dữ liệu test)
    p = tmp_path / "a.hdr"
    rgbe.write_hdr(p, img)
    back = rgbe.read_hdr(p)
    assert back.shape == (8, 16, 3)
    step = img.max(axis=-1, keepdims=True) / 128.0  # lượng tử RGBE theo kênh lớn nhất
    assert (np.abs(back - img) <= step + 1e-6).all()


def test_rgbe_rle(tmp_path: Path) -> None:
    w = 16
    head = f"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X {w}\n".encode()
    line = bytes([2, 2, 0, w])
    for ch in (128, 64, 32, 129):  # mỗi kênh một lượt lặp 16
        line += bytes([128 + w, ch])
    p = tmp_path / "r.hdr"
    p.write_bytes(head + line)
    img = rgbe.read_hdr(p)
    assert img.shape == (1, w, 3)
    assert np.allclose(img[0, 0], [1.0, 0.5, 0.25])


def test_cubemap_hinh_hoc() -> None:
    d = cube.face_dirs(8)
    assert d.shape == (6, 8, 8, 3)
    assert np.allclose((d * d).sum(-1), 1.0)
    assert np.allclose(d[0].mean(axis=(0, 1)) / np.linalg.norm(d[0].mean(axis=(0, 1))), [1, 0, 0])
    assert np.allclose(d[2].mean(axis=(0, 1)) / np.linalg.norm(d[2].mean(axis=(0, 1))), [0, 1, 0])
    assert abs(6 * cube.texel_solid_angle(16).sum() - 4 * math.pi) < 1e-9


def test_equirect_khu_hoi() -> None:
    dirs = cube.equirect_dirs(32, 16)
    img = np.concatenate([dirs * 0.5 + 0.5], axis=-1)
    back = cube.sample_equirect(img, dirs)
    assert np.abs(back - img).max() < 1e-9


def test_ggx_va_sh_moi_truong_hang() -> None:
    env = np.full((16, 32, 3), 2.0)
    mips = prefilter.prefilter(env, 8, 3, 16)
    assert [m.shape for m in mips] == [(6, 8, 8, 3), (6, 4, 4, 3), (6, 2, 2, 3)]
    for m in mips:
        assert np.allclose(m, 2.0)
    sh = prefilter.sh9(mips[0])
    assert abs(sh[0][0] - 2.0 * 0.282094791773878 * 4 * math.pi) < 1e-3
    assert all(abs(c) < 1e-6 for row in sh[1:] for c in row)


def test_rgbm_va_bau_troi() -> None:
    c = np.array([[0.0, 0.0, 0.0], [1.0, 0.5, 0.25], [16.0, 1.0, 1.0]])
    e = prefilter.rgbm(c).astype(np.float64) / 255.0
    dec = e[:, :3] * e[:, 3:4] * prefilter.RGBM_RANGE
    assert np.allclose(dec[:2], c[:2], atol=0.02)
    assert dec[2, 0] == pytest.approx(8.0, abs=0.05)  # kẹp ở RGBM_RANGE
    s = sky.procedural_sky(1024, 512, {})
    assert s.shape == (512, 1024, 3)
    assert s[:64].mean() > s[-64:].mean()  # trời sáng hơn đất
    assert s.max() > 10.0  # đĩa mặt trời HDR
