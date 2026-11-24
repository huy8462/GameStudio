// Lệnh `engine import <thư mục|gói.zip> [--into <id>] [--games <dir>] [--json]` (FR-CLI-11, IF-CLI-04, EP-CLI-03,
// ALG-CLI-07): in import/1 (SCH-RTM-10). Thoát 0 / 3 (brief nháp chờ) / 4 (chan) theo import/run.ts.
import { dirname, join, resolve } from 'node:path';

import type { Command } from 'commander';

import { printBriefHuman } from './brief.js';
import { systemClock } from '../clock.js';
import { ENGINE_VERSION } from '../engine-version.js';
import { runImport } from '../import/run.js';
import { printHuman, printJson } from '../output.js';
import { findVersionsFile } from './doctor.js';

interface Opts {
  into?: string;
  games?: string;
  json?: boolean;
}

export function registerImport(program: Command, setExit: (code: number) => void): void {
  program
    .command('import <src>')
    .description('Nhập game có sẵn (thư mục hoặc .zip): kiểm, chép vào games/<id>/, thiếu brief thì suy brief nháp.')
    .option('--into <id>', 'cập nhật game đã có cùng gameId (giữ data.bak-<ts>/)')
    .option('--games <dir>', 'thư mục games (mặc định <repo>/games)')
    .option('--json', 'in một dòng import/1 ra stdout')
    .action(async (src: string, opts: Opts) => {
      const cwd = process.cwd();
      const v = findVersionsFile(cwd);
      const root = v === undefined ? cwd : dirname(dirname(v));
      const r = await runImport({
        src: resolve(cwd, src),
        ...(opts.into !== undefined ? { into: opts.into } : {}),
        gamesDir: resolve(cwd, opts.games ?? join(root, 'games')),
        cwd,
        engineVersion: ENGINE_VERSION,
        clock: systemClock,
      });
      if (opts.json === true) printJson(r.report);
      for (const w of r.warnings) printHuman(`Cảnh báo: ${w}`);
      const rep = r.report;
      printHuman(
        `Kết quả: ${rep.result} — game '${rep.gameId ?? '?'}', ${rep.counts.zones} zone, ${rep.counts.npcs} NPC, ` +
          `${rep.counts.animals} loài, ${rep.counts.assets} asset.`,
      );
      for (const p of rep.problems) printHuman(`- ${p.code} ${p.path}: ${p.message}`);
      if (rep.result === 'chan') printHuman('Không ghi gì vào games/.');
      else if (rep.brief && rep.gameId) printBriefHuman(rep.brief, rep.gameId);
      setExit(r.exit);
    });
}
