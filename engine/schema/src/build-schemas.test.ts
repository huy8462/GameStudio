// IF-CLI-02 (step/1), SCH-RTM-05 (report/1), SCH-RTM-09 (cache-index/1): schema build (T-0004).
import { describe, expect, it } from 'vitest';

import { BUILD_KINDS, validate } from './validate.js';

const H = `sha256:${'a'.repeat(64)}`;

const STEP = {
  id: 'world.fetch',
  version: '1',
  deps: [],
  inputs: { dataPointers: ['/world.json/source', '/world.json/bbox'], files: [], params: {} },
  runner: 'python',
  entry: 'fetch.py',
  perZone: false,
  outputs: ['dem.tif'],
  tools: ['python'],
  timeoutS: 600,
};

const REPORT = {
  schema: 'report/1',
  kind: 'build',
  step: 'vegetation',
  gameId: 'lang-que',
  zone: 'z1',
  tier: 'vua',
  inputHash: H,
  cached: false,
  startedAt: '2026-11-22T10:00:00Z',
  durationS: 182.4,
  seed: 3117254481,
  metrics: { drawCalls: 104 },
  budget: { drawCalls: 120 },
  result: 'pass',
  checks: [{ id: 'drawCalls', result: 'warn', value: 104, limit: 120 }],
  warnings: [],
  artifacts: ['qa/z1/view-03.png'],
  summary: 'z1 tier vua: Pass 4/5',
  tool: { name: '@gamestudio/cli', version: '0.0.0' },
  host: 'may-dev',
};

const INDEX = [
  {
    step: 'terrain.mesh',
    zone: 'z1',
    tier: 'vua',
    inputHash: H,
    outputHash: H,
    at: '2026-11-24T00:00:00.000Z',
    durationS: 3,
    ok: true,
  },
];

describe('schema build', () => {
  it('BUILD_KINDS = step, report, cacheIndex, status, import', () => {
    expect(BUILD_KINDS).toEqual(['step', 'report', 'cacheIndex', 'status', 'import']);
  });

  it('mẫu hợp lệ', () => {
    expect(validate('step', STEP)).toEqual([]);
    expect(validate('report', REPORT)).toEqual([]);
    expect(validate('cacheIndex', INDEX)).toEqual([]);
    expect(validate('cacheIndex', [])).toEqual([]);
  });

  it.each([
    ['step', { ...STEP, id: 'World.Fetch' }, '/id'],
    ['step', { ...STEP, runner: 'bash' }, '/runner'],
    ['step', { ...STEP, inputs: { ...STEP.inputs, dataPointers: ['world.json/source'] } }, '/inputs/dataPointers/0'],
    ['step', { ...STEP, extra: 1 }, '/'],
    ['report', { ...REPORT, schema: 'report/2' }, '/schema'],
    ['report', { ...REPORT, result: 'ok' }, '/result'],
    ['report', { ...REPORT, inputHash: 'abc' }, '/inputHash'],
    ['report', { ...REPORT, startedAt: '22/11/2026' }, '/startedAt'],
    ['cacheIndex', [{ ...INDEX[0], ok: false }], '/0/ok'],
    ['cacheIndex', [{ ...INDEX[0], tier: 'sieu' }], '/0/tier'],
  ] as const)('%s sai → lỗi tại %s', (kind, data, path) => {
    const errs = validate(kind, data);
    expect(errs.map((e) => e.instancePath)).toContain(path === '/' ? '/' : path);
  });
});
