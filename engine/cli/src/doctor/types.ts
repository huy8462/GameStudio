// Kiểu cho `engine doctor` (DDD-09 §3.2 IF-DEV-03, DTO-DEV-03 / SCH-DEV-03).

export type Role = 'dev' | 'worker' | 'ci';
export const ROLES: readonly Role[] = ['dev', 'worker', 'ci'];

export type CheckKind = 'version' | 'binary' | 'addon' | 'env' | 'path';
export type CheckStatus = 'ok' | 'missing' | 'mismatch';

export interface DoctorCheck {
  id: string;
  kind: CheckKind;
  want?: string;
  have?: string;
  status: CheckStatus;
  message: string;
  /** Mở rộng nhỏ so với IF-DEV-03: mục tuỳ chọn không làm doctor thất bại. */
  optional?: true;
}

export interface DoctorReport {
  ok: boolean;
  role: Role;
  checks: DoctorCheck[];
}

export type MatchRule = 'exact' | 'minor';

export interface FeatureSpec {
  id: string;
  check: string[];
  /** Regex phải khớp stdout+stderr của lệnh `check`. */
  expect: string;
}

export interface ToolSpec {
  version: string;
  match: MatchRule;
  /** argv lấy phiên bản; không có khi `probe` = 'pinned'. */
  check?: string[];
  /** Regex, nhóm 1 là phiên bản. */
  parse?: string;
  probe?: 'blender' | 'chromium' | 'pinned';
  roles?: Role[];
  optional?: boolean;
  timeoutS?: number;
  features?: FeatureSpec[];
}

export interface AddonSpec {
  module: string;
  version: string;
  sha256: string;
}

export interface VersionsFile {
  tools: [string, ToolSpec][];
  addons: [string, AddonSpec][];
}

/** Tạo DoctorCheck, bỏ trường undefined (exactOptionalPropertyTypes). */
export function mkCheck(c: {
  id: string;
  kind: CheckKind;
  status: CheckStatus;
  message: string;
  want?: string | undefined;
  have?: string | undefined;
  optional?: boolean | undefined;
}): DoctorCheck {
  const out: DoctorCheck = { id: c.id, kind: c.kind, status: c.status, message: c.message };
  if (c.want !== undefined) out.want = c.want;
  if (c.have !== undefined) out.have = c.have;
  if (c.optional === true) out.optional = true;
  return out;
}
