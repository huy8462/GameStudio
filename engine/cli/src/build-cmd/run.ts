// `engine build` không phụ thuộc commander (IF-CLI-01, PSC-CLI-01): guards → runBuild → báo cáo gộp build/reports/.
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';

import { EXIT } from '../exit-codes.js';
import { gameIdOf, loadGameData, type GameDataFiles } from '../orchestrator/game-data.js';
import { buildGraph } from '../orchestrator/graph.js';
import { runBuild, type RunBuildOptions } from '../orchestrator/scheduler.js';
import type { BuildOutcome, Clock, Report1, Tier } from '../orchestrator/types.js';
import { runGuards } from './guards.js';
import { buildReport, writeBuildReport } from './report.js';

export interface BuildCommandOptions {
  gameDir: string;
  stepsDir: string;
  buildDir?: string;
  zone?: string;
  tier?: Tier;
  step?: string;
  force?: boolean;
  skipBake?: boolean;
  clock: Clock;
  host: string;
  engineVersion: string;
  tool: { name: string; version: string };
  concurrency?: number;
  runners?: RunBuildOptions['runners'];
  onProgress?: RunBuildOptions['onProgress'];
}

export interface BuildCommandResult {
  exit: number;
  report: Report1;
  reportPath?: string;
  outcome: BuildOutcome;
  /** Không có thư mục bước: build rỗng (chưa có bước nào ở pha này). */
  noSteps: boolean;
}

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function runBuildCommand(o: BuildCommandOptions): Promise<BuildCommandResult> {
  const t0 = o.clock.now();
  const buildDir = o.buildDir ?? join(o.gameDir, 'build');
  const meta = {
    ...(o.zone !== undefined ? { zone: o.zone } : {}),
    ...(o.tier !== undefined ? { tier: o.tier } : {}),
    tool: o.tool,
    host: o.host,
  };
  const empty: BuildOutcome = { result: 'fail', exit: EXIT.DATA, steps: [] };
  const noSteps = !existsSync(o.stepsDir);
  const finish = (outcome: BuildOutcome, gameId: string, guard?: { code: string; message: string }, write = true) => {
    const report = buildReport(outcome, {
      ...meta,
      gameId,
      startedAtMs: t0,
      endMs: o.clock.now(),
      ...(guard ? { guard } : {}),
    });
    const reportPath = write ? writeBuildReport(buildDir, report) : undefined;
    return { exit: outcome.exit, report, outcome, noSteps, ...(reportPath ? { reportPath } : {}) };
  };

  let data: GameDataFiles;
  try {
    data = existsSync(join(o.gameDir, 'data')) ? loadGameData(o.gameDir) : {};
  } catch (e) {
    const fallbackId = ID_RE.test(basename(o.gameDir)) ? basename(o.gameDir) : 'khong-ro';
    const msg = `đọc data/ lỗi: ${(e as Error).message}`;
    return finish({ ...empty, error: msg }, fallbackId, { code: 'ERR-RTM-03', message: msg }, false);
  }
  const gameId = gameIdOf(data);
  if (gameId === undefined || !ID_RE.test(gameId)) {
    const fallbackId = ID_RE.test(basename(o.gameDir)) ? basename(o.gameDir) : 'khong-ro';
    const msg = 'thiếu data/game.json hoặc id không hợp lệ';
    return finish({ ...empty, error: msg }, fallbackId, { code: 'ERR-RTM-03', message: msg }, false);
  }

  const guard = runGuards(o.gameDir, data, o.engineVersion);
  if (guard) return finish({ result: 'fail', exit: guard.exit, steps: [] }, gameId, guard);

  const empGraph = buildGraph([]);
  const outcome = await runBuild({
    gameDir: o.gameDir,
    buildDir,
    ...(noSteps && empGraph.ok ? { graph: empGraph.value } : { stepsDir: o.stepsDir }),
    ...(o.zone !== undefined ? { zone: o.zone } : {}),
    ...(o.tier !== undefined ? { tier: o.tier } : {}),
    ...(o.step !== undefined ? { step: o.step } : {}),
    force: o.force ?? false,
    skipBake: o.skipBake ?? false,
    clock: o.clock,
    host: o.host,
    tool: o.tool,
    ...(o.concurrency !== undefined ? { concurrency: o.concurrency } : {}),
    ...(o.runners ? { runners: o.runners } : {}),
    ...(o.onProgress ? { onProgress: o.onProgress } : {}),
  });
  return finish(outcome, gameId);
}
