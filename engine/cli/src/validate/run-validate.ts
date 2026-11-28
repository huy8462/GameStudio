// Logic `engine validate` (TC-GEN-01, TST-GEN-01, EP-DEV-06, EP-INT-02; FR-RTM-01, AC-04-06).
// Thuần (trừ đọc tệp) để test được: nhận danh sách đường dẫn, trả báo cáo + mã thoát.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { createAjv, kindByPath, toError, validate, type SchemaKind, type ValidationError } from '@gamestudio/schema';

import { EXIT } from '../exit-codes.js';

export interface FileResult {
  path: string;
  kind: SchemaKind | 'custom' | null;
  errors: ValidationError[];
}

export interface ValidateReport {
  schema: 'validate/1';
  ok: boolean;
  checked: number;
  skipped: number;
  files: FileResult[];
}

const toPosix = (p: string): string => p.replace(/\\/g, '/');

/** 'games/<id>/data/x.json' hoặc 'data/x.json' → kind theo bảng DDD-00 §3.3. */
export function kindOfRepoPath(p: string): SchemaKind | undefined {
  const m = /(?:^|\/)(data\/.+)$/.exec(toPosix(p));
  return m?.[1] === undefined ? undefined : kindByPath(m[1]);
}

function readJson(abs: string): { ok: true; data: unknown } | { ok: false; error: ValidationError } {
  try {
    return { ok: true, data: JSON.parse(readFileSync(abs, 'utf8').replace(/^\uFEFF/, '')) as unknown };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { instancePath: '/', keyword: 'json', message: `JSON không hợp lệ: ${message}` } };
  }
}

function walkJson(dir: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walkJson(abs, out);
    else if (name.endsWith('.json')) out.push(abs);
  }
}

/** Mọi tệp JSON dưới games/<id>/data/ (kể cả _template). */
export function listAll(root: string): string[] {
  const games = join(root, 'games');
  const out: string[] = [];
  if (!existsSync(games)) return out;
  for (const g of readdirSync(games).sort()) {
    const data = join(games, g, 'data');
    if (existsSync(data) && statSync(data).isDirectory()) walkJson(data, out);
  }
  return out;
}

/** Tệp JSON dữ liệu game đã stage (thêm/sửa/đổi tên), theo git. */
export function listStaged(root: string): string[] {
  const r = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`git diff --cached lỗi: ${r.stderr.trim()}`);
  return r.stdout
    .split('\0')
    .filter((p) => /^games\/[^/]+\/data\/.+\.json$/.test(p))
    .map((p) => join(root, p));
}

/** Kiểm danh sách tệp theo bảng kind; tệp không có kind → bỏ qua (chỉ kiểm cú pháp JSON). */
export function validatePaths(root: string, paths: readonly string[]): ValidateReport {
  const files: FileResult[] = [];
  let skipped = 0;
  for (const abs of paths) {
    const rel = toPosix(relative(root, abs));
    const parsed = readJson(abs);
    const kind = kindOfRepoPath(rel) ?? null;
    if (!parsed.ok) {
      files.push({ path: rel, kind, errors: [parsed.error] });
      continue;
    }
    if (kind === null) {
      skipped += 1;
      continue;
    }
    files.push({ path: rel, kind, errors: validate(kind, parsed.data) });
  }
  return finish(files, skipped);
}

/** `--schema <tệp schema>`: kiểm tệp theo một JSON Schema bất kỳ (EP-INT-02, handoff intake). */
export function validateWithSchema(root: string, schemaPath: string, paths: readonly string[]): ValidateReport {
  const schema = readJson(schemaPath);
  if (!schema.ok) {
    return finish([{ path: toPosix(relative(root, schemaPath)), kind: 'custom', errors: [schema.error] }], 0);
  }
  // Tệp schema trùng $id với schema đã đăng ký (vd. schemas/audio/1.json, T-0018): dùng bản đã đăng ký, không compile lần hai.
  const ajv = createAjv();
  const id = (schema.data as { $id?: unknown }).$id;
  const fn = (typeof id === 'string' ? ajv.getSchema(id) : undefined) ?? ajv.compile(schema.data as object);
  const files = paths.map((abs): FileResult => {
    const rel = toPosix(relative(root, abs));
    const parsed = readJson(abs);
    if (!parsed.ok) return { path: rel, kind: 'custom', errors: [parsed.error] };
    return { path: rel, kind: 'custom', errors: fn(parsed.data) ? [] : (fn.errors ?? []).map(toError) };
  });
  return finish(files, 0);
}

function finish(files: FileResult[], skipped: number): ValidateReport {
  return { schema: 'validate/1', ok: files.every((f) => f.errors.length === 0), checked: files.length, skipped, files };
}

export const exitOf = (r: ValidateReport): number => (r.ok ? EXIT.OK : EXIT.DATA);

export const resolveAll = (cwd: string, paths: readonly string[]): string[] => paths.map((p) => resolve(cwd, p));
