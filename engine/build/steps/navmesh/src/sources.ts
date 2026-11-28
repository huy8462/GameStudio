// T-0019 (DTO-CHR-06, SCH-CHR-06 theo DDD-05, PSC-CHR-07): dựng nội dung nav/sources.json từ lưới chunk địa hình.
import type { AgentTypeSpec } from './agent-types.js';

export type Vec3 = [number, number, number];
export interface Box {
  min: Vec3;
  max: Vec3;
}
export interface NavTile {
  x: number;
  z: number;
  bounds: Box;
}
export interface NavSource {
  kind: 'terrain' | 'placement' | 'water_deep';
  ref: string;
  area: 'walkable' | 'not_walkable';
}
export interface NavSourcesDoc {
  schema: 'nav-sources/1';
  zone: string;
  agentTypes: AgentTypeSpec[];
  voxelSize: number;
  tileSize: number;
  bounds: Box;
  tiles: NavTile[];
  sources: NavSource[];
}

export interface NavSourcesInput {
  zone: string;
  /** Chỉ số chunk (cx, cz) trên lưới tileSize, như tên thư mục chunks/<cx>_<cz> của terrain.mesh. */
  chunks: readonly { cx: number; cz: number }[];
  /** Khoảng độ cao địa hình của zone (collider/height-lod1.meta.json). */
  minH: number;
  maxH: number;
  agentTypes: readonly AgentTypeSpec[];
  voxelSize: number;
  tileSize: number;
  sources: readonly NavSource[];
}

/** Làm tròn 3 chữ số để JSON ổn định giữa các máy. */
const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/** Ô = chunk (cùng lưới); trục y phủ địa hình + chiều cao tác nhân lớn nhất + 1 m mỗi phía. Ô sắp theo (z, x). */
export function navSources(inp: NavSourcesInput): NavSourcesDoc {
  if (inp.chunks.length === 0) throw new Error('navmesh: zone không có chunk');
  if (!(inp.voxelSize > 0) || !(inp.tileSize > 0)) throw new Error('navmesh: voxelSize, tileSize phải > 0');
  const agentH = Math.max(...inp.agentTypes.map((a) => a.height));
  const y0 = r3(inp.minH - 1);
  const y1 = r3(inp.maxH + agentH + 1);
  const s = inp.tileSize;
  const tiles = [...inp.chunks]
    .sort((a, b) => a.cz - b.cz || a.cx - b.cx)
    .map((c): NavTile => ({
      x: c.cx,
      z: c.cz,
      bounds: { min: [c.cx * s, y0, c.cz * s], max: [(c.cx + 1) * s, y1, (c.cz + 1) * s] },
    }));
  const xs = tiles.map((t) => t.x);
  const zs = tiles.map((t) => t.z);
  return {
    schema: 'nav-sources/1',
    zone: inp.zone,
    agentTypes: inp.agentTypes.map((a) => ({ ...a })),
    voxelSize: inp.voxelSize,
    tileSize: s,
    bounds: {
      min: [Math.min(...xs) * s, y0, Math.min(...zs) * s],
      max: [(Math.max(...xs) + 1) * s, y1, (Math.max(...zs) + 1) * s],
    },
    tiles,
    sources: inp.sources.map((x) => ({ ...x })),
  };
}
