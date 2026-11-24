// TST-RTM-03 (phần lex): PSC-RTM-04 bước lex.
import { describe, expect, it } from 'vitest';
import { lex } from './lexer.js';

const kinds = (src: string): string[] => {
  const r = lex(src);
  if (!r.ok) throw new Error(r.error.message);
  return r.value.map((t) => `${t.kind}:${t.text}`);
};

describe('lex', () => {
  it('tách số, chuỗi, bool, định danh có chấm, toán tử', () => {
    expect(kinds("quest.trau.state >= 2 && name == 'a\\'b' || !true")).toEqual([
      'ident:quest.trau.state',
      'op:>=',
      'num:2',
      'op:&&',
      'ident:name',
      'op:==',
      "str:a'b",
      'op:||',
      'op:!',
      'bool:true',
      'eof:',
    ]);
  });

  it('số thập phân, đoạn định danh bắt đầu bằng số', () => {
    const r = lex('3.25 + counter.1x');
    expect(r.ok && r.value[0]?.num).toBe(3.25);
    expect(kinds('counter.1x')).toEqual(['ident:counter.1x', 'eof:']);
  });

  it('escape \\\\ trong chuỗi', () => {
    const r = lex("'a\\\\b'");
    expect(r.ok && r.value[0]?.text).toBe('a\\b');
  });

  it.each([
    ['a $ b', 2],
    ['Hour', 0],
    ["'abc", 0],
    ["'a\\nb'", 2],
    ['a. b', 1],
    ['a..b', 1],
    ['1.', 1],
    ['.5', 0],
    ['2abc', 1],
    ['a = b', 2],
    ['a & b', 2],
    ['a | b', 2],
  ])('lỗi syntax có vị trí: %s', (src, pos) => {
    const r = lex(src);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('syntax');
      expect(r.error.pos).toBe(pos);
    }
  });

  it('nguồn dài quá 512 ký tự', () => {
    const r = lex('1+'.repeat(256) + '1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.pos).toBe(512);
    expect(lex('1+'.repeat(255) + '1').ok).toBe(true);
  });
});
