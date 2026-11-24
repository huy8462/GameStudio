// Chạy chương trình trên Windows với đối số nguyên vẹn (IF-DEV-03, ALG-DEV-06; T-0009).
// - Tìm theo PATH + PATHEXT. .exe/.com: chạy trực tiếp, Node tự trích dẫn theo quy tắc CreateProcess.
// - .cmd/.bat (shim npm như pnpm.cmd): bắt buộc qua cmd.exe → tự dựng dòng lệnh: trích dẫn CreateProcess rồi thoát
//   ký tự đặc biệt của cmd bằng '^' (hai lần cho tệp batch vì batch phân tích %* thêm một lượt), chạy
//   `cmd.exe /d /s /c "<dòng lệnh>"` với windowsVerbatimArguments. Cách làm như thư viện cross-spawn.
import { existsSync, statSync } from 'node:fs';
import { delimiter, extname, join } from 'node:path';

export interface SpawnPlan {
  file: string;
  args: string[];
  verbatim: boolean;
}

const META = /([()\][%!^"`<>&|;, *?])/g;

/** Trích dẫn một đối số theo quy tắc CommandLineToArgvW / CRT. */
export function quoteArg(arg: string): string {
  if (arg !== '' && !/[\s"]/.test(arg)) return arg;
  let out = '"';
  let bs = 0;
  for (const ch of arg) {
    if (ch === '\\') {
      bs++;
      continue;
    }
    if (ch === '"') {
      out += '\\'.repeat(bs * 2 + 1) + '"';
    } else {
      out += '\\'.repeat(bs) + ch;
    }
    bs = 0;
  }
  return out + '\\'.repeat(bs * 2) + '"';
}

/** Thoát ký tự đặc biệt của cmd.exe bằng '^'; `times` = 2 cho tệp .cmd/.bat. */
export function escapeCmd(s: string, times: number): string {
  let out = s;
  for (let i = 0; i < times; i++) out = out.replace(META, '^$1');
  return out;
}

/** Tìm chương trình theo PATH + PATHEXT (Windows). Trả đường dẫn đầy đủ hoặc undefined. */
export function whichWin(file: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const exts = (env['PATHEXT'] ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean);
  const hasExt = exts.some((e) => e.toLowerCase() === extname(file).toLowerCase());
  const cands = hasExt ? [file] : exts.map((e) => file + e.toLowerCase());
  const dirs = /[\\/]/.test(file) ? [''] : (env['PATH'] ?? env['Path'] ?? '').split(delimiter).filter(Boolean);
  for (const d of dirs) {
    for (const c of cands) {
      const p = d === '' ? c : join(d, c);
      if (existsSync(p) && statSync(p).isFile()) return p;
    }
  }
  return undefined;
}

/** Kế hoạch chạy trên Windows; undefined khi không tìm thấy chương trình. */
export function planWin(argv: readonly string[], env: NodeJS.ProcessEnv = process.env): SpawnPlan | undefined {
  const [file = '', ...args] = argv;
  const path = whichWin(file, env);
  if (path === undefined) return undefined;
  if (!/\.(cmd|bat)$/i.test(path)) return { file: path, args: [...args], verbatim: false };
  const line = [escapeCmd(quoteArg(path), 1), ...args.map((a) => escapeCmd(quoteArg(a), 2))].join(' ');
  return { file: env['ComSpec'] ?? 'cmd.exe', args: ['/d', '/s', '/c', `"${line}"`], verbatim: true };
}
