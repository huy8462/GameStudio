// H-04 (chặn): đọc tệp bí mật (Read/Grep/Glob) và lệnh phá huỷ hoặc lộ bí mật (Bash/PowerShell) → ERR-DEV-03
// (ALG-DEV-04, PSC-DEV-04, FR-DEV-18, QT-DEV-06). Không in nội dung lệnh hay đường dẫn đầy đủ ra thông báo.
import { basename } from 'node:path';

import { blockResult, guard, isMain } from './lib/io.mjs';
import { dangerousBash, isSecretPath } from './lib/patterns.mjs';

const MSG = 'Không được đọc file bí mật hoặc chạy lệnh phá huỷ.';

export async function check(ev) {
  const t = ev.tool_name;
  const inp = ev.tool_input ?? {};
  if (t === 'Read' || t === 'Grep' || t === 'Glob') {
    const p = inp.file_path ?? inp.path;
    if (typeof p === 'string' && isSecretPath(p)) return blockResult('ERR-DEV-03', `${MSG} (${basename(p)})`);
    // Grep/Glob có thể nhắm bí mật qua glob/pattern tên tệp.
    for (const g of [inp.glob, t === 'Glob' ? inp.pattern : undefined]) {
      if (typeof g === 'string' && /(^|[\\/*])\.env(?!\.example)|\.pem\b|\.key\b|secrets[\\/]/i.test(g)) {
        return blockResult('ERR-DEV-03', `${MSG} (glob)`);
      }
    }
    return null;
  }
  if (t === 'Bash' || t === 'PowerShell') {
    const hit = dangerousBash(inp.command);
    return hit ? blockResult(hit.code, `${MSG} (luật ${hit.rule})`) : null;
  }
  return null;
}

if (isMain(import.meta.url)) guard('h04-secrets', 'PreToolUse', check);
