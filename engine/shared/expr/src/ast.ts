// AST biểu thức (MOD-RTM-15, PSC-RTM-04).
import type { ExprValue } from './types.js';

export type BinaryOp = '||' | '&&' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '+' | '-' | '*' | '/' | '%';
export type UnaryOp = '!' | '-';

export type Node =
  | { t: 'lit'; value: ExprValue; pos: number }
  | { t: 'ident'; path: string; pos: number }
  | { t: 'unary'; op: UnaryOp; arg: Node; pos: number }
  | { t: 'binary'; op: BinaryOp; left: Node; right: Node; pos: number }
  | { t: 'call'; fn: string; args: Node[]; pos: number };
