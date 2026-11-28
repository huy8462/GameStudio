// T-0018 (TST: FR-AST-24, ALG-AST-11, PSC-AST-11, ADR-037): vòng lặp (thuần) và chuỗi ffmpeg thật (đo, mã hoá, tất định).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { profileFor } from './encode.js';
import { makeLoop, measureSeam, nearestZeroCrossing } from './loop.js';
import { correctionGain, parseLoudnorm } from './loudnorm.js';
import { LOOP_PAD_S, processAudio } from './process.js';

const SR = 48000;

function sine(freq: number, seconds: number, channels = 1): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n * channels);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < channels; c++) out[i * channels + c] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}

describe('loop (thuần)', () => {
  it('zero-crossing: lấy điểm đi lên gần nhất trong bán kính, không có thì giữ nguyên', () => {
    const pcm = sine(100, 0.1); // chu kỳ 480 mẫu, đi lên ở 0, 480, 960…
    expect(nearestZeroCrossing(pcm, 1, 500, 960)).toBe(481);
    expect(nearestZeroCrossing(pcm, 1, 700, 100)).toBe(700);
  });

  it('đoạn lặp ngắn hơn nguồn đúng một crossfade, mép là hai mẫu liền nhau của nguồn', () => {
    const src = sine(110, 2, 2);
    const r = makeLoop(src, 2, SR, 0, 2);
    expect(r.fadeFrames).toBe(2400);
    const frames = r.pcm.length / 2;
    expect(frames).toBe(r.endFrame - r.startFrame - r.fadeFrames);
    const seam = measureSeam(r.pcm, 2, 0, frames);
    expect(seam.seamStep).toBeLessThanOrEqual(seam.stepP99 + 1e-6);
    // Mẫu đầu của vòng = mẫu nguồn ngay sau mẫu cuối của vòng.
    expect(r.pcm[0]).toBeCloseTo(src[(r.startFrame + frames) * 2] ?? NaN, 6);
  });

  it('đoạn quá ngắn → lỗi', () => {
    expect(() => makeLoop(sine(110, 0.15), 1, SR, 0, 0.15)).toThrow(/quá ngắn/);
  });

  it('cắt cứng không crossfade bị measureSeam bắt', () => {
    const src = sine(110, 1);
    const cut = src.subarray(0, Math.round(0.4977 * SR)); // dừng giữa chu kỳ
    const seam = measureSeam(cut, 1, 0, cut.length);
    expect(seam.seamStep).toBeGreaterThan(0.1);
    expect(seam.seamStep).toBeGreaterThan(seam.stepP99 * 5);
  });
});

describe('loudnorm, profile', () => {
  it('đọc JSON loudnorm ở cuối stderr; tệp im lặng → lỗi', () => {
    const tail = (i: string): string =>
      `[Parsed_loudnorm_0 @ 0x1]\n{\n"input_i" : "${i}",\n"input_tp" : "-3.10",\n"input_lra" : "2.00",\n"input_thresh" : "-33.5",\n"target_offset" : "0.20"\n}\n`;
    expect(parseLoudnorm('x\n' + tail('-23.45'))).toEqual({ i: -23.45, tp: -3.1, lra: 2, thresh: -33.5, offset: 0.2 });
    expect(() => parseLoudnorm(tail('-inf'))).toThrow(/im lặng/);
  });

  it('bù âm lượng không vượt trần đỉnh −1,5 dBTP', () => {
    expect(correctionGain(-16, 0.5)).toBeCloseTo(1, 6);
    expect(correctionGain(-22, 0.1)).toBeCloseTo(10 ** (6 / 20), 6);
    expect(correctionGain(-22, 0.8)).toBeCloseTo(10 ** (-1.5 / 20) / 0.8, 6);
  });

  it('CFG-AST-05: sfx/music 128 kbps stereo, ambience/voice 96 kbps mono', () => {
    expect(profileFor('sfx')).toEqual({ channels: 2, bitrateKbps: 128 });
    expect(profileFor('music')).toEqual({ channels: 2, bitrateKbps: 128 });
    expect(profileFor('ambience')).toEqual({ channels: 1, bitrateKbps: 96 });
    expect(profileFor('voice')).toEqual({ channels: 1, bitrateKbps: 96 });
  });
});

const hasFfmpeg = spawnSync('ffmpeg', ['-hide_banner', '-version'], { windowsHide: true }).status === 0;

describe.skipIf(!hasFfmpeg)('processAudio (ffmpeg thật)', () => {
  let dir = '';
  const src = (): string => join(dir, 'src.wav');

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'gs-audio-test-'));
    // Âm nền mẫu tất định: nhiễu nâu lọc thấp (seed cố định) + tiếng ù 110 Hz, nhỏ hơn đích để buộc chuẩn hoá.
    const r = spawnSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-nostats',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'anoisesrc=d=6:c=brown:r=48000:a=0.2:s=56,lowpass=f=1200',
        '-f',
        'lavfi',
        '-i',
        'sine=f=110:d=6:r=48000',
        '-filter_complex',
        '[0][1]amix=inputs=2:weights=1 0.2',
        '-ac',
        '2',
        '-fflags',
        '+bitexact',
        src(),
      ],
      { windowsHide: true },
    );
    if (r.status !== 0) throw new Error('Không tạo được tệp mẫu');
  }, 60_000);

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('âm nền lặp: −16 LUFS ±0,5, AAC-LC mono, loopPoints nằm trong tệp, mép không click, tất định', async () => {
    const a = await processAudio({
      id: 'amb-thu',
      kind: 'ambience',
      input: src(),
      outDir: join(dir, 'a'),
      loop: true,
      tags: ['rung', 'dem'],
    });
    expect(a.checks.filter((c) => !c.ok)).toEqual([]);
    expect(a.ok).toBe(true);
    expect(Math.abs(a.lufsMeasured + 16)).toBeLessThanOrEqual(0.5);
    expect(a.sidecar.files).toEqual({ aac: 'amb-thu.m4a' });
    expect(a.sidecar.tags).toEqual(['dem', 'rung']);
    const lp = a.sidecar.loopPoints;
    expect(lp?.startS).toBeCloseTo(LOOP_PAD_S - a.primingS, 3);
    expect(lp?.endS ?? 0).toBeCloseTo(a.sidecar.durationS - LOOP_PAD_S - a.primingS, 3);
    expect(Math.abs(a.decodedDurationS - a.sidecar.durationS)).toBeLessThanOrEqual(0.02);
    expect(a.seam?.seamStep ?? 1).toBeLessThanOrEqual(a.seam?.limit ?? 0);
    expect(JSON.parse(readFileSync(join(dir, 'a', 'amb-thu.audio.json'), 'utf8'))).toEqual(a.sidecar);
    expect(existsSync(join(dir, 'a', 'amb-thu.m4a'))).toBe(true);

    const b = await processAudio({
      id: 'amb-thu',
      kind: 'ambience',
      input: src(),
      outDir: join(dir, 'b'),
      loop: true,
      tags: ['dem', 'rung'],
    });
    expect(b.sha256).toBe(a.sha256);
    expect(b.sidecar).toEqual(a.sidecar);
  }, 120_000);

  it('sfx không lặp: stereo 128 kbps, không có loopPoints', async () => {
    const r = await processAudio({ id: 'sfx-thu', kind: 'sfx', input: src(), outDir: join(dir, 's') });
    expect(r.ok).toBe(true);
    expect(r.sidecar.loop).toBe(false);
    expect(r.sidecar.loopPoints).toBeUndefined();
    expect(r.seam).toBeUndefined();
    // 6 s ở 128 kbps ≈ 96 KB; cho phép lệch do VBR của bộ mã.
    expect(r.bytes).toBeGreaterThan(60_000);
    expect(r.bytes).toBeLessThan(140_000);
  }, 120_000);

  it('id sai và tệp không tồn tại → lỗi rõ ràng', async () => {
    await expect(processAudio({ id: 'Sai Id', kind: 'sfx', input: src(), outDir: dir })).rejects.toThrow(/id âm thanh/);
    await expect(processAudio({ id: 'x', kind: 'sfx', input: join(dir, 'khong-co.wav'), outDir: dir })).rejects.toThrow(
      /ffmpeg thoát/,
    );
  }, 60_000);
});
