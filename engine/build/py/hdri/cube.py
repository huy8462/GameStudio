"""Hình học cubemap và tra ảnh equirect (T-0025; PSC-AST-10).

Thứ tự mặt +X, −X, +Y, −Y, +Z, −Z (KTX2/OpenGL); trong mỗi mặt (s, t) ∈ [−1, 1], s sang phải, t đi xuống.
Equirect: u = 0,5 + atan2(x, z)/2π, v = 0,5 − asin(y)/π (hàng 0 là thiên đỉnh).
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt

import detmath

F64 = npt.NDArray[np.float64]

FACES = ("px", "nx", "py", "ny", "pz", "nz")


def face_dirs(n: int) -> F64:
    """Hướng đơn vị tâm texel, dạng (6, n, n, 3)."""
    c = (np.arange(n, dtype=np.float64) + 0.5) / n * 2.0 - 1.0
    t, s = np.meshgrid(c, c, indexing="ij")
    one = np.ones_like(s)
    raw = [
        (one, -t, -s),
        (-one, -t, s),
        (s, one, t),
        (s, -one, -t),
        (s, -t, one),
        (-s, -t, -one),
    ]
    d = np.stack([np.stack(f, axis=-1) for f in raw])
    out: F64 = d / np.sqrt((d * d).sum(axis=-1, keepdims=True))
    return out


def texel_solid_angle(n: int) -> F64:
    """Góc khối mỗi texel (n, n), giống nhau cho 6 mặt (công thức diện tích chiếu, tổng 6 mặt = 4π)."""

    def area(x: F64, y: F64) -> F64:
        return detmath.atan2(x * y, np.sqrt(x * x + y * y + 1.0))

    e = np.arange(n + 1, dtype=np.float64) / n * 2.0 - 1.0
    y0, x0 = np.meshgrid(e[:-1], e[:-1], indexing="ij")
    y1, x1 = np.meshgrid(e[1:], e[1:], indexing="ij")
    out: F64 = area(x0, y0) - area(x0, y1) - area(x1, y0) + area(x1, y1)
    return out


def downsample2(img: F64) -> F64:
    """Trung bình 2×2 (cạnh lẻ thì bỏ hàng/cột cuối)."""
    h, w = img.shape[0] // 2 * 2, img.shape[1] // 2 * 2
    a = img[:h, :w]
    out: F64 = (a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2]) * 0.25
    return out


def pyramid(img: F64, min_width: int = 16) -> list[F64]:
    levels = [img]
    while levels[-1].shape[1] // 2 >= min_width:
        levels.append(downsample2(levels[-1]))
    return levels


def pick_level(levels: list[F64], width: int) -> F64:
    """Mức đầu tiên có độ rộng ≤ width (hoặc mức nhỏ nhất)."""
    for lv in levels:
        if lv.shape[1] <= width:
            return lv
    return levels[-1]


def sample_equirect(img: F64, d: F64) -> F64:
    """Tra song tuyến (quấn theo u, kẹp theo v) tại hướng d (..., 3); trả (..., 3)."""
    h, w = img.shape[:2]
    u = 0.5 + detmath.atan2(d[..., 0], d[..., 2]) / detmath.TWO_PI
    v = 0.5 - detmath.asin(d[..., 1]) / detmath.PI
    x = u * w - 0.5
    y = np.clip(v * h - 0.5, 0.0, h - 1.0)
    x0 = np.floor(x)
    y0 = np.minimum(np.floor(y), h - 2.0) if h > 1 else np.zeros_like(y)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    xi0 = x0.astype(np.int64) % w
    xi1 = (xi0 + 1) % w
    yi0 = y0.astype(np.int64)
    yi1 = np.minimum(yi0 + 1, h - 1)
    top = img[yi0, xi0] * (1 - fx) + img[yi0, xi1] * fx
    bot = img[yi1, xi0] * (1 - fx) + img[yi1, xi1] * fx
    out: F64 = top * (1 - fy) + bot * fy
    return out


def equirect_dirs(w: int, h: int) -> F64:
    """Hướng tâm điểm ảnh equirect (h, w, 3), nghịch đảo của sample_equirect."""
    lon = ((np.arange(w, dtype=np.float64) + 0.5) / w - 0.5) * detmath.TWO_PI
    lat = (0.5 - (np.arange(h, dtype=np.float64) + 0.5) / h) * detmath.PI
    lat_g, lon_g = np.meshgrid(lat, lon, indexing="ij")
    sl, cl = detmath.sincos(lat_g)
    so, co = detmath.sincos(lon_g)
    return np.stack([cl * so, sl, cl * co], axis=-1)
