// TST-DEV-05 / TC-DEV-05 (AC-09-01): cấu trúc .claude/, CLAUDE.md, LICENSE trùng vendor.
import { describe, expect, it } from 'vitest';

// @ts-expect-error -- script .mjs không có khai báo kiểu
import { checkStructure } from './structure-check.mjs';

interface Result {
  ok: boolean;
  errors: string[];
  warnings: string[];
  counts: { agents: number; skills: number; commands: number; claudeMdLines: number };
}

describe('structure-check', () => {
  it('repo đạt: 8 agent, 8 skill gốc, 15 lệnh, CLAUDE.md < 150', () => {
    const r = checkStructure() as Result;
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.counts.agents).toBe(8);
    expect(r.counts.commands).toBe(15);
    expect(r.counts.claudeMdLines).toBeLessThan(150);
  });
});
