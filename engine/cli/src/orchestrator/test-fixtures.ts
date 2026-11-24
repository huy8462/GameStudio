// Tiện ích test bộ điều phối (T-0004): thư mục game tạm, đồng hồ giả. Không build (tsconfig loại test-fixtures.ts).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Clock } from './types.js';

export const FIXTURE_STEPS = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'steps');

export interface TempGame {
  dir: string;
  write(rel: string, value: unknown): void;
  cleanup(): void;
}

export const GAME = { id: 'thu-build', seed: 1, title: 'Làng thử' };
export const WORLD = {
  seed: 7,
  zones: [
    { id: 'z1', pos: [0, 0] },
    { id: 'z2', pos: [500, 0] },
  ],
};

export function makeGame(over: { game?: object; world?: object; notes?: Record<string, string> } = {}): TempGame {
  const dir = mkdtempSync(join(tmpdir(), 'gs-build-'));
  const write = (rel: string, value: unknown): void => {
    const p = join(dir, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
  };
  write('data/game.json', over.game ?? GAME);
  write('data/world.json', over.world ?? WORLD);
  for (const [name, text] of Object.entries(over.notes ?? { 'a.txt': 'ghi chú a' })) write(`notes/${name}`, text);
  return { dir, write, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Đồng hồ giả tất định: mỗi lần gọi tiến 250 ms từ 2026-11-24T00:00:00Z. */
export function fakeClock(): Clock {
  let t = Date.UTC(2026, 10, 24);
  return { now: () => (t += 250) };
}
