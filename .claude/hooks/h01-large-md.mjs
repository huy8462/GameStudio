// H-01 (chặn): đọc nguyên tệp .md > 40 KB không chỉ định đoạn → ERR-DEV-01 kèm heading (ALG-DEV-03, PSC-DEV-03, FR-DEV-18).
import { createReadStream, statSync } from 'node:fs';
import { createInterface } from 'node:readline';

import { blockResult, guard, isMain } from './lib/io.mjs';
import { P } from './lib/patterns.mjs';

export async function headings(path, max = P.maxHeadings) {
  const out = [];
  const rl = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  let n = 0;
  let fence = false;
  for await (const line of rl) {
    n++;
    if (/^\s*```/.test(line)) fence = !fence;
    if (!fence && /^#{1,4} /.test(line)) out.push(`L${n} ${line.trim()}`);
    if (out.length >= max) break;
  }
  rl.close();
  return out;
}

export async function check(ev) {
  if (ev.tool_name !== 'Read') return null;
  const p = ev.tool_input?.file_path;
  if (typeof p !== 'string' || !p.toLowerCase().endsWith('.md')) return null;
  if (ev.tool_input.offset != null || ev.tool_input.limit != null) return null;
  const size = statSync(p).size;
  if (size <= P.mdMaxBytes) return null;
  const kb = Math.round(size / 1024);
  const hs = await headings(p);
  return blockResult('ERR-DEV-01', `File lớn (${kb} KB). Đọc theo mục bằng offset/limit (số dòng): ${hs.join('; ')}`);
}

if (isMain(import.meta.url)) guard('h01-large-md', 'PreToolUse', check);
