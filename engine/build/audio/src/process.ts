// T-0018 (MOD-AST-13, PSC-AST-11, DTO-AST-05, SCH-AST-05, ADR-037, FR-AST-24): một tệp nguồn → <id>.m4a + sidecar audio/1.
// Trình tự: đo → chuẩn hoá (PCM 48 kHz) → cắt lặp → bù âm lượng → mã hoá AAC → giải mã lại để kiểm → ghi sidecar.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type AudioKind, decodeToRaw, encodeAac, probe, profileFor, readRaw } from './encode.js';
import { makeLoop, measureSeam } from './loop.js';
import { correctionGain, measure, normalizeToRaw, SAMPLE_RATE, TARGET_LUFS } from './loudnorm.js';

export const LUFS_TOLERANCE = 0.5;
export const SEAM_LIMIT = 0.01;
export const DURATION_TOLERANCE_S = 0.02;
export const LOOP_PAD_S = 0.1;

export interface AudioJob {
  id: string;
  kind: AudioKind;
  input: string;
  outDir: string;
  loop?: boolean;
  /** Đoạn lặp trong nguồn (giây); mặc định cả tệp. */
  loopRange?: { startS: number; endS: number };
  tags?: string[];
  surface?: string;
  ffmpeg?: string;
  ffprobe?: string;
}

/** Sidecar audio/1 (DTO-AST-05). */
export interface AudioSidecar {
  schema: 'audio/1';
  id: string;
  kind: AudioKind;
  loop: boolean;
  loopPoints?: { startS: number; endS: number };
  lufs: number;
  durationS: number;
  files: { aac: string };
  tags: string[];
  surface?: string;
}

export interface AudioCheck {
  id: 'lufs' | 'duration' | 'seam' | 'codec';
  ok: boolean;
  value: number | string;
  limit: number | string;
}

export interface AudioReport {
  id: string;
  sidecar: AudioSidecar;
  bytes: number;
  sha256: string;
  lufsMeasured: number;
  primingS: number;
  decodedDurationS: number;
  seam?: { seamStep: number; stepP99: number; limit: number };
  checks: AudioCheck[];
  ok: boolean;
}

const round = (v: number, d: number): number => Math.round(v * 10 ** d) / 10 ** d;

function writeRaw(path: string, pcm: Float32Array): void {
  writeFileSync(path, new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength));
}

export async function processAudio(job: AudioJob): Promise<AudioReport> {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(job.id)) throw new Error(`id âm thanh không hợp lệ: ${job.id}`);
  const ffmpeg = job.ffmpeg ?? 'ffmpeg';
  const ffprobe = job.ffprobe ?? 'ffprobe';
  const profile = profileFor(job.kind);
  const ch = profile.channels;
  const loop = job.loop === true;
  mkdirSync(job.outDir, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'gs-audio-'));
  try {
    const rawPath = join(tmp, 'norm.raw');
    await normalizeToRaw(ffmpeg, job.input, await measure(ffmpeg, job.input), ch, rawPath);
    let pcm = readRaw(rawPath);
    let padFrames = 0;
    let loopFrames = 0;
    if (pcm.length === 0) throw new Error(`Không có mẫu âm thanh trong ${job.input}`);

    if (loop) {
      const total = pcm.length / ch / SAMPLE_RATE;
      const range = job.loopRange ?? { startS: 0, endS: total };
      const body = makeLoop(pcm, ch, SAMPLE_RATE, range.startS, range.endS).pcm;
      // AAC mã hoá kém ở khung đầu và khung cuối tệp (không có khung kề để chồng lấp), nên chèn 100 ms cuối vòng
      // vào trước và 100 ms đầu vòng vào sau; loopPoints trỏ vào phần giữa, hai mép lặp đều có ngữ cảnh đúng.
      const bodyFrames = body.length / ch;
      padFrames = Math.min(Math.round(LOOP_PAD_S * SAMPLE_RATE), bodyFrames);
      loopFrames = bodyFrames;
      pcm = new Float32Array((bodyFrames + 2 * padFrames) * ch);
      pcm.set(body.subarray((bodyFrames - padFrames) * ch), 0);
      pcm.set(body, padFrames * ch);
      pcm.set(body.subarray(0, padFrames * ch), (padFrames + bodyFrames) * ch);
    }

    // Cắt lặp và đổi số kênh làm lệch âm lượng: đo lại trên PCM cuối và bù một lần (không vượt trần đỉnh).
    writeRaw(rawPath, pcm);
    const before = await measure(ffmpeg, rawPath, { channels: ch });
    let peak = 0;
    for (const v of pcm) peak = Math.max(peak, Math.abs(v));
    const gain = correctionGain(before.i, peak);
    if (Math.abs(gain - 1) > 1e-4) {
      for (let i = 0; i < pcm.length; i++) pcm[i] = (pcm[i] ?? 0) * gain;
      writeRaw(rawPath, pcm);
    }

    const file = `${job.id}.m4a`;
    const m4a = join(job.outDir, file);
    await encodeAac(ffmpeg, rawPath, profile, m4a);

    const info = await probe(ffprobe, m4a);
    const decoded = await decodeToRaw(ffmpeg, m4a, ch, join(tmp, 'dec.raw'));
    const after = await measure(ffmpeg, m4a);
    const frames = pcm.length / ch;
    const durationS = frames / SAMPLE_RATE;
    const decodedDurationS = decoded.length / ch / SAMPLE_RATE;

    const sidecar: AudioSidecar = {
      schema: 'audio/1',
      id: job.id,
      kind: job.kind,
      loop,
      lufs: TARGET_LUFS,
      durationS: round(durationS, 4),
      files: { aac: file },
      tags: [...(job.tags ?? [])].sort(),
    };
    if (job.surface !== undefined) sidecar.surface = job.surface;

    const checks: AudioCheck[] = [
      {
        id: 'codec',
        ok: info.codec === 'aac' && info.profile === 'LC',
        value: `${info.codec}/${info.profile}`,
        limit: 'aac/LC',
      },
      {
        id: 'lufs',
        ok: Math.abs(after.i - TARGET_LUFS) <= LUFS_TOLERANCE,
        value: round(after.i, 2),
        limit: LUFS_TOLERANCE,
      },
      {
        id: 'duration',
        ok: Math.abs(decodedDurationS - durationS) <= DURATION_TOLERANCE_S,
        value: round(decodedDurationS - durationS, 4),
        limit: DURATION_TOLERANCE_S,
      },
    ];
    const report: AudioReport = {
      id: job.id,
      sidecar,
      bytes: 0,
      sha256: '',
      lufsMeasured: round(after.i, 2),
      primingS: info.startTimeS,
      decodedDurationS: round(decodedDurationS, 4),
      checks,
      ok: false,
    };
    if (loop) {
      // loopPoints tính trên dòng thời gian của clip đã giải mã: trừ độ trễ priming mà ffprobe báo (ADR-037).
      const startS = Math.max(0, padFrames / SAMPLE_RATE - info.startTimeS);
      const endS = startS + loopFrames / SAMPLE_RATE;
      sidecar.loopPoints = { startS: round(startS, 4), endS: round(endS, 4) };
      const seam = measureSeam(decoded, ch, Math.round(startS * SAMPLE_RATE), Math.round(endS * SAMPLE_RATE));
      // Mép không click khi bước nhảy ở mép không lớn hơn 0,01 hoặc không lớn hơn bước nhảy thường gặp của chính tín hiệu.
      const limit = Math.max(SEAM_LIMIT, seam.stepP99);
      report.seam = { seamStep: round(seam.seamStep, 5), stepP99: round(seam.stepP99, 5), limit: round(limit, 5) };
      checks.push({ id: 'seam', ok: seam.seamStep <= limit, value: round(seam.seamStep, 5), limit: round(limit, 5) });
    }

    const bytes = readFileSync(m4a);
    report.bytes = bytes.length;
    report.sha256 = createHash('sha256').update(bytes).digest('hex');
    report.ok = checks.every((c) => c.ok);
    writeFileSync(join(job.outDir, `${job.id}.audio.json`), JSON.stringify(sidecar, null, 2) + '\n');
    return report;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
