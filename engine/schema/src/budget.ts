// Đánh giá theo ngân sách (MOD-GEN-09, ALG-GEN-03, PSC-GEN-04; FR-RTM-14).
// ratio = value / limit: ≤ 0,9 pass; ≤ 1,0 warn; > 1,0 fail. Fps: ≥ mục tiêu pass; ≥ 0,9 × mục tiêu warn; còn lại fail.

export type CheckResult = 'pass' | 'warn' | 'fail';

export interface BudgetCheck {
  id: string;
  result: CheckResult;
  value: number;
  limit: number;
}

export interface BudgetEvaluation {
  result: CheckResult;
  checks: BudgetCheck[];
}

const RANK: Record<CheckResult, number> = { pass: 0, warn: 1, fail: 2 };

export function worst(results: readonly CheckResult[]): CheckResult {
  return results.reduce<CheckResult>((w, r) => (RANK[r] > RANK[w] ? r : w), 'pass');
}

export function evaluate(
  metrics: Readonly<Record<string, number>>,
  limits: Readonly<Record<string, number>>,
  fpsTarget?: number,
): BudgetEvaluation {
  const checks: BudgetCheck[] = [];
  for (const id of Object.keys(limits).sort()) {
    const value = metrics[id];
    const limit = limits[id];
    if (value === undefined || limit === undefined) continue;
    const r = limit > 0 ? value / limit : value > 0 ? Infinity : 0;
    checks.push({ id, result: r <= 0.9 ? 'pass' : r <= 1 ? 'warn' : 'fail', value, limit });
  }
  const fps = metrics['fpsAvg'];
  if (fpsTarget !== undefined && fps !== undefined) {
    const result: CheckResult = fps >= fpsTarget ? 'pass' : fps >= 0.9 * fpsTarget ? 'warn' : 'fail';
    checks.push({ id: 'fps', result, value: fps, limit: fpsTarget });
  }
  return { result: worst(checks.map((c) => c.result)), checks };
}
