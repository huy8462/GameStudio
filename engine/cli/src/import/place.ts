// Chép game nhập vào games/<id>/ (MOD-CLI-09 place, PSC-CLI-07). Game mới: ghi vào thư mục tạm games/.import-<id>/ rồi
// đổi tên (nguyên tử; lỗi giữa chừng không để lại game dở). --into: đổi data/ cũ thành data.bak-<ts>/ rồi chép đè.
// Mỗi đường dẫn đích kiểm lại nằm trong thư mục game (phòng thủ thêm sau safeRelPath).
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import type { SourceFile } from './unpack.js';

const inside = (root: string, p: string): boolean => {
  const r = relative(resolve(root), resolve(p));
  return r !== '' && !r.startsWith('..') && !r.startsWith(sep) && !/^[A-Za-z]:/.test(r);
};

function writeAll(dest: string, files: ReadonlyMap<string, SourceFile>): void {
  for (const [rel, f] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const p = join(dest, ...rel.split('/'));
    if (!inside(dest, p)) throw new Error(`import: đường dẫn ra ngoài thư mục game: ${rel}`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, f.read());
  }
}

/** '20261124T180743' từ thời điểm clock (không dùng Date.now trực tiếp). */
export const stamp = (ms: number): string =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '');

export function placeNew(gamesDir: string, gameId: string, files: ReadonlyMap<string, SourceFile>): string {
  const dest = join(gamesDir, gameId);
  const stage = join(gamesDir, `.import-${gameId}`);
  rmSync(stage, { recursive: true, force: true }); // thư mục tạm của lần nhập hỏng trước
  try {
    writeAll(stage, files);
    renameSync(stage, dest);
  } catch (e) {
    rmSync(stage, { recursive: true, force: true });
    throw e;
  }
  return dest;
}

export function placeInto(
  gamesDir: string,
  gameId: string,
  files: ReadonlyMap<string, SourceFile>,
  nowMs: number,
): { dest: string; backup: string } {
  const dest = join(gamesDir, gameId);
  const backup = `data.bak-${stamp(nowMs)}`;
  if (existsSync(join(dest, 'data'))) renameSync(join(dest, 'data'), join(dest, backup));
  writeAll(dest, files);
  return { dest, backup };
}
