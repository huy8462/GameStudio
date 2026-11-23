// Bộ chạy hook thật bằng tiến trình con với JSON sự kiện mẫu (TST-DEV-01, TST-DEV-02).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..', '..');
export const HOOKS = join(ROOT, '.claude', 'hooks');
export const TMP = mkdtempSync(join(tmpdir(), 'gs-hooks-'));

export interface Run {
  code: number | null;
  stdout: string;
  stderr: string;
  ms: number;
}

export function run(hook: string, ev: object | string): Run {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, [join(HOOKS, `${hook}.mjs`)], {
    input: typeof ev === 'string' ? ev : JSON.stringify(ev),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: TMP },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, ms: performance.now() - t0 };
}

export function file(rel: string, content: string | Buffer): string {
  const p = join(TMP, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content);
  return p;
}

export const read = (file_path: string, extra: object = {}) => ({
  tool_name: 'Read',
  cwd: TMP,
  tool_input: { file_path, ...extra },
});
export const bash = (command: string) => ({ tool_name: 'Bash', cwd: TMP, tool_input: { command } });
export const write = (rel: string) => ({ tool_name: 'Write', cwd: TMP, tool_input: { file_path: join(TMP, rel) } });
