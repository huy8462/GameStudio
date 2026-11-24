// Bước terrain.mesh (EP-WLD-04, MOD-WLD-07, PSC-WLD-07, DTO-WLD-10; T-0010). Bước node: export run(ctx) (IF-CLI-02).
// Đầu vào: hf/ của terrain.erode; đầu ra trong ctx.outDir (một zone mỗi lần chạy, perZone):
//   chunks/<cx>_<cz>/lod{0..3}.glb, collider/height-lod1.r32 + .meta.json, lightmaps/uv2-atlas.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { atlasLayout, chunkKey, chunksForZone, type Chunk } from './chunker.js';
import { chunkGlb } from './glb.js';
import { chunkMesh } from './grid-mesh.js';
import { readHf, sampleH, type Hf } from './heightfield.js';

/** Phần StepCtx (DTO-CLI-01) bước này dùng; không import @gamestudio/cli để bước độc lập với CLI. */
export interface TerrainMeshCtx {
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
const json = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

/** Zone của nút: dataPointer '/world.json/zones/[id={zone}]' cho khoá '/world.json/zones/<i>' (T-0014). */
function zonePolygon(ctx: TerrainMeshCtx): [number, number][] {
  type Z = { id?: unknown; polygon?: unknown };
  const z = Object.entries(ctx.inputs.data)
    .filter(([k]) => k.startsWith('/world.json/zones'))
    .flatMap(([, v]) => (Array.isArray(v) ? (v as Z[]) : [v as Z]))
    .find((x) => typeof x === 'object' && x !== null && x.id === ctx.zone);
  if (!z || !Array.isArray(z.polygon))
    throw new StepDataError(`terrain.mesh: không có zone '${ctx.zone ?? ''}' trong world.json`);
  return z.polygon as [number, number][];
}

/** Collider: lưới LOD1 (bước cellM·2) phủ hộp bao các chunk của zone (PSC-WLD-07). */
function collider(hf: Hf, chunks: readonly Chunk[], step: number): { data: Float32Array; meta: object } {
  const x0 = Math.min(...chunks.map((c) => c.x0));
  const z0 = Math.min(...chunks.map((c) => c.z0));
  const x1 = Math.max(...chunks.map((c) => c.x0 + c.size));
  const z1 = Math.max(...chunks.map((c) => c.z0 + c.size));
  const w = Math.round((x1 - x0) / step) + 1;
  const h = Math.round((z1 - z0) / step) + 1;
  const data = new Float32Array(w * h);
  let lo = Infinity;
  let hi = -Infinity;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const y = sampleH(hf, x0 + c * step, z0 + r * step);
      data[r * w + c] = y;
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  return {
    data,
    meta: { width: w, height: h, cellM: step, originLocal: [x0, z0], minH: lo, maxH: hi, crs: hf.meta.crs },
  };
}

const f32le = (a: Float32Array): Buffer => {
  const b = Buffer.alloc(a.length * 4);
  a.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
};

export async function run(ctx: TerrainMeshCtx): Promise<{ metrics: Record<string, number>; summary: string }> {
  const up = ctx.upstream['terrain.erode'];
  if (!up) throw new StepDataError('terrain.mesh: thiếu upstream terrain.erode');
  const hf = readHf(join(up.outDir, 'hf'));
  const p = ctx.inputs.params;
  const chunkM = num(p['chunkM'], 64);
  const lods = Array.isArray(p['lodSteps']) ? (p['lodSteps'] as number[]) : [1, 2, 4, 8];
  const skirtM = num(p['skirtM'], 2);
  const uvTiling = num(p['uvTiling'], 4);
  const bits = num(p['quantBits'], 14);
  const chunks = chunksForZone(hf.meta, zonePolygon(ctx), chunkM);
  if (chunks.length === 0) throw new StepDataError(`terrain.mesh: zone '${ctx.zone ?? ''}' không phủ chunk nào`);
  const atlas = atlasLayout(chunks);
  let bytes = 0;
  let trisLod0 = 0;
  for (const [i, ch] of chunks.entries()) {
    const key = chunkKey(ch);
    const dir = join(ctx.outDir, 'chunks', key);
    mkdirSync(dir, { recursive: true });
    for (const [lod, mult] of lods.entries()) {
      const mesh = chunkMesh(hf, ch, {
        step: hf.meta.cellM * mult,
        skirtM,
        uvTiling,
        uv2: atlas.rects.get(key) ?? { x: 0, y: 0, w: 1, h: 1 },
      });
      if (lod === 0) trisLod0 += mesh.topTris;
      const glb = await chunkGlb(mesh, `chunk_${key}_lod${lod}`, bits);
      writeFileSync(join(dir, `lod${lod}.glb`), glb);
      bytes += glb.length;
    }
    ctx.progress?.(Math.round(((i + 1) / chunks.length) * 90), `chunk ${key}`);
  }
  const col = collider(hf, chunks, hf.meta.cellM * 2);
  mkdirSync(join(ctx.outDir, 'collider'), { recursive: true });
  writeFileSync(join(ctx.outDir, 'collider', 'height-lod1.r32'), f32le(col.data));
  writeFileSync(join(ctx.outDir, 'collider', 'height-lod1.meta.json'), json(col.meta));
  mkdirSync(join(ctx.outDir, 'lightmaps'), { recursive: true });
  const rects = Object.fromEntries([...atlas.rects].map(([k, r]) => [k, [r.x, r.y, r.w, r.h]]));
  writeFileSync(join(ctx.outDir, 'lightmaps', 'uv2-atlas.json'), json({ cols: atlas.cols, chunkM, rects }));
  ctx.progress?.(100, 'xong');
  return {
    metrics: { chunks: chunks.length, lods: lods.length, trisLod0, glbBytes: bytes },
    summary: `terrain.mesh ${ctx.zone ?? ''}: ${chunks.length} chunk × ${lods.length} LOD, ${trisLod0} tam giác LOD0`,
  };
}
