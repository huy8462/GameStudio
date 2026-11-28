// T-0020 (TST: PSC-CLI-02 bước 5, 7, 9; SRS-04 §6.3; TC-QA-02 phần texture): kích thước, báo cáo ngân sách, chạy ktx/ffmpeg thật.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { textureReport } from './metrics.js';
import { fitWithin, type PackedFile, type PackedTexture, packTextures, vkFormat } from './textures.js';

describe('kích thước và định dạng (thuần)', () => {
  it('fitWithin giữ tỉ lệ, không phóng to', () => {
    expect(fitWithin(2048, 2048, 1024)).toEqual({ width: 1024, height: 1024 });
    expect(fitWithin(4096, 1024, 2048)).toEqual({ width: 2048, height: 512 });
    expect(fitWithin(512, 256, 1024)).toEqual({ width: 512, height: 256 });
    expect(fitWithin(3, 4000, 4)).toEqual({ width: 1, height: 4 });
  });

  it('vkFormat theo alpha và không gian màu', () => {
    expect(vkFormat(false, true)).toBe('R8G8B8_SRGB');
    expect(vkFormat(true, true)).toBe('R8G8B8A8_SRGB');
    expect(vkFormat(false, false)).toBe('R8G8B8_UNORM');
  });
});

function fake(id: string, coreBytes: number, corePx = 1024): PackedTexture {
  const f = (path: string, px: number, bytes: number, codec: PackedFile['codec']): PackedFile => ({
    path,
    width: px,
    height: px,
    bytes,
    sha256: '',
    codec,
  });
  return {
    id,
    source: { width: 2048, height: 2048, alpha: false },
    full: f(`full/${id}.ktx2`, 2048, coreBytes * 3, 'etc1s'),
    core: f(`core/${id}.ktx2`, corePx, coreBytes, 'etc1s'),
    fallback: f(`fallback/${id}.jpg`, 1024, coreBytes, 'jpg'),
  };
}

describe('textureReport', () => {
  const MB = 1024 * 1024;
  const budget = { coreTextureMax: 1024, coreZoneMB: 8 };

  it('trong ngân sách → pass; cạnh đúng bằng trần vẫn pass', () => {
    const r = textureReport([fake('a', MB), fake('b', 2 * MB)], budget);
    expect(r.result).toBe('pass');
    expect(r.metrics).toMatchObject({ coreTextures: 2, coreTextureMB: 3, fullTextureMB: 9, coreTextureMaxPx: 1024 });
    expect(r.checks.find((c) => c.id === 'coreTextureMax')).toMatchObject({ result: 'pass', value: 1024, limit: 1024 });
  });

  it('vượt coreZoneMB → fail, source liệt kê tệp nặng nhất trước, tối đa 5', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => fake(id, (i + 1) * MB));
    const r = textureReport(many, budget);
    expect(r.result).toBe('fail');
    const c = r.checks.find((x) => x.id === 'coreZoneMB');
    expect(c).toMatchObject({ result: 'fail', value: 21, limit: 8 });
    expect(c?.source).toEqual(['core/f.ktx2', 'core/e.ktx2', 'core/d.ktx2', 'core/c.ktx2', 'core/b.ktx2']);
  });

  it('gần trần (90–100 %) → warn; texture lõi lớn hơn coreTextureMax → fail kèm tên tệp', () => {
    expect(textureReport([fake('a', 7.5 * MB)], budget).result).toBe('warn');
    const r = textureReport([fake('a', MB), fake('to', MB, 2048)], budget);
    expect(r.result).toBe('fail');
    expect(r.checks.find((c) => c.id === 'coreTextureMax')?.source).toEqual(['core/to.ktx2']);
  });
});

const has = (bin: string, args: string[]): boolean => spawnSync(bin, args, { windowsHide: true }).status === 0;
const hasTools = has('ktx', ['--version']) && has('ffmpeg', ['-hide_banner', '-version']);

describe.skipIf(!hasTools)('packTextures (ktx, ffmpeg thật)', () => {
  let dir = '';
  const png = (name: string): string => join(dir, name);

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gs-pack-test-'));
    const make = (name: string, fmt: string): void => {
      const r = spawnSync(
        'ffmpeg',
        [
          '-hide_banner',
          '-nostats',
          '-y',
          '-f',
          'lavfi',
          '-i',
          'testsrc2=size=256x128:rate=1',
          '-frames:v',
          '1',
          '-pix_fmt',
          fmt,
          png(name),
        ],
        { windowsHide: true },
      );
      if (r.status !== 0) throw new Error('Không tạo được ảnh mẫu ' + name);
    };
    make('mau.png', 'rgb24');
    make('trong.png', 'rgba');
  }, 60_000);

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const ktxHeader = (path: string): { width: number; height: number; levels: number; uastcZstd: boolean } => {
    const b = readFileSync(path);
    // KTX2: 12 byte định danh, rồi vkFormat, typeSize, pixelWidth, pixelHeight, depth, layers, faces, levelCount, supercompression (u32 LE).
    return {
      width: b.readUInt32LE(20),
      height: b.readUInt32LE(24),
      levels: b.readUInt32LE(40),
      uastcZstd: b.readUInt32LE(44) === 2,
    };
  };

  it('ba bản đúng kích thước và codec; lõi luôn ETC1S kể cả map sharp; tất định', async () => {
    const inputs = [
      { id: 'trong', path: png('trong.png') },
      { id: 'mau', path: png('mau.png'), sharp: true },
    ];
    const opts = { maxTexture: 128, coreTextureMax: 64 };
    const a = await packTextures(inputs, { ...opts, outDir: join(dir, 'a') });
    expect(a.map((t) => t.id)).toEqual(['mau', 'trong']);
    const [mau, trong] = a;
    expect(mau?.full).toMatchObject({ width: 128, height: 64, codec: 'uastc' });
    expect(mau?.core).toMatchObject({ width: 64, height: 32, codec: 'etc1s' });
    expect(mau?.fallback).toMatchObject({ path: 'fallback/mau.jpg', width: 64, height: 32, codec: 'jpg' });
    expect(trong?.full.codec).toBe('etc1s');
    expect(trong?.fallback).toMatchObject({ path: 'fallback/trong.png', codec: 'png' });

    expect(ktxHeader(join(dir, 'a', 'full/mau.ktx2'))).toEqual({ width: 128, height: 64, levels: 8, uastcZstd: true });
    expect(ktxHeader(join(dir, 'a', 'core/mau.ktx2'))).toMatchObject({ width: 64, height: 32, uastcZstd: false });

    const b = await packTextures([...inputs].reverse(), { ...opts, outDir: join(dir, 'b') });
    expect(b).toEqual(a);
  }, 120_000);

  it('id trùng hoặc sai → lỗi trước khi chạy công cụ', async () => {
    const one = { id: 'x', path: png('mau.png') };
    await expect(
      packTextures([one, one], { outDir: join(dir, 'c'), maxTexture: 64, coreTextureMax: 64 }),
    ).rejects.toThrow(/Trùng id/);
    await expect(
      packTextures([{ ...one, id: 'Sai Id' }], { outDir: join(dir, 'c'), maxTexture: 64, coreTextureMax: 64 }),
    ).rejects.toThrow(/không hợp lệ/);
  });
});
