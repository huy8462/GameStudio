// ALG-CLI-01 (đồ thị), PSC-GEN-02 (băm), SCH-RTM-09 (chỉ mục cache): test đơn vị bộ điều phối.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readCacheIndex, recordStep } from './cache-index.js';
import { buildGraph, downstream, loadGraph } from './graph.js';
import { inputHash, outputHash, resolvePointer } from './hash.js';
import { FIXTURE_STEPS } from './test-fixtures.js';
import type { CacheIndexEntry, StepDef } from './types.js';

const tmps: string[] = [];
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'gs-orch-'));
  tmps.push(d);
  return d;
};
afterEach(() => {
  for (const d of tmps.splice(0)) rmSync(d, { recursive: true, force: true });
});

const def = (id: string, deps: string[] = [], extra: Partial<StepDef> = {}): StepDef => ({
  id,
  version: '1',
  deps,
  inputs: { dataPointers: [], files: [], params: {} },
  runner: 'node',
  entry: 'run.mjs',
  perZone: false,
  outputs: [],
  dir: '.',
  ...extra,
});

describe('graph', () => {
  it('loadGraph đọc bước mẫu, thứ tự tô-pô ổn định', () => {
    const g = loadGraph(FIXTURE_STEPS);
    if (!g.ok) throw new Error(g.error.message);
    expect(g.value.order).toEqual(['misc.note', 'terrain.base', 'zone.mark', 'pack.all']);
    expect(downstream(g.value, 'terrain.base')).toEqual(['terrain.base', 'zone.mark', 'pack.all']);
    expect(downstream(g.value, 'misc.note')).toEqual(['misc.note']);
  });

  it('bắt vòng, phụ thuộc thiếu, trùng id', () => {
    const cyc = buildGraph([def('a', ['c']), def('b', ['a']), def('c', ['b']), def('d')]);
    expect(!cyc.ok && cyc.error.code).toBe('cycle');
    expect(!cyc.ok && cyc.error.message).toMatch(/a, b, c/);
    const miss = buildGraph([def('a', ['x'])]);
    expect(!miss.ok && miss.error.code).toBe('missing_dep');
    const dup = buildGraph([def('a'), def('a')]);
    expect(!dup.ok && dup.error.code).toBe('duplicate');
  });

  it('step.json sai schema → lỗi schema có đường dẫn tương đối', () => {
    const d = tmp();
    mkdirSync(join(d, 'x'));
    writeFileSync(join(d, 'x', 'step.json'), JSON.stringify({ id: 'X', version: '1' }));
    const g = loadGraph(d);
    expect(!g.ok && g.error.code).toBe('schema');
    expect(!g.ok && g.error.path).toBe('x/step.json');
  });
});

describe('hash', () => {
  const data = {
    'world.json': {
      zones: [
        { id: 'z1', pos: [0, 0] },
        { id: 'z2', pos: [1, 2] },
      ],
      seed: 7,
    },
  };

  it("resolvePointer giải '*' và bỏ con trỏ không tồn tại", () => {
    expect(resolvePointer(data, '/world.json/zones/*/pos')).toEqual([
      ['/world.json/zones/0/pos', [0, 0]],
      ['/world.json/zones/1/pos', [1, 2]],
    ]);
    expect(resolvePointer(data, '/world.json/khong')).toEqual([]);
    expect(resolvePointer({ 'a/b.json': { x: 1 } }, '/a~1b.json/x')).toEqual([['/a~1b.json/x', 1]]);
  });

  it('inputHash bất biến thứ tự khoá, đổi khi seed/zone/version/params đổi', () => {
    const d = tmp();
    const s = def('w', [], { inputs: { dataPointers: ['/world.json'], files: [], params: { k: 1 } } });
    const base = { data, gameDir: d, upstream: {}, zone: null, tier: null, seed: 1, toolVersions: {} };
    const h = inputHash(s, base);
    expect(h).toMatch(/^sha256:[0-9a-f]{64}$/);
    const reordered = { 'world.json': { seed: 7, zones: data['world.json'].zones } };
    expect(inputHash(s, { ...base, data: reordered })).toBe(h);
    expect(inputHash(s, { ...base, seed: 2 })).not.toBe(h);
    expect(inputHash(s, { ...base, zone: 'z1' })).not.toBe(h);
    expect(inputHash({ ...s, version: '2' }, base)).not.toBe(h);
    expect(inputHash({ ...s, inputs: { ...s.inputs, params: { k: 2 } } }, base)).not.toBe(h);
  });

  it('outputHash bỏ report.json ở gốc, tính tệp con', () => {
    const d = tmp();
    mkdirSync(join(d, 'sub'));
    writeFileSync(join(d, 'a.txt'), 'a');
    writeFileSync(join(d, 'sub', 'b.txt'), 'b');
    const h1 = outputHash(d);
    expect(h1.files).toEqual(['a.txt', 'sub/b.txt']);
    writeFileSync(join(d, 'report.json'), '{"t":1}');
    expect(outputHash(d).hash).toBe(h1.hash);
    writeFileSync(join(d, 'sub', 'b.txt'), 'b2');
    expect(outputHash(d).hash).not.toBe(h1.hash);
  });
});

describe('cache-index', () => {
  const e = (step: string, zone?: string, n = 0): CacheIndexEntry => ({
    step,
    ...(zone ? { zone } : {}),
    inputHash: `sha256:${String(n).padStart(64, '0')}`,
    outputHash: `sha256:${'f'.repeat(64)}`,
    at: '2026-11-24T00:00:00.000Z',
    durationS: 1,
    ok: true,
  });

  it('thay mục cùng (bước, zone, tier), sắp ổn định, không để lại khoá/tệp tạm', () => {
    const b = tmp();
    recordStep(b, e('zone.mark', 'z2'));
    recordStep(b, e('terrain.base'));
    recordStep(b, e('zone.mark', 'z1'));
    recordStep(b, e('zone.mark', 'z2', 5));
    const idx = readCacheIndex(b);
    expect(idx.map((x) => `${x.step}@${x.zone ?? '-'}`)).toEqual(['terrain.base@-', 'zone.mark@z1', 'zone.mark@z2']);
    expect(idx[2]?.inputHash).toBe(`sha256:${'5'.padStart(64, '0')}`);
    expect(readCacheIndex(join(b, 'khong-co'))).toEqual([]);
  });

  it('tệp hỏng hoặc sai schema → []', () => {
    const b = tmp();
    mkdirSync(join(b, 'cache'));
    writeFileSync(join(b, 'cache', 'index.json'), '{hỏng');
    expect(readCacheIndex(b)).toEqual([]);
    writeFileSync(join(b, 'cache', 'index.json'), JSON.stringify([{ step: 'a' }]));
    expect(readCacheIndex(b)).toEqual([]);
  });
});
