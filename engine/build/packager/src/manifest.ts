// T-0026 (MOD-CLI-04 manifest.ts, modules.ts; DTO-RTM-01 manifest/1, SCH-RTM-04; PSC-CLI-02 bước 8, 10).
// Kiểu manifest cho Unity player (engine/unity Loader/Manifest.cs đọc) và các phép tính thuần: bounds, spawn, module.
import { createHash } from 'node:crypto';

export type TierKey = 'thap' | 'vua' | 'cao' | 'toi_da';
export const TIER_ORDER: readonly TierKey[] = ['thap', 'vua', 'cao', 'toi_da'];

export interface FileRef {
  path: string;
  bytes: number;
  sha256: string;
}

export interface ZoneEntry {
  id: string;
  bounds: { min: [number, number]; max: [number, number] };
  neighbors: string[];
  parts: Partial<Record<TierKey, { core: FileRef[]; full: FileRef[] }>>;
  bytes: Partial<Record<TierKey, { core: number; full: number }>>;
}

export interface Manifest {
  schema: 'manifest/1';
  gameId: string;
  engineVersion: string;
  schemaVersion: number;
  dataHash: string;
  tiers: TierKey[];
  startZone: string;
  spawn: { zone: string; pos: [number, number, number]; yaw: number };
  zones: ZoneEntry[];
  modules: { combat?: true };
  fallbacks: { texture: 'png' | 'jpg' };
  /** Ngoài DTO-RTM-01 (T-0026, chờ CR): HDRI và vật liệu dùng chung; player hiện bỏ qua. */
  environment: { hdri: { id: string; env: FileRef; sky: FileRef; sh: FileRef }[]; materials: FileRef[] };
  credits: unknown[];
}

export function fileRef(path: string, buf: Buffer): FileRef {
  return { path, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
}

type Pt = readonly [number, number];

export function boundsOf(polygon: readonly Pt[]): ZoneEntry['bounds'] {
  const xs = polygon.map((p) => p[0]);
  const zs = polygon.map((p) => p[1]);
  return { min: [Math.min(...xs), Math.min(...zs)], max: [Math.max(...xs), Math.max(...zs)] };
}

/** Trọng tâm đỉnh (đủ cho vùng spawn nhỏ, lồi). */
export function centroid(polygon: readonly Pt[]): [number, number] {
  const n = Math.max(1, polygon.length);
  return [polygon.reduce((s, p) => s + p[0], 0) / n, polygon.reduce((s, p) => s + p[1], 0) / n];
}

export function inBounds(b: ZoneEntry['bounds'], x: number, z: number): boolean {
  return x >= b.min[0] && x <= b.max[0] && z >= b.min[1] && z <= b.max[1];
}

export interface WorldLike {
  zones?: { id: string; polygon: Pt[]; neighbors?: string[] }[];
  regions?: { id: string; kind?: string; polygon?: Pt[] }[];
}

/** Spawn = trọng tâm vùng kind 'spawn' (không có thì tâm zone đầu); zone xuất phát = zone chứa điểm đó. */
export function spawnOf(world: WorldLike): { zone: string; x: number; z: number } {
  const zones = world.zones ?? [];
  const first = zones[0];
  if (first === undefined) throw new Error('world.json không có zone');
  const region = (world.regions ?? []).find((r) => r.kind === 'spawn' && (r.polygon?.length ?? 0) > 0);
  const [x, z] = region?.polygon ? centroid(region.polygon) : centroid(first.polygon);
  const zone = zones.find((zz) => inBounds(boundsOf(zz.polygon), x, z)) ?? first;
  return { zone: zone.id, x, z };
}

export interface GameLike {
  id?: string;
  engineVersion?: string;
  schemaVersion?: number;
  features?: { combat?: { enabled?: boolean }; hunting?: { enabled?: boolean } };
}

/** PSC-CLI-02 bước 8: module combat bật khi features.combat hoặc hunting bật (mã luôn có trong player). */
export function modulesOf(game: GameLike): Manifest['modules'] {
  return game.features?.combat?.enabled === true || game.features?.hunting?.enabled === true ? { combat: true } : {};
}

/** engineVersion trong game.json có thể là dải caret ("^0.1.0"); manifest ghi bản semver. */
export function semverOf(v: string | undefined): string {
  const m = /(\d+\.\d+\.\d+)/.exec(v ?? '');
  if (!m?.[1]) throw new Error(`game.json engineVersion không hợp lệ: ${v ?? '(thiếu)'}`);
  return m[1];
}
