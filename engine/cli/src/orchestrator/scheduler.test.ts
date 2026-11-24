// TST-CLI-01 (phần logic), PSC-CLI-01, IF-CLI-02, IF-CLI-03, SCH-RTM-05, 09: runBuild với các bước mẫu.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { validate } from '@gamestudio/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { EXIT } from '../exit-codes.js';
import { readCacheIndex } from './cache-index.js';
import { StepError, runNode } from './runners/node.js';
import { runBuild, type RunBuildOptions } from './scheduler.js';
import { fakeClock, FIXTURE_STEPS, GAME, makeGame, WORLD, type TempGame } from './test-fixtures.js';
import type { BuildOutcome } from './types.js';

let games: TempGame[] = [];
afterEach(() => {
  for (const g of games) g.cleanup();
  games = [];
});

const game = (over?: Parameters<typeof makeGame>[0]): TempGame => {
  const g = makeGame(over);
  games.push(g);
  return g;
};

const build = (g: TempGame, o: Partial<RunBuildOptions> = {}): Promise<BuildOutcome> =>
  runBuild({ gameDir: g.dir, stepsDir: FIXTURE_STEPS, clock: fakeClock(), host: 'may-thu', concurrency: 2, ...o });

const statusOf = (r: BuildOutcome): Record<string, string> =>
  Object.fromEntries(r.steps.map((s) => [`${s.step}@${s.zone ?? '-'}`, s.status]));

describe('runBuild', () => {
  it('lần 1 chạy mọi nút; lần 2 không đổi → toàn cache (TST-CLI-01)', async () => {
    const g = game();
    const r1 = await build(g);
    expect(r1.exit).toBe(EXIT.OK);
    expect(statusOf(r1)).toEqual({
      'misc.note@-': 'ran',
      'terrain.base@-': 'ran',
      'zone.mark@z1': 'ran',
      'zone.mark@z2': 'ran',
      'pack.all@-': 'ran',
    });
    const pack = r1.steps.find((s) => s.step === 'pack.all');
    expect(readFileSync(join(pack?.outDir ?? '', 'pack.txt'), 'utf8')).toMatch(/^zone\.mark@z1,zone\.mark@z2\n/);

    const r2 = await build(g);
    expect(r2.exit).toBe(EXIT.OK);
    expect(Object.values(statusOf(r2))).toEqual(Array(5).fill('cached'));
    expect(r2.steps.map((s) => s.outputHash)).toEqual(r1.steps.map((s) => s.outputHash));
  });

  it('report.json và cache/index.json đúng schema; report không vào outputHash', async () => {
    const g = game();
    const r = await build(g);
    for (const s of r.steps) {
      const rep: unknown = JSON.parse(readFileSync(join(s.outDir ?? '', 'report.json'), 'utf8'));
      expect(validate('report', rep)).toEqual([]);
      expect((rep as { outputHash: string }).outputHash).toBe(s.outputHash);
    }
    const idx = readCacheIndex(join(g.dir, 'build'));
    expect(validate('cacheIndex', idx)).toEqual([]);
    expect(idx.map((e) => `${e.step}@${e.zone ?? '-'}`)).toEqual([
      'misc.note@-',
      'pack.all@-',
      'terrain.base@-',
      'zone.mark@z1',
      'zone.mark@z2',
    ]);
  });

  it('đổi zones[*].pos → zone.mark chạy lại; đầu ra không đổi → pack.all cắt sớm từ cache', async () => {
    const g = game();
    await build(g);
    g.write('data/world.json', { ...WORLD, zones: [WORLD.zones[0], { id: 'z2', pos: [600, 0] }] });
    expect(statusOf(await build(g))).toEqual({
      'misc.note@-': 'cached',
      'terrain.base@-': 'cached',
      'zone.mark@z1': 'ran',
      'zone.mark@z2': 'ran',
      // zone.txt không chứa pos → outputHash zone.mark giữ nguyên → inputHash pack.all giữ nguyên.
      'pack.all@-': 'cached',
    });
  });

  it('đổi world.seed → mọi bước chạy lại (seed bước suy từ world.seed, QT-WLD-01)', async () => {
    const g = game();
    await build(g);
    g.write('data/world.json', { ...WORLD, seed: 8 });
    expect(Object.values(statusOf(await build(g)))).toEqual(Array(5).fill('ran'));
  });

  it('đổi tệp đầu vào hoặc lát dữ liệu riêng → chỉ misc.note chạy lại; dữ liệu khác lát không ảnh hưởng', async () => {
    const g = game();
    await build(g);
    g.write('notes/b.txt', 'thêm');
    expect(statusOf(await build(g))['misc.note@-']).toBe('ran');
    g.write('data/game.json', { ...GAME, title: 'Tên mới' });
    const r = await build(g);
    expect(Object.values(statusOf(r)).filter((s) => s === 'ran')).toHaveLength(1);
    g.write('data/game.json', { ...GAME, title: 'Tên mới', extra: 1 });
    expect(Object.values(statusOf(await build(g)))).toEqual(Array(5).fill('cached'));
  });

  it('cùng dữ liệu ở hai thư mục game → cùng inputHash và outputHash (tất định)', async () => {
    const [a, b] = [game(), game()];
    const [ra, rb] = [await build(a), await build(b, { concurrency: 1 })];
    expect(ra.steps.map((s) => [s.inputHash, s.outputHash])).toEqual(rb.steps.map((s) => [s.inputHash, s.outputHash]));
  });

  it('--force chạy lại mọi bước; --zone z1 chỉ zone z1', async () => {
    const g = game();
    await build(g);
    expect(Object.values(statusOf(await build(g, { force: true })))).toEqual(Array(5).fill('ran'));
    const rz = await build(g, { zone: 'z1' });
    expect(Object.keys(statusOf(rz))).toEqual(['misc.note@-', 'terrain.base@-', 'zone.mark@z1', 'pack.all@-']);
    expect(statusOf(rz)['pack.all@-']).toBe('ran'); // upstream chỉ còn một zone → inputHash khác
  });

  it('--step zone.mark: chạy bước đó + hạ nguồn, upstream lấy từ chỉ mục cache', async () => {
    const g = game();
    const before = await build(g, { step: 'zone.mark' });
    expect(before.exit).toBe(EXIT.DATA); // chưa build terrain.base
    await build(g);
    const r = await build(g, { step: 'zone.mark', force: true });
    expect(r.exit).toBe(EXIT.OK);
    expect(statusOf(r)).toEqual({ 'zone.mark@z1': 'ran', 'zone.mark@z2': 'ran', 'pack.all@-': 'ran' });
  });

  it('bước lỗi: nhánh phụ thuộc bị bỏ, nhánh độc lập vẫn chạy, mã thoát của lỗi', async () => {
    const g = game();
    const r = await build(g, {
      runners: {
        node: (step, ctx) =>
          step.id === 'terrain.base' ? Promise.reject(new StepError('tải DEM lỗi', EXIT.EXTERNAL)) : runNode(step, ctx),
      },
    });
    expect(statusOf(r)).toEqual({
      'misc.note@-': 'ran',
      'terrain.base@-': 'error',
      'zone.mark@z1': 'skipped',
      'zone.mark@z2': 'skipped',
      'pack.all@-': 'skipped',
    });
    expect(r.result).toBe('fail');
    expect(r.exit).toBe(EXIT.EXTERNAL);
    expect(readCacheIndex(join(g.dir, 'build')).map((e) => e.step)).toEqual(['misc.note']);
  });

  it('bước ném lỗi thường → mã 10; kết quả warn → thoát 1', async () => {
    const r = await build(game({ game: { ...GAME, title: 'loi' } }));
    expect(r.steps.find((s) => s.step === 'misc.note')?.status).toBe('error');
    expect(r.exit).toBe(EXIT.UNCAUGHT);
    const w = await build(game({ world: { seed: 7, zones: [{ id: 'z9', pos: [0, 0] }] } }));
    expect(w.result).toBe('warn');
    expect(w.exit).toBe(EXIT.WARN);
  });

  it('lỗi trước khi chạy: --step lạ, thiếu game.json id', async () => {
    expect((await build(game(), { step: 'khong.co' })).exit).toBe(EXIT.DATA);
    const r = await build(game({ game: { title: 'x' } }));
    expect(r.exit).toBe(EXIT.DATA);
    expect(r.error).toMatch(/game\.json/);
  });
});
