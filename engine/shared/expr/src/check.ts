// Kiểm tĩnh (PSC-RTM-04 bước check): định danh/hàm trong danh sách trắng → slot, số đối, kiểu.
import type { BinaryOp, Node, UnaryOp } from './ast.js';
import type { ExprContextSpec, ExprError, ExprType, ExprValue, Result } from './types.js';
import { MAX_FN_ARGS } from './types.js';

/** Nút đã kiểm: có kiểu, định danh/hàm đã thành slot. */
export type TNode =
  | { t: 'lit'; type: ExprType; value: ExprValue }
  | { t: 'ident'; type: ExprType; slot: number }
  | { t: 'unary'; type: ExprType; op: UnaryOp; arg: TNode }
  | { t: 'binary'; type: ExprType; op: BinaryOp; left: TNode; right: TNode }
  | { t: 'call'; type: ExprType; slot: number; args: TNode[] };

class CheckFail {
  constructor(readonly error: ExprError) {}
}

const fail = (code: ExprError['code'], pos: number, message: string): never => {
  throw new CheckFail({ code, pos, message });
};

const typeOfValue = (v: ExprValue): ExprType =>
  typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'bool' : 'string';

const NUM_OPS = new Set<BinaryOp>(['+', '-', '*', '/', '%']);
const CMP_OPS = new Set<BinaryOp>(['<', '<=', '>', '>=']);

export interface Slots {
  idents: Map<string, number>;
  fns: Map<string, number>;
}

export function slotsOf(spec: ExprContextSpec): Slots {
  return {
    idents: new Map(Object.keys(spec.idents).map((k, i) => [k, i])),
    fns: new Map(Object.keys(spec.fns).map((k, i) => [k, i])),
  };
}

function need(n: Node, got: ExprType, want: ExprType, what: string): void {
  if (got !== want) fail('type', n.pos, `${what} cần ${want}, nhận ${got}`);
}

function visit(n: Node, spec: ExprContextSpec, slots: Slots): TNode {
  switch (n.t) {
    case 'lit':
      return { t: 'lit', type: typeOfValue(n.value), value: n.value };
    case 'ident': {
      const slot = slots.idents.get(n.path);
      const type = spec.idents[n.path];
      if (slot === undefined || type === undefined) return fail('unknown_ident', n.pos, `định danh lạ '${n.path}'`);
      return { t: 'ident', type, slot };
    }
    case 'unary': {
      const arg = visit(n.arg, spec, slots);
      need(n, arg.type, n.op === '!' ? 'bool' : 'number', `'${n.op}'`);
      return { t: 'unary', type: arg.type, op: n.op, arg };
    }
    case 'binary': {
      const left = visit(n.left, spec, slots);
      const right = visit(n.right, spec, slots);
      if (n.op === '&&' || n.op === '||') {
        need(n, left.type, 'bool', `'${n.op}'`);
        need(n, right.type, 'bool', `'${n.op}'`);
        return { t: 'binary', type: 'bool', op: n.op, left, right };
      }
      if (n.op === '==' || n.op === '!=') {
        if (left.type !== right.type)
          fail('type', n.pos, `'${n.op}' cần hai vế cùng kiểu (${left.type}, ${right.type})`);
        return { t: 'binary', type: 'bool', op: n.op, left, right };
      }
      need(n, left.type, 'number', `'${n.op}'`);
      need(n, right.type, 'number', `'${n.op}'`);
      const type: ExprType = CMP_OPS.has(n.op)
        ? 'bool'
        : NUM_OPS.has(n.op)
          ? 'number'
          : fail('syntax', n.pos, 'toán tử lạ');
      return { t: 'binary', type, op: n.op, left, right };
    }
    case 'call': {
      const slot = slots.fns.get(n.fn);
      const def = spec.fns[n.fn];
      if (slot === undefined || def === undefined) return fail('unknown_fn', n.pos, `hàm không được phép '${n.fn}'`);
      if (def.args > MAX_FN_ARGS) fail('arity', n.pos, `hàm '${n.fn}' khai báo quá ${MAX_FN_ARGS} đối`);
      if (n.args.length !== def.args) {
        fail('arity', n.pos, `hàm '${n.fn}' cần ${def.args} đối, nhận ${n.args.length}`);
      }
      const args = n.args.map((a) => {
        const ta = visit(a, spec, slots);
        need(a, ta.type, 'number', `đối của '${n.fn}'`);
        return ta;
      });
      return { t: 'call', type: def.ret, slot, args };
    }
  }
}

export function check(ast: Node, spec: ExprContextSpec, slots: Slots = slotsOf(spec)): Result<TNode, ExprError> {
  try {
    return { ok: true, value: visit(ast, spec, slots) };
  } catch (e) {
    if (e instanceof CheckFail) return { ok: false, error: e.error };
    throw e;
  }
}
