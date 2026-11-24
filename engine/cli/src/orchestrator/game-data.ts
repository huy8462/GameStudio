// Nạp dữ liệu game cho bộ điều phối: data/**/*.json → {đường dẫn tương đối data/: JSON} (DDD-00 MOD-GEN-06 dạng GameDataFiles).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type GameDataFiles = Record<string, unknown>;

export function loadGameData(gameDir: string): GameDataFiles {
  const root = join(gameDir, 'data');
  const out: GameDataFiles = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.json')) out[relative(root, p).replace(/\\/g, '/')] = JSON.parse(readFileSync(p, 'utf8'));
    }
  };
  walk(root);
  return out;
}

const field = (doc: unknown, key: string): unknown =>
  typeof doc === 'object' && doc !== null ? (doc as Record<string, unknown>)[key] : undefined;

export function gameIdOf(data: GameDataFiles): string | undefined {
  const id = field(data['game.json'], 'id');
  return typeof id === 'string' ? id : undefined;
}

/** Seed gốc cho bước: world.seed (QT-WLD-01), không có thì game.seed, không có thì 0. */
export function baseSeedOf(data: GameDataFiles): number {
  for (const doc of [data['world.json'], data['game.json']]) {
    const s = field(doc, 'seed');
    if (typeof s === 'number' && Number.isInteger(s)) return s;
  }
  return 0;
}

/** Id các zone trong world.json, đã sắp. */
export function zonesOf(data: GameDataFiles): string[] {
  const zones = field(data['world.json'], 'zones');
  if (!Array.isArray(zones)) return [];
  return zones
    .map((z) => field(z, 'id'))
    .filter((id): id is string => typeof id === 'string')
    .sort();
}
