// Result và lỗi intake (DDD-00 DTO-GEN-01; DDD-01 §9). Tách riêng để llm/types.ts và types.ts không import vòng.
export type Result<T, E = IntakeError> = { ok: true; value: T } | { ok: false; error: E };

export type IntakeErrorCode =
  | 'ERR-INT-01'
  | 'ERR-INT-04'
  | 'ERR-INT-05'
  | 'ERR-INT-08'
  | 'HANDOFF_PENDING'
  | 'HANDOFF_INVALID'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_STATE'
  | 'SESSION_CLOSED';

export interface IntakeError {
  code: IntakeErrorCode;
  message: string;
  detail?: unknown;
}

export const err = (code: IntakeErrorCode, message: string, detail?: unknown): { ok: false; error: IntakeError } => ({
  ok: false,
  error: detail === undefined ? { code, message } : { code, message, detail },
});
