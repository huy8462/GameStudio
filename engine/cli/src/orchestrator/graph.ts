// Đồ thị bước build (MOD-CLI-02, ALG-CLI-01; DDD-04 §3.3 loadGraph): đọc step.json, kiểm schema, deps, vòng.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { validate } from '@gamestudio/schema';

import type { Result, StepDef, StepGraph, StepId } from './types.js';

/** Tìm mọi step.json dưới stepsDir (đệ quy, sắp theo đường dẫn để tất định). */
/** Thư mục không chứa step.json của mình: phụ thuộc, đầu ra build, ẩn (T-0010: bước node là gói pnpm). */
const SKIP_DIRS = new Set(['node_modules', 'dist', '__pycache__']);

function findStepFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name) && !name.startsWith('.')) out.push(...findStepFiles(p));
    } else if (name === 'step.json') out.push(p);
  }
  return out;
}

/** Kahn; hoà theo id tăng dần → thứ tự ổn định. Có vòng → order thiếu các bước trong/sau vòng. */
export function topoOrder(steps: ReadonlyMap<StepId, Pick<StepDef, 'deps'>>): StepId[] {
  const indeg = new Map<StepId, number>();
  const users = new Map<StepId, StepId[]>();
  for (const [id, s] of steps) {
    indeg.set(id, s.deps.length);
    for (const d of s.deps) users.set(d, [...(users.get(d) ?? []), id]);
  }
  const ready = [...indeg].filter(([, n]) => n === 0).map(([id]) => id);
  const order: StepId[] = [];
  while (ready.length > 0) {
    ready.sort();
    const id = ready.shift() as StepId;
    order.push(id);
    for (const u of users.get(id) ?? []) {
      const n = (indeg.get(u) ?? 0) - 1;
      indeg.set(u, n);
      if (n === 0) ready.push(u);
    }
  }
  return order;
}

export function buildGraph(defs: readonly StepDef[]): Result<StepGraph> {
  const steps = new Map<StepId, StepDef>();
  for (const d of defs) {
    if (steps.has(d.id)) return { ok: false, error: { code: 'duplicate', message: `bước '${d.id}' khai báo hai lần` } };
    steps.set(d.id, d);
  }
  for (const d of defs) {
    for (const dep of d.deps) {
      if (!steps.has(dep)) {
        return {
          ok: false,
          error: { code: 'missing_dep', message: `bước '${d.id}' phụ thuộc '${dep}' không tồn tại` },
        };
      }
    }
  }
  const order = topoOrder(steps);
  if (order.length !== steps.size) {
    const left = [...steps.keys()].filter((id) => !order.includes(id)).sort();
    return {
      ok: false,
      error: { code: 'cycle', message: `đồ thị bước có vòng (trong hoặc sau vòng: ${left.join(', ')})` },
    };
  }
  return { ok: true, value: { steps, order } };
}

export function loadGraph(stepsDir: string): Result<StepGraph> {
  const defs: StepDef[] = [];
  for (const file of findStepFiles(stepsDir)) {
    const rel = relative(stepsDir, file).replace(/\\/g, '/');
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      return { ok: false, error: { code: 'io', message: `đọc ${rel} lỗi: ${(e as Error).message}`, path: rel } };
    }
    const errs = validate('step', raw);
    if (errs.length > 0) {
      const msg = errs.map((x) => `${x.instancePath} ${x.message}`).join('; ');
      return { ok: false, error: { code: 'schema', message: `${rel}: ${msg}`, path: rel } };
    }
    const def = raw as Omit<StepDef, 'dir'>;
    defs.push({ ...def, dir: join(file, '..') });
  }
  return buildGraph(defs);
}

/** Bước s và mọi bước phụ thuộc (trực tiếp hoặc gián tiếp) vào s, theo thứ tự tô-pô. */
export function downstream(g: StepGraph, s: StepId): StepId[] {
  const want = new Set<StepId>([s]);
  for (const id of g.order) {
    const def = g.steps.get(id);
    if (def?.deps.some((d) => want.has(d))) want.add(id);
  }
  return g.order.filter((id) => want.has(id));
}
