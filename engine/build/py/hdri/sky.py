"""Bầu trời thủ tục dạng equirect HDR (T-0025): dùng khi game chưa có HDRI CC0, và làm dữ liệu test.

Dải màu thiên đỉnh–chân trời theo sqrt(độ cao), nền đất tối, đĩa mặt trời + quầng (luỹ thừa bằng bình phương lặp).
"""

from __future__ import annotations

from typing import Any

import numpy as np
import numpy.typing as npt

import detmath
from hdri import cube

F64 = npt.NDArray[np.float64]


def _rgb(c: Any) -> F64:
    return np.array([float(v) for v in c], dtype=np.float64)


def procedural_sky(w: int, h: int, spec: dict[str, Any]) -> F64:
    zen = _rgb(spec.get("zenith", [0.25, 0.45, 0.9]))
    hor = _rgb(spec.get("horizon", [0.85, 0.9, 1.0]))
    gnd = _rgb(spec.get("ground", [0.18, 0.16, 0.13]))
    sun = _rgb(spec.get("sun", [1.0, 0.95, 0.85]))
    intensity = float(spec.get("sunIntensity", 40.0))
    elev = float(spec.get("sunElevationDeg", 35.0)) * detmath.PI / 180.0
    azim = float(spec.get("sunAzimuthDeg", 30.0)) * detmath.PI / 180.0
    se, ce = detmath.sincos(elev)
    sa, ca = detmath.sincos(azim)
    sdir = np.array([float(ce * sa), float(se), float(ce * ca)])

    d = cube.equirect_dirs(w, h)
    y = d[..., 1]
    up = np.sqrt(np.clip(y, 0.0, 1.0))[..., None]
    sky = hor + (zen - hor) * up
    fade = np.clip(-y * 8.0, 0.0, 1.0)[..., None]
    col = sky * (1.0 - fade) + gnd * fade
    cosang = np.clip((d * sdir).sum(axis=-1), 0.0, 1.0)
    glow = cosang
    for _ in range(6):  # cos^64
        glow = glow * glow
    disc = np.clip((cosang - 0.99990) / 0.00004, 0.0, 1.0)  # bán kính góc ≈ 0,8°
    out: F64 = col + sun * (0.6 * glow[..., None] + intensity * disc[..., None])
    return out
