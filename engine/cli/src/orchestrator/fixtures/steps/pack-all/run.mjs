// Bước mẫu gộp (T-0004): upstream nhiều zone có khoá '<bước>@<zone>'.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function run(ctx) {
  const keys = Object.keys(ctx.upstream).sort();
  const lines = keys.map((k) => readFileSync(join(ctx.upstream[k].outDir, 'zone.txt'), 'utf8').trim());
  writeFileSync(join(ctx.outDir, 'pack.txt'), `${keys.join(',')}\n${lines.join('\n')}\n`);
}
