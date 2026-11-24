// engine status (FR-CLI-08, DDD-04 PSC-CLI-04, MOD-CLI-07 sources-fs): dựng StatusInputs từ thư mục game (chỉ đọc,
// không mạng, không mô hình; NFR-CLI-02) rồi computeStatus của @gamestudio/status. Không sửa gì.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { computeStatus, summarizeVi, type StatusInputs, type StatusReport } from '@gamestudio/status';
import { validate } from '@gamestudio/schema';

import { briefStatus, checkEngineVersion } from '../build-cmd/guards.js';
import { gameIdOf } from '../orchestrator/game-data.js';
import { planStaleFs } from '../orchestrator/stale.js';
import type { Tier } from '../orchestrator/types.js';

export interface StatusOptions {
  gameDir: string;
  stepsDir: string;
  engineVersion: string;
  tier?: Tier;
}

/** Phiên tạo game còn mở trong games/<id>/.intake/<sid>/session.json (status ChoTraLoi). */
function pendingIntake(gameDir: string): StatusInputs['pendingIntake'] {
  const dir = join(gameDir, '.intake');
  if (!existsSync(dir)) return null;
  for (const sid of readdirSync(dir).sort()) {
    const p = join(dir, sid, 'session.json');
    if (!existsSync(p)) continue;
    const s = JSON.parse(readFileSync(p, 'utf8')) as { status?: string; questions?: unknown[] };
    if (s.status === 'ChoTraLoi') return { sessionId: sid, pendingQuestions: s.questions?.length ?? 0 };
  }
  return null;
}

export function runStatus(
  o: StatusOptions,
): { ok: true; report: StatusReport; summary: string[] } | { ok: false; message: string } {
  const plan = planStaleFs({ gameDir: o.gameDir, stepsDir: o.stepsDir, ...(o.tier ? { tier: o.tier } : {}) });
  if (!plan.ok) return { ok: false, message: plan.error.message };
  const { data, zones, nodes, cache, items } = plan.value;
  const gameId = gameIdOf(data);
  if (gameId === undefined) return { ok: false, message: 'thiếu data/game.json hoặc id' };
  const b = briefStatus(o.gameDir);
  const report = computeStatus({
    gameId,
    dataVersion: 0, // CLI chưa đánh số phiên bản dữ liệu (phiên bản ở web, DDD-08); xem lệch trong T-0014
    brief: b.status === 'KhongCo' ? null : { status: b.status, version: b.version ?? 0 },
    style: 'ChuaCo', // style bible chưa có (MOD-INT-09), không chặn build
    zones,
    nodes,
    cache,
    stale: items,
    qaReports: [], // engine qa: phiếu sau
    publications: [], // engine publish: phiếu sau
    pendingIntake: pendingIntake(o.gameDir),
    counts: { proposalsPending: 0, assetsPending: 0, jobsFailed: 0, missingProvenance: 0, versionsSincePublish: 0 },
    canNangCap: checkEngineVersion(data, o.engineVersion) !== undefined,
  });
  const errs = validate('status', report);
  if (errs.length > 0)
    throw new Error(`status/1 sai schema: ${errs.map((e) => `${e.instancePath} ${e.message}`).join('; ')}`);
  return { ok: true, report, summary: summarizeVi(report) };
}
