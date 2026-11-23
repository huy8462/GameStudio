// Chạy lệnh kiểm phiên bản (ALG-DEV-06: chờ tối đa 10 s). Không truyền biến môi trường thêm, không in ra.
import { execFile } from 'node:child_process';

export interface ExecResult {
  /** false khi không tìm thấy chương trình (ENOENT) hoặc hết giờ. */
  found: boolean;
  code: number | null;
  output: string;
  timedOut: boolean;
}

export type Runner = (argv: readonly string[], timeoutMs: number) => Promise<ExecResult>;

const WIN = process.platform === 'win32';

/** Trên Windows, pnpm/claude cài qua npm là shim .cmd: execFile không chạy được .cmd nếu không qua cmd.exe. */
function resolveArgv(argv: readonly string[]): { file: string; args: string[] } {
  const [file = '', ...args] = argv;
  if (!WIN) return { file, args };
  if (/[\\/]/.test(file) || /\.(exe|com)$/i.test(file)) return { file, args };
  // Chỉ chuỗi cố định từ versions.json (không có đầu vào người dùng) đi qua cmd.exe.
  return { file: process.env['ComSpec'] ?? 'cmd.exe', args: ['/d', '/s', '/c', [file, ...args].join(' ')] };
}

export const runCommand: Runner = (argv, timeoutMs) =>
  new Promise((resolve) => {
    const { file, args } = resolveArgv(argv);
    execFile(
      file,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' },
      (err, stdout, stderr) => {
        const output = `${stdout}\n${stderr}`;
        if (err === null) return resolve({ found: true, code: 0, output, timedOut: false });
        const e = err as NodeJS.ErrnoException & { killed?: boolean; code?: number | string };
        if (e.code === 'ENOENT') return resolve({ found: false, code: null, output: '', timedOut: false });
        if (e.killed === true) return resolve({ found: false, code: null, output, timedOut: true });
        const code: number = typeof e.code === 'number' ? e.code : 1;
        // Qua cmd.exe: "không nhận ra lệnh" trả 9009 (hoặc 1 kèm thông báo) → coi như không có.
        const notFound = code === 9009 || /is not recognized as an internal or external command/i.test(output);
        resolve({ found: !notFound, code, output, timedOut: false });
      },
    );
  });
