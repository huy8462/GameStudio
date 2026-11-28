// Bước navmesh (EP-CHR-01, MOD-CHR-18, DTO-CHR-06, CFG-CHR-06; T-0019). Bước node: export run(ctx) (IF-CLI-02).
// Không dựng navmesh ở build (CR-02): chỉ ghi nav/sources.json để player dựng NavMeshData từng ô lúc nạp (PSC-CHR-07).
// Giai đoạn này nguồn chỉ có địa hình; placement, water_deep thêm khi có bước tương ứng.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { AGENT_TYPES, NAV_DEFAULTS } from './agent-types.js';
import { navSources } from './sources.js';

export { AGENT_TYPES, NAV_DEFAULTS } from './agent-types.js';
export type { AgentTypeId, AgentTypeSpec } from './agent-types.js';
export { navSources } from './sources.js';
export type { NavSource, NavSourcesDoc, NavSourcesInput, NavTile } from './sources.js';

/** Phần StepCtx (DTO-CLI-01) bước này dùng; không import @gamestudio/cli để bước độc lập với CLI. */
export interface NavmeshCtx {
  zone: string | null;
  inputs: { data: Record<string, unknown>; params: Record<string, unknown> };
  upstream: Record<string, { outDir: string }>;
  outDir: string;
  progress?: (pct: number, msg: string) => void;
}

/** Lỗi có mã thoát SRS-04 §7.2; bộ điều phối đọc thuộc tính exitCode. */
export class StepDataError extends Error {
  readonly exitCode = 4;
}

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** Chunk của zone theo tên thư mục chunks/<cx>_<cz> mà terrain.mesh ghi. */
export function readChunks(meshDir: string): { cx: number; cz: number }[] {
  const dir = join(meshDir, 'chunks');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((n) => /^(-?\d+)_(-?\d+)$/.exec(n))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ cx: Number(m[1]), cz: Number(m[2]) }));
}

export function run(ctx: NavmeshCtx): { metrics: Record<string, number>; summary: string } {
  const zone = ctx.zone ?? '';
  const up = ctx.upstream['terrain.mesh'];
  if (!up) throw new StepDataError('navmesh: thiếu upstream terrain.mesh');
  const chunks = readChunks(up.outDir);
  if (chunks.length === 0) throw new StepDataError(`navmesh: zone '${zone}' không có chunk địa hình`);
  const meta = JSON.parse(readFileSync(join(up.outDir, 'collider', 'height-lod1.meta.json'), 'utf8')) as {
    minH?: unknown;
    maxH?: unknown;
  };
  const p = ctx.inputs.params;
  const doc = navSources({
    zone,
    chunks,
    minH: num(meta.minH, 0),
    maxH: num(meta.maxH, 0),
    agentTypes: AGENT_TYPES,
    voxelSize: num(p['voxelSize'], NAV_DEFAULTS.voxelSize),
    tileSize: num(p['tileSize'], NAV_DEFAULTS.tileSize),
    sources: [{ kind: 'terrain', ref: 'terrain.mesh/collider/height-lod1', area: 'walkable' }],
  });
  mkdirSync(join(ctx.outDir, 'nav'), { recursive: true });
  writeFileSync(join(ctx.outDir, 'nav', 'sources.json'), `${JSON.stringify(doc, null, 2)}\n`);
  ctx.progress?.(100, 'xong');
  return {
    metrics: { tiles: doc.tiles.length, agentTypes: doc.agentTypes.length, sources: doc.sources.length },
    summary: `navmesh ${zone}: ${doc.tiles.length} ô ${doc.tileSize} m × ${doc.agentTypes.length} loại tác nhân`,
  };
}
