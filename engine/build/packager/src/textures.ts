// T-0020 (MOD-CLI-04 textures.ts; PSC-CLI-02 bước 5, 7, 9; ALG-CLI-02; FR-AST-16; SRS-04 §6.3; POC-U1).
// Mỗi texture nguồn ra ba bản:
//   full/<id>.ktx2      ≤ maxTexture[tier]; map 'sharp' → UASTC (quality 2, zstd 18), còn lại ETC1S (basis-lz, qlevel 128)
//   core/<id>.ktx2      ≤ coreTextureMax và luôn ETC1S, kể cả map 'sharp' (POC-U1: 8 KTX2 2048 UASTC mất 8,0 s trên A56)
//   fallback/<id>.png|jpg  ½ độ phân giải bản full; PNG khi có alpha, JPG q85 khi không
// Thu nhỏ bằng chính `ktx create --width/--height` (KTX2) và ffmpeg (fallback): hai công cụ đã ghim, không thêm phụ thuộc.
// Tất định: ktx chạy một luồng, ffmpeg bitexact.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runOk } from './exec.js';

export interface TextureInput {
  /** Tên tệp đầu ra (không đuôi). */
  id: string;
  /** PNG hoặc JPG nguồn. */
  path: string;
  /** Map cần nét (chữ, biển, UI): bản full dùng UASTC. */
  sharp?: boolean;
  /** false cho map không phải màu (normal, ORM). Mặc định true. */
  srgb?: boolean;
}

export interface TextureOptions {
  outDir: string;
  /** budgets.tiers[tier].maxTexture. */
  maxTexture: number;
  /** budgets.tiers[tier].coreTextureMax (đề xuất 1024). */
  coreTextureMax: number;
  ktx?: string;
  ffmpeg?: string;
  ffprobe?: string;
}

export interface PackedFile {
  path: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  codec: 'uastc' | 'etc1s' | 'png' | 'jpg';
}

export interface PackedTexture {
  id: string;
  source: { width: number; height: number; alpha: boolean };
  full: PackedFile;
  core: PackedFile;
  fallback: PackedFile;
}

export const UASTC_ARGS = ['--encode', 'uastc', '--uastc-quality', '2', '--zstd', '18'] as const;
export const ETC1S_ARGS = ['--encode', 'basis-lz', '--qlevel', '128'] as const;
/** ffmpeg mjpeg dùng thang qscale 2…31; 4 gần với chất lượng 85 của libjpeg. */
export const JPG_QSCALE = 4;

/** Kích thước sau khi ép cạnh dài ≤ max, giữ tỉ lệ, không phóng to, mỗi cạnh ≥ 1. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function vkFormat(alpha: boolean, srgb: boolean): string {
  return `${alpha ? 'R8G8B8A8' : 'R8G8B8'}_${srgb ? 'SRGB' : 'UNORM'}`;
}

async function probeImage(ffprobe: string, path: string): Promise<{ width: number; height: number; alpha: boolean }> {
  const out = await runOk(ffprobe, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,pix_fmt',
    '-of',
    'json',
    path,
  ]);
  const s = (JSON.parse(out) as { streams?: { width?: number; height?: number; pix_fmt?: string }[] }).streams?.[0];
  if (!s?.width || !s.height) throw new Error(`Không đọc được kích thước ảnh ${path}`);
  // Định dạng có kênh alpha: rgba, bgra, ya8, rgba64…, pal8 (bảng màu có thể trong suốt).
  const fmt = s.pix_fmt ?? '';
  return { width: s.width, height: s.height, alpha: /^(rgba|bgra|argb|abgr|ya|gbrap|pal8)/.test(fmt) };
}

function fileInfo(
  outDir: string,
  rel: string,
  size: { width: number; height: number },
  codec: PackedFile['codec'],
): PackedFile {
  const bytes = readFileSync(join(outDir, rel));
  return { path: rel, ...size, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), codec };
}

async function ktxCreate(
  ktx: string,
  src: string,
  dst: string,
  format: string,
  size: { width: number; height: number },
  encode: readonly string[],
): Promise<void> {
  await runOk(ktx, [
    'create',
    '--format',
    format,
    '--width',
    String(size.width),
    '--height',
    String(size.height),
    '--generate-mipmap',
    '--threads',
    '1',
    ...encode,
    src,
    dst,
  ]);
}

/** PSC-CLI-02 bước 5 + phần texture của bước 7. Kết quả xếp theo id (ổn định để băm). */
export async function packTextures(inputs: readonly TextureInput[], opts: TextureOptions): Promise<PackedTexture[]> {
  const ktx = opts.ktx ?? 'ktx';
  const ffmpeg = opts.ffmpeg ?? 'ffmpeg';
  const ffprobe = opts.ffprobe ?? 'ffprobe';
  const sorted = [...inputs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let i = 0; i < sorted.length; i++) {
    const id = sorted[i]?.id ?? '';
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw new Error(`id texture không hợp lệ: ${id}`);
    if (i > 0 && sorted[i - 1]?.id === id) throw new Error(`Trùng id texture: ${id}`);
  }
  for (const d of ['full', 'core', 'fallback']) mkdirSync(join(opts.outDir, d), { recursive: true });

  const out: PackedTexture[] = [];
  for (const t of sorted) {
    const source = await probeImage(ffprobe, t.path);
    const format = vkFormat(source.alpha, t.srgb !== false);
    const fullSize = fitWithin(source.width, source.height, opts.maxTexture);
    const coreSize = fitWithin(source.width, source.height, Math.min(opts.coreTextureMax, opts.maxTexture));
    const fbSize = fitWithin(
      source.width,
      source.height,
      Math.max(1, Math.floor(Math.max(fullSize.width, fullSize.height) / 2)),
    );

    const fullRel = `full/${t.id}.ktx2`;
    const coreRel = `core/${t.id}.ktx2`;
    const fbRel = `fallback/${t.id}.${source.alpha ? 'png' : 'jpg'}`;
    await ktxCreate(
      ktx,
      t.path,
      join(opts.outDir, fullRel),
      format,
      fullSize,
      t.sharp === true ? UASTC_ARGS : ETC1S_ARGS,
    );
    await ktxCreate(ktx, t.path, join(opts.outDir, coreRel), format, coreSize, ETC1S_ARGS);
    await runOk(ffmpeg, [
      '-hide_banner',
      '-nostats',
      '-nostdin',
      '-y',
      '-i',
      t.path,
      '-vf',
      `scale=${fbSize.width}:${fbSize.height}:flags=lanczos+accurate_rnd+bitexact`,
      '-frames:v',
      '1',
      '-threads',
      '1',
      '-fflags',
      '+bitexact',
      '-flags',
      '+bitexact',
      '-map_metadata',
      '-1',
      ...(source.alpha ? [] : ['-q:v', String(JPG_QSCALE), '-pix_fmt', 'yuvj420p']),
      join(opts.outDir, fbRel),
    ]);

    out.push({
      id: t.id,
      source,
      full: fileInfo(opts.outDir, fullRel, fullSize, t.sharp === true ? 'uastc' : 'etc1s'),
      core: fileInfo(opts.outDir, coreRel, coreSize, 'etc1s'),
      fallback: fileInfo(opts.outDir, fbRel, fbSize, source.alpha ? 'png' : 'jpg'),
    });
  }
  return out;
}
