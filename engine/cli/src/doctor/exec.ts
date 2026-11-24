// Chạy lệnh kiểm phiên bản (ALG-DEV-06: chờ tối đa 10 s). Không truyền biến môi trường thêm, không in ra.
// Windows: tìm chương trình theo PATH + PATHEXT, .exe chạy trực tiếp, shim .cmd qua cmd.exe có trích dẫn đúng
// (win-spawn.ts, T-0009). Trước T-0009 đối số được nối bằng dấu cách nên `python -c "..."` bị cắt vụn.
import { execFile } from 'node:child_process';

import { planWin } from './win-spawn.js';

export interface ExecResult {
  /** false khi không tìm thấy chương trình (ENOENT) hoặc hết giờ. */
  found: boolean;
  code: number | null;
  output: string;
  timedOut: boolean;
}

export type Runner = (argv: readonly string[], timeoutMs: number) => Promise<ExecResult>;

const WIN = process.platform === 'win32';
const NOT_FOUND: ExecResult = { found: false, code: null, output: '', timedOut: false };

export const runCommand: Runner = (argv, timeoutMs) =>
  new Promise((resolve) => {
    let file = argv[0] ?? '';
    let args = argv.slice(1);
    let verbatim = false;
    if (WIN) {
      const plan = planWin(argv);
      if (plan === undefined) return resolve(NOT_FOUND);
      ({ file, args, verbatim } = plan);
    }
    execFile(
      file,
      args,
      {
        timeout: timeoutMs,
        windowsHide: true,
        windowsVerbatimArguments: verbatim,
        maxBuffer: 8 * 1024 * 1024,
        encoding: 'utf8',
      },
      (err, stdout, stderr) => {
        const output = `${stdout}\n${stderr}`;
        if (err === null) return resolve({ found: true, code: 0, output, timedOut: false });
        const e = err as NodeJS.ErrnoException & { killed?: boolean; code?: number | string };
        if (e.code === 'ENOENT') return resolve(NOT_FOUND);
        if (e.killed === true) return resolve({ found: false, code: null, output, timedOut: true });
        const code: number = typeof e.code === 'number' ? e.code : 1;
        // Qua cmd.exe: "không nhận ra lệnh" trả 9009 (hoặc 1 kèm thông báo) → coi như không có.
        const notFound = code === 9009 || /is not recognized as an internal or external command/i.test(output);
        resolve({ found: !notFound, code, output, timedOut: false });
      },
    );
  });
