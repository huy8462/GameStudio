"""Hàm lượng giác tất định cho bước build (T-0025; rule engine-build: cùng đầu vào → cùng byte trên mọi CPU).

`np.sin`/`np.arctan2`/`np.exp` có đường SIMD khác nhau theo CPU (T-0011 đã gặp với arctan, hypot), nên ở đây chỉ dùng
+ − × ÷, floor, sqrt (IEEE 754 làm tròn đúng). Sai số cỡ 1e-7, đủ cho tra texture và chiếu cubemap.
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt

F64 = npt.NDArray[np.float64]

PI = 3.141592653589793
HALF_PI = PI / 2
TWO_PI = 2 * PI


def _sin_core(x: F64) -> F64:
    """sin trên [-π/4, π/4] (Taylor tới x^13)."""
    x2 = x * x
    p: F64 = np.full_like(x, 1.0 / 6227020800.0)
    for c in (-1.0 / 39916800.0, 1.0 / 362880.0, -1.0 / 5040.0, 1.0 / 120.0, -1.0 / 6.0, 1.0):
        p = p * x2 + c
    out: F64 = x * p
    return out


def _cos_core(x: F64) -> F64:
    """cos trên [-π/4, π/4] (Taylor tới x^14)."""
    x2 = x * x
    p: F64 = np.full_like(x, -1.0 / 87178291200.0)
    for c in (1.0 / 479001600.0, -1.0 / 3628800.0, 1.0 / 40320.0, -1.0 / 720.0, 1.0 / 24.0, -0.5, 1.0):
        p = p * x2 + c
    return p


def sincos(a: F64 | float) -> tuple[F64, F64]:
    """(sin a, cos a): rút gọn về góc phần tư k = round(a / (π/2))."""
    a = np.asarray(a, dtype=np.float64)
    k = np.floor(a / HALF_PI + 0.5)
    r = a - k * HALF_PI
    s, c = _sin_core(r), _cos_core(r)
    q = (k.astype(np.int64)) & 3
    sin = np.select([q == 0, q == 1, q == 2], [s, c, -s], -c)
    cos = np.select([q == 0, q == 1, q == 2], [c, -s, -c], s)
    return sin, cos


def _atan_unit(t: F64) -> F64:
    """atan trên [0, 1]: rút gọn qua tan(π/8) rồi chuỗi Taylor (sai số < 1e-9)."""
    t8 = 0.41421356237309503  # tan(π/8)
    big = t > t8
    u = np.where(big, (t - t8) / (1.0 + t * t8), t)
    u2 = u * u
    p = np.zeros_like(u)
    for n in range(12, -1, -1):
        p = p * u2 + ((-1.0) ** n) / (2 * n + 1)
    out: F64 = np.where(big, PI / 8 + u * p, u * p)
    return out


def atan2(y: F64 | float, x: F64 | float) -> F64:
    """atan2(y, x) trong (-π, π]; atan2(0, 0) = 0."""
    y = np.asarray(y, dtype=np.float64)
    x = np.asarray(x, dtype=np.float64)
    ax, ay = np.abs(x), np.abs(y)
    mx = np.maximum(ax, ay)
    mn = np.minimum(ax, ay)
    t = np.where(mx > 0, mn / np.where(mx > 0, mx, 1.0), 0.0)
    a = _atan_unit(t)
    a = np.where(ay > ax, HALF_PI - a, a)
    a = np.where(x < 0, PI - a, a)
    out: F64 = np.where(y < 0, -a, a)
    return out


def asin(v: F64 | float) -> F64:
    v = np.clip(np.asarray(v, dtype=np.float64), -1.0, 1.0)
    return atan2(v, np.sqrt(1.0 - v * v))
