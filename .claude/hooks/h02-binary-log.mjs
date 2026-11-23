// H-02 (chặn): đọc nhị phân, ảnh > 1 MB, log > 2.000 dòng → ERR-DEV-02 (ALG-DEV-04, PSC-DEV-04, FR-DEV-18).
import { createReadStream, statSync } from 'node:fs';
import { extname } from 'node:path';

import { blockResult, guard, isMain } from './lib/io.mjs';
import { P, matchAny } from './lib/patterns.mjs';

const MSG = 'File nhị phân/log dài. Dùng báo cáo JSON hoặc grep/tail.';

/** Đếm dòng, dừng sớm khi vượt `limit` (không đọc hết log lớn). */
export function linesOver(path, limit) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const s = createReadStream(path);
    s.on('data', (buf) => {
      for (const b of buf)
        if (b === 10 && ++n > limit) {
          s.destroy();
          return resolve(true);
        }
    });
    s.on('end', () => resolve(n > limit));
    s.on('close', () => resolve(n > limit));
    s.on('error', reject);
  });
}

export async function check(ev) {
  if (ev.tool_name !== 'Read') return null;
  const p = ev.tool_input?.file_path;
  if (typeof p !== 'string') return null;
  const ext = extname(p).toLowerCase();
  if (P.binaryExt.includes(ext)) return blockResult('ERR-DEV-02', `${MSG} (${ext})`);
  if (P.imageExt.includes(ext)) {
    const size = statSync(p).size;
    return size > P.imageMaxBytes
      ? blockResult('ERR-DEV-02', `${MSG} (ảnh ${Math.round(size / 1024)} KB > 1 MB)`)
      : null;
  }
  if (ext === '.log' || matchAny(p, P.logPaths)) {
    // Đọc theo đoạn (offset/limit) thì cho phép.
    if (ev.tool_input.offset != null || ev.tool_input.limit != null) return null;
    if (await linesOver(p, P.logMaxLines)) return blockResult('ERR-DEV-02', `${MSG} (log > ${P.logMaxLines} dòng)`);
  }
  return null;
}

if (isMain(import.meta.url)) guard('h02-binary-log', 'PreToolUse', check);
