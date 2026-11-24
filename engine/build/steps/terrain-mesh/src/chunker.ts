// Chia zone thành chunk vuông (PSC-WLD-07: chunk 64 m) và bố trí atlas UV2 (lightmaps/uv2-atlas.json).
import type { HfMeta } from './heightfield.js';
import { hfExtent } from './heightfield.js';

export interface Chunk {
  cx: number;
  cz: number;
  x0: number;
  z0: number;
  size: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const chunkKey = (c: Pick<Chunk, 'cx' | 'cz'>): string => `${c.cx}_${c.cz}`;

/** Điểm trong đa giác (tia ngang, chẵn–lẻ); đa giác [x, z][]. */
export function pointInPolygon(x: number, z: number, poly: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i] ?? [0, 0];
    const [xj, zj] = poly[j] ?? [0, 0];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Chunk lưới chunkM (gốc toạ độ 0) phủ heightfield, chọn chunk có tâm trong đa giác zone; sắp theo (cz, cx). */
export function chunksForZone(meta: HfMeta, polygon: readonly (readonly [number, number])[], chunkM: number): Chunk[] {
  const e = hfExtent(meta);
  const out: Chunk[] = [];
  for (let cz = Math.floor(e.z0 / chunkM); cz * chunkM < e.z1; cz++) {
    for (let cx = Math.floor(e.x0 / chunkM); cx * chunkM < e.x1; cx++) {
      const x0 = cx * chunkM;
      const z0 = cz * chunkM;
      if (pointInPolygon(x0 + chunkM / 2, z0 + chunkM / 2, polygon)) out.push({ cx, cz, x0, z0, size: chunkM });
    }
  }
  return out;
}

/** Atlas vuông cols × cols ô bằng nhau, chunk theo thứ tự đã sắp (DTO-WLD-10 lightmaps/uv2-atlas.json). */
export function atlasLayout(chunks: readonly Chunk[]): { cols: number; rects: Map<string, Rect> } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(chunks.length)));
  const rects = new Map<string, Rect>();
  chunks.forEach((c, i) => {
    rects.set(chunkKey(c), { x: (i % cols) / cols, y: Math.floor(i / cols) / cols, w: 1 / cols, h: 1 / cols });
  });
  return { cols, rects };
}
