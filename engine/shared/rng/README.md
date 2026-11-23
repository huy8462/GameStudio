# @gamestudio/rng

RNG tất định dùng chung build, runtime, test (MOD-GEN-10; ALG-GEN-01; PSC-GEN-01).

```ts
import { Pcg32, deriveSeed } from '@gamestudio/rng';
const rng = new Pcg32(deriveSeed(world.seed, 'vegetation', zoneId, localSeed));
const veg = rng.fork('tree-placement'); // tiêu thụ đúng 1 giá trị của luồng cha
veg.int(0, 9); veg.float(); veg.pick(list); veg.shuffleInPlace(arr);
```

- `Pcg32(seed, stream=0)`: PCG32 XSH-RR, khởi tạo như `pcg32_srandom_r` (seed, stream là uint32). Trạng thái 64 bit lưu bằng hai uint32, không cấp phát `BigInt` trong vòng nóng.
- `deriveSeed(...parts)`: 4 byte đầu SHA-256(`parts.join('|')`) big-endian, uint32 (SHA-256 đồng bộ `@noble/hashes`, chạy được trong trình duyệt).
- `int(min, max)` đóng hai đầu, không lệch (loại mẫu dưới ngưỡng).
- Thứ tự gọi `fork` là một phần của tất định: mỗi hệ thống `fork` một lần khi `init`.
- Không có I/O, không `node:*`: dùng được trong `engine/runtime`.

## Bản Python và vector chuẩn

- `engine/build/py/gsrng.py`: cùng thuật toán (MOD-GEN-03).
- `vectors.json`: 5 seed × 1.000 giá trị, `int`, `deriveSeed`, `fork`; sinh bằng `uv run python engine/build/py/gen_rng_vectors.py`. Vitest và pytest cùng đọc (TST-GEN-02). Cả hai bản cũng khớp 6 giá trị đầu của `pcg32-demo` gốc (seed 42, stream 54).
- Đổi thuật toán = phiếu riêng, sinh lại `vectors.json`, mọi `inputHash` build đổi theo.
