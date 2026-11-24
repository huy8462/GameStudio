// Brief suy ngược trên CLI (PSC-INT-13 qua handoff ADR-035; IF-CLI-04 `brief confirm`; QT-INT-09, AC-CR01-02).
// Phiên ở games/<id>/.intake/suy-nguoc/: rounds.json, session.json, req-<n>/res-<n>. Mỗi lần chạy PHÁT LẠI như
// new-game: reverseBrief(data) rồi answer(lượt đã lưu). ChoXacNhan → ghi brief/v1/* KHÔNG có hash.txt (build bị chặn,
// ERR-INT-06); --confirm → confirm() rồi ghi hash.txt. Không bao giờ tự xác nhận.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  answer,
  confirm,
  reverseBrief,
  toReverseResult,
  type Answers,
  type Deps,
  type IntakeError,
  type Result,
  type ReverseBriefResult,
} from '@gamestudio/intake';
import { FileIntakeStore, HandoffLlmClient } from '@gamestudio/intake/node';

import { briefStatus } from '../build-cmd/guards.js';
import { EXIT } from '../exit-codes.js';
import { json, writeAtomic, type Round } from '../new-game/session-dir.js';
import { loadGameData } from '../orchestrator/game-data.js';
import type { Clock } from '../orchestrator/types.js';

export const REVERSE_SID = 'suy-nguoc';

export interface ReverseOptions {
  gameDir: string;
  gameId: string;
  cwd: string;
  clock: Clock;
  answers?: Answers;
  useDefaults?: boolean;
  confirm?: boolean;
}

// Kiểu (không phải interface) để gán được vào import/1 `brief` (Record<string, unknown>).
export type ReverseReport = {
  status: string;
  sessionId: string;
  preview?: string;
  questions?: ReverseBriefResult['questions'];
  fieldSources?: ReverseBriefResult['fieldSources'];
  handoff?: { reqFile: string; resFile: string };
  error?: { code: string; message: string };
  warnings: string[];
};

function exitOf(e: IntakeError): number {
  if (e.code === 'HANDOFF_PENDING' || e.code === 'ERR-INT-08') return EXIT.NEEDS_CONFIRM;
  if (e.code === 'ERR-INT-04') return EXIT.EXTERNAL;
  if (['ERR-INT-05', 'ERR-INT-09', 'HANDOFF_INVALID'].includes(e.code)) return EXIT.DATA;
  return EXIT.UNCAUGHT;
}

export async function runReverseBrief(o: ReverseOptions): Promise<{ exit: number; report: ReverseReport }> {
  const warnings: string[] = [];
  const rel = (p: string): string => relative(o.cwd, p).replace(/\\/g, '/');
  const base = { sessionId: REVERSE_SID, warnings };
  if (briefStatus(o.gameDir).status === 'DaXacNhan')
    return { exit: EXIT.OK, report: { ...base, status: 'DaXacNhan', warnings: ['Brief đã xác nhận trước đó.'] } };

  const dir = join(o.gameDir, '.intake', REVERSE_SID);
  const roundsFile = join(dir, 'rounds.json');
  if (!existsSync(roundsFile)) writeAtomic(roundsFile, json([]));
  const rounds = JSON.parse(readFileSync(roundsFile, 'utf8')) as Round[];
  const data = loadGameData(o.gameDir);
  const lang = (data['game.json'] as { language?: unknown } | undefined)?.language;
  const deps: Deps = {
    llm: new HandoffLlmClient(dir),
    store: new FileIntakeStore(() => dir),
    clock: o.clock,
    newId: () => REVERSE_SID,
    template: {},
  };

  // Phát lại: reverseBrief rồi các lượt trả lời đã lưu, rồi lượt mới (nếu đang chờ trả lời).
  let r: Result<ReverseBriefResult> = await reverseBrief(
    data,
    { gameId: o.gameId, ...(lang === 'en' || lang === 'vi' ? { language: lang } : {}) },
    deps,
  );
  const step = async (round: Round): Promise<void> => {
    const a = await answer(REVERSE_SID, round.answers, deps, { useDefaults: round.useDefaults });
    r = a.ok ? { ok: true, value: toReverseResult(a.value) } : a;
  };
  for (const round of rounds) {
    if (!r.ok || r.value.session.status !== 'ChoTraLoi') break;
    await step(round);
  }
  if (o.answers !== undefined || o.useDefaults === true) {
    if (r.ok && r.value.session.status === 'ChoTraLoi') {
      const round = { answers: o.answers ?? {}, useDefaults: o.useDefaults === true };
      writeAtomic(roundsFile, json([...rounds, round]));
      await step(round);
    } else warnings.push('Bỏ qua câu trả lời mới: phiên không ở bước chờ trả lời.');
  }
  if (!r.ok) {
    const d = r.error.detail as { n?: number } | undefined;
    const handoff =
      r.error.code === 'HANDOFF_PENDING' && d?.n !== undefined
        ? { reqFile: rel(join(dir, `req-${d.n}.json`)), resFile: rel(join(dir, `res-${d.n}.json`)) }
        : undefined;
    return {
      exit: exitOf(r.error),
      report: {
        ...base,
        status: r.error.code === 'HANDOFF_PENDING' ? 'ChoHandoff' : 'Loi',
        ...(handoff ? { handoff } : {}),
        error: { code: r.error.code, message: r.error.message },
      },
    };
  }
  const v = r.value;
  warnings.push(...v.session.warnings);
  const info = { ...base, fieldSources: v.fieldSources };
  if (v.session.status === 'ChoTraLoi')
    return { exit: EXIT.NEEDS_CONFIRM, report: { ...info, status: 'ChoTraLoi', questions: v.questions } };
  const bundle = v.session.bundle;
  if (v.session.status !== 'ChoXacNhan' || !bundle)
    return {
      exit: EXIT.UNCAUGHT,
      report: { ...info, status: v.session.status, error: { code: 'SESSION_STATE', message: 'Trạng thái phiên lạ' } },
    };

  // Brief nháp vào games/<id>/brief/v1/ (không hash.txt → ChoXacNhan, build thoát 3).
  for (const [k, val] of Object.entries(bundle.files))
    writeAtomic(join(o.gameDir, ...k.split('/')), typeof val === 'string' ? val : json(val));
  const preview = rel(join(o.gameDir, 'brief/v1/game-brief.md'));
  if (o.confirm !== true) return { exit: EXIT.NEEDS_CONFIRM, report: { ...info, status: 'ChoXacNhan', preview } };
  const c = await confirm(REVERSE_SID, deps);
  if (!c.ok) return { exit: exitOf(c.error), report: { ...info, status: 'ChoXacNhan', preview, error: c.error } };
  writeAtomic(join(o.gameDir, 'brief/v1/hash.txt'), `${c.value.hash}\n`);
  return { exit: EXIT.OK, report: { ...info, status: 'DaXacNhan', preview } };
}
