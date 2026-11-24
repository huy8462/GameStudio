// @gamestudio/schema (MOD-GEN-12): API công khai.
export { canonicalize, JcsError } from './jcs.js';
export { dataHash, jsonHash, sha256Hex } from './hash.js';
export { evaluate, worst, type BudgetCheck, type BudgetEvaluation, type CheckResult } from './budget.js';
export {
  createAjv,
  kindByPath,
  SCHEMA_KINDS,
  toError,
  validate,
  validateFiles,
  type SchemaKind,
  type ValidationError,
} from './validate.js';
export { ROOT_IDS, SCHEMA_DOCS } from './registry.js';
export {
  formatPointer,
  parsePointer,
  pointerAdd,
  pointerGet,
  pointerHas,
  PointerError,
  pointerRemove,
  pointerSet,
  type Json,
} from './pointer.js';
export {
  applyPatch,
  invertPatch,
  touchedFilesOf,
  type ApplyOptions,
  type JsonPatchOp,
  type PatchResult,
} from './patch.js';
