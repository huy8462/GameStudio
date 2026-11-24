// TST-DEV-01 (H-03, H-05 cảnh báo), TST-DEV-02 (thời gian), lỗi nội bộ không chặn nhầm.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROOT, TMP, bash, file, read, run, write } from './hooks-harness.js';

interface HookOut {
  hookSpecificOutput: { hookEventName: string; additionalContext: string };
}

describe('H-03, H-05 cảnh báo (PostToolUse)', () => {
  it('JSON dữ liệu hỏng → cảnh báo qua additionalContext, exit 0', () => {
    file('games/g1/data/world.json', '{ "a": ');
    const r = run('h03-schema', write('games/g1/data/world.json'));
    expect(r.code).toBe(0);
    const out = JSON.parse(r.stdout) as HookOut;
    expect(out.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(out.hookSpecificOutput.additionalContext).toContain('không phải JSON hợp lệ');
  });
  it('JSON hợp lệ, chưa có validator (E0) → im lặng; ngoài games/**/data → im lặng', () => {
    file('games/g1/data/game.json', '{"schemaVersion":1}');
    expect(run('h03-schema', write('games/g1/data/game.json')).stdout).toBe('');
    file('README.md', '# x');
    expect(run('h03-schema', write('README.md')).stdout).toBe('');
  });
  it('có validators.cjs (E1): dữ liệu sai schema → cảnh báo có instancePath; đúng → im lặng', () => {
    const real = readFileSync(join(ROOT, 'engine/schema/dist/validators.cjs'), 'utf8');
    file('engine/schema/dist/validators.cjs', real);
    const game = JSON.parse(readFileSync(join(ROOT, 'games/_template/data/game.json'), 'utf8')) as Record<string, unknown>;
    file('games/g2/data/game.json', JSON.stringify({ ...game, camera: { mode: 'top_down' } }));
    const r = run('h03-schema', write('games/g2/data/game.json'));
    expect(r.code).toBe(0);
    const ctx = (JSON.parse(r.stdout) as HookOut).hookSpecificOutput.additionalContext;
    expect(ctx).toContain('sai schema game');
    expect(ctx).toContain('/camera/mode');
    file('games/g2/data/game.json', JSON.stringify(game));
    expect(run('h03-schema', write('games/g2/data/game.json')).stdout).toBe('');
  });

  it('sửa budgets.json, .glsl → nhắc /perf-snapshot; tệp khác → im lặng', () => {
    expect(run('h05-perf', write('games/g1/data/budgets.json')).stdout).toContain('/perf-snapshot');
    expect(run('h05-perf', write('engine/runtime/src/render/water.glsl')).stdout).toContain('/perf-snapshot');
    expect(run('h05-perf', write('engine/cli/src/main.ts')).stdout).toBe('');
  });
});

describe('Lỗi nội bộ và thời gian (TST-DEV-02)', () => {
  it('stdin không phải JSON → exit 0 (không chặn nhầm)', () => {
    for (const h of ['h01-large-md', 'h02-binary-log', 'h03-schema', 'h04-secrets', 'h05-perf']) {
      expect(run(h, 'không phải json').code).toBe(0);
    }
  });
  it('tệp không tồn tại → exit 0', () => expect(run('h01-large-md', read(join(TMP, 'khong-co.md'))).code).toBe(0));
  it('P95 mỗi hook < 1 s (NFR-DEV-02)', () => {
    const times = Array.from({ length: 20 }, () => run('h04-secrets', bash('pnpm test')).ms).sort((a, b) => a - b);
    expect(times[18]).toBeLessThan(1000);
  });
});
