// T-0020 (MOD-CLI-04): chạy công cụ ngoài (ktx, ffmpeg, ffprobe) không qua shell.
import { spawn } from 'node:child_process';

/** Lỗi công cụ ngoài; `code` theo SRS-04 §7.2 (5 = thiếu công cụ, 6 = công cụ chạy lỗi). */
export class PackToolError extends Error {
  constructor(
    message: string,
    readonly code: 5 | 6,
  ) {
    super(message);
    this.name = 'PackToolError';
  }
}

export function runOk(bin: string, args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, [...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    child.stdout.on('data', (d: Buffer) => out.push(d));
    child.stderr.on('data', (d: Buffer) => err.push(d));
    child.on('error', (e: NodeJS.ErrnoException) =>
      reject(
        e.code === 'ENOENT'
          ? new PackToolError(`Không tìm thấy ${bin} (chạy engine doctor).`, 5)
          : new PackToolError(e.message, 6),
      ),
    );
    child.on('close', (code) => {
      if (code === 0) return resolve(Buffer.concat(out).toString('utf8'));
      const tail = Buffer.concat(err).toString('utf8').trim().split(/\r?\n/).slice(-3).join(' | ');
      reject(new PackToolError(`${bin} thoát ${code ?? 'null'}: ${tail}`, 6));
    });
  });
}
