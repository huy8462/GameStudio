// MOD-GEN-04, 05; TST-GEN-03 (băm bất biến thứ tự khoá).
import { describe, expect, it } from 'vitest';

import { dataHash, jsonHash, sha256Hex } from './hash.js';
import { canonicalize, JcsError } from './jcs.js';

describe('canonicalize (RFC 8785)', () => {
  it('sắp khoá theo đơn vị mã UTF-16, không khoảng trắng', () => {
    expect(canonicalize({ b: 1, a: [true, null, 'x'], A: {} })).toBe('{"A":{},"a":[true,null,"x"],"b":1}');
    // "é" (U+00E9) đứng sau "z" theo đơn vị mã; localeCompare sẽ xếp khác.
    expect(canonicalize({ z: 1, é: 2, a: 3 })).toBe('{"a":3,"z":1,"é":2}');
  });

  it('số theo ECMAScript; -0 thành 0', () => {
    expect(canonicalize([1, 1.5, -0, 1e21, 1e-7, 0.1 + 0.2, 100])).toBe('[1,1.5,0,1e+21,1e-7,0.30000000000000004,100]');
  });

  it('chuỗi escape tối thiểu, giữ Unicode', () => {
    expect(canonicalize('a"b\\c\n\u0001làng €')).toBe('"a\\"b\\\\c\\n\\u0001làng €"');
  });

  it('bỏ khoá undefined; từ chối NaN, Infinity, undefined trong mảng, kiểu lạ', () => {
    expect(canonicalize({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(() => canonicalize({ a: NaN })).toThrow(JcsError);
    expect(() => canonicalize([Infinity])).toThrow(JcsError);
    expect(() => canonicalize([undefined])).toThrow(/\$\[0\]/);
    expect(() => canonicalize({ d: new Date(0) })).toThrow(JcsError);
    expect(() => canonicalize(10n)).toThrow(JcsError);
  });
});

describe('băm', () => {
  it('sha256Hex khớp vector chuẩn', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex(new Uint8Array())).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('jsonHash không đổi khi đổi thứ tự khoá, đổi khi đổi giá trị (TST-GEN-03)', () => {
    const a = { tools: ['blender@5.2.4', 'ktx@4.4.2'], step: 'terrain.erode', params: { iter: 40, rate: 0.3 } };
    const b = { params: { rate: 0.3, iter: 40 }, step: 'terrain.erode', tools: ['blender@5.2.4', 'ktx@4.4.2'] };
    expect(jsonHash(a)).toBe(jsonHash(b));
    expect(jsonHash({ ...a, tools: ['blender@5.2.5', 'ktx@4.4.2'] })).not.toBe(jsonHash(a));
  });

  it('dataHash không phụ thuộc thứ tự tệp và khoá', () => {
    const h1 = dataHash({ 'world.json': { seed: 1, z: [1] }, 'game.json': { id: 'g' } });
    const h2 = dataHash({ 'game.json': { id: 'g' }, 'world.json': { z: [1], seed: 1 } });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(dataHash({ 'game.json': { id: 'h' }, 'world.json': { seed: 1, z: [1] } })).not.toBe(h1);
  });
});
