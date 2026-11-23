// @gamestudio/schema (MOD-GEN-12): API công khai. Phiếu T-0001: jcs, hash, budget, validate (budgets).
export { canonicalize, JcsError } from './jcs.js';
export { dataHash, jsonHash, sha256Hex } from './hash.js';
export { evaluate, worst, type BudgetCheck, type BudgetEvaluation, type CheckResult } from './budget.js';
export { kindByPath, validate, validateFiles, type SchemaKind, type ValidationError } from './validate.js';
