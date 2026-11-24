// Bước mẫu theo zone (T-0004): dùng đầu ra upstream terrain.base.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function run(ctx) {
  const base = readFileSync(join(ctx.upstream['terrain.base'].outDir, 'base.txt'), 'utf8').trim();
  writeFileSync(join(ctx.outDir, 'zone.txt'), `${ctx.zone} seed=${ctx.seed} ${base}\n`);
  return {
    result: ctx.zone === 'z9' ? 'warn' : 'pass',
    warnings: ctx.zone === 'z9' ? ['zone z9 là zone thử cảnh báo'] : [],
  };
}
