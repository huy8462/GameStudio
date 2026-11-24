// Lệnh `engine brief draft|confirm --game <id>` (IF-CLI-04, EP-CLI-03; PSC-INT-13, QT-INT-09): làm tiếp brief suy ngược
// của game nhập (handoff, trả lời câu hỏi) và xác nhận. `draft` thêm ngoài TSD-04 để trả lời câu hỏi trước khi xác nhận.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import type { Answers } from '@gamestudio/intake';
import type { Command } from 'commander';

import { runReverseBrief, type ReverseReport } from '../brief/run-reverse.js';
import { systemClock } from '../clock.js';
import { EXIT } from '../exit-codes.js';
import { printHuman, printJson } from '../output.js';
import { findVersionsFile } from './doctor.js';

interface Opts {
  game: string;
  games?: string;
  answers?: string;
  useDefaults?: boolean;
  json?: boolean;
}

export function printBriefHuman(b: Omit<ReverseReport, 'warnings'>, gameId: string): void {
  if (b.error) printHuman(`Brief: ${b.error.code}: ${b.error.message}`);
  if (b.handoff) {
    printHuman(`Chờ Claude Code: đọc ${b.handoff.reqFile}, viết ${b.handoff.resFile} (skill engine-intake),`);
    printHuman(`rồi chạy: engine brief draft --game ${gameId}`);
  }
  if (b.questions?.length) {
    printHuman(`Cần trả lời (--answers <tệp JSON> hoặc --use-defaults) rồi chạy: engine brief draft --game ${gameId}`);
    for (const q of b.questions) {
      printHuman(`- [${q.id}]${q.mandatory ? ' (bắt buộc)' : ''} ${q.text}`);
      for (const c of q.choices) printHuman(`    ${c.id === q.defaultChoiceId ? '*' : ' '} ${c.id}: ${c.label}`);
    }
  }
  if (b.status === 'ChoXacNhan' && !b.error)
    printHuman(`Brief nháp: ${b.preview ?? ''}. Đọc rồi xác nhận: engine brief confirm --game ${gameId}`);
  if (b.status === 'DaXacNhan') printHuman(`Brief đã xác nhận. Build: engine build --game games/${gameId}`);
}

export function registerBrief(program: Command, setExit: (code: number) => void): void {
  const brief = program.command('brief').description('Brief suy ngược của game nhập (PSC-INT-13).');
  for (const [name, isConfirm] of [
    ['draft', false],
    ['confirm', true],
  ] as const) {
    brief
      .command(name)
      .description(isConfirm ? 'Xác nhận brief nháp (ghi hash.txt; build mới chạy được).' : 'Làm tiếp brief nháp.')
      .requiredOption('--game <id>', 'id game trong games/')
      .option('--games <dir>', 'thư mục games (mặc định <repo>/games)')
      .option('--answers <file>', 'tệp JSON câu trả lời {"<id câu>": "<id lựa chọn>" | {"text": "..."}}')
      .option('--use-defaults', 'chấp nhận mặc định cho câu không bắt buộc')
      .option('--json', 'in một dòng JSON ra stdout')
      .action(async (opts: Opts) => {
        const cwd = process.cwd();
        const v = findVersionsFile(cwd);
        const root = v === undefined ? cwd : dirname(dirname(v));
        if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.game)) {
          printHuman('ERR-CLI-01 --game phải là id game (a-z0-9-).');
          setExit(EXIT.DATA);
          return;
        }
        const answers =
          opts.answers !== undefined
            ? (JSON.parse(readFileSync(resolve(cwd, opts.answers), 'utf8')) as Answers)
            : undefined;
        const r = await runReverseBrief({
          gameDir: join(resolve(cwd, opts.games ?? join(root, 'games')), opts.game),
          gameId: opts.game,
          cwd,
          clock: systemClock,
          ...(answers ? { answers } : {}),
          ...(opts.useDefaults === true ? { useDefaults: true } : {}),
          confirm: isConfirm,
        });
        if (opts.json === true) printJson(r.report);
        for (const w of r.report.warnings) printHuman(`Cảnh báo: ${w}`);
        printBriefHuman(r.report, opts.game);
        setExit(r.exit);
      });
  }
}
