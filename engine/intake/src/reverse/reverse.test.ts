// TC-INT-17 (TST-INT-13), AC-CR01-02: suy brief nháp từ dữ liệu; mọi trường có fieldSources; brief ChoXacNhan;
// thiếu world.json → ERR-INT-09 không gọi mô hình; nguồn không có trong tóm tắt → 'thieu' → hỏi.
import { describe, expect, it } from 'vitest';

import { REVERSE_SUMMARY_MAX_BYTES } from '../config.js';
import { SCHEMAS, validateOutput } from '../schemas/index.js';
import { answer, confirm } from '../session.js';
import { makeDeps, TEMPLATE } from '../test-fixtures.js';
import { deriveFields } from './derive.js';
import { reverseBrief } from './reverse-brief.js';
import { summarizeData } from './summary.js';

const DATA = {
  'game.json': TEMPLATE['game.json'],
  'world.json': TEMPLATE['world.json'],
  'entities/animals/trau.json': { id: 'trau', species: 'trâu', count: 2 },
  'entities/npc/ong-ba.json': { id: 'ong-ba', name: 'Ông Ba', role: 'nông dân', count: 1 },
  'dialogue/ong-ba.json': { lines: [{ text: 'Chào cháu, ra đồng sớm thế?' }] },
};
const src = (value: unknown, sources: string[]) => ({ value, sources });
const PROSE_FULL = {
  fields: {
    genre: src('khám phá', ['game.json#/title']),
    artStyle: src('low-poly', ['world.json#/postFx']),
    coreLoop: src(['dạo đồng', 'chăn trâu', 'trò chuyện'], ['dialogue/ong-ba.json#/lines']),
    player: src('cậu bé', ['dialogue/ong-ba.json#/lines/0/text']),
    'setting.place': src('làng quê', ['world.json#/procedural/preset']),
    'setting.era': src('hiện đại', ['game.json#/title']),
    'setting.season': src('hè', ['world.json#/weather']),
  },
};

describe('reverseBrief (PSC-INT-13)', () => {
  it('đủ nguồn → brief ChoXacNhan ngay, sourceRef reverse:<id>, không gọi mô hình brief', async () => {
    const deps = makeDeps({ reverse_brief: [PROSE_FULL] });
    const r = await reverseBrief(DATA, { gameId: 'mau-game' }, deps);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.value.questions).toEqual([]);
    expect(r.value.session).toMatchObject({ status: 'ChoXacNhan', kind: 'suy_nguoc' });
    expect(r.value.brief).toMatchObject({
      title: 'Game mẫu',
      sourceRef: 'reverse:mau-game',
      animals: [{ species: 'trâu', count: 2 }],
      npcs: [{ name: 'Ông Ba', role: 'nông dân', count: 1 }],
      scale: { zones: 1, areaKm2: 0.25 },
      features: { combat: false, hunting: false, dialogueMode: 'static' },
    });
    expect(validateOutput(SCHEMAS.brief, r.value.brief)).toEqual([]);
    expect(Object.values(r.value.fieldSources).every((v) => v === 'suy_tu_du_lieu')).toBe(true);
    expect(r.value.sourcePaths.title).toEqual(['game.json#/title']);
    expect(deps.llm.count()).toBe(1);
    expect(r.value.session.bundle && Object.keys(r.value.session.bundle.files)).toEqual([
      'brief/v1/brief.json',
      'brief/v1/game-brief.md',
    ]);
    const c = await confirm(r.value.sessionId, deps);
    expect(c.ok && c.value.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('nguồn không có trong tóm tắt hoặc thiếu → fieldSources thieu → câu hỏi; trả lời → ChoXacNhan', async () => {
    const prose = {
      fields: {
        ...PROSE_FULL.fields,
        artStyle: src('hiện thực', ['khong-co.json#/x']), // nguồn bịa
        player: src('cậu bé', []), // không nguồn
      },
    };
    const clarify = {
      questions: ['artStyle', 'player'].map((field) => ({
        field,
        text: `Chọn ${field}?`,
        choices: [
          { id: 'a', label: 'A', value: `a-${field}` },
          { id: 'b', label: 'B', value: `b-${field}` },
        ],
      })),
    };
    const deps = makeDeps({ reverse_brief: [prose], clarify: [clarify] });
    const r = await reverseBrief(DATA, { gameId: 'mau-game' }, deps);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.value.fieldSources).toMatchObject({ artStyle: 'thieu', player: 'thieu', title: 'suy_tu_du_lieu' });
    expect(r.value.questions.map((q) => q.field)).toEqual(['artStyle', 'player']);
    expect(r.value.brief).toBeUndefined();
    expect(await confirm(r.value.sessionId, deps)).toMatchObject({ ok: false });

    const a = await answer(r.value.sessionId, { 'q-artStyle-1': 'a', 'q-player-1': 'b' }, deps);
    if (!a.ok) throw new Error(a.error.message);
    expect(a.value.session.status).toBe('ChoXacNhan');
    const brief = a.value.session.bundle?.files['brief/v1/brief.json'];
    // Luật bằng chứng giữ trường suy tất định (con trỏ nằm trong tóm tắt) sau lượt trả lời.
    expect(brief).toMatchObject({ title: 'Game mẫu', artStyle: { summary: 'a-artStyle' }, player: 'b-player' });
    expect(deps.llm.count('brief')).toBe(0);
  });

  it('thiếu world.json/game.json → ERR-INT-09, không có lời gọi mô hình', async () => {
    const deps = makeDeps({ reverse_brief: [PROSE_FULL] });
    const { 'world.json': _w, ...noWorld } = DATA;
    expect(await reverseBrief(noWorld, { gameId: 'x' }, deps)).toMatchObject({
      ok: false,
      error: { code: 'ERR-INT-09', detail: { file: 'world.json' } },
    });
    const { 'game.json': _g, ...noGame } = DATA;
    expect(await reverseBrief(noGame, { gameId: 'x' }, deps)).toMatchObject({
      ok: false,
      error: { code: 'ERR-INT-09', detail: { file: 'game.json' } },
    });
    expect(deps.llm.count()).toBe(0);
  });
});

describe('summarizeData / deriveFields', () => {
  it('≤ 6 KB, tất định, giữ dòng đầu (nguồn trường suy), toạ độ rút gọn', () => {
    const big = {
      ...DATA,
      'dialogue/dai.json': { lines: Array.from({ length: 500 }, (_, i) => ({ text: `câu ${i}` })) },
    };
    const head: [string, unknown][] = [['game.json#/title', 'Game mẫu']];
    const a = summarizeData(big, head);
    expect(new TextEncoder().encode(a.text).length).toBeLessThanOrEqual(REVERSE_SUMMARY_MAX_BYTES);
    expect(a.truncated).toBe(true);
    expect(a.text.startsWith('game.json#/title = "Game mẫu"\n')).toBe(true);
    expect(a.text).toContain('world.json#/playArea = "[4 điểm]"');
    expect(summarizeData(big, head)).toEqual(a);
  });

  it('procedural → realPlace false; diện tích từ playArea; thiếu trường thì bỏ', () => {
    const d = deriveFields({ 'game.json': { title: 'X' }, 'world.json': { source: 'osm' } });
    expect(d.title?.value).toBe('X');
    expect(d['setting.realPlace']?.value).toBe(true);
    expect(d.scale).toBeUndefined();
    expect(d.camera).toBeUndefined();
    expect(deriveFields(DATA)['setting.realPlace']?.value).toBe(false);
  });
});
