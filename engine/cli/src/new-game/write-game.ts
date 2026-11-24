// Ghi game sau xác nhận (EP-INT-01 --confirm, SEQ-INT-01 "brief/v1 + data/**"): dựng games/.tmp-<id>-<sid>/ rồi rename
// thành games/<id>/ (nguyên tử trên cùng ổ), sau đó chuyển thư mục phiên vào games/<id>/.intake/<sid>/ (DDD-01 §3.3).
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { json, writeAtomic } from './session-dir.js';

const text = (v: string | object): string => (typeof v === 'string' ? v : json(v));

/** Bản xem trước trong thư mục phiên (người dùng đọc game-brief.md trước khi --confirm). Trả thư mục brief. */
export function writePreview(sessionDir: string, files: Record<string, string | object>): string {
  for (const [rel, v] of Object.entries(files)) writeAtomic(join(sessionDir, 'preview', rel), text(v));
  return join(sessionDir, 'preview', 'brief', 'v1', 'game-brief.md');
}

export function writeGame(
  gamesDir: string,
  gameId: string,
  files: Record<string, string | object>,
  sessionDir: string,
  sid: string,
): { ok: true } | { ok: false; message: string } {
  const target = join(gamesDir, gameId);
  if (existsSync(target)) return { ok: false, message: `Đã có thư mục game '${gameId}'; không ghi đè.` };
  const tmp = join(gamesDir, `.tmp-${gameId}-${sid}`);
  rmSync(tmp, { recursive: true, force: true });
  for (const [rel, v] of Object.entries(files)) writeAtomic(join(tmp, rel), text(v));
  renameSync(tmp, target);
  mkdirSync(join(target, '.intake'), { recursive: true });
  renameSync(sessionDir, join(target, '.intake', sid));
  return { ok: true };
}
