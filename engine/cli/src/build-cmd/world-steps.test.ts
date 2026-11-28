// T-0007, T-0008, T-0010: bước thật world.fetch, world.heightfield, terrain.erode (python), terrain.mesh (node), terrain.splat, navmesh (T-0019) qua engine build
// (EP-WLD-01…04; DTO-WLD-02, 10; TC-WLD-02). terrain.mesh cần dist/ (pnpm -r build trước pnpm test).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { EXIT } from '../exit-codes.js';
import { fakeClock } from '../orchestrator/test-fixtures.js';
import { runBuildCommand } from './run.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const STEPS = join(ROOT, 'engine/build/steps');
const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Game thủ tục từ games/_template (procedural 'doi', playArea 500×500 m), brief đã xác nhận. */
function game(worldPatch: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'gs-world-'));
  dirs.push(dir);
  cpSync(join(ROOT, 'games/_template/data'), join(dir, 'data'), { recursive: true });
  const gp = join(dir, 'data/game.json');
  writeFileSync(gp, JSON.stringify({ ...JSON.parse(readFileSync(gp, 'utf8')), id: 'thu-dia-hinh' }));
  const wp = join(dir, 'data/world.json');
  writeFileSync(wp, JSON.stringify({ ...JSON.parse(readFileSync(wp, 'utf8')), ...worldPatch }));
  // T-0025: vật liệu và HDRI nhỏ cho test nhanh (assets/materials/_settings.json của bước materials).
  mkdirSync(join(dir, 'assets/materials'), { recursive: true });
  writeFileSync(
    join(dir, 'assets/materials/_settings.json'),
    JSON.stringify({ size: 64, hdri: { equirectWidth: 128, face: 16, mips: 3, samples: 8, skyFace: 16 } }),
  );
  mkdirSync(join(dir, 'brief/v1'), { recursive: true });
  writeFileSync(join(dir, 'brief/v1/hash.txt'), `sha256:${'d'.repeat(64)}\n`);
  return dir;
}

const build = (dir: string) =>
  runBuildCommand({
    gameDir: dir,
    stepsDir: STEPS,
    clock: fakeClock(),
    host: 'may-thu',
    engineVersion: '0.1.0',
    tool: { name: '@gamestudio/cli', version: '0.0.0' },
  });

describe(
  'world.fetch → world.heightfield → terrain.erode → terrain.mesh, terrain.splat qua engine build',
  { timeout: 180_000 },
  () => {
    it('sinh bundle DTO-WLD-02; lần 2 toàn cache; hai thư mục sạch cache cùng outputHash (TC-WLD-02)', async () => {
      const a = game();
      const r1 = await build(a);
      expect(r1.exit, r1.report.warnings.join('\n')).toBe(EXIT.OK);
      expect(r1.report.checks.map((c) => `${c.id}:${c.message ?? ''}`)).toEqual([
        'materials@-:ran',
        'world.fetch@-:ran',
        'world.heightfield@-:ran',
        'terrain.erode@-:ran',
        'terrain.mesh@z1:ran',
        'navmesh@z1:ran',
        'terrain.splat@z1:ran',
        'packager@-:ran',
      ]);
      const splat = r1.outcome.steps.find((s) => s.step === 'terrain.splat')?.outDir ?? '';
      for (const f of ['splat-0.png', 'surface.png', 'layers.json', 'preview/splat.png']) {
        expect(existsSync(join(splat, f)), f).toBe(true);
      }
      expect(existsSync(join(splat, 'splat-1.png'))).toBe(false); // 4 lớp mặc định → một ảnh
      // T-0025: lớp splat trỏ vật liệu thật của bước materials.
      const layers = JSON.parse(readFileSync(join(splat, 'layers.json'), 'utf8')) as {
        layers: { id: string; material?: string }[];
      };
      expect(layers.layers.map((l) => l.material)).toEqual([
        'materials/dat-co',
        'materials/dat-tran',
        'materials/da-nui',
        'materials/cat-bai',
      ]);
      const mat = r1.outcome.steps.find((s) => s.step === 'materials')?.outDir ?? '';
      for (const f of [
        'materials.json',
        'materials/dat-co/baseColor.png',
        'materials/dat-co/normal.png',
        'materials/da-nui/orm.png',
        'materials/da-nui/height.png',
        'materials/cat-bai/material.json',
        'hdri/troi-thu-tuc/env.ktx2',
        'hdri/troi-thu-tuc/sky.ktx2',
        'hdri/troi-thu-tuc/sh.json',
      ]) {
        expect(existsSync(join(mat, f)), f).toBe(true);
      }
      const hf = r1.outcome.steps.find((s) => s.step === 'world.heightfield');
      const out = join(hf?.outDir ?? '', 'hf');
      for (const f of ['height.r32', 'height.meta.json', 'mask-water.png', 'vectors.geojson', 'preview/top.png']) {
        expect(existsSync(join(out, f)), f).toBe(true);
      }
      const meta = JSON.parse(readFileSync(join(out, 'height.meta.json'), 'utf8')) as Record<string, unknown>;
      expect(meta).toMatchObject({ width: 251, height: 251, cellM: 2, originLocal: [-250, -250], crs: 'LOCAL' });
      expect(readFileSync(join(out, 'height.r32')).length).toBe(251 * 251 * 4);
      const mesh = r1.outcome.steps.find((s) => s.step === 'terrain.mesh')?.outDir ?? '';
      for (const f of [
        'chunks/-4_-4/lod0.glb',
        'chunks/3_3/lod3.glb',
        'collider/height-lod1.r32',
        'lightmaps/uv2-atlas.json',
      ]) {
        expect(existsSync(join(mesh, f)), f).toBe(true);
      }

      // T-0026: manifest/1 cho Unity player.
      const pk = r1.outcome.steps.find((s) => s.step === 'packager')?.outDir ?? '';
      const man = JSON.parse(readFileSync(join(pk, 'manifest.json'), 'utf8')) as {
        schema: string;
        startZone: string;
        tiers: string[];
        spawn: { pos: number[] };
        zones: {
          id: string;
          parts: Record<string, { core: { path: string; bytes: number }[]; full: { path: string }[] }>;
        }[];
        environment: { hdri: { id: string }[]; materials: { path: string }[] };
      };
      expect(man).toMatchObject({ schema: 'manifest/1', startZone: 'z1', tiers: ['thap', 'vua', 'cao', 'toi_da'] });
      const vua = man.zones[0]?.parts['vua'];
      const core = vua?.core.map((f) => f.path) ?? [];
      expect(core.filter((p) => p.endsWith('.glb')).every((p) => p.endsWith('/lod1.glb'))).toBe(true);
      expect(core.filter((p) => p.endsWith('.glb'))).toHaveLength(64);
      expect(core).toContain('zones/z1/nav/sources.json');
      expect(core).toContain('tex/t2048-1024/core/z1-splat-0.ktx2');
      expect(core).toContain('tex/t2048-1024/core/dat-co-basecolor.ktx2');
      expect(vua?.full.map((f) => f.path)).toContain('zones/z1/terrain/0_0/lod0.glb');
      for (const f of vua?.core ?? []) expect(existsSync(join(pk, f.path)), f.path).toBe(true);
      const glb = readFileSync(join(pk, 'zones/z1/terrain/0_0/lod1.glb'));
      expect(JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'))).toMatchObject({ scene: 0 });
      expect(man.environment.hdri.map((h) => h.id)).toEqual(['troi-thu-tuc']);
      expect(man.environment.materials).toHaveLength(4);

      expect((await build(a)).report.cached).toBe(true);
      const r3 = await build(game());
      expect(r3.outcome.steps.map((s) => s.outputHash)).toEqual(r1.outcome.steps.map((s) => s.outputHash));
    });

    it('đổi world.procedural → chỉ world.heightfield chạy lại; preset ant → thoát 5', async () => {
      const a = game();
      await build(a);
      const wp = join(a, 'data/world.json');
      const w = JSON.parse(readFileSync(wp, 'utf8')) as { procedural: Record<string, unknown> };
      writeFileSync(wp, JSON.stringify({ ...w, procedural: { ...w.procedural, roughness: 0.9 } }));
      const r = await build(a);
      expect(r.report.checks.map((c) => c.message)).toEqual([
        'cached',
        'cached',
        'ran',
        'ran',
        'ran',
        'ran',
        'ran',
        'ran',
      ]);
      const ant = await build(game({ procedural: { preset: 'ant', maxHeight: 40, roughness: 0.5, features: [] } }));
      expect(ant.exit).toBe(EXIT.ENVIRONMENT);
      expect(ant.report.warnings.join(' ')).toMatch(/ant/);
    });

    it('terrain.erode: hf/ mới + flow.r8, sediment.r8; đổi world.erosion → chỉ terrain.erode chạy lại (T-0008)', async () => {
      const a = game();
      const r1 = await build(a);
      const er = r1.outcome.steps.find((s) => s.step === 'terrain.erode');
      const out = er?.outDir ?? '';
      for (const f of [
        'hf/height.r32',
        'hf/height.meta.json',
        'hf/mask-water.png',
        'hf/vectors.geojson',
        'hf/preview/top.png',
      ]) {
        expect(existsSync(join(out, f)), f).toBe(true);
      }
      expect(readFileSync(join(out, 'flow.r8')).length).toBe(251 * 251);
      expect(readFileSync(join(out, 'sediment.r8')).length).toBe(251 * 251);
      const hfUp = r1.outcome.steps.find((s) => s.step === 'world.heightfield')?.outDir ?? '';
      expect(readFileSync(join(out, 'hf/height.r32')).equals(readFileSync(join(hfUp, 'hf/height.r32')))).toBe(false);
      expect(readFileSync(join(out, 'hf/mask-water.png')).equals(readFileSync(join(hfUp, 'hf/mask-water.png')))).toBe(
        true,
      );

      const wp = join(a, 'data/world.json');
      const w = JSON.parse(readFileSync(wp, 'utf8')) as Record<string, unknown>;
      writeFileSync(wp, JSON.stringify({ ...w, erosion: { iterations: 20, strength: 0.5 } }));
      expect((await build(a)).report.checks.map((c) => c.message)).toEqual([
        'cached',
        'cached',
        'cached',
        'ran',
        'ran',
        'ran',
        'ran',
        'ran',
      ]);
    });
  },
);
