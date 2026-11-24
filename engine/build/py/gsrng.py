"""PCG32 và suy seed, bản Python (MOD-GEN-03, ALG-GEN-01, PSC-GEN-01).

Cùng thuật toán với `@gamestudio/rng` (TS). Kiểm chéo bằng `engine/shared/rng/vectors.json` (TST-GEN-02).
"""

from __future__ import annotations

import hashlib
from collections.abc import MutableSequence, Sequence
from typing import TypeVar

T = TypeVar("T")

MASK64 = (1 << 64) - 1
MASK32 = (1 << 32) - 1
MULT = 6364136223846793005


def derive_seed(*parts: str | int) -> int:
    """4 byte đầu SHA-256(parts nối bằng '|') theo big-endian, uint32."""
    text = "|".join(str(p) for p in parts)
    return int.from_bytes(hashlib.sha256(text.encode("utf-8")).digest()[:4], "big")


class Pcg32:
    """PCG32 XSH-RR, trạng thái 64 bit; khởi tạo theo pcg32_srandom_r với seed và stream uint32."""

    def __init__(self, seed: int, stream: int = 0) -> None:
        self._state = 0
        self._inc = (((stream & MASK32) << 1) | 1) & MASK64
        self._step()
        self._state = (self._state + (seed & MASK32)) & MASK64
        self._step()

    def _step(self) -> None:
        self._state = (self._state * MULT + self._inc) & MASK64

    def next_u32(self) -> int:
        old = self._state
        self._step()
        xorshifted = (((old >> 18) ^ old) >> 27) & MASK32
        rot = old >> 59
        return ((xorshifted >> rot) | (xorshifted << ((-rot) & 31))) & MASK32

    def float(self) -> float:
        """[0, 1)."""
        return self.next_u32() / 4294967296.0

    def randint(self, lo: int, hi: int) -> int:
        """Số nguyên trong [lo, hi] (đóng hai đầu), không lệch. Tương ứng `int(min, max)` của bản TS."""
        if hi < lo:
            raise ValueError("int(lo, hi): cần lo <= hi")
        rng = (hi - lo + 1) & MASK32
        if rng == 0:
            return lo + self.next_u32()
        threshold = ((-rng) & MASK32) % rng
        while True:
            r = self.next_u32()
            if r >= threshold:
                return lo + (r % rng)

    def pick(self, items: Sequence[T]) -> T:
        if not items:
            raise ValueError("pick: danh sách rỗng")
        return items[self.randint(0, len(items) - 1)]

    def shuffle_in_place(self, items: MutableSequence[T]) -> None:
        for i in range(len(items) - 1, 0, -1):
            j = self.randint(0, i)
            items[i], items[j] = items[j], items[i]

    def fork(self, name: str) -> Pcg32:
        """Luồng con: tiêu thụ đúng một giá trị của luồng cha (PSC-GEN-01)."""
        return Pcg32(derive_seed(self.next_u32(), name), derive_seed(name))

    def state(self) -> tuple[int, int]:
        """(state, inc), chỉ dùng cho test."""
        return self._state, self._inc
