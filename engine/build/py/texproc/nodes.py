"""Nút texture thủ tục liền mép (T-0025; DDD-03 MOD-AST-11, PSC-AST-09: noise|voronoi|brick|wood|cloth|blend|levels).

Mọi nút trả ảnh xám float64 (N, N) trong [0, 1] và LIỀN MÉP: tần số là số nguyên lần chu kỳ ảnh, lân cận lấy theo
modulo. Ngẫu nhiên chỉ từ `Pcg32(seed)`; chỉ dùng + − × ÷ floor sqrt (tất định giữa CPU, xem detmath).
"""

from __future__ import annotations

from typing import Any

import numpy as np
import numpy.typing as npt

from gsrng import Pcg32

F64 = npt.NDArray[np.float64]
I64 = npt.NDArray[np.int64]

# 8 gradient lệch 22,5° khỏi trục: tránh đường không-giá-trị thẳng theo lưới (lộ rõ ở nhiễu ridged).
C, S = 0.9238795325112867, 0.3826834323650898
GRAD8 = np.array([[C, S], [S, C], [-S, C], [-C, S], [-C, -S], [-S, -C], [S, -C], [C, -S]], dtype=np.float64)


def grid(n: int) -> tuple[F64, F64]:
    """Toạ độ tâm điểm ảnh (u, v) trong [0, 1), u theo cột, v theo hàng."""
    c = (np.arange(n, dtype=np.float64) + 0.5) / n
    v, u = np.meshgrid(c, c, indexing="ij")
    return u, v


def _perm(rng: Pcg32) -> I64:
    p = list(range(256))
    rng.shuffle_in_place(p)
    return np.array(p + p, dtype=np.int64)


def _fade(t: F64) -> F64:
    out: F64 = t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
    return out


def perlin_periodic(n: int, period: int, perm: I64) -> F64:
    """Nhiễu gradient 2D chu kỳ `period` ô trên ảnh n×n (Perlin cải tiến, 8 gradient), giá trị ≈ [-1, 1].

    Lưới đều nên phần lẻ và chỉ số ô tách theo trục (1D); chỉ bảng gradient period×period là 2D.
    """
    c = (np.arange(n, dtype=np.float64) + 0.5) / n * period
    i0 = np.floor(c).astype(np.int64)
    f = c - np.floor(c)
    i1 = (i0 + 1) % period
    cells = np.arange(period, dtype=np.int64)
    table = GRAD8[perm[(perm[cells[None, :] & 255] + cells[:, None]) & 511] & 7]  # [hàng y, cột x, 2]
    gx, gy = table[..., 0], table[..., 1]
    fx, fy = f[None, :], f[:, None]

    def corner(iy: I64, ix: I64, dx: int, dy: int) -> F64:
        out: F64 = gx[np.ix_(iy, ix)] * (fx - dx) + gy[np.ix_(iy, ix)] * (fy - dy)
        return out

    s = _fade(f)
    sx, sy = s[None, :], s[:, None]
    a = corner(i0, i0, 0, 0)
    a = a + sx * (corner(i0, i1, 1, 0) - a)
    b = corner(i1, i0, 0, 1)
    b = b + sx * (corner(i1, i1, 1, 1) - b)
    out: F64 = (a + sy * (b - a)) * 1.4142135623730951
    return out


def noise(  # noqa: PLR0913 (tham số octave keyword-only)
    n: int, rng: Pcg32, *, scale: int = 4, octaves: int = 4, persistence: float = 0.5, ridged: bool = False
) -> F64:
    """fBm chu kỳ: octave o có chu kỳ scale·2^o (lacunarity 2 giữ liền mép). Kết quả [0, 1]."""
    perm = _perm(rng)
    total = np.zeros((n, n))
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        val = perlin_periodic(n, scale << o, perm)
        if ridged:
            r = 1.0 - np.abs(val)
            val = r * r * 2.0 - 1.0
        total += amp * val
        norm += amp
        amp *= persistence
    out: F64 = np.clip(total / norm * 0.5 + 0.5, 0.0, 1.0)
    return out


def voronoi(n: int, rng: Pcg32, *, cells: int = 8, jitter: float = 0.9, mode: str = "f1") -> F64:
    """Voronoi chu kỳ, lưới cells×cells điểm rung. mode: f1 (khoảng cách gần nhất), edge (F2−F1), cell (giá trị ô)."""
    pts = np.array([[rng.float(), rng.float()] for _ in range(cells * cells)], dtype=np.float64).reshape(
        cells, cells, 2
    )
    vals = np.array([rng.float() for _ in range(cells * cells)], dtype=np.float64).reshape(cells, cells)
    pts = 0.5 + (pts - 0.5) * jitter
    c = (np.arange(n, dtype=np.float64) + 0.5) / n * cells  # toạ độ tách theo trục (lưới đều)
    ci = np.floor(c).astype(np.int64)
    f1 = np.full((n, n), np.inf)
    f2 = np.full((n, n), np.inf)
    val = np.zeros((n, n))
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            gx, gy = ci + dx, ci + dy
            ix = np.ix_(gy % cells, gx % cells)
            ddx = (gx - c)[None, :] + pts[..., 0][ix]
            ddy = (gy - c)[:, None] + pts[..., 1][ix]
            d = np.sqrt(ddx * ddx + ddy * ddy)
            closer = d < f1
            f2 = np.where(closer, f1, np.minimum(f2, d))
            val = np.where(closer, vals[ix], val)
            f1 = np.where(closer, d, f1)
    if mode == "cell":
        return val
    out: F64 = np.clip(f2 - f1 if mode == "edge" else f1 / 1.2, 0.0, 1.0)
    return out


def brick(  # noqa: PLR0913 (tham số hình học keyword-only)
    n: int, rng: Pcg32, *, rows: int = 8, cols: int = 4, mortar: float = 0.06, bevel: float = 0.08, tone: float = 0.3
) -> F64:
    """Gạch so le nửa viên mỗi hàng (rows chẵn để liền mép); mạch vữa 0, mặt gạch 1 − tone·ngẫu nhiên mỗi viên."""
    u, v = grid(n)
    y = v * rows
    row = np.floor(y).astype(np.int64)
    x = u * cols + 0.5 * (row & 1)
    col = np.floor(x).astype(np.int64) % cols
    fx, fy = x - np.floor(x), y - np.floor(y)
    tones = np.array([1.0 - tone * rng.float() for _ in range(rows * cols)], dtype=np.float64)
    # khoảng cách tới mép viên (theo đơn vị viên), co theo tỉ lệ để mạch đều hai chiều
    ex = np.minimum(fx, 1.0 - fx) * (rows / max(cols, 1)) / 2.0
    ey = np.minimum(fy, 1.0 - fy) / 2.0
    e = np.minimum(ex, ey)
    m = mortar / 2.0
    prof = np.clip((e - m) / max(bevel / 2.0, 1e-9), 0.0, 1.0)
    out: F64 = prof * tones[(row % rows) * cols + col]
    return out


def _tri(t: F64) -> F64:
    """Sóng tam giác chu kỳ 1, [0, 1]."""
    f = t - np.floor(t)
    out: F64 = 1.0 - np.abs(2.0 * f - 1.0)
    return out


def wood(n: int, rng: Pcg32, *, rings: int = 12, warp: float = 0.6, scale: int = 2) -> F64:
    """Vân gỗ: vòng theo trục v, uốn bởi nhiễu chu kỳ (rings, scale nguyên để liền mép)."""
    w = noise(n, rng, scale=scale, octaves=3, persistence=0.5)
    _, v = grid(n)
    t = _tri(v * rings + warp * (w - 0.5) * 2.0)
    fine = noise(n, rng, scale=scale * 16, octaves=2, persistence=0.5)
    out: F64 = np.clip(0.75 * t * t + 0.25 * fine, 0.0, 1.0)
    return out


def cloth(n: int, rng: Pcg32, *, threads: int = 32, fuzz: float = 0.15) -> F64:
    """Vải dệt trơn: sợi dọc/ngang sóng tam giác, ô bàn cờ chọn sợi nằm trên."""
    u, v = grid(n)
    a = _tri(u * threads * 2.0)
    b = _tri(v * threads * 2.0)
    cu = np.floor(u * threads).astype(np.int64)
    cv = np.floor(v * threads).astype(np.int64)
    over = ((cu + cv) & 1) == 0
    h = np.where(over, 0.6 + 0.4 * b, 0.6 + 0.4 * a) * np.sqrt(np.where(over, a, b))
    f = noise(n, rng, scale=threads, octaves=1)
    out: F64 = np.clip(h * (1.0 - fuzz) + fuzz * f, 0.0, 1.0)
    return out


def levels(x: F64, *, lo: float = 0.0, hi: float = 1.0, invert: bool = False, smooth: bool = False) -> F64:
    t = np.clip((x - lo) / max(hi - lo, 1e-9), 0.0, 1.0)
    if smooth:
        t = t * t * (3.0 - 2.0 * t)
    out: F64 = 1.0 - t if invert else t
    return out


def blend(a: F64, b: F64, *, mode: str = "mix", t: float | F64 = 0.5) -> F64:
    if mode == "mix":
        r = a + (b - a) * t
    elif mode == "multiply":
        r = a * b
    elif mode == "add":
        r = a + b * t
    elif mode == "max":
        r = np.maximum(a, b)
    elif mode == "min":
        r = np.minimum(a, b)
    elif mode == "screen":
        r = 1.0 - (1.0 - a) * (1.0 - b)
    else:
        raise ValueError(f"blend.mode không hỗ trợ: {mode}")
    out: F64 = np.clip(r, 0.0, 1.0)
    return out


GENERATORS: dict[str, Any] = {"noise": noise, "voronoi": voronoi, "brick": brick, "wood": wood, "cloth": cloth}
