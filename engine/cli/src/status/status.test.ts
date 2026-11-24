// T-0014: engine status + build --stale với bước mẫu (FR-CLI-08, 09; PSC-CLI-04, 05; TST-CLI-05 phần logic; AC-CR01-04 dạng mẫu).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validate } from '@gamestudio/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { runBuildCommand } from '../build-cmd/run.js';
import { EXIT } from '../exit-codes.js';
import { inputHash } from '../orchestrator/hash.js';
import { planStaleFs } from '../orchestrator/stale.js';
import { fakeClock, FIXTURE_STEPS, makeGame, type TempGame } from '../orchestrator/test-fixtures.js';
import type { StepDef } from '../orchestrator/types.js';
import { runStatus } from './run-status.js';

let games: TempGame[] = [];
afterEach(() => {
  games.forEach((g) => g.cleanup());
  games = [];
});

const TPL = join(dirname(fileURLToPath(import.meta.url)), '../../../../games/_template/data');
const tpl = (f: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(TPL, f), 'utf8')) as Record<string, unknown>;
const sq = (x0: number, z0: number, s: number) => [
  [x0, z0],
  [x0 + s, z0],
  [x0 + s, z0 + s],
  [x0, z0 + s],
];
/** world.json hợp lệ schema với 2 zone (z2 đổi được seed). */
const world = (z2seed = 2) => ({
  ...tpl('world.json'),
  zones: [
    { id: 'z1', seed: 1, polygon: sq(-250, -250, 250), neighbors: ['z2'] },
    { id: 'z2', seed: z2seed, polygon: sq(0, -250, 250), neighbors: ['z1'] },
  ],
});

/** Game hợp lệ schema (qua guard engine build) từ games/_template, brief đã xác nhận, bước mẫu fixtures/steps. */
function game(): TempGame {
  const g = makeGame({ game: { ...tpl('game.json'), id: 'thu-status' }, world: world() });
  games.push(g);
  mkdirSync(join(g.dir, 'brief', 'v1'), { recursive: true });
  writeFileSync(join(g.dir, 'brief', 'v1', 'hash.txt'), `sha256:${'e'.repeat(64)}\n`);
  return g;
}

const build = (g: TempGame, o: { stale?: boolean; dryRun?: boolean } = {}) =>
  runBuildCommand({
    gameDir: g.dir,
    stepsDir: FIXTURE_STEPS,
    clock: fakeClock(),
    host: 'may-thu',
    engineVersion: '0.1.0',
    tool: { name: '@gamestudio/cli', version: '0.0.0' },
    concurrency: 2,
    ...o,
  });
const ran = (r: Awaited<ReturnType<typeof build>>) =>
  r.outcome.steps.map((s) => `${s.step}@${s.zone ?? '-'}:${s.status}`);
const status = (g: TempGame) => {
  const r = runStatus({ gameDir: g.dir, stepsDir: FIXTURE_STEPS, engineVersion: '0.1.0' });
  if (!r.ok) throw new Error(r.message);
  return r;
};

describe('planStaleFs (dùng đúng công thức băm của build)', () => {
  it('trước build: mọi nút never; sau build: không có gì cũ', async () => {
    const g = game();
    const before = planStaleFs({ gameDir: g.dir, stepsDir: FIXTURE_STEPS });
    expect(before.ok && before.value.items.map((i) => i.reason)).toEqual(Array(5).fill('never'));
    expect((await build(g)).exit).toBe(EXIT.OK);
    const after = planStaleFs({ gameDir: g.dir, stepsDir: FIXTURE_STEPS });
    expect(after.ok && after.value.items).toEqual([]);
  });
});

describe('engine status + build --stale', () => {
  it('đổi z2 → status CanBuild chỉ z2; --dry-run liệt kê; --stale chỉ chạy nút cũ; sau đó hết cũ', async () => {
    const g = game();
    const s0 = status(g);
    expect(s0.report.stage).toBe('ChuaBuild');
    expect(s0.report.next).toMatchObject({ action: 'build', args: '--stale' });
    expect(validate('status', s0.report)).toEqual([]);

    expect((await build(g)).exit).toBe(EXIT.OK);
    expect(status(g).report.stage).toBe('ChuaQA'); // chưa có QA (engine qa: phiếu sau)

    g.write('data/world.json', world(9));
    const s1 = status(g);
    expect(s1.report.stage).toBe('CanBuild');
    expect(s1.report.zones.map((z) => `${z.id}:${z.staleSteps.join('+')}`)).toEqual([
      'z1:pack.all',
      'z2:zone.mark+pack.all',
    ]);
    expect(s1.report.next.args).toBe('--stale');
    expect(s1.summary.length).toBeLessThanOrEqual(6);

    const dry = await build(g, { stale: true, dryRun: true });
    expect(dry.exit).toBe(EXIT.OK);
    expect(dry.stalePlan?.items.map((i) => `${i.key}:${i.reason}`)).toEqual([
      'zone.mark@z2:input_changed',
      'pack.all@-:upstream_stale',
    ]);
    expect(dry.outcome.steps).toEqual([]); // không chạy gì

    const r = await build(g, { stale: true });
    expect(r.exit).toBe(EXIT.OK);
    // pack.all nằm trong kế hoạch nhưng đầu ra zone.mark@z2 không đổi → inputHash trùng → cache (QT-GEN-11).
    expect(ran(r)).toEqual(['zone.mark@z2:ran', 'pack.all@-:cached']);
    expect(status(g).report.zones.every((z) => z.staleSteps.length === 0)).toBe(true);

    const none = await build(g, { stale: true });
    expect(ran(none)).toEqual([]);
  });

  it('brief chờ xác nhận → ChoXacNhanBrief; phiên tạo game còn câu hỏi → pendingIntake', () => {
    const g = makeGame({ game: { ...tpl('game.json'), id: 'thu-status' }, world: world() });
    games.push(g);
    mkdirSync(join(g.dir, '.intake', 's-1'), { recursive: true });
    writeFileSync(
      join(g.dir, '.intake', 's-1', 'session.json'),
      JSON.stringify({ status: 'ChoTraLoi', questions: [{}, {}] }),
    );
    const r = status(g).report;
    expect(r).toMatchObject({
      stage: 'TaoMoi',
      pendingIntake: { sessionId: 's-1', pendingQuestions: 2 },
      next: { action: 'answer' },
    });
  });
});

describe('inputHash: upstream nhiều zone (sửa lỗi T-0004)', () => {
  it('bước toàn cục phụ thuộc bước perZone: đổi đầu ra một zone → inputHash đổi', () => {
    const def: StepDef = {
      id: 'pack.all',
      version: '1',
      deps: ['zone.mark'],
      inputs: { dataPointers: [], files: [], params: {} },
      runner: 'node',
      entry: 'x',
      perZone: false,
      outputs: [],
      dir: '.',
    };
    const base = { data: {}, gameDir: '.', zone: null, tier: null, seed: 1, toolVersions: {} };
    const a = inputHash(def, {
      ...base,
      upstream: { 'zone.mark@z1': { outputHash: 'A' }, 'zone.mark@z2': { outputHash: 'B' } },
    });
    const b = inputHash(def, {
      ...base,
      upstream: { 'zone.mark@z1': { outputHash: 'A' }, 'zone.mark@z2': { outputHash: 'C' } },
    });
    expect(a).not.toBe(b);
  });
});
