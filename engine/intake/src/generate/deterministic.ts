// Phần cấu trúc không qua mô hình (PSC-INT-03, ALG-INT-03, MOD-INT-05; FR-INT-28; TC-INT-09): id, seed, game.json,
// world.json (seed, vùng chơi, zone lưới 500 m), budgets, palette giữ chỗ, khung NPC/động vật. Cùng brief + phiên → cùng byte.
import { deriveSeed } from '@gamestudio/rng';
import { canonicalize, sha256Hex } from '@gamestudio/schema';

import { slugify, uniqueSlug } from '../text.js';
import type { Answers, BriefJson, GameDataFiles } from '../types.js';

const ZONE_M = 500;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

/** seed = input.seed ?? deriveSeed(sha256Hex(mô tả), sha256Hex(canonicalize(answers))) (PSC-INT-03). */
export const gameSeed = (description: string, answers: Answers, seed?: number): number =>
  seed ?? deriveSeed(sha256Hex(description.normalize('NFC')), sha256Hex(canonicalize(answers)));

type Pt = [number, number];

/** Vùng chơi vuông cạnh √areaKm2 km tâm (0,0); zone lưới 500 m sắp theo hàng (Bắc → Nam) rồi cột (Tây → Đông). */
export function zonesFor(areaKm2: number, worldSeed: number): { playArea: Pt[]; zones: object[] } {
  const half = Math.round((Math.sqrt(areaKm2) * 1000) / 2);
  const playArea: Pt[] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];
  const n = Math.max(1, Math.ceil((2 * half) / ZONE_M));
  const id = (r: number, c: number): string => `z${r * n + c + 1}`;
  const zones: object[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x0 = -half + c * ZONE_M;
      const z0 = -half + r * ZONE_M;
      const x1 = Math.min(x0 + ZONE_M, half);
      const z1 = Math.min(z0 + ZONE_M, half);
      const nb: string[] = [];
      if (r > 0) nb.push(id(r - 1, c));
      if (c > 0) nb.push(id(r, c - 1));
      if (c < n - 1) nb.push(id(r, c + 1));
      if (r < n - 1) nb.push(id(r + 1, c));
      zones.push({
        id: id(r, c),
        seed: deriveSeed(worldSeed, 'zone', id(r, c)),
        polygon: [
          [x0, z0],
          [x1, z0],
          [x1, z1],
          [x0, z1],
        ],
        neighbors: nb.sort(),
      });
    }
  }
  return { playArea, zones };
}

export interface DeterministicInput {
  brief: BriefJson;
  description: string;
  answers: Answers;
  seed?: number;
  language: 'vi' | 'en';
  template: GameDataFiles;
  existingGameIds: readonly string[];
}

/** Trả {gameId, files}; khoá files là đường dẫn tương đối games/<id>/ (DTO-INT-07). */
export function buildDeterministic(i: DeterministicInput): { gameId: string; files: Record<string, object> } {
  const b = i.brief;
  const gameId = uniqueSlug(slugify(b.title), new Set(i.existingGameIds));
  const seed = gameSeed(i.description, i.answers, i.seed);
  const tg = obj(i.template['game.json']);
  const tf = obj(tg['features']);
  const game = {
    ...clone(tg),
    id: gameId,
    title: b.title,
    seed,
    language: i.language,
    camera: { mode: b.camera },
    orientation: 'landscape',
    features: {
      ...clone(tf),
      combat: { ...obj(tf['combat']), enabled: b.features.combat },
      hunting: {
        ...obj(tf['hunting']),
        enabled: b.features.hunting,
        species: b.features.hunting ? b.animals.map((a) => slugify(a.species)) : [],
      },
      dialogueMode: b.features.dialogueMode,
    },
    briefVersion: 1,
    styleBibleVersion: null,
  };
  const worldSeed = deriveSeed(seed, 'world');
  const { playArea, zones } = zonesFor(b.scale.areaKm2, worldSeed);
  const world = { ...clone(obj(i.template['world.json'])), seed: worldSeed, source: 'procedural', playArea, zones };
  const files: Record<string, object> = {
    'data/game.json': game,
    'data/world.json': world,
    'data/budgets.json': clone(obj(i.template['budgets.json'])),
    'data/palette.json': clone(obj(i.template['palette.json'])), // giữ chỗ, thay ở generateStyle (MOD-INT-09)
  };
  const used = new Set<string>();
  for (const npc of b.npcs) {
    const id = uniqueSlug(slugify(npc.name), used);
    used.add(id);
    files[`data/entities/npc/${id}.json`] = {
      id,
      name: npc.name,
      role: npc.role,
      count: npc.count,
      appearance: { model: null },
      behavior: 'graph:dan-lang',
    };
  }
  for (const a of b.animals) {
    const id = uniqueSlug(slugify(a.species), used);
    used.add(id);
    files[`data/entities/animals/${id}.json`] = {
      id,
      species: a.species,
      count: a.count,
      family: 'dong_vat_4_chan_nho',
    };
  }
  return { gameId, files };
}
