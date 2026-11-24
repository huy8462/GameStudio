"""Nhiễu 2D cho địa hình thủ tục (PSC-WLD-04, ALG-WLD-04).

Simplex 2D dạng lưới tam giác (lệch F2/G2 như OpenSimplex2S), 12 gradient, bảng hoán vị 256 phần tử xáo bằng
`Pcg32(seed)` (ALG-GEN-01). Vector hoá numpy; chỉ dùng + − × floor nên kết quả từng phần tử tất định theo IEEE 754.
"""

from __future__ import annotations

import math

import numpy as np
import numpy.typing as npt

from gsrng import Pcg32

F64 = npt.NDArray[np.float64]

F2 = 0.5 * (math.sqrt(3.0) - 1.0)
G2 = (3.0 - math.sqrt(3.0)) / 6.0
GRAD = np.array(
    [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0, 1], [0, -1]],
    dtype=np.float64,
)


def make_perm(seed: int) -> npt.NDArray[np.int64]:
    """Bảng hoán vị 512 phần tử (256 lặp hai lần) từ Pcg32(seed)."""
    p = list(range(256))
    Pcg32(seed).shuffle_in_place(p)
    return np.array(p + p, dtype=np.int64)


def simplex2(x: F64, z: F64, perm: npt.NDArray[np.int64]) -> F64:
    """Nhiễu simplex 2D trong [-1, 1] tại các điểm (x, z) cùng hình dạng."""
    s = (x + z) * F2
    i = np.floor(x + s).astype(np.int64)
    j = np.floor(z + s).astype(np.int64)
    t = (i + j).astype(np.float64) * G2
    x0 = x - (i.astype(np.float64) - t)
    z0 = z - (j.astype(np.float64) - t)
    i1 = (x0 > z0).astype(np.int64)
    j1 = 1 - i1
    x1 = x0 - i1 + G2
    z1 = z0 - j1 + G2
    x2 = x0 - 1.0 + 2.0 * G2
    z2 = z0 - 1.0 + 2.0 * G2
    ii = i & 255
    jj = j & 255
    total = np.zeros_like(x)
    for dx, dz, ci, cj in ((x0, z0, 0, 0), (x1, z1, i1, j1), (x2, z2, 1, 1)):
        g = GRAD[perm[ii + ci + perm[jj + cj]] % 12]
        tt = 0.5 - dx * dx - dz * dz
        pos = tt > 0
        t2 = tt * tt
        total += np.where(pos, t2 * t2 * (g[..., 0] * dx + g[..., 1] * dz), 0.0)
    return np.clip(70.0 * total, -1.0, 1.0)


def fbm(  # noqa: PLR0913 (tham số octave keyword-only theo PSC-WLD-04)
    x: F64,
    z: F64,
    perm: npt.NDArray[np.int64],
    *,
    octaves: int,
    persistence: float,
    lacunarity: float = 2.0,
    base_freq: float = 1.0 / 800.0,
    ridged: bool = False,
) -> F64:
    """Tổng octave chuẩn hoá: thường trong [-1, 1]; `ridged` (n' = (1 − |n|)²) trong [0, 1]."""
    total = np.zeros_like(x)
    amp, freq, norm = 1.0, base_freq, 0.0
    for o in range(octaves):
        # Lệch mỗi octave theo hằng để các octave không trùng gốc (tất định, không dùng RNG).
        off = 37.0 * (o + 1)
        n = simplex2(x * freq + off, z * freq - off, perm)
        if ridged:
            r = 1.0 - np.abs(n)
            n = r * r
        total += amp * n
        norm += amp
        amp *= persistence
        freq *= lacunarity
    out: F64 = total / norm
    return out
