// Chạy một nút (bước, zone, tier) của đồ thị (PSC-CLI-01 thân vòng lặp): băm, tra cache, chạy runner, ghi report, cache, chỉ mục.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { deriveSeed } from '@gamestudio/rng';
import { validate } from '@gamestudio/schema';

import type { StepCache } from './cache.js';
import { recordStep } from './cache-index.js';
import { extractData, inputHash, matchFiles, outputHash } from './hash.js';
import type { Runner } from './runners/node.js';
import { StepError } from './runners/node.js';
import type { CacheIndexEntry, Clock, Report1, StepCtx, StepDef, StepOutcome, Tier } from './types.js';

export interface NodeEnv {
  gameDir: string;
  gameId: string;
  buildDir: string;
  data: unknown;
  baseSeed: number;
  cache: StepCache;
  clock: Clock;
  host: string;
  tool: { name: string; version: string };
  toolVersions: Record<string, string>;
  force: boolean;
  runners: Record<StepDef['runner'], Runner>;
  logLevel: 'info' | 'debug';
  onProgress?: (step: string, zone: string | null, pct: number, msg: string) => void;
  nextRunId: () => string;
}

const iso = (ms: number): string => new Date(ms).toISOString();

/** seed_bước = deriveSeed(world.seed, stepId, zoneId, localSeed) (QT-WLD-01); localSeed = params.localSeed ?? 0. */
export function stepSeed(baseSeed: number, step: StepDef, zone: string | null): number {
  const local = step.inputs.params['localSeed'];
  return deriveSeed(baseSeed, step.id, zone ?? '', typeof local === 'number' ? local : 0);
}

export async function runNodeStep(
  env: NodeEnv,
  step: StepDef,
  zone: string | null,
  tier: Tier | null,
  upstream: StepCtx['upstream'],
): Promise<StepOutcome> {
  const seed = stepSeed(env.baseSeed, step, zone);
  const h = inputHash(step, {
    data: env.data,
    gameDir: env.gameDir,
    upstream,
    zone,
    tier,
    seed,
    toolVersions: env.toolVersions,
  });
  const base = { step: step.id, zone, tier, inputHash: h };
  const indexEntry = (outputHashV: string, at: string, durationS: number): CacheIndexEntry => ({
    step: step.id,
    ...(zone !== null ? { zone } : {}),
    ...(tier !== null ? { tier } : {}),
    inputHash: h,
    outputHash: outputHashV,
    at,
    durationS,
    ok: true,
  });

  const hit = env.force ? undefined : env.cache.get(step.id, h);
  if (hit) {
    recordStep(env.buildDir, indexEntry(hit.outputHash, hit.createdAt, hit.durationS));
    return {
      ...base,
      status: 'cached',
      result: 'pass',
      outputHash: hit.outputHash,
      outDir: env.cache.outDir(step.id, h),
      durationS: 0,
    };
  }

  const t0 = env.clock.now();
  const { outDir, tmpDir } = env.cache.prepareTmp(step.id, h, env.nextRunId());
  const ctx: StepCtx = {
    gameDir: env.gameDir,
    gameId: env.gameId,
    zone,
    tier,
    seed,
    inputs: {
      data: extractData(env.data, step.inputs.dataPointers),
      files: matchFiles(env.gameDir, step.inputs.files),
      params: step.inputs.params,
    },
    upstream,
    outDir,
    tmpDir,
    toolVersions: env.toolVersions,
    logLevel: env.logLevel,
    progress: (pct, msg) => env.onProgress?.(step.id, zone, pct, msg),
  };
  try {
    const r = await env.runners[step.runner](step, ctx);
    const out = outputHash(outDir);
    const durationS = Math.max(0, (env.clock.now() - t0) / 1000);
    const report: Report1 = {
      schema: 'report/1',
      kind: 'build',
      step: step.id,
      gameId: env.gameId,
      ...(zone !== null ? { zone } : {}),
      ...(tier !== null ? { tier } : {}),
      inputHash: h,
      outputHash: out.hash,
      cached: false,
      startedAt: iso(t0),
      durationS,
      seed,
      metrics: r.metrics ?? {},
      budget: r.budget ?? {},
      result: r.result ?? 'pass',
      checks: r.checks ?? [],
      warnings: r.warnings ?? [],
      artifacts: r.artifacts ?? [],
      outputs: out.files,
      summary: r.summary ?? `${step.id}${zone ? ` ${zone}` : ''}: ${out.files.length} tệp`,
      tool: env.tool,
      host: env.host,
      stepVersion: step.version,
    };
    const bad = validate('report', report);
    if (bad.length > 0)
      throw new StepError(
        `report của '${step.id}' sai schema: ${bad.map((b) => `${b.instancePath} ${b.message}`).join('; ')}`,
        4,
      );
    writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    const at = iso(env.clock.now());
    const finalOut = env.cache.commit(step.id, h, outDir, {
      inputHash: h,
      outputHash: out.hash,
      createdAt: at,
      durationS,
      host: env.host,
      stepVersion: step.version,
    });
    recordStep(env.buildDir, indexEntry(out.hash, at, durationS));
    return { ...base, status: 'ran', result: report.result, outputHash: out.hash, outDir: finalOut, durationS };
  } catch (e) {
    env.cache.discard(outDir);
    const durationS = Math.max(0, (env.clock.now() - t0) / 1000);
    return { ...base, status: 'error', result: 'fail', durationS, error: (e as Error).message, exitCode: errorExit(e) };
  }
}

/** Mã thoát của lỗi bước: StepError mang mã riêng; lỗi khác là 10 (SRS-04 §7.2). */
export function errorExit(e: unknown): number {
  return e instanceof StepError ? e.exitCode : 10;
}
