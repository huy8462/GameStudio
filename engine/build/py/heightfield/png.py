"""Ghi PNG 8 bit (xám, RGB) chỉ bằng thư viện chuẩn: zlib mức 9, không chunk thời gian → byte tất định
với cùng bản zlib (mask DTO-WLD-02, preview/top.png)."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

import numpy as np
import numpy.typing as npt

U8 = npt.NDArray[np.uint8]
SIG = b"\x89PNG\r\n\x1a\n"


def _chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def encode_png(img: U8) -> bytes:
    """img: (h, w) xám hoặc (h, w, 3) RGB, uint8."""
    if img.dtype != np.uint8 or img.ndim not in (2, 3) or (img.ndim == 3 and img.shape[2] != 3):
        raise ValueError(f"cần uint8 (h, w) hoặc (h, w, 3), nhận {img.dtype} {img.shape}")
    h, w = img.shape[0], img.shape[1]
    color = 0 if img.ndim == 2 else 2
    rows = img.reshape(h, -1)
    raw = np.empty((h, rows.shape[1] + 1), dtype=np.uint8)
    raw[:, 0] = 0  # bộ lọc None mỗi hàng
    raw[:, 1:] = rows
    ihdr = struct.pack(">IIBBBBB", w, h, 8, color, 0, 0, 0)
    return SIG + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", zlib.compress(raw.tobytes(), 9)) + _chunk(b"IEND", b"")


def write_png(path: Path, img: U8) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encode_png(img))


def decode_png(data: bytes) -> U8:
    """Giải PNG do encode_png ghi (bộ lọc None, 8 bit). Dùng cho test và công cụ."""
    if data[:8] != SIG:
        raise ValueError("không phải PNG")
    pos, idat, w, h, color = 8, b"", 0, 0, 0
    while pos < len(data):
        (n,) = struct.unpack(">I", data[pos : pos + 4])
        kind, body = data[pos + 4 : pos + 8], data[pos + 8 : pos + 8 + n]
        (crc,) = struct.unpack(">I", data[pos + 8 + n : pos + 12 + n])
        if zlib.crc32(kind + body) & 0xFFFFFFFF != crc:
            raise ValueError(f"CRC sai ở chunk {kind!r}")
        if kind == b"IHDR":
            w, h, _, color = struct.unpack(">IIBB", body[:10])
        elif kind == b"IDAT":
            idat += body
        pos += 12 + n
    ch = 1 if color == 0 else 3
    raw = np.frombuffer(zlib.decompress(idat), dtype=np.uint8).reshape(h, w * ch + 1)
    out: U8 = raw[:, 1:].reshape((h, w) if ch == 1 else (h, w, 3)).copy()
    return out
