"""Tiền lọc cubemap GGX theo mip, mã RGBM và hệ số SH bậc 2 (T-0025; DDD-03 MOD-AST-12, PSC-AST-10; FR-AST-18).

Mip m có độ nhám m/(M−1); mip 0 lấy mẫu thẳng. Mỗi texel lấy `samples` hướng GGX theo dãy Hammersley (cố định,
không cần RNG), giả định N = V = R (split-sum của Karis). Nguồn chọn từ tháp equirect theo cỡ mặt để tránh răng cưa.
"""

from __future__ import annotations

import numpy as np
import numpy.typing as npt

import detmath
from hdri import cube

F64 = npt.NDArray[np.float64]
U8 = npt.NDArray[np.uint8]

RGBM_RANGE = 8.0
SH_BASIS = ("Y00", "Y1-1", "Y10", "Y11", "Y2-2", "Y2-1", "Y20", "Y21", "Y22")


def hammersley(k: int) -> tuple[F64, F64]:
    """Dãy Hammersley (i/k, nghịch đảo bit 32 của i), tính bằng số nguyên Python."""

    def rev(i: int) -> float:
        return int(f"{i:032b}"[::-1], 2) / 4294967296.0

    return np.arange(k, dtype=np.float64) / k, np.array([rev(i) for i in range(k)], dtype=np.float64)


def _frame(n: F64) -> tuple[F64, F64]:
    up = np.where(np.abs(n[..., 2:3]) < 0.999, np.array([0.0, 0.0, 1.0]), np.array([1.0, 0.0, 0.0]))
    t = np.cross(up, n)
    t = t / np.sqrt((t * t).sum(axis=-1, keepdims=True))
    return t, np.cross(n, t)


def prefilter_level(levels: list[F64], n: int, roughness: float, samples: int) -> F64:
    """Một mip (6, n, n, 3) tuyến tính."""
    dirs = cube.face_dirs(n)
    if roughness <= 0.0:
        return cube.sample_equirect(cube.pick_level(levels, 4 * n), dirs)
    src = cube.pick_level(levels, max(16, int(4 * n * (1.0 - 0.5 * roughness))))
    flat = dirs.reshape(-1, 3)
    tan, bit = _frame(flat)
    a2 = (roughness * roughness) ** 2
    x1, x2 = hammersley(samples)
    sp, cp = detmath.sincos(detmath.TWO_PI * x1)
    cos_t = np.sqrt((1.0 - x2) / (1.0 + (a2 - 1.0) * x2))
    sin_t = np.sqrt(1.0 - cos_t * cos_t)
    acc = np.zeros_like(flat)
    wsum = np.zeros(flat.shape[0])
    for k in range(samples):
        h = tan * (sin_t[k] * cp[k]) + bit * (sin_t[k] * sp[k]) + flat * cos_t[k]
        vh = (flat * h).sum(axis=-1, keepdims=True)
        lv = 2.0 * vh * h - flat
        nl = (flat * lv).sum(axis=-1)
        ok = nl > 0
        if not ok.any():
            continue
        w = np.where(ok, nl, 0.0)
        acc += cube.sample_equirect(src, lv) * w[:, None]
        wsum += w
    out: F64 = (acc / np.maximum(wsum, 1e-12)[:, None]).reshape(6, n, n, 3)
    return out


def prefilter(img: F64, face: int, mips: int, samples: int) -> list[F64]:
    levels = cube.pyramid(img)
    return [prefilter_level(levels, max(1, face >> m), m / max(mips - 1, 1), samples) for m in range(mips)]


def rgbm(c: F64) -> U8:
    """RGBM tuyến tính, dải RGBM_RANGE: rgb = rgb8/255 · a8/255 · RANGE."""
    m = np.clip(c.max(axis=-1) / RGBM_RANGE, 1e-6, 1.0)
    m = np.ceil(m * 255.0) / 255.0
    rgb = np.clip(c / (m[..., None] * RGBM_RANGE), 0.0, 1.0)
    out: U8 = np.floor(np.concatenate([rgb, m[..., None]], axis=-1) * 255.0 + 0.5).astype(np.uint8)
    return out


def sh9(cubemap: F64) -> list[list[float]]:
    """9 hệ số SH bậc 2 (radiance, cơ sở thực chuẩn hoá) từ cubemap (6, n, n, 3), trọng số góc khối."""
    n = cubemap.shape[1]
    d = cube.face_dirs(n)
    w = np.broadcast_to(cube.texel_solid_angle(n), (6, n, n))
    x, y, z = d[..., 0], d[..., 1], d[..., 2]
    basis = [
        np.full_like(x, 0.282094791773878),
        0.488602511902920 * y,
        0.488602511902920 * z,
        0.488602511902920 * x,
        1.092548430592079 * x * y,
        1.092548430592079 * y * z,
        0.315391565252520 * (3.0 * z * z - 1.0),
        1.092548430592079 * x * z,
        0.546274215296040 * (x * x - y * y),
    ]
    return [[round(float((cubemap[..., c] * b * w).sum()), 6) for c in range(3)] for b in basis]


def tonemap_preview(img: F64) -> U8:
    """Reinhard + gamma xấp xỉ sqrt, để xem nhanh (không dùng lúc chạy)."""
    t = img / (1.0 + img)
    out: U8 = np.floor(np.sqrt(np.clip(t, 0.0, 1.0)) * 255.0 + 0.5).astype(np.uint8)
    return out
