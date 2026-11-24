// @gamestudio/status (PSC-GEN-05, STM-GEN-01, TC-GEN-08 phần planStale, TC-INT-19 phần summarizeVi).
import { describe, expect, it } from 'vitest';

import { computeStatus } from './compute.js';
import { estimateSeconds, planStale } from './plan-stale.js';
import { summarizeVi } from './summarize-vi.js';
import type { CacheIndexEntry, PlanNode, StatusInputs } from './types.js';

const N = (step: string, zone: string | null, deps: string[] = []): PlanNode => ({
  key: `${step}@${zone ?? '-'}`,
  step,
  zone,
  deps,
});
const NODES: PlanNode[] = [
  N('terrain.erode', null),
  N('terrain.mesh', 'z1', ['terrain.erode@-']),
  N('terrain.mesh', 'z2', ['terrain.erode@-']),
];
const E = (step: string, zone: string | undefined, inputHash: string, durationS = 60): CacheIndexEntry => ({
  step,
  ...(zone ? { zone } : {}),
  inputHash,
  outputHash: `out-${step}-${zone ?? '-'}`,
  at: '2026-11-24T00:00:00Z',
  durationS,
  ok: true,
});
/** hashOf giả: băm = khoá + đầu ra upstream + "phiên bản dữ liệu" của zone. */
const hashOf = (ver: Record<string, number>) => (n: PlanNode, up: Readonly<Record<string, string>>) =>
  `${n.key}|${Object.values(up).join(',')}|${ver[n.zone ?? '-'] ?? 0}`;
const fullCache = (ver: Record<string, number> = {}): CacheIndexEntry[] => {
  const h = hashOf(ver);
  const e = E('terrain.erode', undefined, h(NODES[0] as PlanNode, {}));
  const up = { 'terrain.erode@-': e.outputHash };
  return [
    e,
    E('terrain.mesh', 'z1', h(NODES[1] as PlanNode, up), 30),
    E('terrain.mesh', 'z2', h(NODES[2] as PlanNode, up), 90),
  ];
};

describe('planStale', () => {
  it('chưa có chỉ mục → mọi nút never; ước lượng theo mặc định CFG-GEN-06', () => {
    const items = planStale(NODES, [], { tier: null, hashOf: hashOf({}) });
    expect(items.map((i) => `${i.key}:${i.reason}`)).toEqual([
      'terrain.erode@-:never',
      'terrain.mesh@z1:never',
      'terrain.mesh@z2:never',
    ]);
    expect(items[0]?.estS).toBe(180);
  });

  it('khớp chỉ mục → không có bước cũ; đổi dữ liệu z2 → chỉ mesh@z2 input_changed', () => {
    expect(planStale(NODES, fullCache(), { tier: null, hashOf: hashOf({}) })).toEqual([]);
    const items = planStale(NODES, fullCache(), { tier: null, hashOf: hashOf({ z2: 1 }) });
    expect(items.map((i) => `${i.key}:${i.reason}`)).toEqual(['terrain.mesh@z2:input_changed']);
    expect(items[0]?.estS).toBe(60); // trung vị durationS của bước (30, 90)
  });

  it('bước gốc đổi → hạ nguồn upstream_stale, inputHash rỗng', () => {
    const items = planStale(NODES, fullCache(), { tier: null, hashOf: hashOf({ '-': 1 }) });
    expect(items.map((i) => `${i.key}:${i.reason}:${i.inputHash === '' ? 'rong' : 'co'}`)).toEqual([
      'terrain.erode@-:input_changed:co',
      'terrain.mesh@z1:upstream_stale:rong',
      'terrain.mesh@z2:upstream_stale:rong',
    ]);
  });

  it('chỉ mục tier khác bị bỏ qua', () => {
    const cache = fullCache().map((e) => ({ ...e, tier: 'cao' as const }));
    expect(planStale(NODES, cache, { tier: null, hashOf: hashOf({}) })).toHaveLength(3);
    expect(planStale(NODES, cache, { tier: 'cao', hashOf: hashOf({}) })).toEqual([]);
    expect(estimateSeconds('khong-co', [])).toBe(60);
  });
});

const inputs = (over: Partial<StatusInputs> = {}): StatusInputs => ({
  gameId: 'lang-thu',
  dataVersion: 0,
  brief: { status: 'DaXacNhan', version: 1 },
  style: 'ChuaCo',
  zones: ['z1', 'z2'],
  nodes: NODES,
  cache: fullCache(),
  stale: [],
  qaReports: [],
  publications: [],
  pendingIntake: null,
  counts: { proposalsPending: 0, assetsPending: 0, jobsFailed: 0, missingProvenance: 0, versionsSincePublish: 0 },
  canNangCap: false,
  ...over,
});

describe('computeStatus (STM-GEN-01)', () => {
  it.each([
    [{ brief: null, pendingIntake: { sessionId: 's-1', pendingQuestions: 2 } }, 'TaoMoi', 'answer'],
    [{ brief: null }, 'ChoXacNhanBrief', 'confirm_brief'],
    [{ brief: { status: 'ChoXacNhan' as const, version: 2 } }, 'ChoXacNhanBrief', 'confirm_brief'],
    [{ style: 'ChoDuyet' as const }, 'ChoDuyetStyle', 'approve_style'],
    [{ cache: [] }, 'ChuaBuild', 'build'],
    [{}, 'ChuaQA', 'qa'],
    [
      {
        qaReports: [
          { zone: 'z1', result: 'pass' as const, buildHash: 'x' },
          { zone: 'z2', result: 'pass' as const, buildHash: 'x' },
        ],
      },
      'SanSangXuatBan',
      'publish',
    ],
    [{ canNangCap: true }, 'ChuaQA', 'upgrade'],
  ])('%o → %s, next %s', (over, stage, action) => {
    const r = computeStatus(inputs(over));
    expect(r.stage).toBe(stage);
    expect(r.next.action).toBe(action);
  });

  it('z2 cũ → CanBuild, staleSteps chỉ ở z2, next build --stale --zone z2; tóm tắt ≤ 6 dòng', () => {
    const stale = planStale(NODES, fullCache(), { tier: null, hashOf: hashOf({ z2: 1 }) });
    const r = computeStatus(inputs({ stale, qaReports: [{ zone: 'z2', result: 'pass', buildHash: 'x' }] }));
    expect(r.stage).toBe('CanBuild');
    expect(r.zones).toEqual([
      { id: 'z1', built: true, staleSteps: [], qa: 'chua' },
      { id: 'z2', built: true, staleSteps: ['terrain.mesh'], estimateMinutes: 1, qa: 'cu' },
    ]);
    expect(r.next).toEqual({ action: 'build', args: '--stale --zone z2', label: 'Build lại zone z2 (khoảng 1 phút)' });
    const s = summarizeVi(r);
    expect(s.length).toBeLessThanOrEqual(6);
    expect(s[0]).toBe('Game lang-thu: Cần build lại phần đã đổi (CanBuild).');
    expect(s.join('\n')).toContain('z2 (terrain.mesh)');
  });
});
