// Lệnh `engine build [--game] [--steps] [--zone] [--tier] [--step] [--force] [--skip-bake] [--json]` (IF-CLI-01, FR-CLI-01, 03).
// Mã thoát SRS-04 §7.2: 0 pass, 1 warn, 2 fail, 3 brief chưa xác nhận, 4 dữ liệu/đồ thị, 5 môi trường, 6 dịch vụ ngoài, 10.
import { hostname } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type { Command } from 'commander';

import { runBuildCommand } from '../build-cmd/run.js';
import { systemClock } from '../clock.js';
import { ENGINE_VERSION } from '../engine-version.js';
import { EXIT } from '../exit-codes.js';
import type { Tier } from '../orchestrator/types.js';
import { printHuman, printJson } from '../output.js';
import { findVersionsFile } from './doctor.js';

interface Opts {
  game?: string;
  steps?: string;
  zone?: string;
  tier?: string;
  step?: string;
  force?: boolean;
  skipBake?: boolean;
  stale?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

const TIERS = ['thap', 'vua', 'cao', 'toi_da'] as const;
const ICON: Record<string, string> = { ran: '✓', cached: '↺', error: '✗', skipped: '–' };

/** Thư mục bước mặc định: <gốc repo>/engine/build/steps (gốc = nơi có tools/versions.json). */
function defaultStepsDir(cwd: string): string {
  const v = findVersionsFile(cwd);
  return join(v === undefined ? cwd : dirname(dirname(v)), 'engine', 'build', 'steps');
}

export function registerBuild(program: Command, setExit: (code: number) => void): void {
  program
    .command('build')
    .description('Build game theo đồ thị bước, cache theo nội dung (ADR-023).')
    .option('--game <dir>', 'thư mục game (mặc định thư mục hiện tại)')
    .option('--steps <dir>', 'thư mục step.json (mặc định engine/build/steps)')
    .option('--zone <id>', 'chỉ build zone này cho bước perZone')
    .option('--tier <tier>', `tier: ${TIERS.join(' | ')}`)
    .option('--step <id>', 'chạy bước này và các bước sau nó')
    .option('--force', 'bỏ qua cache')
    .option('--skip-bake', 'bỏ bước lighting.bake')
    .option('--stale', 'chỉ chạy bước có hash đầu vào đổi hoặc chưa build (FR-CLI-09)')
    .option('--dry-run', 'với --stale: chỉ liệt kê bước, zone, ước lượng; không chạy')
    .option('--json', 'in báo cáo report/1 gộp một dòng ra stdout')
    .action(async (opts: Opts) => {
      if (opts.tier !== undefined && !(TIERS as readonly string[]).includes(opts.tier)) {
        printHuman(`ERR-CLI-01 --tier phải là một trong: ${TIERS.join(', ')}.`);
        setExit(EXIT.DATA);
        return;
      }
      const cwd = process.cwd();
      const gameDir = resolve(cwd, opts.game ?? '.');
      const r = await runBuildCommand({
        gameDir,
        stepsDir: opts.steps !== undefined ? resolve(cwd, opts.steps) : defaultStepsDir(cwd),
        ...(opts.zone !== undefined ? { zone: opts.zone } : {}),
        ...(opts.tier !== undefined ? { tier: opts.tier as Tier } : {}),
        ...(opts.step !== undefined ? { step: opts.step } : {}),
        force: opts.force === true,
        skipBake: opts.skipBake === true,
        stale: opts.stale === true || opts.dryRun === true,
        dryRun: opts.dryRun === true,
        clock: systemClock,
        host: hostname(),
        engineVersion: ENGINE_VERSION,
        tool: { name: '@gamestudio/cli', version: '0.0.0' },
        onProgress: (step, zone, pct, msg) => printHuman(`[${step}@${zone ?? '-'}] ${Math.round(pct)}% ${msg}`),
      });
      if (opts.dryRun === true && r.stalePlan) {
        const steps = r.stalePlan.items.map((i) => ({
          step: i.step,
          zone: i.zone,
          reason: i.reason,
          estS: Math.round(i.estS),
        }));
        if (opts.json === true) printJson({ steps, estimateS: Math.round(r.stalePlan.estimateS) });
        else {
          for (const s of steps) printHuman(`- ${s.step}@${s.zone ?? '-'} (${s.reason}, ~${s.estS} s)`);
          printHuman(
            `Cần chạy ${steps.length} nút, ước lượng ${Math.ceil(r.stalePlan.estimateS / 60)} phút. Không chạy gì (--dry-run).`,
          );
        }
        setExit(r.exit);
        return;
      }
      if (opts.json === true) printJson(r.report);
      else {
        if (r.noSteps) printHuman('Chưa có bước build nào (engine/build/steps chưa có).');
        for (const s of r.outcome.steps) {
          const tail = s.error ? `: ${s.error}` : s.status === 'ran' ? ` (${s.durationS.toFixed(1)} s)` : '';
          printHuman(`${ICON[s.status] ?? '?'} ${s.step}@${s.zone ?? '-'} ${s.status}${tail}`);
        }
        for (const w of r.report.warnings.filter((x) => !r.outcome.steps.some((s) => x.startsWith(`${s.step}@`))))
          printHuman(w);
        printHuman(
          `${r.report.summary}. Kết quả ${r.report.result}, mã thoát ${r.exit}.${r.reportPath ? ` Báo cáo: build/${r.reportPath}` : ''}`,
        );
      }
      setExit(r.exit);
    });
}
