// Vào/ra chung cho hook (DDD-09 MOD-DEV-07, IF-DEV-02, PSC-DEV-03…05).
// Chặn: thoát 2 + stderr (Claude nhận làm lý do). Cảnh báo PostToolUse: JSON additionalContext, thoát 0.
// Lỗi nội bộ: thoát 0 (không chặn nhầm) + ghi hook-errors.log (chỉ tên công cụ, đuôi tệp; không ghi tool_input).
// Không gọi process.exit() sau khi ghi: trên Windows ghi ra pipe là bất đồng bộ, exit sớm làm mất dữ liệu.
import { appendFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HOOKS_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const LIMIT_MS = 900; // NFR-DEV-02: mỗi hook tự thoát 0 sau 900 ms.

export function logError(hook, err, ev) {
  try {
    const p = ev?.tool_input?.file_path ?? ev?.tool_input?.path;
    const line = {
      ts: new Date().toISOString(),
      hook,
      tool: ev?.tool_name ?? null,
      ext: typeof p === 'string' ? extname(p) : null,
      msg: String(err instanceof Error ? err.message : err).slice(0, 300),
    };
    appendFileSync(join(HOOKS_DIR, 'hook-errors.log'), JSON.stringify(line) + '\n');
  } catch {
    // Không làm gì: hook không được hỏng vì log.
  }
}

export async function readEvent() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return JSON.parse(data);
}

/** Kết quả hook: null = cho qua; {block: {code, msg}}; {warn: msg}. */
export const blockResult = (code, msg) => ({ block: { code, msg } });
export const warnResult = (msg) => ({ warn: msg });

/** Thư mục dự án: biến CLAUDE_PROJECT_DIR (Claude Code đặt) hoặc cwd của sự kiện. */
export function projectDir(ev) {
  return process.env.CLAUDE_PROJECT_DIR || ev?.cwd || process.cwd();
}

/** true khi module `metaUrl` là tệp được chạy trực tiếp (`node h0x.mjs`), false khi bị import trong test. */
export function isMain(metaUrl) {
  return typeof process.argv[1] === 'string' && pathToFileURL(resolve(process.argv[1])).href === metaUrl;
}

/** Chạy hook với giới hạn thời gian; mọi lỗi nội bộ → thoát 0 + log. */
export function guard(name, eventName, fn) {
  setTimeout(() => process.exit(0), LIMIT_MS).unref();
  let ev;
  readEvent()
    .then((e) => {
      ev = e;
      return fn(e);
    })
    .then((r) => {
      if (r?.block) {
        process.stderr.write(`${r.block.code}: ${r.block.msg}\n`);
        process.exitCode = 2;
      } else if (r?.warn) {
        process.stdout.write(
          JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: r.warn } }),
        );
        process.exitCode = 0;
      } else {
        process.exitCode = 0;
      }
    })
    .catch((err) => {
      logError(name, err, ev);
      process.exitCode = 0;
    });
}
