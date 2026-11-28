// T-0013: engine new-game (EP-INT-01, 02; TC-INT-12; AC-01-04): handoff từng bước → xác nhận → game build được 6 bước (T-0019 thêm navmesh).
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateFiles } from '@gamestudio/schema';
import { afterAll, describe, expect, it } from 'vitest';

import { runBuildCommand } from '../build-cmd/run.js';
import { EXIT } from '../exit-codes.js';
import { fakeClock } from '../orchestrator/test-fixtures.js';
import { runNewGame, type NewGameOptions } from './run.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const DESC =
  'Làng chài ven biển miền Trung, phong cách low-poly sáng. Góc nhìn thứ ba. Chiều hoàng hôn mùa hè. Người chơi là cô bé bán cá, đi chợ, giúp ngư dân kéo lưới và nhặt vỏ sò. Có mèo và hải âu.';
const fs = (value: unknown, evidence: string[]) => ({ value, status: 'tu_mo_ta', evidence });
const ANALYSIS = {
  fields: {
    title: fs('Làng chài hoàng hôn', ['Làng chài ven biển']),
    genre: fs('khám phá', ['đi chợ']),
    camera: fs('third_person', ['Góc nhìn thứ ba']),
    'setting.place': fs('làng chài ven biển miền Trung', ['Làng chài ven biển miền Trung']),
    'setting.era': fs('hiện đại', ['Làng chài']),
    'setting.season': fs('he', ['mùa hè']),
    'setting.timeOfDay': fs(['hoang_hon'], ['Chiều hoàng hôn']),
    artStyle: fs('low-poly sáng', ['phong cách low-poly sáng']),
    coreLoop: fs(['đi chợ', 'kéo lưới', 'nhặt vỏ sò'], ['đi chợ, giúp ngư dân kéo lưới và nhặt vỏ sò']),
    player: fs('cô bé bán cá', ['cô bé bán cá']),
    animals: fs(
      [
        { species: 'mèo', count: 3 },
        { species: 'hải âu', count: 8 },
      ],
      ['Có mèo và hải âu'],
    ),
  },
};
const CLARIFY = {
  questions: [
    {
      field: 'scale',
      text: 'Rộng cỡ nào?',
      choices: [
        { id: 'nho', label: '0,25 km²', value: { zones: 1, areaKm2: 0.25 } },
        { id: 'vua', label: '1 km²', value: { zones: 4, areaKm2: 1 } },
      ],
    },
  ],
};
const BRIEF = {
  title: 'Làng chài hoàng hôn',
  sourceRef: 'intake:x',
  genre: 'Khám phá',
  camera: 'third_person',
  setting: { place: 'Làng chài miền Trung', era: 'hiện đại', season: 'hè', timeOfDay: ['hoàng hôn'], realPlace: false },
  artStyle: { summary: 'Low-poly sáng', refs: [] },
  coreLoop: ['Đi chợ', 'Kéo lưới', 'Nhặt vỏ sò'],
  player: 'Cô bé bán cá',
  npcs: [{ name: 'Ông Ba', role: 'ngư dân', count: 1 }],
  animals: [
    { species: 'mèo', count: 3 },
    { species: 'hải âu', count: 8 },
  ],
  features: { combat: false, hunting: false, dialogueMode: 'static' },
  scale: { zones: 1, areaKm2: 0.25 },
  highRiskAssets: [],
  assumptions: [],
  suggestions: [],
};

function setup() {
  const gamesDir = mkdtempSync(join(tmpdir(), 'gs-newgame-'));
  dirs.push(gamesDir);
  const base: NewGameOptions = {
    gamesDir,
    templateDir: join(ROOT, 'games/_template/data'),
    cwd: gamesDir,
    clock: fakeClock(),
  };
  /** Đóng vai phiên Claude Code (skill engine-intake): đọc req-<n>.json, viết res-<n>.json. */
  const respond = (reqFile: string, data: unknown) => {
    const req = JSON.parse(readFileSync(join(gamesDir, reqFile), 'utf8')) as { n: number };
    writeFileSync(
      join(gamesDir, reqFile.replace('req-', 'res-')),
      JSON.stringify({
        schema: 'intake-handoff/1',
        n: req.n,
        data,
        answeredBy: 'claude-code',
        at: '2026-11-24T00:00:00Z',
      }),
    );
    return req as { n: number; task: string };
  };
  return { gamesDir, base, respond };
}

describe('engine new-game', { timeout: 240_000 }, () => {
  it('handoff analyze → clarify → câu hỏi → mặc định → brief → xác nhận → engine build 6 bước thoát 0', async () => {
    const { gamesDir, base, respond } = setup();
    let r = await runNewGame({ ...base, description: DESC });
    expect(r.exit).toBe(EXIT.NEEDS_CONFIRM);
    expect(r.report.error?.code).toBe('HANDOFF_PENDING');
    const sid = r.report.sessionId ?? '';
    expect(r.report.handoff?.reqFile).toBe(`.intake/pending/${sid}/req-1.json`);
    expect(respond(r.report.handoff?.reqFile ?? '', ANALYSIS).task).toBe('analyze');

    r = await runNewGame({ ...base, resume: sid });
    expect(respond(r.report.handoff?.reqFile ?? '', CLARIFY).task).toBe('clarify');

    r = await runNewGame({ ...base, resume: sid });
    expect(r.exit).toBe(EXIT.NEEDS_CONFIRM);
    expect(r.report.questions?.map((q) => q.id)).toEqual(['q-scale-1']);

    r = await runNewGame({ ...base, resume: sid, useDefaults: true });
    expect(respond(r.report.handoff?.reqFile ?? '', BRIEF).task).toBe('brief');
    // Mỗi lần dừng chỉ một yêu cầu chờ (EP-INT-02): req-1…3, res-1…3.
    expect(
      readdirSync(join(gamesDir, '.intake/pending', sid))
        .filter((f) => /^re[qs]-\d+\.json$/.test(f))
        .sort(),
    ).toEqual(['req-1.json', 'req-2.json', 'req-3.json', 'res-1.json', 'res-2.json', 'res-3.json']);

    r = await runNewGame({ ...base, resume: sid });
    expect(r.exit).toBe(EXIT.NEEDS_CONFIRM);
    expect(r.report).toMatchObject({ status: 'ChoXacNhan', gameId: 'lang-chai-hoang-hon' });
    expect(readFileSync(join(gamesDir, r.report.preview ?? ''), 'utf8')).toContain('# Làng chài hoàng hôn');
    expect(existsSync(join(gamesDir, 'lang-chai-hoang-hon'))).toBe(false);

    // AC-01-04: build khi chưa xác nhận bị chặn (chưa có thư mục game → không build được).
    r = await runNewGame({ ...base, resume: sid, confirm: true });
    expect(r.exit).toBe(EXIT.OK);
    const game = join(gamesDir, 'lang-chai-hoang-hon');
    expect(readFileSync(join(game, 'brief/v1/hash.txt'), 'utf8')).toMatch(/^sha256:[0-9a-f]{64}\n$/);
    expect(existsSync(join(game, '.intake', sid, 'session.json'))).toBe(true);
    expect(existsSync(join(gamesDir, '.intake/pending', sid))).toBe(false);
    const data = Object.fromEntries(
      ['game.json', 'world.json', 'budgets.json', 'palette.json'].map((f) => [
        `data/${f}`,
        JSON.parse(readFileSync(join(game, 'data', f), 'utf8')),
      ]),
    );
    expect(Object.values(validateFiles(data)).flat()).toEqual([]);

    // Chạy lại sau xác nhận: không ghi đè.
    expect((await runNewGame({ ...base, resume: sid, confirm: true })).report.status).toBe('DaXacNhan');

    const b = await runBuildCommand({
      gameDir: game,
      stepsDir: join(ROOT, 'engine/build/steps'),
      clock: fakeClock(),
      host: 'may-thu',
      engineVersion: '0.1.0',
      tool: { name: '@gamestudio/cli', version: '0.0.0' },
    });
    expect(b.exit, b.report.warnings.join('\n')).toBe(EXIT.OK);
    expect(b.report.checks.map((c) => c.id)).toEqual([
      'world.fetch@-',
      'world.heightfield@-',
      'terrain.erode@-',
      'terrain.mesh@z1',
      'navmesh@z1',
      'terrain.splat@z1',
    ]);
  });

  it('res sai schema → thoát 4; thiếu --from/--resume → 4; mô tả ngắn → 4 (ERR-INT-01)', async () => {
    const { base, respond } = setup();
    const r = await runNewGame({ ...base, description: DESC });
    respond(r.report.handoff?.reqFile ?? '', { fields: { camera: { value: 1 } } });
    const bad = await runNewGame({ ...base, resume: r.report.sessionId ?? '' });
    expect(bad.exit).toBe(EXIT.DATA);
    expect(bad.report.error?.code).toBe('HANDOFF_INVALID');
    expect((await runNewGame({ ...base })).exit).toBe(EXIT.DATA);
    const short = await runNewGame({ ...base, description: 'ngắn' });
    expect(short).toMatchObject({ exit: EXIT.DATA, report: { error: { code: 'ERR-INT-01' } } });
  });

  it('AC-CR01-01: trả lời một phần → --resume in đúng câu còn lại, không có req mới', async () => {
    const { gamesDir, base, respond } = setup();
    const noTitle = { fields: Object.fromEntries(Object.entries(ANALYSIS.fields).filter(([k]) => k !== 'title')) };
    const two = {
      questions: [
        ...CLARIFY.questions,
        {
          field: 'title',
          text: 'Tên game?',
          choices: [
            { id: 't1', label: 'Làng chài', value: 'Làng chài' },
            { id: 't2', label: 'Chiều biển', value: 'Chiều biển' },
          ],
        },
      ],
    };
    let r = await runNewGame({ ...base, description: DESC });
    const sid = r.report.sessionId ?? '';
    respond(r.report.handoff?.reqFile ?? '', noTitle);
    r = await runNewGame({ ...base, resume: sid });
    respond(r.report.handoff?.reqFile ?? '', two);
    r = await runNewGame({ ...base, resume: sid });
    expect(r.report.questions?.map((q) => q.id)).toEqual(['q-scale-1', 'q-title-1']);
    const reqs = () => readdirSync(join(gamesDir, '.intake/pending', sid)).filter((f) => f.startsWith('req-')).length;
    expect(reqs()).toBe(2);

    r = await runNewGame({ ...base, resume: sid, answers: { 'q-scale-1': 'vua' } });
    expect(r.exit).toBe(EXIT.NEEDS_CONFIRM);
    expect(r.report.questions?.map((q) => q.id)).toEqual(['q-title-1']);
    // "Đóng rồi mở lại": chạy lại không câu trả lời mới → vẫn đúng câu còn lại, không gọi mô hình (không req mới).
    r = await runNewGame({ ...base, resume: sid });
    expect(r.report.questions?.map((q) => q.id)).toEqual(['q-title-1']);
    expect(reqs()).toBe(2);
  });

  it('cùng mô tả → cùng phiên (làm tiếp, có cảnh báo); câu trả lời khi đang chờ handoff bị bỏ qua', async () => {
    const { base } = setup();
    const a = await runNewGame({ ...base, description: DESC });
    const b = await runNewGame({ ...base, description: DESC, useDefaults: true });
    expect(b.report.sessionId).toBe(a.report.sessionId);
    expect(b.report.warnings.join(' ')).toMatch(/làm tiếp phiên cũ/);
    expect(b.report.warnings.join(' ')).toMatch(/Bỏ qua câu trả lời mới/);
  });
});
