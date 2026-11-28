// TC-GEN-01 / TST-GEN-01 (FR-RTM-01, AC-04-06): `engine validate` trên mẫu thật và trên dữ liệu sai.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import { EXIT } from '../exit-codes.js';
import { exitOf, kindOfRepoPath, listAll, validatePaths, validateWithSchema } from './run-validate.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const TMP = mkdtempSync(join(tmpdir(), 'gs-validate-'));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

function put(rel: string, body: string): string {
  const abs = join(TMP, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body);
  return abs;
}

describe('engine validate', () => {
  it('kindOfRepoPath nhận cả games/<id>/data/x.json lẫn data/x.json, dấu \\', () => {
    expect(kindOfRepoPath('games/g1/data/world.json')).toBe('world');
    expect(kindOfRepoPath('games\\g1\\data\\game.json')).toBe('game');
    expect(kindOfRepoPath('data/palette.json')).toBe('palette');
    expect(kindOfRepoPath('games/g1/data/entities/npc.json')).toBeUndefined();
  });

  it('--all trên repo: mẫu _template hợp lệ, thoát 0 (TC-GEN-01)', () => {
    const r = validatePaths(ROOT, listAll(ROOT));
    expect(r.files.filter((f) => f.errors.length > 0)).toEqual([]);
    expect(r.files.map((f) => f.path)).toEqual(expect.arrayContaining(['games/_template/data/game.json']));
    expect(exitOf(r)).toBe(EXIT.OK);
  });

  it('dữ liệu sai schema hoặc JSON hỏng → báo đúng tệp, thoát 4; tệp chưa có schema bị bỏ qua', () => {
    const game = JSON.parse(readFileSync(join(ROOT, 'games/_template/data/game.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    const bad = put('games/g1/data/game.json', JSON.stringify({ ...game, camera: { mode: 'top_down' } }));
    const broken = put('games/g1/data/world.json', '{ "schemaVersion": ');
    const free = put('games/g1/data/entities/npc.json', '{}');
    const r = validatePaths(TMP, [bad, broken, free]);
    expect(r.ok).toBe(false);
    expect(r.skipped).toBe(1);
    expect(r.files.find((f) => f.path === 'games/g1/data/game.json')?.errors.map((e) => e.instancePath)).toContain(
      '/camera/mode',
    );
    expect(r.files.find((f) => f.path === 'games/g1/data/world.json')?.errors[0]?.keyword).toBe('json');
    expect(exitOf(r)).toBe(EXIT.DATA);
  });

  it('--schema: kiểm theo JSON Schema tuỳ ý (EP-INT-02)', () => {
    const schema = put(
      's.json',
      JSON.stringify({ type: 'object', required: ['a'], properties: { a: { type: 'integer' } } }),
    );
    expect(exitOf(validateWithSchema(TMP, schema, [put('ok.json', '{"a":1}')]))).toBe(EXIT.OK);
    const r = validateWithSchema(TMP, schema, [put('no.json', '{"a":"x"}')]);
    expect(r.files[0]?.errors[0]?.instancePath).toBe('/a');
    expect(exitOf(r)).toBe(EXIT.DATA);
  });

  it('--schema trỏ tới schema đã đăng ký (audio/1, T-0018): files.opus là lỗi, thoát 4', () => {
    const schema = join(ROOT, 'engine/schema/schemas/audio/1.json');
    const side = (files: string): string =>
      `{"schema":"audio/1","id":"a","kind":"sfx","loop":false,"lufs":-16,"durationS":1,"files":${files},"tags":[]}`;
    expect(exitOf(validateWithSchema(TMP, schema, [put('a.audio.json', side('{"aac":"a.m4a"}'))]))).toBe(EXIT.OK);
    const r = validateWithSchema(TMP, schema, [put('b.audio.json', side('{"aac":"a.m4a","opus":"a.webm"}'))]);
    expect(r.files[0]?.errors[0]?.instancePath).toBe('/files');
    expect(exitOf(r)).toBe(EXIT.DATA);
  });
});
