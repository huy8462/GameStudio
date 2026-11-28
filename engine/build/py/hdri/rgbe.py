"""Đọc/ghi Radiance `.hdr` (RGBE, có RLE kiểu mới) bằng thư viện chuẩn + numpy (T-0025; PSC-AST-10).

Chỉ hỗ trợ `-Y H +X W` (hướng thường gặp của HDRI Poly Haven). EXR chưa hỗ trợ: tải bản `.hdr`.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import numpy.typing as npt

F32 = npt.NDArray[np.float32]


class HdrError(ValueError):
    pass


def _header(data: bytes) -> tuple[int, int, int]:
    """(width, height, vị trí bắt đầu điểm ảnh)."""
    if not (data.startswith(b"#?RADIANCE") or data.startswith(b"#?RGBE")):
        raise HdrError("không phải tệp Radiance .hdr")
    pos = 0
    fmt_ok = False
    while True:
        end = data.index(b"\n", pos)
        line = data[pos:end].strip()
        pos = end + 1
        if line.startswith(b"FORMAT="):
            fmt_ok = line == b"FORMAT=32-bit_rle_rgbe"
        if line == b"":
            break
    if not fmt_ok:
        raise HdrError("chỉ hỗ trợ FORMAT=32-bit_rle_rgbe")
    end = data.index(b"\n", pos)
    parts = data[pos:end].split()
    if len(parts) != 4 or parts[0] != b"-Y" or parts[2] != b"+X":
        raise HdrError(f"hướng ảnh chưa hỗ trợ: {data[pos:end]!r}")
    return int(parts[3]), int(parts[1]), end + 1


def _scanline_rle(data: bytes, pos: int, w: int) -> tuple[bytes, int]:
    """Một hàng RLE kiểu mới: 4 kênh lần lượt. Trả (w·4 byte xếp theo kênh, vị trí mới)."""
    if data[pos + 2] << 8 | data[pos + 3] != w:
        raise HdrError("độ rộng hàng RLE sai")
    pos += 4
    chans: list[bytes] = []
    for _ in range(4):
        buf = bytearray()
        while len(buf) < w:
            count = data[pos]
            if count > 128:
                buf += bytes([data[pos + 1]]) * (count - 128)
                pos += 2
            else:
                buf += data[pos + 1 : pos + 1 + count]
                pos += 1 + count
        if len(buf) != w:
            raise HdrError("hàng RLE tràn")
        chans.append(bytes(buf))
    return b"".join(chans), pos


def read_hdr(path: Path) -> F32:
    """Ảnh (H, W, 3) float32 tuyến tính."""
    data = path.read_bytes()
    w, h, pos = _header(data)
    rgbe = np.empty((h, w, 4), dtype=np.uint8)
    for y in range(h):
        if 8 <= w < 32768 and data[pos] == 2 and data[pos + 1] == 2 and data[pos + 2] < 128:
            line, pos = _scanline_rle(data, pos, w)
            rgbe[y] = np.frombuffer(line, dtype=np.uint8).reshape(4, w).T
        else:
            rgbe[y] = np.frombuffer(data[pos : pos + 4 * w], dtype=np.uint8).reshape(w, 4)
            pos += 4 * w
    e = rgbe[..., 3].astype(np.int32)
    scale = np.where(e == 0, 0.0, np.ldexp(1.0, e - 136)).astype(np.float64)
    out: F32 = (rgbe[..., :3].astype(np.float64) * scale[..., None]).astype(np.float32)
    return out


def write_hdr(path: Path, img: npt.NDArray[np.floating]) -> None:
    """Ghi phẳng (không RLE); đủ cho test và ảnh xem trước."""
    f = np.asarray(img, dtype=np.float64)
    h, w = f.shape[:2]
    m = f.max(axis=-1)
    mant, exp = np.frexp(m)
    scale = np.where(m > 1e-32, mant * 256.0 / np.where(m > 1e-32, m, 1.0), 0.0)
    rgbe = np.zeros((h, w, 4), dtype=np.uint8)
    rgbe[..., :3] = np.clip(np.floor(f * scale[..., None]), 0, 255).astype(np.uint8)
    rgbe[..., 3] = np.where(m > 1e-32, exp + 128, 0).astype(np.uint8)
    head = f"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {h} +X {w}\n".encode("ascii")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(head + rgbe.tobytes())
