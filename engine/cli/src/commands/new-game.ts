// Lệnh `engine new-game` (EP-INT-01, MOD-INT-17; FR-INT-01, 29). Bỏ `--llm gateway` của DDD-01 vì ADR-035: mô hình là
// phiên Claude Code của người dùng qua tệp handoff (skill .claude/skills/engine-intake).
import { readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import type { Command } from 'commander';

import { systemClock } from '../clock.js';
import { EXIT } from '../exit-codes.js';
import { runNewGame, type NewGameReport } from '../new-game/run.js';
import { printHuman, printJson } from '../output.js';
import { findVersionsFile } from './doctor.js';

interface Opts {
  from?: string;
  image?: string[];
  seed?: string;
  resume?: string;
  answers?: string;
  useDefaults?: boolean;
  confirm?: boolean;
  games?: string;
  json?: boolean;
}

function printReport(r: NewGameReport): void {
  for (const w of r.warnings) printHuman(`Cảnh báo: ${w}`);
  if (r.error) {
    printHuman(`${r.error.code}: ${r.error.message}`);
    if (r.handoff) {
      printHuman(`Chờ Claude Code: đọc ${r.handoff.reqFile}, viết ${r.handoff.resFile} (skill engine-intake),`);
      printHuman(`rồi chạy lại: engine new-game --resume ${r.sessionId ?? ''}`);
    }
    return;
  }
  if (r.questions?.length) {
    printHuman(
      `Phiên ${r.sessionId ?? ''}: cần trả lời (tệp JSON {"<id câu>": "<id lựa chọn>"} qua --answers, hoặc --use-defaults):`,
    );
    for (const q of r.questions) {
      printHuman(`- [${q.id}]${q.mandatory ? ' (bắt buộc)' : ''} ${q.text}`);
      for (const c of q.choices) printHuman(`    ${c.id === q.defaultChoiceId ? '*' : ' '} ${c.id}: ${c.label}`);
    }
    return;
  }
  if (r.status === 'ChoXacNhan') {
    printHuman(`Brief nháp cho game '${r.gameId ?? ''}': ${r.preview ?? ''}`);
    printHuman(`Đọc rồi xác nhận: engine new-game --resume ${r.sessionId ?? ''} --confirm`);
    return;
  }
  printHuman(
    `Đã tạo game '${r.gameId ?? ''}' (${r.files?.length ?? 0} tệp). Build: engine build --game games/${r.gameId ?? ''}`,
  );
}

export function registerNewGame(program: Command, setExit: (code: number) => void): void {
  program
    .command('new-game')
    .description(
      'Tạo game mới từ mô tả (brief + dữ liệu khởi tạo); mô hình là phiên Claude Code qua tệp handoff (ADR-035).',
    )
    .option('--from <file>', 'tệp mô tả (.md/.txt, UTF-8)')
    .option('--image <file>', 'ảnh tham chiếu (lặp ≤ 5)', (v: string, acc: string[] = []) => [...acc, v])
    .option('--seed <uint32>', 'seed cố định')
    .option('--resume <sessionId>', 'làm tiếp phiên')
    .option('--answers <file>', 'tệp JSON câu trả lời {"<id câu>": "<id lựa chọn>" | {"text": "..."}}')
    .option('--use-defaults', 'chấp nhận mặc định cho câu không bắt buộc')
    .option('--confirm', 'xác nhận brief và ghi games/<id>/')
    .option('--games <dir>', 'thư mục games (mặc định <repo>/games)')
    .option('--json', 'in một dòng JSON ra stdout')
    .action(async (opts: Opts) => {
      const cwd = process.cwd();
      const v = findVersionsFile(cwd);
      const root = v === undefined ? cwd : dirname(dirname(v));
      const gamesDir = resolve(cwd, opts.games ?? join(root, 'games'));
      const seed = opts.seed !== undefined ? Number(opts.seed) : undefined;
      if (seed !== undefined && (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)) {
        printHuman('ERR-CLI-01 --seed phải là số nguyên 0…4294967295.');
        setExit(EXIT.DATA);
        return;
      }
      const r = await runNewGame({
        gamesDir,
        templateDir: join(root, 'games', '_template', 'data'),
        cwd,
        ...(opts.from !== undefined ? { description: readFileSync(resolve(cwd, opts.from), 'utf8') } : {}),
        images: (opts.image ?? []).map((f) => ({
          name: basename(f),
          bytes: new Uint8Array(readFileSync(resolve(cwd, f))),
        })),
        ...(seed !== undefined ? { seed } : {}),
        ...(opts.resume !== undefined ? { resume: opts.resume } : {}),
        ...(opts.answers !== undefined
          ? { answers: JSON.parse(readFileSync(resolve(cwd, opts.answers), 'utf8')) as Record<string, string> }
          : {}),
        useDefaults: opts.useDefaults === true,
        confirm: opts.confirm === true,
        clock: systemClock,
      });
      if (opts.json === true) printJson(r.report);
      else printReport(r.report);
      setExit(r.exit);
    });
}
