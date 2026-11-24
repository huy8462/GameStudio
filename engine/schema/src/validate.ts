// Kiểm dữ liệu game theo JSON Schema 2020-12 (MOD-GEN-07, ADR-021, SCH-RTM-01).
// Biên dịch lúc chạy (CLI, test). Bản biên dịch sẵn cho runtime và hook H-03: scripts/gen-validators.mjs (MOD-RTM-04).
import { Ajv2020, type ErrorObject, type Options, type ValidateFunction } from 'ajv/dist/2020.js';

import { kindByPath, ROOT_IDS, SCHEMA_DOCS, type AnyKind } from './registry.js';

export { BUILD_KINDS, kindByPath, SCHEMA_KINDS, type AnyKind, type BuildKind, type SchemaKind } from './registry.js';

export interface ValidationError {
  instancePath: string;
  keyword: string;
  message: string;
}

/** Ajv dùng chung cấu hình cho bản chạy và bản biên dịch sẵn. */
export function createAjv(extra: Options = {}): Ajv2020 {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    // Schema cố ý dùng kiểu hợp, vd styleBibleVersion: integer|null, state: number|boolean|string.
    allowUnionTypes: true,
    // world.json dùng if/then để bắt buộc origin/bbox theo source; trường đã khai báo ở properties gốc.
    // strictRequired của Ajv không nhìn thấy khai báo đó qua if/then nên báo nhầm.
    strictRequired: false,
    // Định dạng dùng trong schema; khai báo tay để không kéo thêm ajv-formats.
    formats: { date: /^\d{4}-\d{2}-\d{2}$/ },
    ...extra,
  });
  for (const doc of SCHEMA_DOCS) ajv.addSchema(doc);
  return ajv;
}

let ajv: Ajv2020 | undefined;
const compiled = new Map<AnyKind, ValidateFunction>();

function validator(kind: AnyKind): ValidateFunction {
  let fn = compiled.get(kind);
  if (fn === undefined) {
    ajv ??= createAjv();
    fn = ajv.getSchema(ROOT_IDS[kind]);
    if (fn === undefined) throw new Error(`Không có schema cho kind '${kind}'`);
    compiled.set(kind, fn);
  }
  return fn;
}

export function toError(e: ErrorObject): ValidationError {
  const p = e.params as { additionalProperty?: unknown; allowedValues?: unknown };
  const extra =
    e.keyword === 'additionalProperties'
      ? ` (${String(p.additionalProperty)})`
      : e.keyword === 'enum'
        ? ` (${JSON.stringify(p.allowedValues)})`
        : '';
  return { instancePath: e.instancePath || '/', keyword: e.keyword, message: `${e.message ?? 'không hợp lệ'}${extra}` };
}

export function validate(kind: AnyKind, data: unknown): ValidationError[] {
  const fn = validator(kind);
  return fn(data) ? [] : (fn.errors ?? []).map(toError);
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
