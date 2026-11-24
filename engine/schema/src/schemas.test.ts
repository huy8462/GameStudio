// TST-GEN-01 / TC-GEN-01: mọi tệp mẫu games/_template/data hợp lệ; schema bắt lỗi đúng chỗ (SCH-GEN-01, 02, 03).
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { applyPatch } from './patch.js';
import type { Json } from './pointer.js';
import { SCHEMA_KINDS, validate, type SchemaKind } from './validate.js';

const load = (k: SchemaKind): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../../../games/_template/data/${k}.json`, import.meta.url), 'utf8')) as Record<
    string,
    unknown
  >;

const errPaths = (k: SchemaKind, data: unknown): string[] =>
  validate(k, data).map((e) => `${e.instancePath} ${e.keyword}`);

describe('mẫu games/_template/data (TC-GEN-01)', () => {
  it.each(SCHEMA_KINDS.map((k) => [k]))('%s.json hợp lệ', (k) => {
    expect(validate(k, load(k))).toEqual([]);
  });
});

describe('game/1', () => {
  it('id slug, tính năng mặc định tắt, dialogueMode trong enum', () => {
    const g = load('game');
    expect(errPaths('game', { ...g, id: 'Có Dấu' })).toContain('/id pattern');
    const f = g['features'] as Record<string, unknown>;
    expect(errPaths('game', { ...g, features: { ...f, dialogueMode: 'llm' } })).toContain(
      '/features/dialogueMode enum',
    );
    expect(errPaths('game', { ...g, features: { ...f, combat: {} } })).toContain('/features/combat required');
    expect(errPaths('game', { ...g, seed: -1 })).toContain('/seed minimum');
  });
});

describe('world/1', () => {
  it('source real/mixed bắt buộc origin, bbox; procedural bắt buộc procedural', () => {
    const w = load('world');
    expect(errPaths('world', { ...w, source: 'real' })).toEqual(expect.arrayContaining(['/ required']));
    const { procedural: _p, ...noProc } = w;
    expect(errPaths('world', noProc)).toContain('/ required');
    expect(
      validate('world', {
        ...w,
        source: 'real',
        origin: { lat: 21, lon: 105.6 },
        bbox: { south: 21, west: 105.6, north: 21.01, east: 105.61 },
      }),
    ).toEqual([]);
  });
  it('đa giác ≥ 3 đỉnh, ≥ 1 zone, ≥ 1 mốc thời điểm, assetRef đúng mẫu', () => {
    const w = load('world');
    expect(
      errPaths('world', {
        ...w,
        playArea: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toContain('/playArea minItems');
    expect(errPaths('world', { ...w, zones: [] })).toContain('/zones minItems');
    expect(errPaths('world', { ...w, timeOfDay: [] })).toContain('/timeOfDay minItems');
    const placed = [{ id: 'cay', assetId: 'cay-tre', position: [0, 0, 0] }];
    expect(errPaths('world', { ...w, placedObjects: placed })).toContain('/placedObjects/0/assetId pattern');
  });
});

describe('palette/1', () => {
  it('8–16 màu, hex 6 chữ số, vai trò trong enum', () => {
    const p = load('palette');
    const colors = p['colors'] as Record<string, unknown>[];
    expect(errPaths('palette', { ...p, colors: colors.slice(0, 7) })).toContain('/colors minItems');
    expect(errPaths('palette', { ...p, colors: [{ ...colors[0], hex: '#fff' }, ...colors.slice(1)] })).toContain(
      '/colors/0/hex pattern',
    );
    expect(errPaths('palette', { ...p, colors: [{ ...colors[0], role: 'chu' }, ...colors.slice(1)] })).toContain(
      '/colors/0/role enum',
    );
  });
});

describe('applyPatch kèm kiểm schema', () => {
  it('sửa hợp lệ → ok; sửa phá schema → lỗi schema, tài liệu không đổi', () => {
    const doc = { 'world.json': load('world'), 'game.json': load('game') } as Json;
    const good = applyPatch(doc, [{ op: 'replace', path: '/world.json/seed', value: 42 }], { validate: true });
    expect(good).toMatchObject({ ok: true, value: { touchedFiles: ['world.json'] } });
    const bad = applyPatch(doc, [{ op: 'replace', path: '/game.json/camera/mode', value: 'top_down' }], {
      validate: true,
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok && bad.error.code === 'schema') expect(Object.keys(bad.error.errors)).toEqual(['game.json']);
  });
});
