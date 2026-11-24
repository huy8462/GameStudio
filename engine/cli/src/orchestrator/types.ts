// Kiểu bộ điều phối build (ADR-023; DDD-04 §3.3 StepDef, DTO-CLI-01…05; DDD-00 DTO-GEN-01, 05, §2.4 Clock).
import type { CheckResult } from '@gamestudio/schema';

export type StepId = string;
export type Tier = 'thap' | 'vua' | 'cao' | 'toi_da';
export type Result<T, E = BuildError> = { ok: true; value: T } | { ok: false; error: E };

/** DDD-00 §2.4: thời gian tiêm, không Date.now() trong engine/**. */
export interface Clock {
  now(): number;
}

export interface BuildError {
  code: 'schema' | 'missing_dep' | 'cycle' | 'duplicate' | 'io' | 'unknown_step';
  message: string;
  path?: string;
}

/** step.json (IF-CLI-02, schema step/1) + thư mục chứa nó. */
export interface StepDef {
  id: StepId;
  version: string;
  description?: string;
  deps: StepId[];
  inputs: { dataPointers: string[]; files: string[]; params: Record<string, unknown> };
  runner: 'node' | 'python' | 'blender';
  entry: string;
  perZone: boolean;
  outputs: string[];
  tools?: string[];
  timeoutS?: number;
  /** Thư mục chứa step.json (tuyệt đối, chỉ dùng trong tiến trình, không ghi ra báo cáo). */
  dir: string;
}

export interface StepGraph {
  steps: ReadonlyMap<StepId, StepDef>;
  /** Thứ tự tô-pô ổn định (Kahn, hoà theo id tăng dần). */
  order: readonly StepId[];
}

/** ctx.json (DTO-CLI-01). */
export interface StepCtx {
  gameDir: string;
  gameId: string;
  zone: string | null;
  tier: Tier | null;
  seed: number;
  inputs: { data: Record<string, unknown>; files: string[]; params: Record<string, unknown> };
  upstream: Record<StepId, { outDir: string; outputHash: string }>;
  outDir: string;
  tmpDir: string;
  toolVersions: Record<string, string>;
  logLevel: 'info' | 'debug';
  /** Báo tiến độ (thay dòng stdout `PROGRESS <0-100> <msg>` khi chạy trong tiến trình). */
  progress?: (pct: number, msg: string) => void;
}

/** Phần báo cáo do bước node trả về; bộ điều phối điền phần còn lại của report/1. */
export interface StepReturn {
  result?: CheckResult;
  metrics?: Record<string, number>;
  budget?: Record<string, number>;
  checks?: Report1['checks'];
  warnings?: string[];
  artifacts?: string[];
  summary?: string;
}

/** report/1 (SRS-04 §6.4, DTO-GEN-05) + outputs (DTO-CLI-02). */
export interface Report1 {
  schema: 'report/1';
  kind: 'build' | 'qa' | 'perf' | 'gate' | 'upgrade' | 'import';
  step?: StepId;
  gameId: string;
  zone?: string;
  tier?: Tier;
  inputHash?: string;
  outputHash?: string;
  cached: boolean;
  startedAt: string;
  durationS: number;
  seed?: number;
  metrics: Record<string, number>;
  budget: Record<string, number>;
  result: CheckResult;
  checks: { id: string; result: CheckResult; value?: number; limit?: number; message?: string; source?: string[] }[];
  warnings: string[];
  artifacts: string[];
  outputs?: string[];
  summary: string;
  tool: { name: string; version: string };
  host: string;
  stepVersion?: string;
}

/** meta.json trong thư mục cache (DTO-CLI-04). */
export interface CacheMeta {
  inputHash: string;
  outputHash: string;
  createdAt: string;
  durationS: number;
  host: string;
  stepVersion: string;
}

/** Mục cache/index.json (DTO-CLI-05, SCH-RTM-09). */
export interface CacheIndexEntry {
  step: StepId;
  zone?: string;
  tier?: Tier;
  inputHash: string;
  outputHash: string;
  at: string;
  durationS: number;
  ok: true;
}

export type StepStatus = 'cached' | 'ran' | 'error' | 'skipped';

export interface StepOutcome {
  step: StepId;
  zone: string | null;
  tier: Tier | null;
  status: StepStatus;
  result: CheckResult;
  inputHash?: string;
  outputHash?: string;
  outDir?: string;
  durationS: number;
  error?: string;
  /** Mã thoát SRS-04 §7.2 khi status = 'error'. */
  exitCode?: number;
}

export interface BuildOutcome {
  result: CheckResult;
  exit: number;
  steps: StepOutcome[];
  /** Lỗi trước khi chạy bước nào (đồ thị, dữ liệu, --step lạ). */
  error?: string;
}
