// planStaleFs (MOD-CLI-07, DDD-04 PSC-CLI-05; FR-CLI-09): dựng nút đồ thị + chỉ mục cache từ thư mục game, gọi planStale
// của @gamestudio/status với hàm băm ĐÚNG như build (inputHash, stepSeed, upstreamName), nên status và build --stale không lệch.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { planStale, type StaleItem } from '@gamestudio/status';

import { readCacheIndex } from './cache-index.js';
import { baseSeedOf, loadGameData, zonesOf, type GameDataFiles } from './game-data.js';
import { buildGraph, loadGraph } from './graph.js';
import { inputHash } from './hash.js';
import { stepSeed } from './run-step.js';
import { planNodes, upstreamName } from './scheduler.js';
import type { CacheIndexEntry, Result, StepGraph, Tier } from './types.js';

export interface StalePlan {
  graph: StepGraph;
  data: GameDataFiles;
  zones: string[];
  nodes: ReturnType<typeof planNodes>;
  cache: CacheIndexEntry[];
  items: StaleItem[];
}

export interface PlanStaleFsOptions {
  gameDir: string;
  stepsDir: string;
  buildDir?: string;
  zone?: string;
  tier?: Tier;
  toolVersions?: Record<string, string>;
}

export function planStaleFs(o: PlanStaleFsOptions): Result<StalePlan> {
  const g = existsSync(o.stepsDir) ? loadGraph(o.stepsDir) : buildGraph([]);
  if (!g.ok) return g;
  const data = loadGameData(o.gameDir);
  const zones = o.zone !== undefined ? [o.zone] : zonesOf(data);
  const nodes = planNodes(g.value, g.value.order, zones);
  const cache = readCacheIndex(o.buildDir ?? join(o.gameDir, 'build'));
  const tier = o.tier ?? null;
  const baseSeed = baseSeedOf(data);
  const items = planStale(nodes, cache, {
    tier,
    hashOf: (n, up) => {
      const def = g.value.steps.get(n.step);
      if (!def) return undefined;
      const upstream = Object.fromEntries(n.deps.map((k) => [upstreamName(k, n.deps), { outputHash: up[k] ?? '' }]));
      return inputHash(def, {
        data,
        gameDir: o.gameDir,
        upstream,
        zone: n.zone,
        tier,
        seed: stepSeed(baseSeed, def, n.zone),
        toolVersions: o.toolVersions ?? {},
      });
    },
  });
  return { ok: true, value: { graph: g.value, data, zones, nodes, cache, items } };
}
