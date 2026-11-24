// Kiểu @gamestudio/status (DDD-00 §3.7: DTO-GEN-08 StatusReport status/1, DTO-GEN-09 phần nguồn, StaleItem; SRS-04 §6.6).
export type StepId = string;
export type Tier = 'thap' | 'vua' | 'cao' | 'toi_da';

/** Một nút của đồ thị build: (bước, zone) với khoá '<bước>@<zone|->' và đủ khoá phụ thuộc. */
export interface PlanNode {
  key: string;
  step: StepId;
  zone: string | null;
  deps: string[];
}

/** Mục cache/index.json (DDD-04 DTO-CLI-05, SCH-RTM-09). */
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

export type StaleReason = 'never' | 'input_changed' | 'upstream_stale';

export interface StaleItem {
  key: string;
  step: StepId;
  zone: string | null;
  tier: Tier | null;
  reason: StaleReason;
  /** inputHash mong đợi; '' khi upstream còn cũ (chưa biết đầu ra mới). */
  inputHash: string;
  estS: number;
}

export type Stage =
  'TaoMoi' | 'ChoXacNhanBrief' | 'ChoDuyetStyle' | 'ChuaBuild' | 'CanBuild' | 'ChuaQA' | 'SanSangXuatBan' | 'DaXuatBan';

export type NextAction = 'answer' | 'confirm_brief' | 'approve_style' | 'build' | 'qa' | 'publish' | 'upgrade' | 'none';

export interface ZoneStatus {
  id: string;
  built: boolean;
  staleSteps: StepId[];
  estimateMinutes?: number;
  qa: 'pass' | 'fail' | 'cu' | 'chua';
}

/** DTO-GEN-08 / SRS-04 §6.6 (status/1). */
export interface StatusReport {
  schema: 'status/1';
  gameId: string;
  dataVersion: number;
  stage: Stage;
  brief: { status: 'Nhap' | 'ChoXacNhan' | 'DaXacNhan'; version: number } | null;
  style: 'ChuaCo' | 'ChoDuyet' | 'DaDuyet';
  zones: ZoneStatus[];
  flags: {
    deXuatChoDuyet: number;
    assetChoDuyet: number;
    jobLoi: number;
    canNangCap: boolean;
    thieuProvenance: number;
    thayDoiChuaXuatBan: number;
    dangKhoaBoi?: string;
  };
  lastPublication: { version: number; dataVersion: number; chuaDat: boolean } | null;
  pendingIntake: { sessionId: string; pendingQuestions: number } | null;
  next: { action: NextAction; args: string; label: string };
}

/** Dữ liệu đã đọc sẵn (DTO-GEN-09 sau khi nạp); nơi gọi (CLI/web) chịu trách nhiệm I/O. */
export interface StatusInputs {
  gameId: string;
  dataVersion: number;
  brief: StatusReport['brief'];
  style: StatusReport['style'];
  zones: readonly string[];
  nodes: readonly PlanNode[];
  cache: readonly CacheIndexEntry[];
  stale: readonly StaleItem[];
  qaReports: readonly { zone: string; result: 'pass' | 'fail'; buildHash: string }[];
  publications: readonly { version: number; dataVersion: number; notMet: boolean; takenDown: boolean }[];
  pendingIntake: StatusReport['pendingIntake'];
  counts: {
    proposalsPending: number;
    assetsPending: number;
    jobsFailed: number;
    missingProvenance: number;
    versionsSincePublish: number;
    lockedBy?: string;
  };
  canNangCap: boolean;
}
