// Kiểu công khai của @gamestudio/expr (DDD-04 §3.2, ALG-RTM-04, DTO-GEN-01; ADR-022).

/** DTO-GEN-01: hàm thư viện không ném lỗi nghiệp vụ. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export type ExprType = 'number' | 'bool' | 'string';
export type ExprValue = number | boolean | string;

/** Ngữ cảnh do nơi dùng cấp: định danh và hàm trong danh sách trắng. Slot = vị trí khoá. */
export interface ExprContextSpec {
  idents: Record<string, ExprType>;
  fns: Record<string, { args: number; ret: 'number' | 'bool' }>;
}

/** Môi trường đánh giá; không cấp phát trong vòng nóng. */
export interface ExprEnv {
  ident(slot: number): ExprValue;
  call(fnSlot: number, a0: number, a1: number): number | boolean;
}

export interface CompiledExpr {
  readonly src: string;
  /** Kiểu kết quả (thêm so với DDD-04: để nơi dùng bắt buộc điều kiện là bool). */
  readonly type: ExprType;
  /** Tên định danh/hàm theo slot (thêm so với DDD-04). */
  readonly identSlots: readonly string[];
  readonly fnSlots: readonly string[];
  eval(env: ExprEnv): ExprValue;
}

export type ExprErrorCode = 'syntax' | 'unknown_ident' | 'unknown_fn' | 'type' | 'arity';

export interface ExprError {
  code: ExprErrorCode;
  /** Vị trí ký tự (0-based) trong nguồn. */
  pos: number;
  message: string;
}

export const MAX_SOURCE_LENGTH = 512;
export const MAX_DEPTH = 32;
export const MAX_FN_ARGS = 2;
