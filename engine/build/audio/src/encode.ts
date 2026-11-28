// T-0018 (ADR-037, CFG-AST-05, PSC-AST-11): mã hoá AAC-LC trong M4A bằng bộ mã `aac` của ffmpeg, một định dạng duy nhất.
// sfx/music: 128 kbps stereo. ambience/voice: 96 kbps mono. Cờ bitexact + bỏ metadata để hai lần chạy ra cùng byte.
import { readFileSync } from 'node:fs';

import { FF_BASE, FF_BITEXACT, runOk } from './ffmpeg.js';
import { inputArgs, SAMPLE_RATE } from './loudnorm.js';

export type AudioKind = 'sfx' | 'ambience' | 'music' | 'voice';
export const AUDIO_KINDS: readonly AudioKind[] = ['sfx', 'ambience', 'music', 'voice'];

export interface EncodeProfile {
  channels: 1 | 2;
  bitrateKbps: number;
}

export function profileFor(kind: AudioKind): EncodeProfile {
  return kind === 'ambience' || kind === 'voice' ? { channels: 1, bitrateKbps: 96 } : { channels: 2, bitrateKbps: 128 };
}

/** PCM thô f32le → .m4a. */
export async function encodeAac(ffmpeg: string, rawPath: string, p: EncodeProfile, outM4a: string): Promise<void> {
  await runOk(ffmpeg, [
    ...FF_BASE,
    ...inputArgs(rawPath, { channels: p.channels }),
    '-c:a',
    'aac',
    '-b:a',
    `${p.bitrateKbps}k`,
    '-ar',
    String(SAMPLE_RATE),
    '-ac',
    String(p.channels),
    ...FF_BITEXACT,
    '-movflags',
    '+faststart',
    outM4a,
  ]);
}

/** Giải mã lại .m4a ra PCM thô f32le để kiểm (độ dài, mép lặp). */
export async function decodeToRaw(
  ffmpeg: string,
  m4a: string,
  channels: number,
  outRaw: string,
): Promise<Float32Array> {
  await runOk(ffmpeg, [
    ...FF_BASE,
    '-i',
    m4a,
    '-ar',
    String(SAMPLE_RATE),
    '-ac',
    String(channels),
    ...FF_BITEXACT,
    '-f',
    'f32le',
    outRaw,
  ]);
  return readRaw(outRaw);
}

export function readRaw(path: string): Float32Array {
  const b = readFileSync(path);
  // Chép sang vùng nhớ riêng: Buffer của Node có thể nằm lệch biên 4 byte trong pool.
  const copy = new Uint8Array(b.byteLength - (b.byteLength % 4));
  copy.set(b.subarray(0, copy.byteLength));
  return new Float32Array(copy.buffer);
}

export interface ProbeInfo {
  /** Độ trễ đệm đầu (priming) mà trình giải mã thấy, giây; 0 khi vỏ M4A đã có edit list bù. */
  startTimeS: number;
  durationS: number;
  codec: string;
  profile: string;
}

export async function probe(ffprobe: string, m4a: string): Promise<ProbeInfo> {
  const r = await runOk(ffprobe, [
    '-v',
    'error',
    '-select_streams',
    'a:0',
    '-show_entries',
    'stream=codec_name,profile,start_time,duration',
    '-of',
    'json',
    m4a,
  ]);
  const s = (JSON.parse(r.stdout) as { streams?: Record<string, string>[] }).streams?.[0];
  if (!s) throw new Error(`ffprobe không thấy luồng âm thanh trong ${m4a}`);
  return {
    startTimeS: Number(s['start_time'] ?? 0) || 0,
    durationS: Number(s['duration'] ?? 0) || 0,
    codec: s['codec_name'] ?? '',
    profile: s['profile'] ?? '',
  };
}
