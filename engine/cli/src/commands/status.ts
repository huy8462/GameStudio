// Lệnh `engine status [--game <dir>] [--steps <dir>] [--tier] [--json]` (FR-CLI-08, IF-CLI-04, PSC-CLI-04): báo cáo
// tiến độ status/1 (SRS-04 §6.6) hoặc bảng + tóm tắt tiếng Việt. Chỉ đọc; thoát 0 (4 khi không đọc được game).
import { dirname, join, resolve } from 'node:path';

import type { Command } from 'commander';

import { ENGINE_VERSION } from '../engine-version.js';
import { EXIT } from '../exit-codes.js';
import type { Tier } from '../orchestrator/types.js';
import { printHuman, printJson } from '../output.js';
import { runStatus } from '../status/run-status.js';
import { findVersionsFile } from './doctor.js';

interface Opts {
  game?: string;
  steps?: string;
  tier?: string;
  json?: boolean;
}

export function registerStatus(program: Command, setExit: (code: number) => void): void {
  program
    .command('status')
    .description('Báo cáo tiến độ game: giai đoạn, bước cũ theo zone, việc nên làm tiếp (chỉ đọc).')
    .option('--game <dir>', 'thư mục game (mặc định thư mục hiện tại)')
    .option('--steps <dir>', 'thư mục step.json (mặc định engine/build/steps)')
    .option('--tier <tier>', 'tier đã build (mặc định không tier)')
    .option('--json', 'in một dòng status/1 ra stdout')
    .action((opts: Opts) => {
      const cwd = process.cwd();
      const v = findVersionsFile(cwd);
      const root = v === undefined ? cwd : dirname(dirname(v));
      const r = runStatus({
        gameDir: resolve(cwd, opts.game ?? '.'),
        stepsDir: opts.steps !== undefined ? resolve(cwd, opts.steps) : join(root, 'engine', 'build', 'steps'),
        engineVersion: ENGINE_VERSION,
        ...(opts.tier ? { tier: opts.tier as Tier } : {}),
      });
      if (!r.ok) {
        printHuman(`Không đọc được game: ${r.message}`);
        setExit(EXIT.DATA);
        return;
      }
      if (opts.json === true) printJson(r.report);
      else {
        for (const z of r.report.zones) {
          const tail = z.staleSteps.length ? ` cũ: ${z.staleSteps.join(', ')} (~${z.estimateMinutes ?? 0} phút)` : '';
          printHuman(`${z.id}: ${z.built ? 'đã build' : 'chưa build'}, QA ${z.qa}${tail}`);
        }
        for (const l of r.summary) printHuman(l);
      }
      setExit(EXIT.OK);
    });
}
