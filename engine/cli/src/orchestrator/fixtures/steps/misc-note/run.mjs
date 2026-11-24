// Bước mẫu độc lập (T-0004): lát dữ liệu + tệp đầu vào; ném lỗi khi title là 'loi' để thử nhánh lỗi.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function run(ctx) {
  const title = ctx.inputs.data['/game.json/title'];
  if (title === 'loi') throw new Error('misc.note: lỗi thử');
  writeFileSync(join(ctx.outDir, 'note.txt'), `${title} ${ctx.inputs.files.join(',')}\n`);
  return { summary: 'misc.note' };
}
