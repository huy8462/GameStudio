// Đo baseline trên thiết bị thật (E0-06; FR-QA-07, DTO-RTM-08, EP-RTM-01 `?perf=1`, OIT-GEN-01 `?dpr=`).
// Bật bằng ?perf=1. Sau WARMUP_S giây khởi động, ghi thời gian khung trong SAMPLE_S giây, rồi hiện kết quả
// và nút sao chép JSON. Không gửi dữ liệu đi đâu (chưa có API-WEB-60 ở E0).
import type * as THREE from 'three';

const WARMUP_S = 5;
const SAMPLE_S = 60;

export interface PerfSample {
  schema: 'perf-sample/e0';
  publishId: string;
  device: { ua: string; gpu: string | null; deviceMemory: number | null; dpr: number; screen: string };
  tier: string;
  route: string;
  renderDpr: number;
  canvas: string;
  fps: { avg: number; p5: number; p1: number };
  frameMs: { p50: number; p95: number; max: number };
  memoryMB: number | null;
  drawCalls: number;
  tris: number;
  programs: number;
  loadS: number;
  sampleS: number;
  frames: number;
  at: string;
}

const params = new URLSearchParams(location.search);
export const perfEnabled = params.get('perf') === '1';

/** DPR tối đa từ ?dpr= (vd 1.5 cho OIT-GEN-01); mặc định giữ mức của scaffold. */
export function maxDprFromUrl(fallback: number): number {
  const v = Number(params.get('dpr'));
  return Number.isFinite(v) && v > 0 && v <= 4 ? v : fallback;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[i] ?? 0;
}

const round = (n: number, d = 1): number => Math.round(n * 10 ** d) / 10 ** d;

function gpuName(renderer: THREE.WebGLRenderer): string | null {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null;
}

export class PerfProbe {
  private readonly times: number[] = [];
  private last = 0;
  private startAt = 0;
  private done = false;
  private readonly panel = document.createElement('pre');

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    Object.assign(this.panel.style, {
      position: 'fixed', left: '8px', top: '8px', zIndex: '99', margin: '0', padding: '8px',
      font: '12px/1.35 monospace', color: '#fff', background: 'rgba(0,0,0,.72)', maxWidth: '92vw',
      whiteSpace: 'pre-wrap', pointerEvents: 'none',
    });
    this.panel.textContent = `Đo hiệu năng: khởi động ${WARMUP_S}s, đo ${SAMPLE_S}s. Để máy yên, màn hình sáng.`;
    document.body.append(this.panel);
  }

  /** Gọi mỗi khung sau render. */
  frame(now: number): void {
    if (this.done) return;
    if (this.startAt === 0) this.startAt = now + WARMUP_S * 1000;
    if (now >= this.startAt && this.last > 0) this.times.push(now - this.last);
    this.last = now;
    const elapsed = (now - this.startAt) / 1000;
    if (elapsed > 0 && Math.floor(elapsed) !== Math.floor(elapsed - 0.02)) {
      this.panel.textContent = `Đang đo… ${Math.floor(elapsed)}/${SAMPLE_S}s`;
    }
    if (elapsed >= SAMPLE_S) this.finish();
  }

  private finish(): void {
    this.done = true;
    const sorted = [...this.times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const fpsOf = (ms: number): number => (ms > 0 ? 1000 / ms : 0);
    const info = this.renderer.info;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    const loadS = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.loadEventEnd;
    const canvas = this.renderer.domElement;
    const sample: PerfSample = {
      schema: 'perf-sample/e0',
      publishId: 'baseline-a56@scaffold-8286774',
      device: {
        ua: navigator.userAgent,
        gpu: gpuName(this.renderer),
        deviceMemory: nav.deviceMemory ?? null,
        dpr: window.devicePixelRatio,
        screen: `${screen.width}x${screen.height}`,
      },
      tier: 'vua',
      route: params.get('route') ?? 'tinh',
      renderDpr: this.renderer.getPixelRatio(),
      canvas: `${canvas.width}x${canvas.height}`,
      fps: {
        avg: round(sorted.length > 0 ? (1000 * sorted.length) / sum : 0),
        p5: round(fpsOf(quantile(sorted, 0.95))),
        p1: round(fpsOf(quantile(sorted, 0.99))),
      },
      frameMs: { p50: round(quantile(sorted, 0.5), 2), p95: round(quantile(sorted, 0.95), 2), max: round(sorted.at(-1) ?? 0, 2) },
      memoryMB: mem ? round(mem.usedJSHeapSize / 1048576) : null,
      drawCalls: info.render.calls,
      tris: info.render.triangles,
      programs: info.programs?.length ?? 0,
      loadS: round((loadS ?? 0) / 1000, 2),
      sampleS: SAMPLE_S,
      frames: sorted.length,
      at: new Date().toISOString(),
    };
    this.show(sample);
  }

  private show(sample: PerfSample): void {
    const json = JSON.stringify(sample);
    this.panel.style.pointerEvents = 'auto';
    this.panel.textContent =
      `XONG. fps tb ${sample.fps.avg} | p5 ${sample.fps.p5} | p1 ${sample.fps.p1}\n` +
      `khung p50 ${sample.frameMs.p50} ms | p95 ${sample.frameMs.p95} ms\n` +
      `draw ${sample.drawCalls} | tri ${sample.tris} | DPR ${sample.renderDpr} (${sample.canvas})\n` +
      `GPU ${sample.device.gpu ?? '?'}\n\n` +
      'Bấm "Sao chép JSON" rồi dán gửi lại.\n\n' +
      json;
    const btn = document.createElement('button');
    btn.textContent = 'Sao chép JSON';
    Object.assign(btn.style, { position: 'fixed', right: '8px', top: '8px', zIndex: '100', padding: '12px', font: '16px sans-serif' });
    btn.onclick = () => {
      void navigator.clipboard?.writeText(json).then(
        () => (btn.textContent = 'Đã sao chép'),
        () => (btn.textContent = 'Không sao chép được: chọn chữ trong khung'),
      );
    };
    document.body.append(btn);
    (window as Window & { __GS_PERF__?: PerfSample }).__GS_PERF__ = sample;
  }
}
