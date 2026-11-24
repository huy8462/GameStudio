// TST-RTM-03, TC-RTM-03: biên dịch, kiểu, ngắn mạch, gập hằng, giới hạn, không eval (ADR-022).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { check } from './check.js';
import { compile, fold } from './compile.js';
import { makeEnv, SPEC } from './fixture.test-util.js';
import { parse } from './parser.js';

const ok = (src: string) => {
  const r = compile(src, SPEC);
  if (!r.ok) throw new Error(`${r.error.code}@${r.error.pos}: ${r.error.message}`);
  return r.value;
};

describe('compile', () => {
  it('trả kiểu kết quả và tên slot theo thứ tự khoá spec', () => {
    const c = ok('hour >= 18 && flag.cua_mo');
    expect(c.type).toBe('bool');
    expect(c.src).toBe('hour >= 18 && flag.cua_mo');
    expect(c.identSlots).toEqual(Object.keys(SPEC.idents));
    expect(c.fnSlots).toEqual(Object.keys(SPEC.fns));
    expect(Object.isFrozen(c)).toBe(true);
    expect(c.eval(makeEnv())).toBe(true);
    expect(c.eval(makeEnv({ hour: 6 }))).toBe(false);
  });

  it('độ ưu tiên và kết hợp trái theo PSC-RTM-04', () => {
    expect(ok('1 + 2 * 3').eval(makeEnv())).toBe(7);
    expect(ok('10 - 4 - 3').eval(makeEnv())).toBe(3);
    expect(ok('16 / 4 / 2').eval(makeEnv())).toBe(2);
    expect(ok('-2 * 3').eval(makeEnv())).toBe(-6);
    expect(ok('!flag.da_gap && flag.cua_mo').eval(makeEnv())).toBe(true);
    expect(ok('true || false && false').eval(makeEnv())).toBe(true);
    expect(ok('atk - def * 2 > 3 == true').eval(makeEnv())).toBe(true);
  });

  it('ngắn mạch && và || không gọi vế phải', () => {
    const env = makeEnv();
    expect(ok('flag.da_gap && event(7)').eval(env)).toBe(false);
    expect(ok('flag.cua_mo || event(7)').eval(env)).toBe(true);
    expect(env.calls).toBe(0);
    expect(ok('flag.cua_mo && event(7)').eval(env)).toBe(true);
    expect(env.calls).toBe(1);
  });

  it('gọi hàm truyền đối số số, thiếu đối số truyền 0', () => {
    expect(ok('max(atk, def * 4)').eval(makeEnv())).toBe(16);
    expect(ok('round(atk / 5)').eval(makeEnv())).toBe(2);
    expect(ok('rand() + 1').eval(makeEnv())).toBe(1.25);
    expect(ok('round(min(atk, 100) * 1.5 - def)').eval(makeEnv())).toBe(14);
  });

  it('gập hằng: hai lá hằng thành một hằng, gọi hàm không gập', () => {
    const p = parse('(1 + 2) * 3 > 8 && !false');
    if (!p.ok) throw new Error('parse');
    const t = check(p.value, SPEC);
    if (!t.ok) throw new Error('check');
    expect(fold(t.value)).toEqual({ t: 'lit', type: 'bool', value: true });
    const q = parse('max(1, 2) + 3');
    const tq = q.ok ? check(q.value, SPEC) : undefined;
    expect(tq?.ok && fold(tq.value).t).toBe('binary');
  });

  it('so sánh chuỗi và bool cùng kiểu', () => {
    expect(ok("name == 'ong_lao'").eval(makeEnv())).toBe(true);
    expect(ok("name != 'ong_lao'").eval(makeEnv())).toBe(false);
    expect(ok('flag.cua_mo == flag.da_gap').eval(makeEnv())).toBe(false);
  });

  it('định danh trùng tên thuộc tính Object không lọt qua', () => {
    for (const src of ['constructor', '__proto__', 'tostring', 'hasownproperty']) {
      const r = compile(src, SPEC);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('unknown_ident');
    }
    const f = compile('constructor(1)', SPEC);
    expect(!f.ok && f.error.code).toBe('unknown_fn');
  });

  it('giới hạn độ sâu lồng 32', () => {
    expect(compile('('.repeat(31) + '1' + ')'.repeat(31), SPEC).ok).toBe(true);
    const deep = compile('('.repeat(40) + '1' + ')'.repeat(40), SPEC);
    expect(deep.ok).toBe(false);
    if (!deep.ok) expect(deep.error.code).toBe('syntax');
    expect(compile('-'.repeat(40) + '1', SPEC).ok).toBe(false);
  });

  it('hàm khai báo quá 2 đối bị từ chối (arity)', () => {
    const r = compile('f(1, 2, 3)', { idents: {}, fns: { f: { args: 3, ret: 'number' } } });
    expect(!r.ok && r.error.code).toBe('arity');
  });
});

describe('không eval (TST-RTM-03, ADR-022)', () => {
  it('mã nguồn src/ không dùng eval, Function, new Function, import động', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.includes('.test'));
    expect(files.length).toBeGreaterThan(4);
    const banned = /\beval\s*\(|\bFunction\s*\(|\bimport\s*\(|\bReflect\./;
    for (const f of files) {
      const code = readFileSync(join(dir, f), 'utf8')
        .split('\n')
        .filter((l) => !l.trimStart().startsWith('//'))
        .join('\n')
        // Khai báo phương thức CompiledExpr.eval trong types.ts, không phải lời gọi eval toàn cục.
        .replace('eval(env: ExprEnv): ExprValue;', '');
      expect(banned.test(code), f).toBe(false);
    }
  });
});
