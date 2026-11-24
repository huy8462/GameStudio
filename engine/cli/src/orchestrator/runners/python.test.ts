// IF-CLI-02 (runner python): uv run python -I, dòng PROGRESS, report.json một phần, mã thoát, timeout (T-0005).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { EXIT } from '../../exit-codes.js';
import { loadGraph } from '../graph.js';
import { runBuild } from '../scheduler.js';
import { fakeClock, FIXTURE_STEPS, makeGame, type TempGame } from '../test-fixtures.js';
import type { StepGraph } from '../types.js';

const PY_STEPS = join(FIXTURE_STEPS, '..', 'py-steps');
const games: TempGame[] = [];
afterEach(() => {
  for (const g of games.splice(0)) g.cleanup();
});

/** Đồ thị py.echo với params.mode và timeoutS tuỳ chọn. */
function graph(mode: string, timeoutS?: number): StepGraph {
  const g = loadGraph(PY_STEPS);
  if (!g.ok) throw new Error(g.error.message);
  const s = g.value.steps.get('py.echo');
  if (!s) throw new Error('thiếu py.echo');
  const def = { ...s, inputs: { ...s.inputs, params: { mode } }, ...(timeoutS !== undefined ? { timeoutS } : {}) };
  return { steps: new Map([['py.echo', def]]), order: ['py.echo'] };
}

async function run(mode: string, timeoutS?: number) {
  const g = makeGame();
  games.push(g);
  const progress: string[] = [];
  const r = await runBuild({
    gameDir: g.dir,
    graph: graph(mode, timeoutS),
    clock: fakeClock(),
    host: 'may-thu',
    onProgress: (_s, _z, pct, msg) => progress.push(`${pct} ${msg}`),
  });
  return { r, progress, step: r.steps[0] };
}

describe('runner python', { timeout: 60_000 }, () => {
  it('chạy main.py qua uv, nhận PROGRESS, lấy result/metrics từ report.json của bước', async () => {
    const { r, progress, step } = await run('ok');
    expect(step?.status, step?.error).toBe('ran');
    expect(progress).toEqual(['10 doc ctx', '100 xong']);
    expect(readFileSync(join(step?.outDir ?? '', 'echo.txt'), 'utf8')).toMatch(/^Làng thử seed=\d+\n$/);
    const rep = JSON.parse(readFileSync(join(step?.outDir ?? '', 'report.json'), 'utf8')) as Record<string, unknown>;
    expect(rep).toMatchObject({
      schema: 'report/1',
      step: 'py.echo',
      result: 'warn',
      metrics: { chars: 8 },
      warnings: ['thu canh bao'],
    });
    expect(r.exit).toBe(EXIT.WARN);
  });

  it('thoát 4 giữ mã 4 kèm dòng stderr cuối; ngoại lệ Python → 10', async () => {
    const a = await run('exit4');
    expect(a.step?.status).toBe('error');
    expect(a.r.exit).toBe(EXIT.DATA);
    expect(a.step?.error).toMatch(/du lieu thieu/);
    const b = await run('crash');
    expect(b.r.exit).toBe(EXIT.UNCAUGHT);
    expect(b.step?.error).toMatch(/RuntimeError: loi thu/);
  });

  it('quá timeoutS → huỷ tiến trình, lỗi 10', async () => {
    const { r, step } = await run('sleep', 2);
    expect(step?.status).toBe('error');
    expect(step?.error).toMatch(/quá thời gian 2 s/);
    expect(r.exit).toBe(EXIT.UNCAUGHT);
  });
});
