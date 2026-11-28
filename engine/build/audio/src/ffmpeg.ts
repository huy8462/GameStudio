// T-0018 (MOD-AST-13, PSC-AST-11): chạy ffmpeg/ffprobe không qua shell, gom stdout/stderr.
import { spawn } from 'node:child_process';

export interface ToolResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Lỗi công cụ ngoài; `code` theo SRS-04 §7.2 (5 = thiếu công cụ, 6 = công cụ chạy lỗi). */
export class AudioToolError extends Error {
  constructor(
    message: string,
    readonly code: 5 | 6,
  ) {
    super(message);
    this.name = 'AudioToolError';
  }
}

export function runTool(bin: string, args: readonly string[]): Promise<ToolResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, [...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (d: Buffer) => out.push(d));
    child.stderr.on('data', (d: Buffer) => err.push(d));
    child.on('error', (e: NodeJS.ErrnoException) =>
      reject(
        e.code === 'ENOENT'
          ? new AudioToolError(`Không tìm thấy ${bin} (chạy engine doctor).`, 5)
          : new AudioToolError(e.message, 6),
      ),
    );
    child.on('close', (code) =>
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8'),
      }),
    );
  });
}

/** Chạy và ném AudioToolError (6) nếu mã thoát khác 0; thông báo chỉ giữ vài dòng cuối của stderr. */
export async function runOk(bin: string, args: readonly string[]): Promise<ToolResult> {
  const r = await runTool(bin, args);
  if (r.code !== 0) {
    const tail = r.stderr.trim().split(/\r?\n/).slice(-3).join(' | ');
    throw new AudioToolError(`${bin} thoát ${r.code}: ${tail}`, 6);
  }
  return r;
}

/** Cờ chung: không banner, không tiến độ, ghi đè, và bitexact để hai lần chạy ra cùng byte (luật tất định). */
export const FF_BASE = ['-hide_banner', '-nostats', '-nostdin', '-y'] as const;
export const FF_BITEXACT = ['-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1'] as const;
