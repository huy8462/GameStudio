// TST-GEN-02 / TC-GEN-02: TS khớp vector chuẩn (sinh từ bản Python) và vector tham chiếu pcg32 gốc.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { Pcg32, deriveSeed } from './index.js';

interface Vectors {
  sequences: { seed: number; stream: number; u32: number[] }[];
  ints: { seed: number; stream: number; cases: { min: number; max: number; values: number[] }[] };
  shuffle: { seed: number; stream: number; cases: { n: number; result: number[] }[] };
  pick: { seed: number; stream: number; items: number[]; values: number[] };
  deriveSeed: { parts: (string | number)[]; value: number }[];
  fork: { parent: { seed: number; stream: number }; id: string; parentNextAfterFork: number; child: number[] };
}

const V = JSON.parse(readFileSync(new URL('../vectors.json', import.meta.url), 'utf8')) as Vectors;
const take = (r: Pcg32, n: number): number[] => Array.from({ length: n }, () => r.nextU32());

describe('Pcg32', () => {
  it('khớp pcg32-demo gốc: srandom(42, 54)', () => {
    expect(take(new Pcg32(42, 54), 6)).toEqual([
      0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e,
    ]);
  });

  it.each(V.sequences.map((s) => [`${s.seed}/${s.stream}`, s] as const))('TS = Python, 1.000 giá trị: %s', (_n, s) => {
    expect(take(new Pcg32(s.seed, s.stream), s.u32.length)).toEqual(s.u32);
  });

  it('int(min, max) khớp Python, nằm trong khoảng; min > max ném lỗi', () => {
    const r = new Pcg32(V.ints.seed, V.ints.stream);
    for (const c of V.ints.cases) {
      const got = Array.from({ length: c.values.length }, () => r.int(c.min, c.max));
      expect(got).toEqual(c.values);
    }
    expect(() => r.int(3, 2)).toThrow(RangeError);
  });

  it('fork tiêu thụ đúng một giá trị của luồng cha', () => {
    const p = new Pcg32(V.fork.parent.seed, V.fork.parent.stream);
    const c = p.fork(V.fork.id);
    expect(p.nextU32()).toBe(V.fork.parentNextAfterFork);
    expect(take(c, 10)).toEqual(V.fork.child);
  });

  it('float trong [0,1), shuffle hoán vị, pick', () => {
    const r = new Pcg32(9, 9);
    for (let i = 0; i < 1000; i++) {
      const f = r.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
    const a = Array.from({ length: 20 }, (_, i) => i);
    r.shuffleInPlace(a);
    expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(r.pick(['a'])).toBe('a');
    expect(() => r.pick([])).toThrow(RangeError);
  });

  it('shuffle và pick khớp vector Python (TS = Python = C#)', () => {
    const r = new Pcg32(V.shuffle.seed, V.shuffle.stream);
    for (const c of V.shuffle.cases) {
      const a = Array.from({ length: c.n }, (_, i) => i);
      r.shuffleInPlace(a);
      expect(a).toEqual(c.result);
    }
    const p = new Pcg32(V.pick.seed, V.pick.stream);
    expect(V.pick.values.map(() => p.pick(V.pick.items))).toEqual(V.pick.values);
  });

  it('state() trả trạng thái 64 bit cho test', () => {
    const s = new Pcg32(42, 54).state();
    expect(s.inc).toBe(109n);
    expect(typeof s.state).toBe('bigint');
  });
});

describe('deriveSeed', () => {
  it('TS = Python cho mọi ca; số và chuỗi cùng biểu diễn cho cùng seed', () => {
    for (const c of V.deriveSeed) expect(deriveSeed(...c.parts)).toBe(c.value);
    expect(deriveSeed('42', 'vegetation', 'z1', '7')).toBe(deriveSeed(42, 'vegetation', 'z1', 7));
  });
});
