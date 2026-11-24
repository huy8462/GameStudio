// Đọc heightfield bundle (DTO-WLD-02, MOD-WLD-02 bản TS) và lấy mẫu song tuyến; khớp engine/build/py/heightfield/io.py.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface HfMeta {
  width: number;
  height: number;
  cellM: number;
  originLocal: [number, number];
  minH: number;
  maxH: number;
  crs: string;
}

export interface Hf {
  h: Float32Array;
  meta: HfMeta;
}

export function readHf(dir: string): Hf {
  const meta = JSON.parse(readFileSync(join(dir, 'height.meta.json'), 'utf8')) as HfMeta;
  const buf = readFileSync(join(dir, 'height.r32'));
  const n = meta.width * meta.height;
  if (buf.length !== n * 4) throw new Error(`height.r32 có ${buf.length} byte, meta cần ${n * 4}`);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const h = new Float32Array(n);
  for (let i = 0; i < n; i++) h[i] = dv.getFloat32(i * 4, true); // little-endian
  return { h, meta };
}

/** Hộp bao lưới theo toạ độ cục bộ (m). */
export function hfExtent(m: HfMeta): { x0: number; z0: number; x1: number; z1: number } {
  const [x0, z0] = m.originLocal;
  return { x0, z0, x1: x0 + (m.width - 1) * m.cellM, z1: z0 + (m.height - 1) * m.cellM };
}

/** Độ cao tại (x, z) cục bộ, song tuyến, kẹp biên (như sample_bilinear bản Python). */
export function sampleH(hf: Hf, x: number, z: number): number {
  const { width: w, height: hh, cellM, originLocal } = hf.meta;
  const fc = Math.min(Math.max((x - originLocal[0]) / cellM, 0), w - 1);
  const fr = Math.min(Math.max((z - originLocal[1]) / cellM, 0), hh - 1);
  const c0 = Math.floor(fc);
  const r0 = Math.floor(fr);
  const c1 = Math.min(c0 + 1, w - 1);
  const r1 = Math.min(r0 + 1, hh - 1);
  const tc = fc - c0;
  const tr = fr - r0;
  const at = (r: number, c: number): number => hf.h[r * w + c] ?? 0;
  const top = at(r0, c0) * (1 - tc) + at(r0, c1) * tc;
  const bot = at(r1, c0) * (1 - tc) + at(r1, c1) * tc;
  return top * (1 - tr) + bot * tr;
}
