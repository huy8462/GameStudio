// T-0018 (ALG-AST-11, PSC-AST-11, FR-AST-24): cắt vòng lặp không click.
// Điểm cắt dời về zero-crossing gần nhất (±20 ms); 50 ms cuối đoạn trộn chéo vào 50 ms đầu, nên mẫu cuối và mẫu đầu
// của đoạn lặp là hai mẫu liền nhau trong nguồn. Làm trên PCM bằng mã (tất định), không dùng acrossfade của ffmpeg.

export const ZERO_SEARCH_MS = 20;
export const CROSSFADE_MS = 50;

export interface LoopResult {
  /** PCM xen kênh của đoạn lặp; cả tệp là một vòng. */
  pcm: Float32Array;
  /** Chỉ số khung (mẫu mỗi kênh) trong nguồn sau khi dời về zero-crossing. */
  startFrame: number;
  endFrame: number;
  fadeFrames: number;
}

/** Giá trị đơn kênh (trung bình các kênh) của khung i. */
function mono(pcm: Float32Array, channels: number, i: number): number {
  let s = 0;
  for (let c = 0; c < channels; c++) s += pcm[i * channels + c] ?? 0;
  return s / channels;
}

/** Khung gần `target` nhất (trong ±`radius`) mà tín hiệu đi từ ≤ 0 lên > 0; không có thì trả `target`. */
export function nearestZeroCrossing(pcm: Float32Array, channels: number, target: number, radius: number): number {
  const frames = Math.floor(pcm.length / channels);
  const lo = Math.max(1, target - radius);
  const hi = Math.min(frames - 1, target + radius);
  let best = -1;
  for (let i = lo; i <= hi; i++) {
    if (mono(pcm, channels, i - 1) <= 0 && mono(pcm, channels, i) > 0) {
      if (best < 0 || Math.abs(i - target) < Math.abs(best - target)) best = i;
    }
  }
  return best < 0 ? Math.min(Math.max(target, 0), frames) : best;
}

/**
 * Dựng đoạn lặp từ [startS, endS] của nguồn. Độ dài kết quả = (end − start) − crossfade.
 * Trộn chéo đẳng công suất (âm nền gần như không tương quan giữa đầu và cuối).
 */
export function makeLoop(
  pcm: Float32Array,
  channels: number,
  sampleRate: number,
  startS: number,
  endS: number,
): LoopResult {
  const frames = Math.floor(pcm.length / channels);
  const radius = Math.round((ZERO_SEARCH_MS / 1000) * sampleRate);
  const fade = Math.round((CROSSFADE_MS / 1000) * sampleRate);
  const start = nearestZeroCrossing(pcm, channels, Math.round(startS * sampleRate), radius);
  const end = Math.min(frames, nearestZeroCrossing(pcm, channels, Math.round(endS * sampleRate), radius));
  const body = end - start;
  if (body < fade * 4)
    throw new Error(
      `Đoạn lặp quá ngắn: ${(body / sampleRate).toFixed(3)} s, cần ít nhất ${(4 * CROSSFADE_MS) / 1000} s.`,
    );

  const outFrames = body - fade;
  const out = new Float32Array(outFrames * channels);
  for (let i = 0; i < outFrames; i++) {
    if (i < fade) {
      const t = i / fade;
      const gIn = Math.sqrt(t);
      const gOut = Math.sqrt(1 - t);
      for (let c = 0; c < channels; c++) {
        const head = pcm[(start + i) * channels + c] ?? 0;
        const tail = pcm[(start + outFrames + i) * channels + c] ?? 0;
        out[i * channels + c] = head * gIn + tail * gOut;
      }
    } else {
      for (let c = 0; c < channels; c++) out[i * channels + c] = pcm[(start + i) * channels + c] ?? 0;
    }
  }
  return { pcm: out, startFrame: start, endFrame: end, fadeFrames: fade };
}

export interface SeamCheck {
  /** |mẫu đầu − mẫu cuối| của đoạn lặp (thang 1,0), lớn nhất qua các kênh. */
  seamStep: number;
  /** Phân vị 99 của bước nhảy giữa hai mẫu liền nhau trong cả tệp: mức "bình thường" của tín hiệu. */
  stepP99: number;
}

/** Đo bước nhảy ở mép lặp [startFrame, endFrame) của PCM đã giải mã. */
export function measureSeam(pcm: Float32Array, channels: number, startFrame: number, endFrame: number): SeamCheck {
  const frames = Math.floor(pcm.length / channels);
  const last = Math.min(frames, endFrame) - 1;
  let seamStep = 0;
  for (let c = 0; c < channels; c++) {
    seamStep = Math.max(seamStep, Math.abs((pcm[startFrame * channels + c] ?? 0) - (pcm[last * channels + c] ?? 0)));
  }
  const steps = new Float32Array(Math.max(0, last - startFrame));
  for (let i = startFrame + 1; i <= last; i++) {
    let d = 0;
    for (let c = 0; c < channels; c++)
      d = Math.max(d, Math.abs((pcm[i * channels + c] ?? 0) - (pcm[(i - 1) * channels + c] ?? 0)));
    steps[i - startFrame - 1] = d;
  }
  steps.sort();
  const stepP99 = steps.length === 0 ? 0 : (steps[Math.floor(0.99 * (steps.length - 1))] ?? 0);
  return { seamStep, stepP99 };
}
