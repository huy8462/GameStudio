"""Xói mòn thuỷ lực dạng hạt + nhiệt (ALG-WLD-06, PSC-WLD-06, MOD-WLD-06; tham số CFG-WLD-04).

Tất định: vị trí xuất phát của hạt sinh bằng `gsrng.Pcg32(seed)` (Python, cùng thuật toán TS) rồi truyền vào nhân
numba; nhân `@njit(parallel=False, fastmath=False)` chạy tuần tự, mọi phép cộng dồn theo thứ tự cố định.
Toạ độ hạt tính theo ô lưới; độ cao theo mét (như PSC-WLD-06).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from numba import njit

from gsrng import Pcg32

F64 = npt.NDArray[np.float64]
U8 = npt.NDArray[np.uint8]
MAX_STEPS = 64
THERMAL_PASSES = 10


@dataclass(frozen=True)
class ErodeParams:
    """CFG-WLD-04: quán tính 0,05; sức mang 4; lắng 0,3; bốc hơi 0,01; bán kính 3; talus 35°."""

    inertia: float = 0.05
    capacity: float = 4.0
    deposition: float = 0.3
    evaporation: float = 0.01
    radius: int = 3
    talus_deg: float = 35.0
    min_slope: float = 0.01


def particle_count(iterations: int, strength: float, w: int, h: int) -> int:
    """N = int(iterations · strength · W · H / 64) (PSC-WLD-06)."""
    return int(iterations * strength * w * h / 64)


def particle_starts(n: int, w: int, h: int, seed: int) -> tuple[F64, F64]:
    rng = Pcg32(seed)
    xs = np.empty(n, dtype=np.float64)
    zs = np.empty(n, dtype=np.float64)
    for k in range(n):
        xs[k] = rng.float() * (w - 1)
        zs[k] = rng.float() * (h - 1)
    return xs, zs


@njit(cache=True, parallel=False, fastmath=False)
def _height_grad(hf: F64, x: float, z: float) -> tuple[float, float, float]:
    c, r = int(x), int(z)
    u, v = x - c, z - r
    h00, h10 = hf[r, c], hf[r, c + 1]
    h01, h11 = hf[r + 1, c], hf[r + 1, c + 1]
    gx = (h10 - h00) * (1 - v) + (h11 - h01) * v
    gz = (h01 - h00) * (1 - u) + (h11 - h10) * u
    hh = h00 * (1 - u) * (1 - v) + h10 * u * (1 - v) + h01 * (1 - u) * v + h11 * u * v
    return hh, gx, gz


@njit(cache=True, parallel=False, fastmath=False)
def _erode_kernel(  # noqa: PLR0913, PLR0915 (một nhân numba theo đúng PSC-WLD-06)
    hf: F64,
    xs: F64,
    zs: F64,
    mask: U8,
    inertia: float,
    capacity: float,
    deposition: float,
    evaporation: float,
    radius: int,
    min_slope: float,
    flow: F64,
    sed_map: F64,
) -> None:
    hh, ww = hf.shape
    # Trọng số vòng tròn bán kính r (tính một lần, chuẩn hoá tổng = 1).
    offs = []
    wsum = 0.0
    for dz in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            d = math.sqrt(dx * dx + dz * dz)
            if d < radius:
                offs.append((dx, dz, radius - d))
                wsum += radius - d
    for k in range(xs.shape[0]):
        x, z = xs[k], zs[k]
        if mask[int(z), int(x)] == 0:
            continue
        dirx, dirz, speed, water, sed = 0.0, 0.0, 1.0, 1.0, 0.0
        for _ in range(MAX_STEPS):
            c, r = int(x), int(z)
            flow[r, c] += 1.0
            h0, gx, gz = _height_grad(hf, x, z)
            dirx = dirx * inertia - gx * (1 - inertia)
            dirz = dirz * inertia - gz * (1 - inertia)
            ln = math.sqrt(dirx * dirx + dirz * dirz)
            if ln == 0.0:
                break
            dirx /= ln
            dirz /= ln
            nx, nz = x + dirx, z + dirz
            if nx < 0 or nz < 0 or nx >= ww - 1 or nz >= hh - 1:
                break
            h1, _, _ = _height_grad(hf, nx, nz)
            dh = h1 - h0
            cap = max(-dh, min_slope) * speed * water * capacity
            if sed > cap or dh > 0:
                dep = min(dh, sed) if dh > 0 else (sed - cap) * deposition
                u, v = x - c, z - r
                hf[r, c] += dep * (1 - u) * (1 - v)
                hf[r, c + 1] += dep * u * (1 - v)
                hf[r + 1, c] += dep * (1 - u) * v
                hf[r + 1, c + 1] += dep * u * v
                sed_map[r, c] += dep
                sed -= dep
            else:
                ero = min((cap - sed) * deposition, -dh)
                for dx, dz, wt in offs:
                    rr, cc = r + dz, c + dx
                    if 0 <= rr < hh and 0 <= cc < ww:
                        hf[rr, cc] -= ero * wt / wsum
                sed += ero
            speed = math.sqrt(max(speed * speed + dh * 4.0, 0.0))
            water *= 1 - evaporation
            x, z = nx, nz


@njit(cache=True, parallel=False, fastmath=False)
def _thermal(hf: F64, talus_h: float, passes: int) -> None:
    """Mỗi ô dốc hơn talus so với láng giềng thấp nhất (4 hướng) chuyển 0,5·(chênh − talus) xuống ô đó."""
    hh, ww = hf.shape
    for _ in range(passes):
        for r in range(hh):
            for c in range(ww):
                best_r, best_c, best_d = -1, -1, talus_h
                for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    rr, cc = r + dr, c + dc
                    if 0 <= rr < hh and 0 <= cc < ww:
                        d = hf[r, c] - hf[rr, cc]
                        if d > best_d:
                            best_r, best_c, best_d = rr, cc, d
                if best_r >= 0:
                    amt = 0.5 * (best_d - talus_h)
                    hf[r, c] -= amt
                    hf[best_r, best_c] += amt


def to_r8(a: F64) -> U8:
    """Chuẩn hoá về 0..255 theo giá trị lớn nhất (0 khi toàn 0)."""
    m = float(a.max())
    if m <= 0:
        return np.zeros(a.shape, dtype=np.uint8)
    out: U8 = np.clip(np.rint(a / m * 255.0), 0, 255).astype(np.uint8)
    return out


def erode(  # noqa: PLR0913 (tham số khớp world.erosion + ô lưới)
    h: npt.NDArray[np.float32],
    *,
    iterations: int,
    strength: float,
    seed: int,
    cell_m: float,
    mask: U8 | None = None,
    params: ErodeParams = ErodeParams(),  # noqa: B008 (dataclass bất biến)
) -> tuple[npt.NDArray[np.float32], U8, U8, int]:
    """Trả (H đã xói float32, flow.r8, sediment.r8, số hạt). Không sửa mảng đầu vào."""
    hh, ww = h.shape
    hf = h.astype(np.float64)
    m = np.ones((hh, ww), dtype=np.uint8) if mask is None else mask
    n = particle_count(iterations, strength, ww, hh)
    xs, zs = particle_starts(n, ww, hh, seed)
    flow = np.zeros((hh, ww), dtype=np.float64)
    sed = np.zeros((hh, ww), dtype=np.float64)
    if n > 0:
        _erode_kernel(
            hf, xs, zs, m, params.inertia, params.capacity, params.deposition,
            params.evaporation, params.radius, params.min_slope, flow, sed,
        )  # fmt: skip
    if iterations > 0 and strength > 0:
        _thermal(hf, math.tan(math.radians(params.talus_deg)) * cell_m, THERMAL_PASSES)
    return hf.astype(np.float32), to_r8(flow), to_r8(sed), n
