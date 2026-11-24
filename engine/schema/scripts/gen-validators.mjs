// Sinh bộ kiểm Ajv biên dịch sẵn (MOD-RTM-04, MOD-GEN-07; DDD-09 PSC-DEV-05 cho hook H-03).
// Chạy sau tsc: node scripts/gen-validators.mjs → dist/validators.js (ESM, runtime) và dist/validators.cjs (hook H-03).
// Mỗi kind xuất một hàm validate (có .errors như Ajv) + kindByPath(path) nhận cả 'data/x.json' lẫn 'games/<id>/data/x.json'.
import { writeFileSync } from 'node:fs';

import standaloneCode from 'ajv/dist/standalone/index.js';

import { createAjv, ROOT_IDS, SCHEMA_KINDS } from '../dist/src/index.js';

const DIST = new URL('../dist/', import.meta.url);
const KIND_RE = `/(?:^|\\/)data\\/(${SCHEMA_KINDS.join('|')})\\.json$/`;
const kindFn = `function kindByPath(p) { const m = String(p).replace(/\\\\/g, '/').match(${KIND_RE}); return m ? m[1] : undefined; }`;

function build(esm) {
  const ajv = createAjv({ code: { source: true, esm } });
  const code = standaloneCode(ajv, { ...ROOT_IDS });
  const head = '// SINH TỰ ĐỘNG bởi engine/schema/scripts/gen-validators.mjs. Không sửa tay.\n';
  const tail = esm
    ? `\n${kindFn}\nexport { kindByPath };\nexport const SCHEMA_KINDS = ${JSON.stringify(SCHEMA_KINDS)};\n`
    : `\n${kindFn}\nexports.kindByPath = kindByPath;\nexports.SCHEMA_KINDS = ${JSON.stringify(SCHEMA_KINDS)};\n`;
  return head + code + tail;
}

for (const [file, esm] of [
  ['validators.js', true],
  ['validators.cjs', false],
]) {
  const out = new URL(file, DIST);
  writeFileSync(out, build(esm));
  process.stdout.write(`đã ghi ${out.pathname}\n`);
}
