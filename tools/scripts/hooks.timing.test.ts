// TST-DEV-02 (thời gian), NFR-DEV-02: P95 mỗi hook < 1 s. Đo thời gian thật nên chạy riêng, tuần tự:
// `pnpm test:timing` (vitest.timing.config.ts). `pnpm test` loại *.timing.test.ts (T-0006).
import { describe, expect, it } from 'vitest';

import { bash, file, read, run, write } from './hooks-harness.js';

const N = 20;
const p95 = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.ceil(0.95 * xs.length) - 1] ?? Infinity;

/** Sự kiện điển hình cho từng hook (IF-DEV-01…05). */
const CASES: [string, () => object][] = [
  ['h01-large-md', () => read(file('docs/nho.md', '# nhỏ\n'))],
  ['h02-binary-log', () => read(file('logs/ngan.log', 'dòng 1\n'))],
  [
    'h03-schema',
    () => {
      file('games/g1/data/game.json', '{"schemaVersion":1}');
      return write('games/g1/data/game.json');
    },
  ],
  ['h04-secrets', () => bash('pnpm test')],
  [
    'h05-perf',
    () => {
      file('engine/cli/src/x.ts', 'export {};\n');
      return write('engine/cli/src/x.ts');
    },
  ],
];

describe('Thời gian hook (TST-DEV-02, NFR-DEV-02)', { timeout: 120_000 }, () => {
  it.each(CASES)(`%s: P95 của ${N} lần < 1 s`, (hook, ev) => {
    const e = ev();
    run(hook, e); // khởi động nguội (nạp module lần đầu) không tính
    const times = Array.from({ length: N }, () => run(hook, e).ms);
    expect(p95(times), `${hook} ms: ${times.map((t) => t.toFixed(0)).join(',')}`).toBeLessThan(1000);
  });
});
