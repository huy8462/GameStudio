// TST-CLI-07, TC-INT-17, AC-CR01-02: engine import (thư mục/zip) → import/1; thiếu brief → brief nháp qua handoff →
// build thoát 3 (ERR-INT-06) → brief confirm → build qua. Chặn (không ghi gì): thiếu game.json, zip có ../, --into lệch,
// thiếu world.json (ERR-INT-09, không có req mô hình), đuôi tệp lạ, symlink/junction.
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';

import { validate } from '@gamestudio/schema';
import { afterAll, describe, expect, it } from 'vitest';

import { runReverseBrief } from '../brief/run-reverse.js';
import { runBuildCommand } from '../build-cmd/run.js';
import { EXIT } from '../exit-codes.js';
import { fakeClock } from '../orchestrator/test-fixtures.js';
import { runImport } from './run.js';
import { readZip } from './zip.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = (p: string): string => {
  const d = mkdtempSync(join(tmpdir(), p));
  dirs.push(d);
  return d;
};

/** Game nguồn: dữ liệu mẫu + 1 loài + 1 NPC + 1 asset thiếu provenance + 1 asset có provenance + build/ (bỏ qua). */
function makeSource(): string {
  const src = tmp('gs-import-src-');
  cpSync(join(ROOT, 'games/_template/data'), join(src, 'data'), { recursive: true });
  const put = (rel: string, v: string | object): void => {
    mkdirSync(dirname(join(src, rel)), { recursive: true });
    writeFileSync(join(src, rel), typeof v === 'string' ? v : JSON.stringify(v));
  };
  put('data/entities/animals/trau.json', { id: 'trau', species: 'trâu', count: 2 });
  put('data/entities/npc/ong-ba.json', { id: 'ong-ba', name: 'Ông Ba', role: 'nông dân', count: 1 });
  put('assets/imported/nha.glb', 'glb');
  put('assets/imported/cay.glb', 'glb');
  put('assets/imported/cay.glb.provenance.json', { source: 'cc0' });
  put('scripts/hello.ts', 'export {};');
  put('build/cache/x.bin', 'x');
  return src;
}

const PROSE = {
  fields: {
    genre: { value: 'khám phá', sources: ['game.json#/title'] },
    artStyle: { value: 'low-poly', sources: ['world.json#/postFx'] },
    coreLoop: { value: ['dạo', 'chăn trâu', 'trò chuyện'], sources: ['entities/npc/ong-ba.json#/name'] },
    player: { value: 'cậu bé', sources: ['game.json#/title'] },
    'setting.place': { value: 'làng quê', sources: ['world.json#/procedural/preset'] },
    'setting.era': { value: 'hiện đại', sources: ['game.json#/title'] },
    'setting.season': { value: 'hè', sources: ['world.json#/weather'] },
  },
};

function respond(cwd: string, reqFile: string, data: unknown): string {
  const req = JSON.parse(readFileSync(join(cwd, reqFile), 'utf8')) as { n: number; task: string };
  writeFileSync(
    join(cwd, reqFile.replace('req-', 'res-')),
    JSON.stringify({
      schema: 'intake-handoff/1',
      n: req.n,
      data,
      answeredBy: 'claude-code',
      at: '2026-11-24T00:00:00Z',
    }),
  );
  return req.task;
}

/** Zip "stored" tối thiểu (tên tuỳ ý, kể cả '../') để thử bộ đọc. */
function makeZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const cens: Buffer[] = [];
  let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const n = Buffer.from(name, 'utf8');
    const d = Buffer.from(text, 'utf8');
    const crc = crc32(d);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0);
    l.writeUInt16LE(0x0800, 6);
    l.writeUInt32LE(crc, 14);
    l.writeUInt32LE(d.length, 18);
    l.writeUInt32LE(d.length, 22);
    l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(d.length, 20);
    c.writeUInt32LE(d.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(off, 42);
    locals.push(l, n, d);
    cens.push(c, n);
    off += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(cens);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0);
  e.writeUInt16LE(Object.keys(files).length, 8);
  e.writeUInt16LE(Object.keys(files).length, 10);
  e.writeUInt32LE(cd.length, 12);
  e.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, e]);
}

function setup() {
  const gamesDir = tmp('gs-import-games-');
  const base = { gamesDir, cwd: gamesDir, engineVersion: '0.1.0', clock: fakeClock() };
  return { gamesDir, base };
}

const build = (gameDir: string) =>
  runBuildCommand({
    gameDir,
    stepsDir: join(ROOT, 'engine/build/steps'),
    clock: fakeClock(),
    host: 'may-thu',
    engineVersion: '0.1.0',
    tool: { name: '@gamestudio/cli', version: '0.0.0' },
    stale: true,
    dryRun: true,
  });

describe('engine import', { timeout: 60_000 }, () => {
  it('thư mục không brief → game mới + brief nháp ChoXacNhan; build thoát 3; brief confirm → build qua', async () => {
    const { gamesDir, base } = setup();
    let r = await runImport({ ...base, src: makeSource() });
    expect(validate('import', r.report)).toEqual([]);
    expect(r.report).toMatchObject({
      result: 'ok',
      gameId: 'mau-game',
      hasBrief: false,
      counts: { zones: 1, npcs: 1, animals: 1, assets: 2 },
      assets: { missingProvenance: ['assets/imported/nha.glb'], pendingReview: ['assets/imported/nha.glb'] },
      brief: { status: 'ChoHandoff' },
    });
    expect(r.exit).toBe(EXIT.NEEDS_CONFIRM);
    const game = join(gamesDir, 'mau-game');
    expect(existsSync(join(game, 'scripts/hello.ts'))).toBe(true);
    expect(existsSync(join(game, 'build'))).toBe(false);
    expect(r.warnings.join(' ')).toMatch(/Bỏ qua build\//);
    expect(respond(gamesDir, r.report.brief?.handoff?.reqFile ?? '', PROSE)).toBe('reverse_brief');

    const o = { gameDir: game, gameId: 'mau-game', cwd: gamesDir, clock: fakeClock() };
    let b = await runReverseBrief(o);
    expect(b).toMatchObject({ exit: EXIT.NEEDS_CONFIRM, report: { status: 'ChoXacNhan' } });
    expect(Object.values(b.report.fieldSources ?? {}).every((s) => s === 'suy_tu_du_lieu')).toBe(true);
    const brief = JSON.parse(readFileSync(join(game, 'brief/v1/brief.json'), 'utf8')) as { sourceRef: string };
    expect(brief.sourceRef).toBe('reverse:mau-game');
    expect(existsSync(join(game, 'brief/v1/hash.txt'))).toBe(false);

    // AC-CR01-02: chưa xác nhận → build thoát 3 ERR-INT-06.
    const blocked = await build(game);
    expect(blocked.exit).toBe(EXIT.NEEDS_CONFIRM);
    expect(JSON.stringify(blocked.report)).toContain('ERR-INT-06');

    b = await runReverseBrief({ ...o, confirm: true });
    expect(b).toMatchObject({ exit: EXIT.OK, report: { status: 'DaXacNhan' } });
    expect(readFileSync(join(game, 'brief/v1/hash.txt'), 'utf8')).toMatch(/^sha256:[0-9a-f]{64}\n$/);
    expect((await build(game)).exit).toBe(EXIT.OK);
    expect((await runReverseBrief({ ...o, confirm: true })).report.status).toBe('DaXacNhan');

    // Nhập lại không --into → chặn; --into → giữ data.bak-<ts>/.
    r = await runImport({ ...base, src: makeSource() });
    expect(r.report.problems.map((p) => p.code)).toEqual(['ERR-CLI-03']);
    r = await runImport({ ...base, src: makeSource(), into: 'mau-game' });
    expect(r.report.result).toBe('ok');
    expect(r.backup).toMatch(/^data\.bak-\d{8}T\d{6}$/);
    expect(existsSync(join(game, r.backup ?? '', 'game.json'))).toBe(true);
    expect(r.exit).toBe(EXIT.OK); // đã có brief (từ lần trước) → không suy lại
  });

  it('chặn và không ghi gì: thiếu game.json, --into lệch, thiếu world.json (ERR-INT-09), đuôi lạ', async () => {
    const { gamesDir, base } = setup();
    const noGame = makeSource();
    rmSync(join(noGame, 'data/game.json'));
    let r = await runImport({ ...base, src: noGame });
    expect(r).toMatchObject({ exit: EXIT.DATA, report: { result: 'chan' } });
    expect(r.report.problems.some((p) => p.path === 'data/game.json')).toBe(true);

    r = await runImport({ ...base, src: makeSource(), into: 'khac' });
    expect(r.report.problems.map((p) => p.path)).toContain('data/game.json#/id');

    const noWorld = makeSource();
    rmSync(join(noWorld, 'data/world.json'));
    r = await runImport({ ...base, src: noWorld });
    expect(r.report.problems.map((p) => p.code)).toContain('ERR-INT-09');

    const exe = makeSource();
    writeFileSync(join(exe, 'scripts/run.exe'), 'MZ');
    r = await runImport({ ...base, src: exe });
    expect(r.report.problems).toEqual([
      { code: 'ERR-CLI-03', path: 'scripts/run.exe', message: 'Đuôi tệp không được phép.' },
    ]);
    expect(readdirSync(gamesDir)).toEqual([]);
  });

  it('junction trong thư mục nguồn → chặn', async () => {
    const { gamesDir, base } = setup();
    const src = makeSource();
    symlinkSync(tmp('gs-import-target-'), join(src, 'assets/lienket'), 'junction');
    const r = await runImport({ ...base, src });
    expect(r.report.problems[0]).toMatchObject({ code: 'ERR-CLI-03', path: 'assets/lienket' });
    expect(readdirSync(gamesDir)).toEqual([]);
  });

  it('zip: thư mục bọc ngoài được bỏ; ../ và ổ đĩa bị chặn', async () => {
    const { gamesDir, base } = setup();
    const src = makeSource();
    const files: Record<string, string> = {};
    for (const f of ['game.json', 'world.json', 'budgets.json', 'palette.json'])
      files[`goi/data/${f}`] = readFileSync(join(src, 'data', f), 'utf8');
    const zipPath = join(tmp('gs-import-zip-'), 'goi.zip');
    writeFileSync(zipPath, makeZip(files));
    const r = await runImport({ ...base, src: zipPath });
    expect(r.report).toMatchObject({ result: 'ok', gameId: 'mau-game' });
    expect(existsSync(join(gamesDir, 'mau-game/data/world.json'))).toBe(true);

    for (const bad of ['../thoat.json', 'C:/win.json', 'a/../../b.json', '/tuyet-doi.json']) {
      const z = readZip(makeZip({ ...files, [bad]: '{}' }));
      expect(z.ok, bad).toBe(false);
    }
    const evil = join(tmp('gs-import-zip-'), 'evil.zip');
    writeFileSync(evil, makeZip({ ...files, '../thoat.json': '{}' }));
    const g2 = setup();
    const e = await runImport({ ...g2.base, src: evil });
    expect(e).toMatchObject({ exit: EXIT.DATA, report: { result: 'chan' } });
    expect(readdirSync(g2.gamesDir)).toEqual([]);
  });
});
