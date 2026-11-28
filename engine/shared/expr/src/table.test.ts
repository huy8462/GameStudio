// TST-RTM-03: bảng ≥ 200 biểu thức (đúng, sai cú pháp, hàm cấm, định danh lạ, sai kiểu, sai số đối).
// Bảng nằm ở ../vectors/table.json, dùng chung với bản C# (engine/unity, ExprTests; T-0027, RR-CR02-04).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compile } from './compile.js';
import { makeEnv, SPEC, VALUES } from './fixture.test-util.js';
import type { ExprErrorCode, ExprValue } from './types.js';

interface Table {
  spec: { idents: [string, string][]; fns: [string, number, string][] };
  values: Record<string, ExprValue>;
  valid: { src: string; type: string; value: ExprValue }[];
  errors: { src: string; code: ExprErrorCode; pos: number }[];
}

const T = JSON.parse(readFileSync(new URL('../vectors/table.json', import.meta.url), 'utf8')) as Table;

describe('bảng biểu thức TST-RTM-03', () => {
  it('đủ ≥ 200 dòng và khớp ngữ cảnh fixture', () => {
    expect(T.valid.length + T.errors.length).toBeGreaterThanOrEqual(200);
    expect(T.spec.idents).toEqual(Object.entries(SPEC.idents));
    expect(T.spec.fns).toEqual(Object.entries(SPEC.fns).map(([k, v]) => [k, v.args, v.ret]));
    expect(T.values).toEqual(VALUES);
  });

  it.each(T.valid.map((v) => [v.src, v.value, v.type] as const))('đúng: %s → %s', (src, want, type) => {
    const r = compile(src, SPEC);
    if (!r.ok) throw new Error(`${r.error.code}@${r.error.pos}: ${r.error.message}`);
    expect(r.value.type).toBe(type);
    expect(r.value.eval(makeEnv())).toBe(want);
  });

  it.each(T.errors.map((e) => [e.src, e.code, e.pos] as const))('lỗi: %s → %s@%s', (src, code, pos) => {
    const r = compile(src, SPEC);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe(code);
      expect(r.error.pos).toBe(pos);
    }
  });
});
