// H-03 (cảnh báo): ghi games/**/data/**/*.json → kiểm schema (ALG-DEV-05, PSC-DEV-05, FR-DEV-18).
// Validator Ajv biên dịch sẵn (engine/schema/dist/validators.cjs) có từ E1. Trước đó chỉ kiểm JSON hợp lệ.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { guard, isMain, projectDir, warnResult } from './lib/io.mjs';
import { P, matchAny, relToProject } from './lib/patterns.mjs';

const MAX_ERRORS = 10;

export async function check(ev) {
  if (ev.tool_name !== 'Write' && ev.tool_name !== 'Edit') return null;
  const dir = projectDir(ev);
  const rel = relToProject(ev.tool_input?.file_path, dir);
  if (rel === null || !matchAny(rel, P.schemaPaths)) return null;

  let data;
  try {
    data = JSON.parse(readFileSync(join(dir, rel), 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    return warnResult(`H-03: ${rel} không phải JSON hợp lệ: ${err.message}`);
  }
  const validatorsPath = join(dir, 'engine/schema/dist/validators.cjs');
  if (!existsSync(validatorsPath)) return null; // E0: chưa có @gamestudio/schema.
  const v = createRequire(import.meta.url)(validatorsPath);
  const kind = v.kindByPath?.(rel);
  const validate = kind ? v[kind] : undefined;
  if (typeof validate !== 'function' || validate(data)) return null;
  const errs = (validate.errors ?? []).slice(0, MAX_ERRORS).map((e) => `${e.instancePath || '/'} ${e.message}`);
  return warnResult(`H-03: ${rel} sai schema ${kind}: ${errs.join('; ')}`);
}

if (isMain(import.meta.url)) guard('h03-schema', 'PostToolUse', check);
