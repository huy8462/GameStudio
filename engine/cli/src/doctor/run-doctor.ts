// runDoctor (DDD-09 §3.2 IF-DEV-03, PSC-DEV-06). Thoát 5 khi có mục bắt buộc missing/mismatch.
import { readFileSync } from 'node:fs';

import { EXIT } from '../exit-codes.js';
import { checkBlender } from './blender-check.js';
import { checkChromium, checkPinned, checkTool } from './checks.js';
import { checkEnv } from './env-roles.js';
import type { Runner } from './exec.js';
import { runCommand } from './exec.js';
import type { DoctorCheck, DoctorReport, Role, VersionsFile } from './types.js';
import { mkCheck } from './types.js';
import { appliesTo, parseVersionsFile } from './versions.js';

export interface DoctorOptions {
  role?: Role;
  versionsPath: string;
  probePath: string;
  env?: NodeJS.ProcessEnv;
  run?: Runner;
}

export async function runDoctor(o: DoctorOptions): Promise<{ report: DoctorReport; exitCode: 0 | 5 }> {
  const role = o.role ?? 'dev';
  const env = o.env ?? process.env;
  const run = o.run ?? runCommand;
  let versions: VersionsFile;
  try {
    // Bỏ BOM: trình soạn thảo/PowerShell trên Windows hay ghi UTF-8 có BOM.
    const text = readFileSync(o.versionsPath, 'utf8').replace(/^\uFEFF/, '');
    versions = parseVersionsFile(JSON.parse(text) as unknown);
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    const check = mkCheck({
      id: 'versions.json',
      kind: 'path',
      want: 'hợp lệ (SCH-DEV-03)',
      have: why,
      status: 'mismatch',
      message: `ERR-DEV-04 versions.json: cần hợp lệ (SCH-DEV-03), đang có lỗi: ${why}`,
    });
    return { report: { ok: false, role, checks: [check] }, exitCode: EXIT.ENVIRONMENT };
  }

  const jobs: Promise<DoctorCheck[]>[] = [];
  for (const [id, spec] of versions.tools) {
    if (!appliesTo(spec, role)) continue;
    if (spec.probe === 'blender') jobs.push(checkBlender(spec, versions.addons, o.probePath, run));
    else if (spec.probe === 'chromium') jobs.push(Promise.resolve(checkChromium(spec, env)));
    else if (spec.probe === 'pinned') jobs.push(Promise.resolve([checkPinned(id, spec)]));
    else jobs.push(checkTool(id, spec, run));
  }
  const checks = (await Promise.all(jobs)).flat();
  checks.push(...checkEnv(role, env));

  const ok = checks.every((c) => c.status === 'ok' || c.optional === true);
  return { report: { ok, role, checks }, exitCode: ok ? EXIT.OK : EXIT.ENVIRONMENT };
}
