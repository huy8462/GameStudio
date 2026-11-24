// Chỉ mục cache build/<id>/cache/index.json (SCH-RTM-09, DTO-CLI-05, MOD-CLI-07 phần chỉ mục; DDD-04 §3.4).
// Ghi nguyên tử: khoá index.lock (mở 'wx'), tệp tạm + rename. engine status, planStale, web/api chỉ đọc tệp này.
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { validate } from '@gamestudio/schema';

import type { CacheIndexEntry } from './types.js';

const cacheDirOf = (buildDir: string): string => join(buildDir, 'cache');
const indexPath = (buildDir: string): string => join(cacheDirOf(buildDir), 'index.json');
const keyOf = (e: CacheIndexEntry): string => `${e.step}\u0000${e.zone ?? ''}\u0000${e.tier ?? ''}`;

/** Đọc chỉ mục; thiếu tệp → []; tệp hỏng hoặc sai schema → [] (coi như chưa có lịch sử, bước sẽ chạy lại). */
export function readCacheIndex(buildDir: string): CacheIndexEntry[] {
  const p = indexPath(buildDir);
  if (!existsSync(p)) return [];
  try {
    const raw: unknown = JSON.parse(readFileSync(p, 'utf8'));
    return validate('cacheIndex', raw).length === 0 ? (raw as CacheIndexEntry[]) : [];
  } catch {
    return [];
  }
}

export class IndexLockedError extends Error {}

/** Lấy khoá index.lock; thử lại tối đa `tries` lần bằng vòng bận ngắn (bộ điều phối là tiến trình duy nhất ghi). */
function lock(cacheDir: string, tries = 200): number {
  const p = join(cacheDir, 'index.lock');
  for (let i = 0; i < tries; i++) {
    try {
      return openSync(p, 'wx');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  throw new IndexLockedError(
    `không lấy được ${p} (khoá còn sót từ lần chạy trước? xoá tay nếu chắc không còn build nào chạy)`,
  );
}

/** Thay mục cùng (bước, zone, tier) bằng e; sắp ổn định theo khoá; ghi tệp tạm + rename. */
export function recordStep(buildDir: string, e: CacheIndexEntry): CacheIndexEntry[] {
  const cacheDir = cacheDirOf(buildDir);
  mkdirSync(cacheDir, { recursive: true });
  const fd = lock(cacheDir);
  try {
    const k = keyOf(e);
    const next = [...readCacheIndex(buildDir).filter((x) => keyOf(x) !== k), e].sort((a, b) =>
      keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0,
    );
    const tmp = join(cacheDir, 'index.json.tmp');
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
    renameSync(tmp, indexPath(buildDir));
    return next;
  } finally {
    closeSync(fd);
    rmSync(join(cacheDir, 'index.lock'), { force: true });
  }
}
