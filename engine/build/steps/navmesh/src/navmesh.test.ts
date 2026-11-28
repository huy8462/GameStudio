// T-0019 (MOD-CHR-18, DTO-CHR-06, CFG-CHR-06): nav/sources.json từ đầu ra terrain.mesh; hợp lệ nav-sources/1; tất định.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { validate } from '@gamestudio/schema';
import { afterAll, describe, expect, it } from 'vitest';

import { AGENT_TYPES, navSources, readChunks, run, StepDataError } from './index.js';

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'gs-nav-'));
  dirs.push(d);
  return d;
};

/** Thư mục giả của terrain.mesh: lưới 4×4 chunk từ (-2,-2), collider meta có minH/maxH. */
function fakeMesh(): string {
  const d = tmp();
  for (let cz = -2; cz < 2; cz++)
    for (let cx = -2; cx < 2; cx++) mkdirSync(join(d, 'chunks', `${cx}_${cz}`), { recursive: true });
  mkdirSync(join(d, 'chunks', 'khong-phai-chunk'), { recursive: true });
  mkdirSync(join(d, 'collider'), { recursive: true });
  writeFileSync(join(d, 'collider', 'height-lod1.meta.json'), JSON.stringify({ minH: -3.2, maxH: 41.75 }));
  return d;
}

const ctx = (mesh: string, out: string) => ({
  zone: 'z1',
  inputs: { data: {}, params: { voxelSize: 0.2, tileSize: 64 } },
  upstream: { 'terrain.mesh': { outDir: mesh } },
  outDir: out,
});

describe('navmesh', () => {
  it('ô theo lưới chunk 64 m, sắp (z, x); bounds phủ địa hình + chiều cao tác nhân; 4 họ', () => {
    const doc = navSources({
      zone: 'z1',
      chunks: [
        { cx: 1, cz: 0 },
        { cx: 0, cz: 0 },
        { cx: 0, cz: -1 },
      ],
      minH: 0,
      maxH: 10,
      agentTypes: AGENT_TYPES,
      voxelSize: 0.2,
      tileSize: 64,
      sources: [{ kind: 'terrain', ref: 't', area: 'walkable' }],
    });
    expect(doc.tiles.map((t) => [t.x, t.z])).toEqual([
      [0, -1],
      [0, 0],
      [1, 0],
    ]);
    expect(doc.tiles[2]?.bounds).toEqual({ min: [64, -1, 0], max: [128, 12.7, 64] });
    expect(doc.bounds).toEqual({ min: [0, -1, -64], max: [128, 12.7, 64] });
    expect(doc.agentTypes.map((a) => a.agentType)).toEqual(['nguoi', 'thu4_nho', 'thu4_lon', 'gia_cam']);
    expect(validate('navSources', doc)).toEqual([]);
  });

  it('run(): ghi nav/sources.json hợp lệ schema; bỏ thư mục không phải chunk; hai lần cùng byte', () => {
    const mesh = fakeMesh();
    expect(readChunks(mesh)).toHaveLength(16);
    const a = tmp();
    const b = tmp();
    const r = run(ctx(mesh, a));
    run(ctx(mesh, b));
    expect(r.metrics).toEqual({ tiles: 16, agentTypes: 4, sources: 1 });
    const ta = readFileSync(join(a, 'nav/sources.json'), 'utf8');
    expect(ta).toBe(readFileSync(join(b, 'nav/sources.json'), 'utf8'));
    const doc = JSON.parse(ta) as { tiles: unknown[]; bounds: unknown; voxelSize: number };
    expect(validate('navSources', doc)).toEqual([]);
    expect(doc.voxelSize).toBe(0.2);
    expect(doc.bounds).toEqual({ min: [-128, -4.2, -128], max: [128, 44.45, 128] });
  });

  it('thiếu upstream hoặc không có chunk → StepDataError (thoát 4)', () => {
    expect(() => run({ ...ctx(tmp(), tmp()), upstream: {} })).toThrow(StepDataError);
    expect(() => run(ctx(tmp(), tmp()))).toThrow(/không có chunk/);
  });

  it('schema bắt sai: voxelSize ≤ 0, area lạ, thiếu tiles', () => {
    const doc = JSON.parse(
      JSON.stringify(
        navSources({
          zone: 'z1',
          chunks: [{ cx: 0, cz: 0 }],
          minH: 0,
          maxH: 1,
          agentTypes: AGENT_TYPES,
          voxelSize: 0.2,
          tileSize: 64,
          sources: [{ kind: 'terrain', ref: 't', area: 'walkable' }],
        }),
      ),
    ) as Record<string, unknown>;
    expect(validate('navSources', { ...doc, voxelSize: 0 }).length).toBeGreaterThan(0);
    expect(
      validate('navSources', { ...doc, sources: [{ kind: 'terrain', ref: 't', area: 'bay' }] }).length,
    ).toBeGreaterThan(0);
    const { tiles: _t, ...noTiles } = doc;
    expect(validate('navSources', noTiles).length).toBeGreaterThan(0);
  });
});
