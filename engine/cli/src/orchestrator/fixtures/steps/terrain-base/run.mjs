// Bước mẫu node (IF-CLI-02, T-0004): run(ctx) ghi đầu ra vào ctx.outDir và trả phần báo cáo.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function run(ctx) {
  const worldSeed = ctx.inputs.data['/world.json/seed'];
  ctx.progress?.(50, 'ghi base.txt');
  writeFileSync(join(ctx.outDir, 'base.txt'), `seed=${ctx.seed} world=${worldSeed} scale=${ctx.inputs.params.scale}\n`);
  return { metrics: { files: 1 }, summary: 'terrain.base: base.txt' };
}
