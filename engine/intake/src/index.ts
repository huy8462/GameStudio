// @gamestudio/intake (MOD-GEN-13, MOD-INT-01; DDD-01): API công khai, không dùng node:* (dùng được ở web).
// HandoffLlmClient (đọc/ghi tệp) xuất riêng ở '@gamestudio/intake/node'.
export {
  analyze,
  answer,
  briefHash,
  confirm,
  EXPIRE_AFTER_DAYS,
  expireSessions,
  generate,
  REMIND_AFTER_DAYS,
  reopenSession,
  type Step,
} from './session.js';
export { REQUIRED_DATA, reverseBrief, toReverseResult, type ReverseBriefResult } from './reverse/reverse-brief.js';
export { deriveFields } from './reverse/derive.js';
export { coveredBy, summarizeData, type DataSummary } from './reverse/summary.js';
export { buildReverseBrief, UNKNOWN } from './reverse/bundle.js';
export { applyPostRules } from './analyze/post-rules.js';
export { enforceEvidence } from './analyze/evidence.js';
export { validateInput } from './analyze/validate-input.js';
export { defaultFor, pendingFields } from './clarify/select.js';
export { buildDeterministic, gameSeed, zonesFor } from './generate/deterministic.js';
export { renderBrief } from './generate/brief-render.js';
export { FakeLlmClient } from './llm/fake.js';
export { MemoryIntakeStore } from './store.js';
export { SCHEMAS, validateOutput } from './schemas/index.js';
export { PROMPTS } from './prompts.js';
export { slugify } from './text.js';
export type { ContentPart, LlmClient, LlmRequest, LlmResult, LlmTask, Msg } from './llm/types.js';
export type {
  Answers,
  Assumption,
  BriefJson,
  ClarifyChoice,
  ClarifyQuestion,
  Clock,
  Deps,
  FieldKey,
  FieldSource,
  FieldState,
  FieldStatus,
  GameDataFiles,
  GeneratedBundle,
  IntakeAnalysis,
  IntakeError,
  IntakeErrorCode,
  IntakeImage,
  IntakeInput,
  IntakeSessionState,
  IntakeStatus,
  IntakeStore,
  Result,
  SourcePaths,
} from './types.js';
