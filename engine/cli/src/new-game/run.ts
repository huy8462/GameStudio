// `engine new-game` không phụ thuộc commander (EP-INT-01, EP-INT-02, SEQ-INT-01, MOD-INT-17; ADR-035).
// Mỗi lần chạy PHÁT LẠI phiên: analyze(input) rồi answer(lượt 1..k) đã lưu; HandoffLlmClient đánh số lời gọi theo thứ tự
// nên res-<n> luôn khớp đúng lời gọi, và mỗi lần dừng chỉ có một yêu cầu chờ. Thoát: 0 xong; 3 chờ trả lời/handoff/xác
// nhận; 4 dữ liệu (ERR-INT-01, 05, res sai, game đã có); 6 ERR-INT-04; 10 lỗi khác.
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  analyze,
  answer,
  confirm,
  type Answers,
  type ClarifyQuestion,
  type Deps,
  type IntakeError,
  type IntakeImage,
  type Result,
  type Step,
} from '@gamestudio/intake';
import { FileIntakeStore, HandoffLlmClient } from '@gamestudio/intake/node';

import { EXIT } from '../exit-codes.js';
import type { Clock } from '../orchestrator/types.js';
import {
  appendRound,
  createSession,
  existingGameIds,
  findSessionDir,
  mimeOf,
  pendingRoot,
  readSession,
  sessionIdFor,
  type SessionInput,
} from './session-dir.js';
import { writeGame, writePreview } from './write-game.js';

export interface NewGameOptions {
  gamesDir: string;
  templateDir: string;
  /** Thư mục gốc để in đường dẫn tương đối (không in đường dẫn tuyệt đối, CLAUDE.md luật 3). */
  cwd: string;
  description?: string;
  images?: { name: string; bytes: Uint8Array }[];
  seed?: number;
  language?: 'vi' | 'en';
  resume?: string;
  answers?: Answers;
  useDefaults?: boolean;
  confirm?: boolean;
  clock: Clock;
}

export interface NewGameReport {
  ok: boolean;
  sessionId?: string;
  status?: string;
  questions?: ClarifyQuestion[];
  handoff?: { reqFile: string; resFile: string };
  preview?: string;
  gameId?: string;
  files?: string[];
  warnings: string[];
  error?: { code: string; message: string };
}

const TEMPLATE_FILES = ['game.json', 'world.json', 'budgets.json', 'palette.json'];

function exitOf(e: IntakeError): number {
  if (e.code === 'HANDOFF_PENDING' || e.code === 'ERR-INT-08') return EXIT.NEEDS_CONFIRM;
  if (e.code === 'ERR-INT-04') return EXIT.EXTERNAL;
  if (e.code === 'ERR-INT-01' || e.code === 'ERR-INT-05' || e.code === 'HANDOFF_INVALID') return EXIT.DATA;
  return EXIT.UNCAUGHT;
}

export async function runNewGame(o: NewGameOptions): Promise<{ exit: number; report: NewGameReport }> {
  const warnings: string[] = [];
  const rel = (p: string): string => relative(o.cwd, p).replace(/\\/g, '/');
  const fail = (exit: number, code: string, message: string, extra: Partial<NewGameReport> = {}) => ({
    exit,
    report: { ok: false, warnings, ...extra, error: { code, message } },
  });

  // 1. Thư mục phiên.
  let sid: string;
  let dir: string;
  if (o.resume !== undefined) {
    sid = o.resume;
    const found = findSessionDir(o.gamesDir, sid);
    if (!found) return fail(EXIT.DATA, 'SESSION_NOT_FOUND', `Không có phiên ${sid} trong ${rel(o.gamesDir)}`);
    dir = found;
    if (!dir.startsWith(pendingRoot(o.gamesDir))) {
      // Phiên đã xác nhận và chuyển vào games/<id>/.intake/<sid>: không phát lại, không ghi đè.
      const gameId = relative(o.gamesDir, dir).split(/[\\/]/)[0] ?? '';
      return {
        exit: EXIT.OK,
        report: { ok: true, sessionId: sid, status: 'DaXacNhan', gameId, warnings: ['Phiên đã xác nhận trước đó.'] },
      };
    }
  } else {
    if (o.description === undefined)
      return fail(EXIT.DATA, 'ERR-CLI-01', 'Cần --from <tệp mô tả> hoặc --resume <sessionId>.');
    sid = sessionIdFor(o.description, o.seed);
    dir = findSessionDir(o.gamesDir, sid) ?? join(pendingRoot(o.gamesDir), sid);
    if (findSessionDir(o.gamesDir, sid)) warnings.push(`Đã có phiên ${sid} cho mô tả này: làm tiếp phiên cũ.`);
    else {
      const imgs = (o.images ?? []).map((i): IntakeImage => ({ ...i, mime: mimeOf(i.name) }));
      const input: SessionInput = {
        schema: 'new-game-input/1',
        description: o.description,
        language: o.language ?? 'vi',
        images: imgs.map((i) => ({ name: i.name, mime: i.mime })),
        ...(o.seed !== undefined ? { seed: o.seed } : {}),
      };
      createSession(dir, input, imgs);
    }
  }
  const { input, images, rounds } = readSession(dir);
  const deps: Deps = {
    llm: new HandoffLlmClient(dir),
    store: new FileIntakeStore(() => dir),
    clock: o.clock,
    newId: () => sid,
    template: Object.fromEntries(
      TEMPLATE_FILES.map((f) => [f, JSON.parse(readFileSync(join(o.templateDir, f), 'utf8'))]),
    ),
    existingGameIds: existingGameIds(o.gamesDir),
  };

  // 2. Phát lại.
  let r: Result<Step> = await analyze(
    {
      description: input.description,
      images,
      language: input.language,
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
    },
    deps,
  );
  for (const round of rounds) {
    if (!r.ok || r.value.session.status !== 'ChoTraLoi') break;
    r = await answer(sid, round.answers, deps, { useDefaults: round.useDefaults });
  }
  // 3. Lượt trả lời mới (chỉ khi phát lại đã tới câu hỏi đang chờ).
  const fresh = o.answers !== undefined || o.useDefaults === true;
  if (fresh) {
    if (r.ok && r.value.session.status === 'ChoTraLoi') {
      const round = { answers: o.answers ?? {}, useDefaults: o.useDefaults === true };
      appendRound(dir, rounds, round);
      r = await answer(sid, round.answers, deps, { useDefaults: round.useDefaults });
    } else warnings.push('Bỏ qua câu trả lời mới: phiên không ở bước chờ trả lời.');
  }
  if (!r.ok) {
    const d = r.error.detail as { reqFile?: string; n?: number } | undefined;
    const handoff =
      r.error.code === 'HANDOFF_PENDING' && d?.n !== undefined
        ? { reqFile: rel(join(dir, `req-${d.n}.json`)), resFile: rel(join(dir, `res-${d.n}.json`)) }
        : undefined;
    return fail(exitOf(r.error), r.error.code, r.error.message, { sessionId: sid, ...(handoff ? { handoff } : {}) });
  }
  const s = r.value.session;
  warnings.push(...s.warnings);
  const base = { sessionId: sid, status: s.status, warnings };
  if (s.status === 'ChoTraLoi')
    return { exit: EXIT.NEEDS_CONFIRM, report: { ok: true, ...base, questions: r.value.questions } };
  if (s.status !== 'ChoXacNhan' || !s.bundle)
    return fail(EXIT.UNCAUGHT, 'SESSION_STATE', `Trạng thái phiên lạ: ${s.status}`, base);

  // 4. Chờ xác nhận hoặc xác nhận + ghi game.
  const preview = writePreview(dir, s.bundle.files);
  if (o.confirm !== true)
    return { exit: EXIT.NEEDS_CONFIRM, report: { ok: true, ...base, gameId: s.bundle.gameId, preview: rel(preview) } };
  const c = await confirm(sid, deps);
  if (!c.ok) return fail(exitOf(c.error), c.error.code, c.error.message, base);
  const bundle = c.value.session.bundle;
  if (!bundle) return fail(EXIT.UNCAUGHT, 'SESSION_STATE', 'Thiếu bundle sau xác nhận', base);
  const w = writeGame(o.gamesDir, bundle.gameId, bundle.files, dir, sid);
  if (!w.ok) return fail(EXIT.DATA, 'GAME_EXISTS', w.message, base);
  return {
    exit: EXIT.OK,
    report: { ok: true, ...base, status: 'DaXacNhan', gameId: bundle.gameId, files: Object.keys(bundle.files).sort() },
  };
}
