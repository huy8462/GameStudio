// TC-GEN-05 (ALG-GEN-03), TST-GEN-01 phần budgets (SCH-GEN-03, SCH-RTM-03).
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { evaluate, worst } from './budget.js';
import { kindByPath, validate, validateFiles } from './validate.js';

const TEMPLATE = new URL('../../../games/_template/data/budgets.json', import.meta.url);
const tpl = (): Record<string, unknown> => JSON.parse(readFileSync(TEMPLATE, 'utf8')) as Record<string, unknown>;

describe('evaluate (TC-GEN-05)', () => {
  it('draw call 100/112/125 với giới hạn 120 → pass/warn/fail', () => {
    expect(evaluate({ drawCalls: 100 }, { drawCalls: 120 }).result).toBe('pass');
    expect(evaluate({ drawCalls: 112 }, { drawCalls: 120 }).result).toBe('warn');
    expect(evaluate({ drawCalls: 125 }, { drawCalls: 120 }).result).toBe('fail');
  });

  it('fps 31/28/26 với mục tiêu 30 → pass/warn/fail', () => {
    expect(evaluate({ fpsAvg: 31 }, {}, 30).result).toBe('pass');
    expect(evaluate({ fpsAvg: 28 }, {}, 30).result).toBe('warn');
    expect(evaluate({ fpsAvg: 26 }, {}, 30).result).toBe('fail');
  });

  it('kết quả tổng là xấu nhất; check sắp theo id; chỉ số thiếu bị bỏ qua', () => {
    const r = evaluate(
      { materials: 30, drawCalls: 50, fpsAvg: 40 },
      { drawCalls: 120, materials: 32, trisTotal: 650000 },
      30,
    );
    expect(r.result).toBe('warn');
    expect(r.checks.map((c) => c.id)).toEqual(['drawCalls', 'materials', 'fps']);
    expect(worst([])).toBe('pass');
    expect(evaluate({ x: 1 }, { x: 0 }).result).toBe('fail');
    expect(evaluate({ x: 0 }, { x: 0 }).result).toBe('pass');
  });
});

describe('schema budgets/1', () => {
  it('games/_template/data/budgets.json hợp lệ và có baseline A56 (TST-GEN-01)', () => {
    const data = tpl();
    expect(validate('budgets', data)).toEqual([]);
    const tiers = data['tiers'] as Record<string, { maxRenderDpr: number; fpsTarget: number; drawCalls: number }>;
    expect(tiers['vua']).toMatchObject({ maxRenderDpr: 1.5, fpsTarget: 30, drawCalls: 120 });
    expect(data['a56Baseline']).toMatchObject({ gpu: expect.stringContaining('Xclipse 540'), renderDpr: 1.5 });
  });

  it('báo lỗi có đường dẫn: thiếu tier, sai kiểu, khoá lạ', () => {
    const bad = tpl();
    const tiers = bad['tiers'] as Record<string, Record<string, unknown>>;
    delete tiers['cao'];
    (tiers['vua'] as Record<string, unknown>)['drawCalls'] = -1;
    (tiers['vua'] as Record<string, unknown>)['foo'] = 1;
    const errs = validate('budgets', bad);
    const paths = errs.map((e) => `${e.instancePath} ${e.keyword}`);
    expect(paths).toContain('/tiers required');
    expect(paths).toContain('/tiers/vua/drawCalls minimum');
    expect(errs.find((e) => e.keyword === 'additionalProperties')?.message).toContain('foo');
  });

  it('kindByPath và validateFiles theo bảng DDD-00 §3.3', () => {
    expect(kindByPath('data/budgets.json')).toBe('budgets');
    expect(kindByPath('data\\budgets.json')).toBe('budgets');
    expect(kindByPath('data/game.json')).toBe('game');
    expect(kindByPath('data/entities/player.json')).toBeUndefined();
    const out = validateFiles({ 'data/budgets.json': tpl(), 'data/game.json': {}, 'README.md': '' });
    expect(Object.keys(out)).toEqual(['data/budgets.json', 'data/game.json']);
    expect(out['data/budgets.json']).toEqual([]);
    expect(out['data/game.json']?.length).toBeGreaterThan(0);
  });
});
