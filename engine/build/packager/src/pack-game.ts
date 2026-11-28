// T-0026 (MOD-CLI-04 collect.ts, split-core.ts, manifest.ts; PSC-CLI-02 bước 1, 5, 6, 7, 9, 10; DTO-RTM-01; FR-CLI-04).
// Đóng gói một game cho Unity player: zone × tier, phần core/full, glb có scene mặc định, texture lõi ≤ coreTextureMax
// ETC1S (dùng packTextures, T-0020), module, manifest.json. Chưa có: kiểm asset/provenance (bước 2), gộp mesh và vật
// liệu (3, 4), Meshopt lại (6, glb của terrain.mesh đã nén), credits (10).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { type BudgetCheck, type CheckResult, evaluate } from '@gamestudio/schema';

import { withDefaultScene } from './glb.js';
import {
  type FileRef,
  fileRef,
  type GameLike,
  type Manifest,
  modulesOf,
  semverOf,
  spawnOf,
  TIER_ORDER,
  type TierKey,
  type WorldLike,
  type ZoneEntry,
  boundsOf,
} from './manifest.js';
import { textureReport } from './metrics.js';
import { packTextures, type PackedTexture, type TextureInput } from './textures.js';

export interface PackTierBudget {
  maxTexture?: number;
  coreTextureMax?: number;
  coreZoneMB?: number;
  zoneDownloadMB?: number;
}

export interface PackZoneInput {
  id: string;
  /** Đầu ra terrain.mesh (chunks/<cx>_<cz>/lod*.glb, collider/). */
  meshDir: string;
  /** Đầu ra terrain.splat (splat-*.png, layers.json). */
  splatDir?: string;
  /** Đầu ra navmesh (nav/sources.json). */
  navDir?: string;
}

export interface PackGameInput {
  game: GameLike;
  world: WorldLike;
  budgets: { tiers?: Record<string, PackTierBudget> };
  /** Chỉ đóng gói các tier này (engine build --tier); mặc định mọi tier có trong budgets. */
  tiers?: TierKey[];
  zones: PackZoneInput[];
  /** Đầu ra bước materials (materials.json, materials/, hdri/). */
  materialsDir?: string;
  /** hf/ của terrain.erode để lấy độ cao điểm spawn. */
  heightDir?: string;
  dataHash: string;
  outDir: string;
  tools?: { ktx?: string; ffmpeg?: string; ffprobe?: string };
}

export interface PackGameResult {
  manifest: Manifest;
  result: CheckResult;
  metrics: Record<string, number>;
  checks: (BudgetCheck & { source?: string[] })[];
  warnings: string[];
}

const MB = 1024 * 1024;
const round = (v: number): number => Math.round(v * 1000) / 1000;
// T-0028: core vẽ LOD1, trùng đỉnh với collider LOD1 (cùng bước cellM·2) nên người chơi không lún vào mặt hiển thị.
const LOD_CORE = [1];
const LOD_FULL = [0, 2, 3];
const MAP_KEYS = ['baseColor', 'normal', 'orm', 'height'] as const;

interface MaterialsIndex {
  materials?: { id: string; dir: string }[];
  hdri?: { id: string; dir: string }[];
}

/** Ghi tệp vào gói và trả FileRef (đường dẫn tương đối manifest). */
function put(outDir: string, rel: string, buf: Buffer): FileRef {
  const dst = join(outDir, rel);
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, buf);
  return fileRef(rel, buf);
}

function spawnHeight(heightDir: string | undefined, x: number, z: number): number {
  if (!heightDir || !existsSync(join(heightDir, 'height.meta.json'))) return 0;
  const meta = JSON.parse(readFileSync(join(heightDir, 'height.meta.json'), 'utf8')) as {
    width: number;
    height: number;
    cellM: number;
    originLocal: [number, number];
  };
  const col = Math.min(meta.width - 1, Math.max(0, Math.round((x - meta.originLocal[0]) / meta.cellM)));
  const row = Math.min(meta.height - 1, Math.max(0, Math.round((z - meta.originLocal[1]) / meta.cellM)));
  const buf = readFileSync(join(heightDir, 'height.r32'));
  return round(buf.readFloatLE((row * meta.width + col) * 4));
}

function textureInputs(input: PackGameInput): { inputs: TextureInput[]; materials: FileRef[]; mats: string[] } {
  const inputs: TextureInput[] = [];
  const materials: FileRef[] = [];
  const mats: string[] = [];
  const mdir = input.materialsDir;
  if (mdir && existsSync(join(mdir, 'materials.json'))) {
    const index = JSON.parse(readFileSync(join(mdir, 'materials.json'), 'utf8')) as MaterialsIndex;
    for (const m of index.materials ?? []) {
      const mj = JSON.parse(readFileSync(join(mdir, m.dir, 'material.json'), 'utf8')) as {
        maps: Partial<Record<(typeof MAP_KEYS)[number], string>>;
        sharp?: string[];
      };
      const textures: Record<string, string> = {};
      for (const k of MAP_KEYS) {
        const file = mj.maps[k];
        if (!file) continue;
        const id = `${m.id}-${k.toLowerCase()}`;
        textures[k] = id;
        inputs.push({
          id,
          path: join(mdir, m.dir, file),
          sharp: (mj.sharp ?? []).includes(k),
          srgb: k === 'baseColor',
        });
      }
      const doc = Buffer.from(`${JSON.stringify({ ...mj, textures }, null, 2)}\n`);
      materials.push(put(input.outDir, `materials/${m.id}.json`, doc));
      mats.push(m.id);
    }
  }
  for (const z of input.zones) {
    if (!z.splatDir) continue;
    for (const n of readdirSync(z.splatDir)
      .filter((f) => /^splat-\d+\.png$/.test(f))
      .sort()) {
      inputs.push({ id: `${z.id}-${n.replace('.png', '')}`, path: join(z.splatDir, n), srgb: false });
    }
  }
  return { inputs, materials, mats };
}

function copyHdri(input: PackGameInput): Manifest['environment']['hdri'] {
  const mdir = input.materialsDir;
  if (!mdir || !existsSync(join(mdir, 'materials.json'))) return [];
  const index = JSON.parse(readFileSync(join(mdir, 'materials.json'), 'utf8')) as MaterialsIndex;
  return (index.hdri ?? []).map((h) => {
    const f = (name: string): FileRef =>
      put(input.outDir, `env/${h.id}/${name}`, readFileSync(join(mdir, h.dir, name)));
    return { id: h.id, env: f('env.ktx2'), sky: f('sky.ktx2'), sh: f('sh.json') };
  });
}

function zoneFiles(input: PackGameInput, z: PackZoneInput): { core: FileRef[]; full: FileRef[]; patched: number } {
  const core: FileRef[] = [];
  const full: FileRef[] = [];
  let patched = 0;
  const chunks = join(z.meshDir, 'chunks');
  for (const c of existsSync(chunks) ? readdirSync(chunks).sort() : []) {
    for (const lod of [...LOD_CORE, ...LOD_FULL]) {
      const src = join(chunks, c, `lod${lod}.glb`);
      if (!existsSync(src)) continue;
      const g = withDefaultScene(readFileSync(src));
      if (g.changed) patched++;
      const ref = put(input.outDir, `zones/${z.id}/terrain/${c}/lod${lod}.glb`, g.buf);
      (LOD_CORE.includes(lod) ? core : full).push(ref);
    }
  }
  const extra: [string | undefined, string][] = [
    [z.meshDir, 'collider/height-lod1.r32'],
    [z.meshDir, 'collider/height-lod1.meta.json'],
    [z.navDir, 'nav/sources.json'],
    [z.splatDir, 'layers.json'],
  ];
  for (const [dir, rel] of extra) {
    if (dir && existsSync(join(dir, rel)))
      core.push(put(input.outDir, `zones/${z.id}/${rel}`, readFileSync(join(dir, rel))));
  }
  return { core, full, patched };
}

const byPath = (a: FileRef, b: FileRef): number => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const sumBytes = (fs: readonly FileRef[]): number => fs.reduce((s, f) => s + f.bytes, 0);

export async function packGame(input: PackGameInput): Promise<PackGameResult> {
  const budgets = input.budgets.tiers ?? {};
  const tiers = (input.tiers ?? TIER_ORDER).filter((t) => budgets[t] !== undefined);
  if (tiers.length === 0) throw new Error('budgets.json không có tier nào để đóng gói');
  const warnings: string[] = [];
  const checks: PackGameResult['checks'] = [];

  // Bước 5 + texture của bước 7: đóng gói một lần cho mỗi cặp (maxTexture, coreTextureMax), các tier cùng cặp dùng chung.
  const { inputs, materials, mats } = textureInputs(input);
  const groups = new Map<string, { packed: PackedTexture[]; tiers: TierKey[] }>();
  for (const t of tiers) {
    const b = budgets[t] ?? {};
    if (b.maxTexture === undefined || b.coreTextureMax === undefined)
      throw new Error(`budgets.tiers.${t} thiếu maxTexture hoặc coreTextureMax`);
    const key = `t${b.maxTexture}-${b.coreTextureMax}`;
    let g = groups.get(key);
    if (!g) {
      const dir = join(input.outDir, 'tex', key);
      const packed = await packTextures(inputs, {
        outDir: dir,
        maxTexture: b.maxTexture,
        coreTextureMax: b.coreTextureMax,
        ...input.tools,
      });
      for (const p of packed) for (const f of [p.full, p.core, p.fallback]) f.path = `tex/${key}/${f.path}`;
      g = { packed, tiers: [] };
      groups.set(key, g);
      const rep = textureReport(packed, { coreTextureMax: b.coreTextureMax, coreZoneMB: b.coreZoneMB ?? Infinity });
      checks.push(...rep.checks.filter((c) => c.id === 'coreTextureMax').map((c) => ({ ...c, id: `${key}.${c.id}` })));
    }
    g.tiers.push(t);
  }
  const texOf = (t: TierKey): PackedTexture[] => [...groups.values()].find((g) => g.tiers.includes(t))?.packed ?? [];
  const ref = (f: { path: string; bytes: number; sha256: string }): FileRef => ({
    path: f.path,
    bytes: f.bytes,
    sha256: f.sha256,
  });

  const sp = spawnOf(input.world);
  const zonesDef = new Map((input.world.zones ?? []).map((z) => [z.id, z]));
  let patched = 0;
  const zones: ZoneEntry[] = [];
  for (const z of [...input.zones].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const def = zonesDef.get(z.id);
    if (!def) throw new Error(`zone '${z.id}' không có trong world.json`);
    const files = zoneFiles(input, z);
    patched += files.patched;
    if (files.core.length === 0) warnings.push(`zone ${z.id}: không có tệp lõi (thiếu chunk địa hình?)`);
    const entry: ZoneEntry = {
      id: z.id,
      bounds: boundsOf(def.polygon),
      neighbors: [...(def.neighbors ?? [])],
      parts: {},
      bytes: {},
    };
    for (const t of tiers) {
      const own = texOf(t).filter(
        (p) => p.id.startsWith(`${z.id}-splat-`) || mats.some((m) => p.id.startsWith(`${m}-`)),
      );
      const core = [...files.core, ...own.map((p) => ref(p.core))].sort(byPath);
      const full = [...files.full, ...own.map((p) => ref(p.full))].sort(byPath);
      entry.parts[t] = { core, full };
      entry.bytes[t] = { core: sumBytes(core), full: sumBytes(full) };
      const b = budgets[t] ?? {};
      const limits: Record<string, number> = {};
      const metrics: Record<string, number> = { zoneDownloadMB: round((sumBytes(core) + sumBytes(full)) / MB) };
      if (b.zoneDownloadMB !== undefined) limits['zoneDownloadMB'] = b.zoneDownloadMB;
      if (z.id === sp.zone && b.coreZoneMB !== undefined) {
        metrics['coreZoneMB'] = round(sumBytes(core) / MB);
        limits['coreZoneMB'] = b.coreZoneMB;
      }
      const top = [...core, ...full]
        .sort((a, c) => c.bytes - a.bytes)
        .slice(0, 5)
        .map((f) => f.path);
      for (const c of evaluate(metrics, limits).checks) checks.push({ ...c, id: `${t}.${z.id}.${c.id}`, source: top });
    }
    zones.push(entry);
  }

  const environment = { hdri: copyHdri(input), materials: materials.sort(byPath) };
  const manifest: Manifest = {
    schema: 'manifest/1',
    gameId: input.game.id ?? 'game',
    engineVersion: semverOf(input.game.engineVersion),
    schemaVersion: input.game.schemaVersion ?? 1,
    dataHash: input.dataHash,
    tiers,
    startZone: sp.zone,
    spawn: { zone: sp.zone, pos: [round(sp.x), spawnHeight(input.heightDir, sp.x, sp.z), round(sp.z)], yaw: 0 },
    zones,
    modules: modulesOf(input.game),
    fallbacks: { texture: 'jpg' },
    environment,
    credits: [],
  };
  writeManifest(input.outDir, manifest);
  const result: CheckResult = checks.some((c) => c.result === 'fail')
    ? 'fail'
    : checks.some((c) => c.result === 'warn')
      ? 'warn'
      : 'pass';
  const start = zones.find((z) => z.id === sp.zone);
  const metrics: Record<string, number> = {
    zones: zones.length,
    tiers: tiers.length,
    textures: inputs.length,
    glbPatched: patched,
  };
  for (const t of tiers) metrics[`${t}.startCoreMB`] = round((start?.bytes[t]?.core ?? 0) / MB);
  return { manifest, result, metrics, checks, warnings };
}

function writeManifest(outDir: string, m: Manifest): void {
  writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(m, null, 2)}\n`);
}
