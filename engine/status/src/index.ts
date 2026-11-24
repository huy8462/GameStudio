// @gamestudio/status (MOD-GEN-20, 21; DDD-00 §3.7; ALG-GEN-05): API công khai, thuần TS, không I/O, không mạng.
export { computeStatus, STAGE_LABEL, STAGES } from './compute.js';
export { DEFAULT_MINUTES, estimateSeconds, planStale, type PlanStaleOptions } from './plan-stale.js';
export { summarizeVi } from './summarize-vi.js';
export type {
  CacheIndexEntry,
  NextAction,
  PlanNode,
  Stage,
  StaleItem,
  StaleReason,
  StatusInputs,
  StatusReport,
  StepId,
  Tier,
  ZoneStatus,
} from './types.js';
