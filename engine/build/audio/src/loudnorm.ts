// T-0018 (ALG-AST-11, PSC-AST-11, CFG-AST-05, FR-AST-24): chuẩn hoá âm lượng bằng loudnorm hai lượt về -16 LUFS.
import { FF_BASE, FF_BITEXACT, runOk } from './ffmpeg.js';

export const TARGET_LUFS = -16;
export const TARGET_TP = -1.5;
export const TARGET_LRA = 11;
export const SAMPLE_RATE = 48000;

export interface Loudness {
  /** Âm lượng tích hợp (LUFS). */
  i: number;
  /** Đỉnh thật (dBTP). */
  tp: number;
  lra: number;
  thresh: number;
  offset: number;
}

/** Đối số đầu vào cho tệp thường hoặc PCM thô f32le. */
export function inputArgs(path: string, raw?: { channels: number }): string[] {
  return raw ? ['-f', 'f32le', '-ar', String(SAMPLE_RATE), '-ac', String(raw.channels), '-i', path] : ['-i', path];
}

/** Đọc khối JSON loudnorm in ở cuối stderr. */
export function parseLoudnorm(stderr: string): Loudness {
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Không thấy kết quả loudnorm trong đầu ra ffmpeg.');
  const o = JSON.parse(stderr.slice(start, end + 1)) as Record<string, string>;
  const num = (k: string): number => {
    const v = Number(o[k]);
    // Tệp im lặng cho -inf: coi như lỗi đầu vào thay vì chuẩn hoá ra nhiễu.
    if (!Number.isFinite(v)) throw new Error(`loudnorm: ${k} = ${String(o[k])} (tệp im lặng hoặc hỏng).`);
    return v;
  };
  return {
    i: num('input_i'),
    tp: num('input_tp'),
    lra: num('input_lra'),
    thresh: num('input_thresh'),
    offset: num('target_offset'),
  };
}

const TARGET = `I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=${TARGET_LRA}`;

/** Lượt 1: đo. */
export async function measure(ffmpeg: string, path: string, raw?: { channels: number }): Promise<Loudness> {
  const r = await runOk(ffmpeg, [
    ...FF_BASE,
    ...inputArgs(path, raw),
    '-af',
    `loudnorm=${TARGET}:print_format=json`,
    '-f',
    'null',
    '-',
  ]);
  return parseLoudnorm(r.stderr);
}

/** Lượt 2: áp số đo (linear=true), ghi PCM thô f32le 48 kHz với số kênh đích. */
export async function normalizeToRaw(
  ffmpeg: string,
  input: string,
  m: Loudness,
  channels: number,
  outRaw: string,
): Promise<void> {
  const af =
    `loudnorm=${TARGET}:measured_I=${m.i}:measured_TP=${m.tp}:measured_LRA=${m.lra}` +
    `:measured_thresh=${m.thresh}:offset=${m.offset}:linear=true:print_format=json`;
  await runOk(ffmpeg, [
    ...FF_BASE,
    '-i',
    input,
    '-af',
    af,
    '-ar',
    String(SAMPLE_RATE),
    '-ac',
    String(channels),
    ...FF_BITEXACT,
    '-f',
    'f32le',
    outRaw,
  ]);
}

/** Hệ số nhân để đưa `measured` về đích, không để đỉnh mẫu vượt trần TP. */
export function correctionGain(measuredLufs: number, samplePeak: number): number {
  const want = 10 ** ((TARGET_LUFS - measuredLufs) / 20);
  const ceiling = 10 ** (TARGET_TP / 20);
  return samplePeak > 0 ? Math.min(want, ceiling / samplePeak) : want;
}
