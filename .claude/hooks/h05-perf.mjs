// H-05 (cảnh báo): sửa render, shader, vật liệu, budgets.json → nhắc /perf-snapshot (ALG-DEV-05, PSC-DEV-05, QT-RTM-02).
import { guard, isMain, projectDir, warnResult } from './lib/io.mjs';
import { P, matchAny, relToProject } from './lib/patterns.mjs';

export async function check(ev) {
  if (ev.tool_name !== 'Write' && ev.tool_name !== 'Edit') return null;
  const rel = relToProject(ev.tool_input?.file_path, projectDir(ev));
  if (rel === null || !matchAny(rel, P.perfPaths)) return null;
  return warnResult(`H-05: đã sửa ${rel}. Nhắc: chạy /perf-snapshot trước khi xong phiếu (QT-RTM-02).`);
}

if (isMain(import.meta.url)) guard('h05-perf', 'PostToolUse', check);
