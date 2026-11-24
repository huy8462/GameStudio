// Pratt parser (PSC-RTM-04): || 1, && 2, == != 3, < <= > >= 4, + - 5, * / % 6, tiền tố ! - 7, gọi hàm/ngoặc 8.
import type { BinaryOp, Node } from './ast.js';
import type { Token } from './lexer.js';
import { lex } from './lexer.js';
import type { ExprError, Result } from './types.js';
import { MAX_DEPTH } from './types.js';

const BINARY_PREC: Readonly<Record<string, number>> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};
const PREFIX_PREC = 7;

/** Lỗi nội bộ để thoát đệ quy; parse() đổi thành Result. */
class ParseFail {
  constructor(readonly error: ExprError) {}
}

class Parser {
  private i = 0;
  private depth = 0;
  constructor(private readonly toks: Token[]) {}

  private peek(): Token {
    // lex() luôn kết thúc bằng 'eof' nên chỉ số cuối hợp lệ.
    return this.toks[Math.min(this.i, this.toks.length - 1)] as Token;
  }
  private next(): Token {
    const t = this.peek();
    if (this.i < this.toks.length - 1) this.i++;
    return t;
  }
  private fail(pos: number, message: string): never {
    throw new ParseFail({ code: 'syntax', pos, message });
  }

  parseAll(): Node {
    const n = this.expr(0);
    const t = this.peek();
    if (t.kind !== 'eof') this.fail(t.pos, `thừa '${t.text}'`);
    return n;
  }

  private expr(minPrec: number): Node {
    if (++this.depth > MAX_DEPTH) this.fail(this.peek().pos, `lồng sâu quá ${MAX_DEPTH}`);
    let left = this.prefix();
    for (;;) {
      const t = this.peek();
      const prec = t.kind === 'op' ? BINARY_PREC[t.text] : undefined;
      if (prec === undefined || prec <= minPrec) break;
      this.next();
      const right = this.expr(prec);
      left = { t: 'binary', op: t.text as BinaryOp, left, right, pos: t.pos };
    }
    this.depth--;
    return left;
  }

  private prefix(): Node {
    const t = this.next();
    switch (t.kind) {
      case 'num':
        return { t: 'lit', value: t.num ?? Number(t.text), pos: t.pos };
      case 'str':
        return { t: 'lit', value: t.text, pos: t.pos };
      case 'bool':
        return { t: 'lit', value: t.text === 'true', pos: t.pos };
      case 'ident':
        if (this.peek().kind === 'lparen') return this.call(t);
        return { t: 'ident', path: t.text, pos: t.pos };
      case 'lparen': {
        const inner = this.expr(0);
        const r = this.next();
        if (r.kind !== 'rparen') this.fail(r.pos, "thiếu ')'");
        return inner;
      }
      case 'op':
        if (t.text === '!' || t.text === '-') {
          return { t: 'unary', op: t.text, arg: this.expr(PREFIX_PREC - 1), pos: t.pos };
        }
        return this.fail(t.pos, `toán tử '${t.text}' đứng sai chỗ`);
      case 'eof':
        return this.fail(t.pos, 'biểu thức kết thúc đột ngột');
      default:
        return this.fail(t.pos, `'${t.text}' đứng sai chỗ`);
    }
  }

  private call(name: Token): Node {
    this.next(); // '('
    const args: Node[] = [];
    if (this.peek().kind !== 'rparen') {
      for (;;) {
        args.push(this.expr(0));
        const t = this.peek();
        if (t.kind === 'comma') {
          this.next();
          continue;
        }
        break;
      }
    }
    const r = this.next();
    if (r.kind !== 'rparen') this.fail(r.pos, "thiếu ')' sau đối số");
    return { t: 'call', fn: name.text, args, pos: name.pos };
  }
}

export function parse(src: string): Result<Node, ExprError> {
  const toks = lex(src);
  if (!toks.ok) return toks;
  try {
    return { ok: true, value: new Parser(toks.value).parseAll() };
  } catch (e) {
    if (e instanceof ParseFail) return { ok: false, error: e.error };
    throw e;
  }
}
