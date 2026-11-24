// Kiểm nhanh bản build: mọi tệp mẫu games/_template/data hợp lệ. Dùng: node engine/schema/scripts/smoke-template.mjs
import { readFileSync } from 'node:fs';

import { validate } from '../dist/src/index.js';

const root = new URL('../../../games/_template/data/', import.meta.url);
let bad = 0;
for (const k of ['budgets', 'game', 'palette', 'world']) {
  const errs = validate(k, JSON.parse(readFileSync(new URL(`${k}.json`, root), 'utf8')));
  bad += errs.length;
  process.stdout.write(`${k}: ${errs.length} lỗi ${errs.length ? JSON.stringify(errs.slice(0, 5)) : ''}\n`);
}
process.exitCode = bad === 0 ? 0 : 1;
