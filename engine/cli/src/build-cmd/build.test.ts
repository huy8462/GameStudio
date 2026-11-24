// TST-CLI-02 (phần build), TC-INT-04, ERR-RTM-04, FR-CLI-03: guards và `engine build` qua runBuildCommand (T-0005).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validate } from '@gamestudio/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { EXIT } from '../exit-codes.js';
import { fakeClock, FIXTURE_STEPS } from '../orchestrator/test-fixtures.js';
import { briefStatus, engineSatisfies } from './guards.js';
import { runBuildCommand, type BuildCommandOptions } from './run.js';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '../../../../games/_template/data');
const HASH = `sha256:${'b'.repeat(64)}\n`;
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Game thử từ games/_template/data (hợp lệ schema), id 'thu-build'; brief: số bản và bản nào đã xác nhận. */
function game(o: { brief?: { v: number; confirmed: boolean }[]; patchGame?: Record<string, unknown> } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'gs-cmd-'));
  dirs.push(dir);
  cpSync(TEMPLATE, join(dir, 'data'), { recursive: true });
  const gp = join(dir, 'data', 'game.json');
  const g = JSON.parse(readFileSync(gp, 'utf8')) as Record<string, unknown>;
  writeFileSync(gp, JSON.stringify({ ...g, id: 'thu-build', ...o.patchGame }, null, 2));
  mkdirSync(join(dir, 'notes'));
  writeFileSync(join(dir, 'notes', 'a.txt'), 'a');
  for (const b of o.brief ?? [{ v: 1, confirmed: true }]) {
    mkdirSync(join(dir, 'brief', `v${b.v}`), { recursive: true });
    writeFileSync(join(dir, 'brief', `v${b.v}`, 'brief.json'), '{}');
    if (b.confirmed) writeFileSync(join(dir, 'brief', `v${b.v}`, 'hash.txt'), HASH);
  }
  return dir;
}

const cmd = (gameDir: string, o: Partial<BuildCommandOptions> = {}) =>
  runBuildCommand({
    gameDir,
    stepsDir: FIXTURE_STEPS,
    clock: fakeClock(),
    host: 'may-thu',
    engineVersion: '0.1.0',
    tool: { name: '@gamestudio/cli', version: '0.0.0' },
    concurrency: 2,
    ...o,
  });

describe('guards', () => {
  it('briefStatus: không có / bản lớn nhất chờ xác nhận / đã xác nhận', () => {
    expect(briefStatus(game({ brief: [] })).status).toBe('KhongCo');
    expect(
      briefStatus(
        game({
          brief: [
            { v: 1, confirmed: true },
            { v: 2, confirmed: false },
          ],
        }),
      ),
    ).toEqual({
      status: 'ChoXacNhan',
      version: 2,
    });
    expect(
      briefStatus(
        game({
          brief: [
            { v: 1, confirmed: false },
            { v: 10, confirmed: true },
          ],
        }),
      ),
    ).toEqual({
      status: 'DaXacNhan',
      version: 10,
    });
  });

  it.each([
    ['0.1.0', '0.1.0', true],
    ['0.1.0', '0.1.5', true],
    ['0.1.2', '0.1.1', false],
    ['0.1.0', '0.2.0', false],
    ['1.2.0', '1.9.0', true],
    ['1.2.0', '2.0.0', false],
    ['0.0.3', '0.0.4', false],
    ['1.0.0-beta.1', '1.0.0', true],
    ['abc', '0.1.0', false],
  ])('engineSatisfies(%s, %s) = %s', (req, cur, want) => {
    expect(engineSatisfies(req, cur)).toBe(want);
  });
});

describe('engine build (runBuildCommand)', () => {
  it('chưa có brief hoặc brief mới nhất chờ xác nhận → thoát 3, báo cáo ERR-INT-06 (TC-INT-04)', async () => {
    for (const brief of [
      [],
      [
        { v: 1, confirmed: true },
        { v: 2, confirmed: false },
      ],
    ]) {
      const dir = game({ brief });
      const r = await cmd(dir);
      expect(r.exit).toBe(EXIT.NEEDS_CONFIRM);
      expect(r.report.warnings[0]).toMatch(/^ERR-INT-06/);
      expect(existsSync(join(dir, 'build', 'cache'))).toBe(false);
      expect(
        validate('report', JSON.parse(readFileSync(join(dir, 'build', 'reports', 'build-all.json'), 'utf8'))),
      ).toEqual([]);
    }
  });

  it('dữ liệu sai schema → 4 (ERR-RTM-03); engineVersion không khớp → 4 (ERR-RTM-04)', async () => {
    const bad = await cmd(game({ patchGame: { language: 'fr' } }));
    expect(bad.exit).toBe(EXIT.DATA);
    expect(bad.report.warnings[0]).toMatch(/^ERR-RTM-03 .*game\.json\/language/);
    const ver = await cmd(game({ patchGame: { engineVersion: '0.2.0' } }));
    expect(ver.exit).toBe(EXIT.DATA);
    expect(ver.report.warnings[0]).toBe('ERR-RTM-04 Bản game cần engine ^0.2.0, hiện có 0.1.0.');
  });

  it('build đạt: thoát 0, build/reports/build-all.json hợp lệ; lần 2 toàn cache', async () => {
    const dir = game();
    const r1 = await cmd(dir);
    expect(r1.exit, r1.report.warnings.join('\n')).toBe(EXIT.OK);
    expect(r1.reportPath).toBe('reports/build-all.json');
    const onDisk: unknown = JSON.parse(readFileSync(join(dir, 'build', 'reports', 'build-all.json'), 'utf8'));
    expect(validate('report', onDisk)).toEqual([]);
    expect(r1.report.metrics).toEqual({ nodes: 4, ran: 4, cached: 0, error: 0, skipped: 0 });
    expect(r1.report.checks.map((c) => c.id)).toEqual(['misc.note@-', 'terrain.base@-', 'zone.mark@z1', 'pack.all@-']);
    const r2 = await cmd(dir);
    expect(r2.report.cached).toBe(true);
    expect(r2.report.metrics['cached']).toBe(4);
  });

  it('--zone ghi build-<zone>.json; thư mục bước chưa có → build rỗng thoát 0', async () => {
    const dir = game();
    expect((await cmd(dir, { zone: 'z1' })).reportPath).toBe('reports/build-z1.json');
    const empty = await cmd(dir, { stepsDir: join(dir, 'khong-co') });
    expect(empty.noSteps).toBe(true);
    expect(empty.exit).toBe(EXIT.OK);
    expect(empty.report.metrics['nodes']).toBe(0);
  });

  it('thiếu data/game.json → 4, không ghi báo cáo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gs-cmd-'));
    dirs.push(dir);
    const r = await cmd(dir);
    expect(r.exit).toBe(EXIT.DATA);
    expect(r.reportPath).toBeUndefined();
  });
});
