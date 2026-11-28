// Bộ kiểm công cụ chung của `engine doctor` (PSC-DEV-06, ALG-DEV-06).
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { Runner } from './exec.js';
import type { CheckKind, DoctorCheck, ToolSpec } from './types.js';
import { mkCheck } from './types.js';
import { parseVersion, versionMatches, wantLabel } from './versions.js';

export const MS = 1000;

export const mismatchMsg = (id: string, want: string, have: string): string =>
  `ERR-DEV-04 ${id}: cần ${want}, đang có ${have}.`;

export function missingCheck(id: string, kind: CheckKind, want: string, optional: boolean, why: string): DoctorCheck {
  return mkCheck({ id, kind, want, have: why, status: 'missing', optional, message: mismatchMsg(id, want, why) });
}

/** Kiểm một công cụ có `check` + `parse`, kèm `features` (vd. ffmpeg có bộ mã aac, ktx có create). */
export async function checkTool(id: string, spec: ToolSpec, run: Runner): Promise<DoctorCheck[]> {
  if (spec.check === undefined || spec.parse === undefined) return [];
  const want = wantLabel(spec.version, spec.match);
  const optional = spec.optional === true;
  const timeout = (spec.timeoutS ?? 10) * MS;
  const r = await run(spec.check, timeout);
  if (!r.found) return [missingCheck(id, 'version', want, optional, r.timedOut ? 'hết giờ' : 'không tìm thấy')];
  const have = parseVersion(r.output, spec.parse);
  if (have === undefined) return [missingCheck(id, 'version', want, optional, 'không đọc được phiên bản')];
  const ok = versionMatches(have, spec.version, spec.match);
  const out: DoctorCheck[] = [
    mkCheck({
      id,
      kind: 'version',
      want,
      have,
      status: ok ? 'ok' : 'mismatch',
      optional,
      message: ok ? `${id} ${have}.` : mismatchMsg(id, want, have),
    }),
  ];
  for (const f of spec.features ?? []) {
    const fr = await run(f.check, timeout);
    const fok = fr.found && new RegExp(f.expect, 'm').test(fr.output);
    out.push(
      mkCheck({
        id: `${id}.${f.id}`,
        kind: 'binary',
        want: 'co',
        have: fok ? 'co' : 'khong',
        status: fok ? 'ok' : 'missing',
        optional,
        message: fok ? `${id}: có ${f.id}.` : mismatchMsg(`${id}.${f.id}`, 'có', 'không'),
      }),
    );
  }
  return out;
}

function playwrightRoot(env: NodeJS.ProcessEnv): string {
  const custom = env['PLAYWRIGHT_BROWSERS_PATH'];
  if (custom !== undefined && custom !== '') return custom;
  if (process.platform === 'win32')
    return join(env['LOCALAPPDATA'] ?? join(homedir(), 'AppData', 'Local'), 'ms-playwright');
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Caches', 'ms-playwright');
  return join(homedir(), '.cache', 'ms-playwright');
}

/** Chromium của Playwright: thư mục `chromium-<revision>` trong cache (không mở trình duyệt). */
export function checkChromium(spec: ToolSpec, env: NodeJS.ProcessEnv): DoctorCheck[] {
  const root = playwrightRoot(env);
  const dirs = existsSync(root) ? readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)) : [];
  const want = spec.version;
  const ok = dirs.includes(`chromium-${want}`);
  const have =
    dirs
      .map((d) => d.slice('chromium-'.length))
      .sort()
      .join(', ') || 'không có';
  const status = ok ? 'ok' : dirs.length > 0 ? 'mismatch' : 'missing';
  return [
    mkCheck({
      id: 'chromium',
      kind: 'path',
      want,
      have,
      status,
      optional: spec.optional === true,
      message: ok
        ? `chromium (playwright) bản ${want}.`
        : `${mismatchMsg('chromium', want, have)} Chạy: pnpm exec playwright install chromium.`,
    }),
  ];
}
