// PCG32 XSH-RR (MOD-GEN-01, ALG-GEN-01, PSC-GEN-01). Trạng thái 64 bit lưu bằng hai uint32 (hi/lo),
// nhân 64 bit bằng tách 16 bit để không cấp phát BigInt trong vòng nóng (FR-RTM-23).
import { deriveSeed } from './derive-seed.js';

// MULT = 6364136223846793005 = 0x5851F42D_4C957F2D
const M_HI = 0x5851f42d;
const M_LO = 0x4c957f2d;

/** (aHi:aLo) * (bHi:bLo) mod 2^64 → [hi, lo]. */
function mul64(aHi: number, aLo: number, bHi: number, bLo: number): [number, number] {
  const a0 = aLo & 0xffff;
  const a1 = aLo >>> 16;
  const b0 = bLo & 0xffff;
  const b1 = bLo >>> 16;
  const p00 = a0 * b0;
  const p01 = a0 * b1;
  const p10 = a1 * b0;
  const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff);
  const lo = ((mid & 0xffff) << 16) | (p00 & 0xffff);
  const carry = (mid >>> 16) + (p01 >>> 16) + (p10 >>> 16) + a1 * b1;
  const hi = (carry + Math.imul(aHi, bLo) + Math.imul(aLo, bHi)) >>> 0;
  return [hi, lo >>> 0];
}

/** (aHi:aLo) + (bHi:bLo) mod 2^64 → [hi, lo]. */
function add64(aHi: number, aLo: number, bHi: number, bLo: number): [number, number] {
  const lo = (aLo + bLo) >>> 0;
  const c = lo < aLo >>> 0 ? 1 : 0;
  return [(aHi + bHi + c) >>> 0, lo];
}

export class Pcg32 {
  private sHi = 0;
  private sLo = 0;
  private readonly iHi: number;
  private readonly iLo: number;

  /** Khởi tạo như pcg32_srandom_r(seed, stream); seed, stream là uint32. */
  constructor(seed: number, stream = 0) {
    const st = stream >>> 0;
    // inc = (stream << 1) | 1 trên 64 bit.
    this.iHi = st >>> 31;
    this.iLo = ((st << 1) | 1) >>> 0;
    this.step();
    [this.sHi, this.sLo] = add64(this.sHi, this.sLo, 0, seed >>> 0);
    this.step();
  }

  private step(): void {
    const [mh, ml] = mul64(this.sHi, this.sLo, M_HI, M_LO);
    [this.sHi, this.sLo] = add64(mh, ml, this.iHi, this.iLo);
  }

  nextU32(): number {
    const oHi = this.sHi;
    const oLo = this.sLo;
    this.step();
    // xorshifted = uint32(((old >> 18) ^ old) >> 27)
    const xHi = (oHi >>> 18) ^ oHi;
    const xLo = ((oLo >>> 18) | (oHi << 14)) ^ oLo;
    const xorshifted = ((xLo >>> 27) | (xHi << 5)) >>> 0;
    const rot = oHi >>> 27;
    return ((xorshifted >>> rot) | (xorshifted << (-rot & 31))) >>> 0;
  }

  /** [0, 1). */
  float(): number {
    return this.nextU32() / 4294967296;
  }

  /** Số nguyên trong [min, max] (đóng hai đầu), không lệch. */
  int(min: number, max: number): number {
    if (max < min) throw new RangeError('int(min, max): cần min <= max');
    const range = (max - min + 1) >>> 0;
    if (range === 0) return min + this.nextU32();
    const threshold = (4294967296 - range) % range;
    for (;;) {
      const r = this.nextU32();
      if (r >= threshold) return min + (r % range);
    }
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new RangeError('pick: mảng rỗng');
    return arr[this.int(0, arr.length - 1)] as T;
  }

  shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const t = arr[i] as T;
      arr[i] = arr[j] as T;
      arr[j] = t;
    }
  }

  /** Luồng con: tiêu thụ đúng một giá trị của luồng cha (PSC-GEN-01). */
  fork(id: string): Pcg32 {
    return new Pcg32(deriveSeed(this.nextU32(), id), deriveSeed(id));
  }

  /** Chỉ dùng cho test. */
  state(): { state: bigint; inc: bigint } {
    return {
      state: (BigInt(this.sHi) << 32n) | BigInt(this.sLo),
      inc: (BigInt(this.iHi) << 32n) | BigInt(this.iLo),
    };
  }
}
