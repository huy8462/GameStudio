// Báo cáo gộp của một lần build (FR-CLI-03, FR-QA-01, SCH-RTM-05): report/1 kind 'build' không có `step`,
// mỗi nút (bước@zone) là một check; ghi <buildDir>/reports/build-<zone|all>.json (tệp tạm + rename).
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { validate } from '@gamestudio/schema';

import type { BuildOutcome, Report1, Tier } from '../orchestrator/types.js';

export interface BuildReportMeta {
  gameId: string;
  zone?: string;
  tier?: Tier;
  startedAtMs: number;
  endMs: number;
  tool: { name: string; version: string };
  host: string;
  /** Lỗi guard (trước khi chạy bước nào). */
  guard?: { code: string; message: string };
}

export function buildReport(o: BuildOutcome, m: BuildReportMeta): Report1 {
  const count = (s: string): number => o.steps.filter((x) => x.status === s).length;
  const metrics = {
    nodes: o.steps.length,
    ran: count('ran'),
    cached: count('cached'),
    error: count('error'),
    skipped: count('skipped'),
  };
  const warnings = [
    ...(m.guard ? [`${m.guard.code} ${m.guard.message}`] : []),
    ...(o.error && !m.guard ? [o.error] : []),
    ...o.steps.filter((s) => s.error).map((s) => `${s.step}@${s.zone ?? '-'}: ${s.error ?? ''}`),
  ];
  const result = m.guard || o.error ? 'fail' : o.result;
  const scope = `${m.zone ?? 'mọi zone'}${m.tier ? ` tier ${m.tier}` : ''}`;
  const summary = m.guard
    ? `Chặn trước build: ${m.guard.code}`
    : `${scope}: ${metrics.ran} chạy, ${metrics.cached} cache, ${metrics.error} lỗi, ${metrics.skipped} bỏ / ${metrics.nodes} nút`;
  return {
    schema: 'report/1',
    kind: 'build',
    gameId: m.gameId,
    ...(m.zone !== undefined ? { zone: m.zone } : {}),
    ...(m.tier !== undefined ? { tier: m.tier } : {}),
    cached: metrics.nodes > 0 && metrics.cached === metrics.nodes,
    startedAt: new Date(m.startedAtMs).toISOString(),
    durationS: Math.max(0, (m.endMs - m.startedAtMs) / 1000),
    metrics,
    budget: {},
    result,
    checks: o.steps.map((s) => ({
      id: `${s.step}@${s.zone ?? '-'}`,
      result: s.result,
      message: s.status,
      ...(s.durationS > 0 ? { value: s.durationS } : {}),
    })),
    warnings,
    artifacts: [],
    summary,
    tool: m.tool,
    host: m.host,
  };
}

/** Ghi báo cáo; trả đường dẫn tương đối buildDir. Báo cáo sai schema là lỗi lập trình → ném. */
export function writeBuildReport(buildDir: string, r: Report1): string {
  const errs = validate('report', r);
  if (errs.length > 0)
    throw new Error(`report build sai schema: ${errs.map((e) => `${e.instancePath} ${e.message}`).join('; ')}`);
  const dir = join(buildDir, 'reports');
  mkdirSync(dir, { recursive: true });
  const name = `build-${r.zone ?? 'all'}.json`;
  const tmp = join(dir, `${name}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(r, null, 2)}\n`);
  renameSync(tmp, join(dir, name));
  return `reports/${name}`;
}
