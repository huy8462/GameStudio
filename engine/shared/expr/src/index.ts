// @gamestudio/expr (MOD-GEN-11, MOD-RTM-15; ADR-022, ALG-RTM-04): API công khai.
export { compile } from './compile.js';
export { parse } from './parser.js';
export { lex, type Token, type TokenKind } from './lexer.js';
export type { BinaryOp, Node, UnaryOp } from './ast.js';
export {
  MAX_DEPTH,
  MAX_FN_ARGS,
  MAX_SOURCE_LENGTH,
  type CompiledExpr,
  type ExprContextSpec,
  type ExprEnv,
  type ExprError,
  type ExprErrorCode,
  type ExprType,
  type ExprValue,
  type Result,
} from './types.js';
