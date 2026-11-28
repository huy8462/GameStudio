// Bước packager (T-0026; MOD-CLI-04, PSC-CLI-02, DTO-RTM-01, FR-CLI-04). Bước node: export run(ctx) (IF-CLI-02).
// Gom đầu ra materials, terrain.erode và các bước theo zone (terrain.mesh, terrain.splat, navmesh) rồi gọi packGame.
// Bước toàn game sau bước theo zone: upstream có khoá '<bước>' (một zone) hoặc '<bước>@<zone>' (nhiều zone).
import { join } from 'node:path';

import { packGame, type PackZoneInput, type TierKey } from '@gamestudio/packager';
import { jsonHash } from '@gamestudio/schema';

/** Phần StepCtx (DTO-CLI-01) bước này dùng. */
export interface PackagerCtx {
  gameId: string;
  tier: TierKey | null;
  inputs: { data: Record<string, unknown>; params: Record<string, unknown> };
  upstream: Record<string, { outDir: string }>;
  outDir: string;
  progress?: (pct: number, msg: string) => void;
}

/** Lỗi dữ liệu (thoát 4). */
export class StepDataError extends Error {
  readonly exitCode = 4;
}

/** Thư mục đầu ra theo zone của một bước theo zone; một zone thì khoá không có hậu tố. */
export function zoneDirs(
  upstream: PackagerCtx['upstream'],
  step: string,
  zones: readonly string[],
): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(upstream)) {
    const only = zones.length === 1 ? zones[0] : undefined;
    if (k === step && only !== undefined) out.set(only, v.outDir);
    else if (k.startsWith(`${step}@`)) out.set(k.slice(step.length + 1), v.outDir);
  }
  return out;
}

export async function run(ctx: PackagerCtx): Promise<{
  result: 'pass' | 'warn' | 'fail';
  metrics: Record<string, number>;
  checks: { id: string; result: 'pass' | 'warn' | 'fail'; value?: number; limit?: number; source?: string[] }[];
  warnings: string[];
  artifacts: string[];
  summary: string;
}> {
  const d = ctx.inputs.data;
  const game = d['/game.json'] as { id?: string } | undefined;
  const zonesDef = (d['/world.json/zones'] ?? []) as { id: string; polygon: [number, number][] }[];
  if (!game || zonesDef.length === 0) throw new StepDataError('packager: thiếu game.json hoặc world.json/zones');
  const ids = zonesDef.map((z) => z.id);
  const mesh = zoneDirs(ctx.upstream, 'terrain.mesh', ids);
  const splat = zoneDirs(ctx.upstream, 'terrain.splat', ids);
  const nav = zoneDirs(ctx.upstream, 'navmesh', ids);
  const zones: PackZoneInput[] = ids.map((id) => {
    const meshDir = mesh.get(id);
    if (!meshDir) throw new StepDataError(`packager: thiếu terrain.mesh của zone '${id}'`);
    const z: PackZoneInput = { id, meshDir };
    const s = splat.get(id);
    const n = nav.get(id);
    if (s) z.splatDir = s;
    if (n) z.navDir = n;
    return z;
  });
  const erode = ctx.upstream['terrain.erode'];
  const mats = ctx.upstream['materials'];
  ctx.progress?.(5, 'đóng gói texture');
  const r = await packGame({
    game: { ...game, id: game.id ?? ctx.gameId },
    world: { zones: zonesDef, regions: (d['/world.json/regions'] ?? []) as [] },
    budgets: { tiers: (d['/budgets.json/tiers'] ?? {}) as Record<string, object> },
    ...(ctx.tier ? { tiers: [ctx.tier] } : {}),
    zones,
    ...(mats ? { materialsDir: mats.outDir } : {}),
    ...(erode ? { heightDir: join(erode.outDir, 'hf') } : {}),
    dataHash: `sha256:${jsonHash(d)}`,
    outDir: ctx.outDir,
  });
  ctx.progress?.(100, 'xong');
  const m = r.manifest;
  return {
    result: r.result,
    metrics: r.metrics,
    checks: r.checks,
    warnings: r.warnings,
    artifacts: ['manifest.json'],
    summary: `packager: ${m.zones.length} zone × ${m.tiers.length} tier, zone xuất phát ${m.startZone}`,
  };
}
