// Kiểm Unity (role dev): ProjectVersion.txt, Editor cài qua Hub (+ WebGL), gói Unity theo manifest/lock.
// DDD-09 PSC-DEV-06, DTO-DEV-03 (CR-02, ADR-036, POC-U1; T-0023). Không mở Editor, không cần mạng.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { mismatchMsg } from './checks.js';
import type { CheckKind, DoctorCheck, ToolSpec } from './types.js';
import { mkCheck } from './types.js';

const NONE = 'không có';

function readJson(path: string): Record<string, unknown> | undefined {
  try {
    const v = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')) as unknown;
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/** Gốc các Editor của Unity Hub; `UNITY_HUB_EDITORS` ghi đè (máy dev cài ở chỗ khác). */
export function editorRoots(env: NodeJS.ProcessEnv): string[] {
  const custom = env['UNITY_HUB_EDITORS'];
  if (custom !== undefined && custom !== '') return [custom];
  if (process.platform === 'win32') return [join(env['ProgramFiles'] ?? 'C:\\Program Files', 'Unity', 'Hub', 'Editor')];
  if (process.platform === 'darwin') return ['/Applications/Unity/Hub/Editor'];
  return [join(homedir(), 'Unity', 'Hub', 'Editor')];
}

function row(id: string, kind: CheckKind, want: string, have: string, hint = ''): DoctorCheck {
  const ok = have === want;
  const missing = have === NONE;
  return mkCheck({
    id,
    kind,
    want,
    have,
    status: ok ? 'ok' : missing ? 'missing' : 'mismatch',
    message: ok ? `${id} ${have}.` : `${mismatchMsg(id, want, have)}${hint}`,
  });
}

export function checkUnity(spec: ToolSpec, repoRoot: string, env: NodeJS.ProcessEnv): DoctorCheck[] {
  const want = spec.version;
  const proj = join(repoRoot, 'engine', 'unity');
  const out: DoctorCheck[] = [];

  let have = NONE;
  try {
    const txt = readFileSync(join(proj, 'ProjectSettings', 'ProjectVersion.txt'), 'utf8');
    have = /^m_EditorVersion:\s*(\S+)/m.exec(txt)?.[1] ?? NONE;
  } catch {
    // giữ NONE
  }
  out.push(row('unity', 'version', want, have));

  const dir = editorRoots(env)
    .map((r) => join(r, want))
    .find((d) => existsSync(d));
  out.push(
    row(
      'unity.editor',
      'path',
      want,
      dir === undefined ? NONE : want,
      ' Cài qua Unity Hub (UNITY_HUB_EDITORS nếu cài chỗ khác).',
    ),
  );
  const webgl = dir !== undefined && existsSync(join(dir, 'Editor', 'Data', 'PlaybackEngines', 'WebGLSupport'));
  out.push(row('unity.webgl', 'path', 'co', webgl ? 'co' : NONE, ' Thêm module Web Build Support.'));

  const deps = (f: string): Record<string, unknown> =>
    (readJson(join(proj, 'Packages', f))?.['dependencies'] ?? {}) as Record<string, unknown>;
  const manifest = deps('manifest.json');
  const lock = deps('packages-lock.json');
  for (const [pkg, pin] of Object.entries(spec.packages ?? {})) {
    const m = manifest[pkg];
    const l = (lock[pkg] as { version?: string } | undefined)?.version;
    const got = typeof m !== 'string' ? NONE : m !== pin ? m : (l ?? 'thiếu trong packages-lock');
    out.push(row(`unity.pkg.${pkg}`, 'version', pin, got));
  }
  return out;
}
