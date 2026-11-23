// Kiểm dữ liệu game theo JSON Schema 2020-12 (MOD-GEN-07, ADR-021, SCH-RTM-01).
// Phiếu T-0001 chỉ có schema `budgets`; các kind khác thêm dần. Bản Ajv standalone biên dịch sẵn cho runtime
// và hook H-03 (`dist/validators.*`, MOD-RTM-04) làm ở phiếu sau; ở đây biên dịch lúc chạy (CLI, test).
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';

import budgetsV1 from '../schemas/budgets/1.json' with { type: 'json' };

export type SchemaKind = 'budgets';

export interface ValidationError {
  instancePath: string;
  keyword: string;
  message: string;
}

const SCHEMAS: Record<SchemaKind, object> = { budgets: budgetsV1 };

/** Bảng `kindByPath` (DDD-00 §3.3), đường dẫn tương đối `games/<id>/`, dùng '/'. */
const KIND_BY_PATH: readonly [RegExp, SchemaKind][] = [[/^data\/budgets\.json$/, 'budgets']];

let ajv: Ajv2020 | undefined;
const compiled = new Map<SchemaKind, ValidateFunction>();

function validator(kind: SchemaKind): ValidateFunction {
  let fn = compiled.get(kind);
  if (fn === undefined) {
    ajv ??= new Ajv2020({
      allErrors: true,
      strict: true,
      // Định dạng dùng trong schema; khai báo tay để không kéo thêm ajv-formats.
      formats: { date: /^\d{4}-\d{2}-\d{2}$/ },
    });
    fn = ajv.compile(SCHEMAS[kind]);
    compiled.set(kind, fn);
  }
  return fn;
}

function toError(e: ErrorObject): ValidationError {
  const extra =
    e.keyword === 'additionalProperties'
      ? ` (${String((e.params as { additionalProperty?: unknown }).additionalProperty)})`
      : '';
  return { instancePath: e.instancePath || '/', keyword: e.keyword, message: `${e.message ?? 'không hợp lệ'}${extra}` };
}

export function validate(kind: SchemaKind, data: unknown): ValidationError[] {
  const fn = validator(kind);
  return fn(data) ? [] : (fn.errors ?? []).map(toError);
}

export function kindByPath(relPath: string): SchemaKind | undefined {
  const p = relPath.replace(/\\/g, '/');
  return KIND_BY_PATH.find(([re]) => re.test(p))?.[1];
}

/** Kiểm nhiều tệp (khoá: đường dẫn tương đối `games/<id>/`); tệp không có kind được bỏ qua. */
export function validateFiles(files: Readonly<Record<string, unknown>>): Record<string, ValidationError[]> {
  const out: Record<string, ValidationError[]> = {};
  for (const path of Object.keys(files).sort()) {
    const kind = kindByPath(path);
    if (kind !== undefined) out[path] = validate(kind, files[path]);
  }
  return out;
}
