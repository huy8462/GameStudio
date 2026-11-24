// Lưới một chunk ở một mức LOD (PSC-WLD-07): bước lưới cellM·2^lod, normal sai phân trung tâm, skirt hướng ra ngoài,
// UV0 = (x, z)/tiling (liền giữa các chunk), UV2 = vị trí trong ô atlas. Tam giác mặt trên quay lên +y (glTF, CCW).
import type { Chunk, Rect } from './chunker.js';
import type { Hf } from './heightfield.js';
import { sampleH } from './heightfield.js';

export interface MeshData {
  positions: Float32Array<ArrayBuffer>;
  normals: Float32Array<ArrayBuffer>;
  uv0: Float32Array<ArrayBuffer>;
  uv2: Float32Array<ArrayBuffer>;
  indices: Uint16Array<ArrayBuffer> | Uint32Array<ArrayBuffer>;
  /** Số tam giác mặt trên (không tính skirt). */
  topTris: number;
}

export interface MeshOptions {
  step: number;
  skirtM: number;
  uvTiling: number;
  uv2: Rect;
}

export function chunkMesh(hf: Hf, ch: Chunk, o: MeshOptions): MeshData {
  const n = Math.round(ch.size / o.step) + 1;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv0: number[] = [];
  const uv2: number[] = [];
  const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number): void => {
    pos.push(x, y, z);
    nor.push(nx, ny, nz);
    uv0.push(x / o.uvTiling, z / o.uvTiling);
    uv2.push(o.uv2.x + ((x - ch.x0) / ch.size) * o.uv2.w, o.uv2.y + ((z - ch.z0) / ch.size) * o.uv2.h);
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = ch.x0 + i * o.step;
      const z = ch.z0 + j * o.step;
      const gx = (sampleH(hf, x + o.step, z) - sampleH(hf, x - o.step, z)) / (2 * o.step);
      const gz = (sampleH(hf, x, z + o.step) - sampleH(hf, x, z - o.step)) / (2 * o.step);
      const len = Math.hypot(gx, 1, gz);
      push(x, sampleH(hf, x, z), z, -gx / len, 1 / len, -gz / len);
    }
  }
  const idx: number[] = [];
  const v = (i: number, j: number): number => j * n + i;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      idx.push(v(i, j), v(i, j + 1), v(i + 1, j), v(i + 1, j), v(i, j + 1), v(i + 1, j + 1));
    }
  }
  const topTris = idx.length / 3;
  // Skirt: vòng biên Bắc (→ +x), Đông (→ +z), Nam (→ −x), Tây (→ −z) để mặt tường hướng ra ngoài.
  const ring: number[] = [];
  for (let i = 0; i < n - 1; i++) ring.push(v(i, 0));
  for (let j = 0; j < n - 1; j++) ring.push(v(n - 1, j));
  for (let i = n - 1; i > 0; i--) ring.push(v(i, n - 1));
  for (let j = n - 1; j > 0; j--) ring.push(v(0, j));
  const base = pos.length / 3;
  for (const k of ring) {
    push(
      pos[k * 3] ?? 0,
      (pos[k * 3 + 1] ?? 0) - o.skirtM,
      pos[k * 3 + 2] ?? 0,
      nor[k * 3] ?? 0,
      nor[k * 3 + 1] ?? 1,
      nor[k * 3 + 2] ?? 0,
    );
    // UV2 của đỉnh skirt trùng đỉnh biên (đã đúng vì cùng x, z).
  }
  for (let t = 0; t < ring.length; t++) {
    const p = ring[t] ?? 0;
    const q = ring[(t + 1) % ring.length] ?? 0;
    const pl = base + t;
    const ql = base + ((t + 1) % ring.length);
    idx.push(p, q, pl, q, ql, pl);
  }
  const vcount = pos.length / 3;
  return {
    positions: Float32Array.from(pos),
    normals: Float32Array.from(nor),
    uv0: Float32Array.from(uv0),
    uv2: Float32Array.from(uv2),
    indices: vcount < 65536 ? Uint16Array.from(idx) : Uint32Array.from(idx),
    topTris,
  };
}
