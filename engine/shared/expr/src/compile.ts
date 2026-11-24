// Biên dịch closure (PSC-RTM-04 bước compile, ADR-022): không eval/Function, gập hằng, ngắn mạch.
import type { BinaryOp } from './ast.js';
import type { TNode } from './check.js';
import { check, slotsOf } from './check.js';
import { parse } from './parser.js';
import type { CompiledExpr, ExprContextSpec, ExprEnv, ExprError, ExprValue, Result } from './types.js';

type Fn = (env: ExprEnv) => ExprValue;
type NumFn = (env: ExprEnv) => number;
type BoolFn = (env: ExprEnv) => boolean;

/** Phép tính nhị phân trên giá trị đã đúng kiểu (check bảo đảm). Dùng cho gập hằng. */
function applyBinary(op: BinaryOp, a: ExprValue, b: ExprValue): ExprValue {
  switch (op) {
    case '||':
      return (a as boolean) || (b as boolean);
    case '&&':
      return (a as boolean) && (b as boolean);
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '<':
      return (a as number) < (b as number);
    case '<=':
      return (a as number) <= (b as number);
    case '>':
      return (a as number) > (b as number);
    case '>=':
      return (a as number) >= (b as number);
    case '+':
      return (a as number) + (b as number);
    case '-':
      return (a as number) - (b as number);
    case '*':
      return (a as number) * (b as number);
    case '/':
      return (a as number) / (b as number);
    case '%':
      return (a as number) % (b as number);
  }
}

/** Gập hằng: nút có mọi con là hằng → hằng. Gọi hàm không gập (môi trường quyết định). */
export function fold(n: TNode): TNode {
  switch (n.t) {
    case 'lit':
    case 'ident':
      return n;
    case 'unary': {
      const arg = fold(n.arg);
      if (arg.t === 'lit') {
        const value = n.op === '!' ? !(arg.value as boolean) : -(arg.value as number);
        return { t: 'lit', type: n.type, value };
      }
      return { ...n, arg };
    }
    case 'binary': {
      const left = fold(n.left);
      const right = fold(n.right);
      if (left.t === 'lit' && right.t === 'lit') {
        return { t: 'lit', type: n.type, value: applyBinary(n.op, left.value, right.value) };
      }
      return { ...n, left, right };
    }
    case 'call':
      return { ...n, args: n.args.map(fold) };
  }
}

function emit(n: TNode): Fn {
  switch (n.t) {
    case 'lit': {
      const v = n.value;
      return () => v;
    }
    case 'ident': {
      const s = n.slot;
      return (env) => env.ident(s);
    }
    case 'unary': {
      const a = emit(n.arg);
      if (n.op === '!') return (env) => !(a(env) as boolean);
      return (env) => -(a(env) as number);
    }
    case 'call': {
      const s = n.slot;
      const a0 = n.args[0] ? (emit(n.args[0]) as NumFn) : undefined;
      const a1 = n.args[1] ? (emit(n.args[1]) as NumFn) : undefined;
      if (a0 && a1) return (env) => env.call(s, a0(env), a1(env));
      if (a0) return (env) => env.call(s, a0(env), 0);
      return (env) => env.call(s, 0, 0);
    }
    case 'binary':
      return emitBinary(n.op, emit(n.left), emit(n.right));
  }
}

function emitBinary(op: BinaryOp, l: Fn, r: Fn): Fn {
  const ln = l as NumFn;
  const rn = r as NumFn;
  const lb = l as BoolFn;
  const rb = r as BoolFn;
  switch (op) {
    case '||':
      return (env) => lb(env) || rb(env);
    case '&&':
      return (env) => lb(env) && rb(env);
    case '==':
      return (env) => l(env) === r(env);
    case '!=':
      return (env) => l(env) !== r(env);
    case '<':
      return (env) => ln(env) < rn(env);
    case '<=':
      return (env) => ln(env) <= rn(env);
    case '>':
      return (env) => ln(env) > rn(env);
    case '>=':
      return (env) => ln(env) >= rn(env);
    case '+':
      return (env) => ln(env) + rn(env);
    case '-':
      return (env) => ln(env) - rn(env);
    case '*':
      return (env) => ln(env) * rn(env);
    case '/':
      return (env) => ln(env) / rn(env);
    case '%':
      return (env) => ln(env) % rn(env);
  }
}

/** compile(src, spec) (DDD-04 §3.2): biên dịch một lần khi nạp; eval không cấp phát. */
export function compile(src: string, spec: ExprContextSpec): Result<CompiledExpr, ExprError> {
  const ast = parse(src);
  if (!ast.ok) return ast;
  const slots = slotsOf(spec);
  const typed = check(ast.value, spec, slots);
  if (!typed.ok) return typed;
  const root = fold(typed.value);
  const run = emit(root);
  const compiled: CompiledExpr = Object.freeze({
    src,
    type: root.type,
    identSlots: Object.freeze([...slots.idents.keys()]),
    fnSlots: Object.freeze([...slots.fns.keys()]),
    eval: run,
  });
  return { ok: true, value: compiled };
}
