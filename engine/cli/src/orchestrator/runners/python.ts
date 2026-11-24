// Runner python (IF-CLI-02, MOD-CLI-02): `uv run python -I <entry> --ctx ctx.json` ở tiến trình con.
// stdout: dòng `PROGRESS <0-100> <msg>` → ctx.progress; stderr: log JSON một dòng (giữ vài dòng cuối cho thông báo lỗi).
// Bước ghi đầu ra vào ctx.outDir; nếu ghi report.json (một phần report/1) thì các trường result/metrics/… được lấy lại.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { StepReturn } from '../types.js';
import { StepError, writeCtxJson, type Runner } from './node.js';

export interface PythonRunnerOptions {
  /** Lệnh và tiền tố đối số; mặc định ['uv', ['run', 'python', '-I']]. Test có thể thay bằng node. */
  command?: string;
  prefixArgs?: readonly string[];
  /** Thư mục chạy (uv tìm pyproject.toml từ đây); mặc định thư mục chứa step.json. */
  cwd?: string;
}

const PROGRESS_RE = /^PROGRESS\s+(\d{1,3}(?:\.\d+)?)\s*(.*)$/;
/** Mã thoát của tiến trình con giữ nguyên khi có nghĩa ở SRS-04 §7.2; còn lại là 10. */
const PASS_THROUGH = new Set([3, 4, 5, 6]);
const TAIL = 5;

/** Diệt cả cây tiến trình (uv → python): Windows dùng taskkill /T, POSIX gửi SIGKILL cho nhóm. */
function killTree(pid: number | undefined, fallback: () => void): void {
  if (pid === undefined) return fallback();
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }).on(
        'error',
        fallback,
      );
    } else process.kill(-pid, 'SIGKILL');
  } catch {
    fallback();
  }
}

function readPartialReport(outDir: string): StepReturn {
  const p = join(outDir, 'report.json');
  if (!existsSync(p)) return {};
  try {
    const r = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
    const out: StepReturn = {};
    if (r['result'] === 'pass' || r['result'] === 'warn' || r['result'] === 'fail') out.result = r['result'];
    for (const k of ['metrics', 'budget'] as const)
      if (typeof r[k] === 'object' && r[k] !== null) out[k] = r[k] as Record<string, number>;
    for (const k of ['warnings', 'artifacts'] as const) if (Array.isArray(r[k])) out[k] = r[k] as string[];
    if (Array.isArray(r['checks'])) out.checks = r['checks'] as NonNullable<StepReturn['checks']>;
    if (typeof r['summary'] === 'string') out.summary = r['summary'];
    return out;
  } catch {
    throw new StepError('report.json của bước không phải JSON hợp lệ', 4);
  }
}

export function makePythonRunner(o: PythonRunnerOptions = {}): Runner {
  const command = o.command ?? 'uv';
  const prefix = o.prefixArgs ?? ['run', 'python', '-I'];
  return (step, ctx) =>
    new Promise<StepReturn>((resolve, reject) => {
      const ctxPath = writeCtxJson(ctx);
      const child = spawn(command, [...prefix, join(step.dir, step.entry), '--ctx', ctxPath], {
        cwd: o.cwd ?? step.dir,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        // POSIX: nhóm tiến trình riêng để killTree diệt cả python con của uv.
        detached: process.platform !== 'win32',
      });
      const errTail: string[] = [];
      let outBuf = '';
      let errBuf = '';
      let timedOut = false;
      const onLines = (buf: string, chunk: Buffer, each: (line: string) => void): string => {
        const lines = (buf + chunk.toString('utf8')).split(/\r?\n/);
        const rest = lines.pop() ?? '';
        lines.forEach(each);
        return rest;
      };
      const onOut = (line: string): void => {
        const m = PROGRESS_RE.exec(line.trim());
        if (m) ctx.progress?.(Math.min(100, Number(m[1])), m[2] ?? '');
      };
      const onErr = (line: string): void => {
        if (line.trim() === '') return;
        errTail.push(line.trim());
        if (errTail.length > TAIL) errTail.shift();
      };
      child.stdout.on('data', (c: Buffer) => (outBuf = onLines(outBuf, c, onOut)));
      child.stderr.on('data', (c: Buffer) => (errBuf = onLines(errBuf, c, onErr)));
      const timer =
        step.timeoutS !== undefined
          ? setTimeout(() => {
              timedOut = true;
              killTree(child.pid, () => child.kill('SIGKILL'));
            }, step.timeoutS * 1000)
          : undefined;
      child.on('error', (e) => {
        clearTimeout(timer);
        reject(new StepError(`bước '${step.id}': không chạy được '${command}' (${e.message})`, 5));
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (outBuf) onOut(outBuf);
        if (errBuf) onErr(errBuf);
        if (timedOut) return reject(new StepError(`bước '${step.id}' quá thời gian ${step.timeoutS} s`, 10));
        if (code !== 0) {
          const exit = code !== null && PASS_THROUGH.has(code) ? code : 10;
          const tail = errTail.length > 0 ? `: ${errTail.join(' | ')}` : '';
          return reject(new StepError(`bước '${step.id}' thoát mã ${code ?? 'null'}${tail}`, exit));
        }
        try {
          resolve(readPartialReport(ctx.outDir));
        } catch (e) {
          reject(e);
        }
      });
    });
}
