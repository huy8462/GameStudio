// Lập lịch đồ thị bước (ALG-CLI-01, PSC-CLI-01; DDD-04 §3.3 runBuild): nút (bước, zone), song song có giới hạn,
// hit cache bỏ qua, bước lỗi huỷ nhánh phụ thuộc và tiếp nhánh độc lập, mã thoát SRS-04 §7.2.
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import { worst } from '@gamestudio/schema';

import { EXIT } from '../exit-codes.js';
import { StepCache } from './cache.js';
import { readCacheIndex } from './cache-index.js';
import { baseSeedOf, gameIdOf, loadGameData, zonesOf } from './game-data.js';
import { downstream, loadGraph } from './graph.js';
import { errorExit, runNodeStep, type NodeEnv } from './run-step.js';
import { notYet, runNode, type Runner } from './runners/node.js';
import { makePythonRunner } from './runners/python.js';
import type { BuildOutcome, Clock, StepCtx, StepGraph, StepId, StepOutcome, Tier } from './types.js';

export interface RunBuildOptions {
  gameDir: string;
  /** Mặc định <gameDir>/build (cache ở <buildDir>/cache). */
  buildDir?: string;
  stepsDir?: string;
  graph?: StepGraph;
  zone?: string;
  tier?: Tier;
  step?: StepId;
  force?: boolean;
  skipBake?: boolean;
  clock: Clock;
  host: string;
  tool?: { name: string; version: string };
  toolVersions?: Record<string, string>;
  concurrency?: number;
  runners?: Partial<NodeEnv['runners']>;
  /** Chỉ chạy các nút này (khoá '<bước>@<zone|->'); dùng cho build --stale (PSC-CLI-05). */
  onlyKeys?: ReadonlySet<string>;
  logLevel?: 'info' | 'debug';
  onProgress?: NodeEnv['onProgress'];
}

interface PlanNode {
  key: string;
  step: StepId;
  zone: string | null;
  deps: string[];
}

export const keyOf = (step: StepId, zone: string | null): string => `${step}@${zone ?? '-'}`;
export const parseKey = (key: string): { step: StepId; zone: string | null } => {
  const at = key.lastIndexOf('@');
  const z = key.slice(at + 1);
  return { step: key.slice(0, at), zone: z === '-' ? null : z };
};

/** Tên upstream trong ctx/inputHash: id bước, hoặc '<bước>@<zone>' khi nút phụ thuộc nhiều zone của cùng bước. */
export function upstreamName(depKey: string, allDepKeys: readonly string[]): string {
  const { step } = parseKey(depKey);
  return allDepKeys.filter((k) => parseKey(k).step === step).length > 1 ? depKey : step;
}

/** Mặc định song song ≤ min(4, lõi/2) (CFG-CLI-01). */
export const defaultConcurrency = (): number => Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2)));

const fail = (exit: number, msg: string): BuildOutcome => ({ result: 'fail', exit, steps: [], error: msg });

/**
 * Nút theo thứ tự tô-pô; bước perZone nhân theo zone (o.zone hoặc mọi zone của world.json). `deps` là ĐỦ khoá phụ thuộc
 * (kể cả bước ngoài plan): khoá không nằm trong tập nút sẽ chạy được lấy từ cache/index.json (--step, --stale).
 */
export function planNodes(g: StepGraph, plan: readonly StepId[], zones: readonly string[]): PlanNode[] {
  const zonesFor = (s: StepId): (string | null)[] =>
    g.steps.get(s)?.perZone && zones.length > 0 ? [...zones] : [null];
  const nodes: PlanNode[] = [];
  for (const s of plan) {
    const def = g.steps.get(s);
    if (!def) continue;
    for (const z of zonesFor(s)) {
      const deps: string[] = [];
      for (const d of def.deps) {
        const dz = zonesFor(d);
        if (dz.length === 1 && dz[0] === null) deps.push(keyOf(d, null));
        else if (z !== null) deps.push(keyOf(d, z));
        else deps.push(...dz.map((x) => keyOf(d, x)));
      }
      nodes.push({ key: keyOf(s, z), step: s, zone: z, deps });
    }
  }
  return nodes;
}

export async function runBuild(o: RunBuildOptions): Promise<BuildOutcome> {
  let g = o.graph;
  if (!g) {
    if (o.stepsDir === undefined) return fail(EXIT.DATA, 'thiếu stepsDir hoặc graph');
    const lg = loadGraph(o.stepsDir);
    if (!lg.ok) return fail(EXIT.DATA, lg.error.message);
    g = lg.value;
  }
  const data = loadGameData(o.gameDir);
  const gameId = gameIdOf(data);
  if (gameId === undefined) return fail(EXIT.DATA, 'thiếu data/game.json hoặc game.json không có id');
  if (o.step !== undefined && !g.steps.has(o.step)) return fail(EXIT.DATA, `không có bước '${o.step}'`);

  let plan = o.step !== undefined ? downstream(g, o.step) : [...g.order];
  if (o.skipBake) plan = plan.filter((s) => s !== 'lighting.bake');
  const zones = o.zone !== undefined ? [o.zone] : zonesOf(data);
  const only = o.onlyKeys;
  const nodes = planNodes(g, plan, zones).filter((n) => !only || only.has(n.key));
  const runKeys = new Set(nodes.map((n) => n.key));

  const buildDir = o.buildDir ?? join(o.gameDir, 'build');
  let runSeq = 0;
  const runners: Record<'node' | 'python' | 'blender', Runner> = {
    node: runNode,
    python: makePythonRunner(),
    blender: notYet('blender'),
    ...o.runners,
  };
  const env: NodeEnv = {
    gameDir: o.gameDir,
    gameId,
    buildDir,
    data,
    baseSeed: baseSeedOf(data),
    cache: new StepCache(join(buildDir, 'cache')),
    clock: o.clock,
    host: o.host,
    tool: o.tool ?? { name: '@gamestudio/cli', version: '0.0.0' },
    toolVersions: o.toolVersions ?? {},
    force: o.force ?? false,
    runners,
    logLevel: o.logLevel ?? 'info',
    ...(o.onProgress ? { onProgress: o.onProgress } : {}),
    nextRunId: () => `${process.pid}-${++runSeq}`,
  };

  const done = new Map<string, StepOutcome>();
  const running = new Map<string, Promise<void>>();
  const limit = Math.max(1, o.concurrency ?? defaultConcurrency());
  const tier = o.tier ?? null;

  // Phụ thuộc ngoài tập nút chạy (--step, --stale): lần chạy thành công gần nhất từ chỉ mục cache (SCH-RTM-09).
  const index = readCacheIndex(buildDir);
  const fromIndex = (depKey: string): StepCtx['upstream'][string] | undefined => {
    const { step, zone } = parseKey(depKey);
    const e = index.find((x) => x.step === step && (x.zone ?? null) === zone && (x.tier ?? null) === tier);
    return e ? { outDir: env.cache.outDir(step, e.inputHash), outputHash: e.outputHash } : undefined;
  };
  const internal = (n: PlanNode): string[] => n.deps.filter((k) => runKeys.has(k));

  const launch = (n: PlanNode): void => {
    const def = g.steps.get(n.step);
    if (!def) return;
    const upstream: StepCtx['upstream'] = {};
    for (const k of n.deps.filter((x) => !runKeys.has(x))) {
      const u = fromIndex(k);
      if (!u) {
        const error = `bước phụ thuộc '${k}' chưa build (chạy build đủ trước)`;
        done.set(n.key, {
          step: n.step,
          zone: n.zone,
          tier,
          status: 'error',
          result: 'fail',
          durationS: 0,
          error,
          exitCode: EXIT.DATA,
        });
        return;
      }
      upstream[upstreamName(k, n.deps)] = u;
    }
    for (const k of internal(n)) {
      const r = done.get(k);
      if (r?.outDir && r.outputHash) upstream[upstreamName(k, n.deps)] = { outDir: r.outDir, outputHash: r.outputHash };
    }
    const p = runNodeStep(env, def, n.zone, tier, upstream)
      .catch((e: unknown): StepOutcome => {
        // Lỗi ngoài thân bước (băm tệp, khoá chỉ mục…): coi là lỗi bước, không làm sập cả build.
        const error = e instanceof Error ? e.message : String(e);
        return {
          step: n.step,
          zone: n.zone,
          tier,
          status: 'error',
          result: 'fail',
          durationS: 0,
          error,
          exitCode: errorExit(e),
        };
      })
      .then((r) => {
        done.set(n.key, r);
        running.delete(n.key);
      });
    running.set(n.key, p);
  };

  const pending = [...nodes];
  for (;;) {
    let changed = false;
    // Bỏ qua nút có phụ thuộc lỗi/bị bỏ; giữ thứ tự tô-pô ổn định.
    for (let i = 0; i < pending.length;) {
      const n = pending[i] as PlanNode;
      const bad = internal(n).find((k) => {
        const s = done.get(k)?.status;
        return s === 'error' || s === 'skipped';
      });
      if (bad !== undefined) {
        done.set(n.key, {
          step: n.step,
          zone: n.zone,
          tier,
          status: 'skipped',
          result: 'fail',
          durationS: 0,
          error: `bỏ vì '${bad}' lỗi`,
        });
        pending.splice(i, 1);
        changed = true;
      } else i++;
    }
    for (let i = 0; i < pending.length && running.size < limit;) {
      const n = pending[i] as PlanNode;
      if (internal(n).every((k) => done.has(k))) {
        pending.splice(i, 1);
        launch(n);
        changed = true;
      } else i++;
    }
    if (running.size > 0) await Promise.race(running.values());
    else if (!changed) break; // hết việc (DAG hợp lệ thì pending đã rỗng)
  }

  const steps = nodes.map((n) => done.get(n.key)).filter((x): x is StepOutcome => x !== undefined);
  const result = worst(steps.map((s) => s.result));
  const errs = steps.filter((s) => s.status === 'error').map((s) => s.exitCode ?? EXIT.UNCAUGHT);
  const exit =
    errs.length > 0 ? Math.max(...errs) : result === 'pass' ? EXIT.OK : result === 'warn' ? EXIT.WARN : EXIT.FAIL;
  return { result, exit, steps };
}
