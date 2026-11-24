// Lexer biểu thức an toàn (PSC-RTM-04 bước lex, ALG-RTM-04).
import type { ExprError, Result } from './types.js';
import { MAX_SOURCE_LENGTH } from './types.js';

export type TokenKind = 'num' | 'str' | 'bool' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof';

export interface Token {
  kind: TokenKind;
  /** Văn bản gốc (op, ident) hoặc giá trị đã giải escape (str). */
  text: string;
  num?: number;
  pos: number;
}

const OPS2 = ['&&', '||', '==', '!=', '<=', '>='] as const;
const OPS1 = new Set(['!', '<', '>', '+', '-', '*', '/', '%']);

const isDigit = (c: string): boolean => c >= '0' && c <= '9';
const isIdentStart = (c: string): boolean => (c >= 'a' && c <= 'z') || c === '_';
const isIdentPart = (c: string): boolean => isIdentStart(c) || isDigit(c);
const isSpace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n' || c === '\r';

const syntax = (pos: number, message: string): { ok: false; error: ExprError } => ({
  ok: false,
  error: { code: 'syntax', pos, message },
});

export function lex(src: string): Result<Token[], ExprError> {
  if (src.length > MAX_SOURCE_LENGTH) return syntax(MAX_SOURCE_LENGTH, `nguồn dài quá ${MAX_SOURCE_LENGTH} ký tự`);
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src.charAt(i);
    if (isSpace(c)) {
      i++;
      continue;
    }
    const start = i;
    if (isDigit(c)) {
      while (isDigit(src.charAt(i))) i++;
      if (src.charAt(i) === '.' && isDigit(src.charAt(i + 1))) {
        i++;
        while (isDigit(src.charAt(i))) i++;
      }
      if (isIdentStart(src.charAt(i))) return syntax(i, 'số dính liền chữ');
      const text = src.slice(start, i);
      out.push({ kind: 'num', text, num: Number(text), pos: start });
      continue;
    }
    if (c === "'") {
      let val = '';
      i++;
      for (;;) {
        if (i >= src.length) return syntax(start, 'chuỗi chưa đóng');
        const d = src.charAt(i);
        if (d === "'") break;
        if (d === '\\') {
          const e = src.charAt(i + 1);
          if (e !== "'" && e !== '\\') return syntax(i, "escape không hợp lệ (chỉ \\' và \\\\)");
          val += e;
          i += 2;
          continue;
        }
        val += d;
        i++;
      }
      i++;
      out.push({ kind: 'str', text: val, pos: start });
      continue;
    }
    if (isIdentStart(c)) {
      while (isIdentPart(src.charAt(i))) i++;
      while (src.charAt(i) === '.') {
        if (!isIdentPart(src.charAt(i + 1))) return syntax(i, 'định danh có dấu chấm thừa');
        i++;
        while (isIdentPart(src.charAt(i))) i++;
      }
      const text = src.slice(start, i);
      if (text === 'true' || text === 'false') out.push({ kind: 'bool', text, pos: start });
      else out.push({ kind: 'ident', text, pos: start });
      continue;
    }
    const two = src.slice(i, i + 2);
    if ((OPS2 as readonly string[]).includes(two)) {
      out.push({ kind: 'op', text: two, pos: start });
      i += 2;
      continue;
    }
    if (OPS1.has(c)) {
      out.push({ kind: 'op', text: c, pos: start });
      i++;
      continue;
    }
    if (c === '(' || c === ')' || c === ',') {
      out.push({ kind: c === '(' ? 'lparen' : c === ')' ? 'rparen' : 'comma', text: c, pos: start });
      i++;
      continue;
    }
    return syntax(i, `ký tự không hợp lệ '${c}'`);
  }
  out.push({ kind: 'eof', text: '', pos: src.length });
  return { ok: true, value: out };
}
