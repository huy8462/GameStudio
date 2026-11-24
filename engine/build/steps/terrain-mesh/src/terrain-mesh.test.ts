// T-0010: terrain.mesh (PSC-WLD-07, DTO-WLD-10): chunk, lưới LOD + skirt, glb lượng tử + Meshopt, run() tất định.
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { afterAll, describe, expect, it } from 'vitest';

import { atlasLayout, chunkKey, chunksForZone, pointInPolygon } from './chunker.js';
import { chunkGlb, quantizePositions } from './glb.js';
import { chunkMesh } from './grid-mesh.js';
import type { Hf, HfMeta } from './heightfield.js';
import { readHf, sampleH } from './heightfield.js';
import { run, StepDataError } from './index.js';

const SQ: [number, number][] = [
  [-250, -250],
  [250, -250],
  [250, 250],
  [-250, 250],
];
const META: HfMeta = { width: 251, height: 251, cellM: 2, originLocal: [-250, -250], minH: 0, maxH: 0, crs: 'LOCAL' };

/** Heightfield thử: mặt nghiêng + sóng, tất định. */
function makeHf(): Hf {
  const h = new Float32Array(META.width * META.height);
  for (let r = 0; r < META.height; r++) {
    for (let c = 0; c < META.width; c++) h[r * META.width + c] = 0.05 * c + 3 * Math.sin(r / 9);
  }
  return { h, meta: META };
}

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'gs-tmesh-'));
  dirs.push(d);
  return d;
};

function writeHfBundle(dir: string, hf: Hf): void {
  mkdirSync(join(dir, 'hf'), { recursive: true });
  const b = Buffer.alloc(hf.h.length * 4);
  hf.h.forEach((v, i) => b.writeFloatLE(v, i * 4));
  writeFileSync(join(dir, 'hf', 'height.r32'), b);
  writeFileSync(join(dir, 'hf', 'height.meta.json'), JSON.stringify(hf.meta));
}

describe('chunker', () => {
  it('điểm trong đa giác; 500×500 m → 8×8 chunk 64 m sắp theo (cz, cx)', () => {
    expect(pointInPolygon(0, 0, SQ)).toBe(true);
    expect(pointInPolygon(300, 0, SQ)).toBe(false);
    const ch = chunksForZone(META, SQ, 64);
    expect(ch).toHaveLength(64);
    expect(chunkKey(ch[0] ?? { cx: 0, cz: 0 })).toBe('-4_-4');
    expect(chunkKey(ch[63] ?? { cx: 0, cz: 0 })).toBe('3_3');
    const half = chunksForZone(
      META,
      [
        [-250, -250],
        [0, -250],
        [0, 250],
        [-250, 250],
      ],
      64,
    );
    expect(half).toHaveLength(32);
    const a = atlasLayout(ch);
    expect(a.cols).toBe(8);
    expect(a.rects.get('3_3')).toEqual({ x: 7 / 8, y: 7 / 8, w: 1 / 8, h: 1 / 8 });
  });
});

describe('lưới chunk', () => {
  const hf = makeHf();
  const ch = { cx: 0, cz: 0, x0: 0, z0: 0, size: 64 };
  const uv2 = { x: 0.5, y: 0.25, w: 0.25, h: 0.25 };

  it.each([
    [2, 33],
    [4, 17],
    [8, 9],
    [16, 5],
  ])('bước %d m → %d×%d đỉnh mặt trên + skirt', (step, n) => {
    const m = chunkMesh(hf, ch, { step, skirtM: 2, uvTiling: 4, uv2 });
    const ring = 4 * (n - 1);
    expect(m.positions.length / 3).toBe(n * n + ring);
    expect(m.topTris).toBe(2 * (n - 1) * (n - 1));
    expect(m.indices.length / 3).toBe(m.topTris + 2 * ring);
    expect(m.positions[1]).toBeCloseTo(sampleH(hf, 0, 0), 5);
  });

  it('mặt trên quay lên, skirt hướng ra ngoài và thấp hơn 2 m, normal đơn vị, UV2 trong ô atlas', () => {
    const m = chunkMesh(hf, ch, { step: 8, skirtM: 2, uvTiling: 4, uv2 });
    const p = (i: number): [number, number, number] => [
      m.positions[i * 3] ?? 0,
      m.positions[i * 3 + 1] ?? 0,
      m.positions[i * 3 + 2] ?? 0,
    ];
    const faceN = (t: number): [number, number, number] => {
      const [a, b, c] = [p(m.indices[t * 3] ?? 0), p(m.indices[t * 3 + 1] ?? 0), p(m.indices[t * 3 + 2] ?? 0)];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      return [
        (u[1] ?? 0) * (v[2] ?? 0) - (u[2] ?? 0) * (v[1] ?? 0),
        (u[2] ?? 0) * (v[0] ?? 0) - (u[0] ?? 0) * (v[2] ?? 0),
        (u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0),
      ];
    };
    for (let t = 0; t < m.topTris; t++) expect(faceN(t)[1]).toBeGreaterThan(0);
    // Tam giác skirt đầu tiên nằm ở biên Bắc (z = 0) → normal hướng −z.
    expect(faceN(m.topTris)[2]).toBeLessThan(0);
    const top = 81;
    expect(p(top)[1]).toBeCloseTo(p(0)[1] - 2, 5);
    for (let i = 0; i < m.normals.length; i += 3) {
      expect(Math.hypot(m.normals[i] ?? 0, m.normals[i + 1] ?? 0, m.normals[i + 2] ?? 0)).toBeCloseTo(1, 6);
    }
    for (let i = 0; i < m.uv2.length; i += 2) {
      expect(m.uv2[i]).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(m.uv2[i]).toBeLessThanOrEqual(0.75 + 1e-9);
    }
  });
});

describe('glb', () => {
  it('lượng tử đồng đều 14 bit; glb Meshopt giải lại đúng vị trí; byte tất định', async () => {
    const m = chunkMesh(
      makeHf(),
      { cx: 1, cz: 1, x0: 64, z0: 64, size: 64 },
      { step: 4, skirtM: 2, uvTiling: 4, uv2: { x: 0, y: 0, w: 1, h: 1 } },
    );
    const q = quantizePositions(m.positions, 14);
    expect(Math.max(...q.positions)).toBe(16383);
    expect(Math.min(...q.positions)).toBe(0);
    const a = await chunkGlb(m, 'chunk_1_1_lod1', 14);
    const b = await chunkGlb(m, 'chunk_1_1_lod1', 14);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.readBinary(a);
    const root = doc.getRoot();
    expect(
      root
        .listExtensionsUsed()
        .map((e) => e.extensionName)
        .sort(),
    ).toEqual(['EXT_meshopt_compression', 'KHR_mesh_quantization']);
    const node = root.listNodes()[0];
    const pos = node?.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION');
    const s = node?.getScale()[0] ?? 0;
    const t = node?.getTranslation() ?? [0, 0, 0];
    const el: number[] = [];
    for (let i = 0; i < (pos?.getCount() ?? 0); i += 37) {
      pos?.getElement(i, el);
      for (let k = 0; k < 3; k++)
        expect(Math.abs((el[k] ?? 0) * s + (t[k] ?? 0) - (m.positions[i * 3 + k] ?? 0))).toBeLessThanOrEqual(
          s / 2 + 1e-6,
        );
    }
  });
});

describe('run()', () => {
  const ctx = (up: string, out: string, zone = 'z1') => ({
    zone,
    inputs: { data: { '/world.json/zones': [{ id: 'z1', polygon: SQ }] }, params: {} },
    upstream: { 'terrain.erode': { outDir: up } },
    outDir: out,
  });

  it('ghi chunks/*/lod0..3.glb, collider LOD1, atlas; hai lần chạy cùng byte', { timeout: 60_000 }, async () => {
    const up = tmp();
    writeHfBundle(up, makeHf());
    const [o1, o2] = [tmp(), tmp()];
    const r = await run(ctx(up, o1));
    await run(ctx(up, o2));
    expect(r.metrics).toMatchObject({ chunks: 64, lods: 4, trisLod0: 64 * 2048 });
    expect(readdirSync(join(o1, 'chunks', '0_0')).sort()).toEqual(['lod0.glb', 'lod1.glb', 'lod2.glb', 'lod3.glb']);
    const col = JSON.parse(readFileSync(join(o1, 'collider', 'height-lod1.meta.json'), 'utf8')) as HfMeta;
    expect(col).toMatchObject({ width: 129, height: 129, cellM: 4, originLocal: [-256, -256] });
    expect(readFileSync(join(o1, 'collider', 'height-lod1.r32')).length).toBe(129 * 129 * 4);
    const atlas = JSON.parse(readFileSync(join(o1, 'lightmaps', 'uv2-atlas.json'), 'utf8')) as { cols: number };
    expect(atlas.cols).toBe(8);
    for (const f of [
      'chunks/-4_-4/lod0.glb',
      'chunks/3_3/lod3.glb',
      'collider/height-lod1.r32',
      'lightmaps/uv2-atlas.json',
    ]) {
      expect(readFileSync(join(o1, f)).equals(readFileSync(join(o2, f))), f).toBe(true);
    }
    expect(readHf(join(up, 'hf')).meta.width).toBe(251);
  });

  it('zone lạ hoặc thiếu upstream → StepDataError (thoát 4)', async () => {
    const up = tmp();
    writeHfBundle(up, makeHf());
    await expect(run(ctx(up, tmp(), 'z9'))).rejects.toBeInstanceOf(StepDataError);
    await expect(run({ ...ctx(up, tmp()), upstream: {} })).rejects.toMatchObject({ exitCode: 4 });
  });
});
