// Hàm công khai của phiên tiếp nhận (DDD-01 §3.2: analyze, answer, generate, confirm; PSC-INT-01, 02, 09; STM-INT-01).
import { canonicalize, sha256Hex } from '@gamestudio/schema';

import { applyPostRules } from './analyze/post-rules.js';
import { enforceEvidence } from './analyze/evidence.js';
import { validateInput } from './analyze/validate-input.js';
import { applyAnswers, fillDefaults, hasConflict } from './clarify/answer.js';
import { selectQuestions } from './clarify/select.js';
import { FIELD_ORDER, isRequired, MAX_ROUNDS } from './config.js';
import { generateBundle } from './generate/generate.js';
import { callModel } from './llm/call.js';
import type { ContentPart } from './llm/types.js';
import { SCHEMAS } from './schemas/index.js';
import type {
  Answers,
  ClarifyQuestion,
  Deps,
  GeneratedBundle,
  IntakeAnalysis,
  IntakeInput,
  IntakeSessionState,
  Result,
} from './types.js';
import { err } from './types.js';

export interface Step {
  session: IntakeSessionState;
  questions: ClarifyQuestion[];
}

const iso = (deps: Deps): string => new Date(deps.clock.now()).toISOString();

async function persist(s: IntakeSessionState, deps: Deps): Promise<IntakeSessionState> {
  const next = { ...s, version: s.version + 1, updatedAt: iso(deps) };
  await deps.store.save(next);
  return next;
}

/** Mô hình chỉ được nói 'gia_dinh' cho trường bắt buộc sau vòng hỏi; ở vòng 0 coi là 'thieu' để hỏi (QT-INT-06, AC-01-02). */
function demoteModelAssumptions(a: IntakeAnalysis): IntakeAnalysis {
  const fields = { ...a.fields };
  for (const k of FIELD_ORDER) {
    const f = fields[k];
    if (f?.status === 'gia_dinh' && isRequired(k) && !k.startsWith('features.'))
      fields[k] = { ...f, status: 'thieu', value: null };
  }
  return { ...a, fields };
}

/** Sau mỗi lượt: hỏi tiếp, hoặc điền mặc định rồi sinh (STM-INT-01). */
async function advance(s: IntakeSessionState, deps: Deps): Promise<Result<Step>> {
  const round = s.analysis.round + 1;
  const qs =
    round <= MAX_ROUNDS
      ? await selectQuestions(s.analysis, round, s.input.description, s.id, deps)
      : { ok: true as const, value: [] };
  if (!qs.ok) return qs;
  if (qs.value.length > 0) {
    const analysis = { ...s.analysis, round: round as IntakeAnalysis['round'] };
    const saved = await persist({ ...s, analysis, status: 'ChoTraLoi', questions: qs.value }, deps);
    return { ok: true, value: { session: saved, questions: qs.value } };
  }
  const filled = fillDefaults(s.analysis);
  if (hasConflict(filled.analysis)) {
    // Mâu thuẫn không có mặc định: hỏi lại câu bắt buộc (không giới hạn vòng).
    const again = await selectQuestions(filled.analysis, MAX_ROUNDS, s.input.description, s.id, deps);
    if (!again.ok) return again;
    const saved = await persist({ ...s, analysis: filled.analysis, status: 'ChoTraLoi', questions: again.value }, deps);
    return { ok: true, value: { session: saved, questions: again.value } };
  }
  const ready: IntakeSessionState = {
    ...s,
    status: 'DangSinh',
    analysis: filled.analysis,
    questions: [],
    assumptions: [
      ...s.assumptions,
      ...filled.assumptions.filter((x) => !s.assumptions.some((y) => y.field === x.field)),
    ],
  };
  const bundle = await generateBundle(ready, deps);
  if (!bundle.ok) {
    if (bundle.error.code !== 'HANDOFF_PENDING') await persist({ ...ready, status: 'Loi' }, deps);
    return bundle;
  }
  const saved = await persist({ ...ready, status: 'ChoXacNhan', bundle: bundle.value }, deps);
  return { ok: true, value: { session: saved, questions: [] } };
}

/** analyze (API-INT-01, PSC-INT-01). Lỗi HANDOFF_PENDING: chạy lại sau khi có res-<n>.json. */
export async function analyze(input: IntakeInput, deps: Deps): Promise<Result<Step>> {
  const chk = validateInput(input);
  if (!chk.ok) return chk;
  const now = iso(deps);
  const id = deps.newId();
  const parts: ContentPart[] = [
    { type: 'text', text: chk.value.description },
    ...chk.value.images.map((i): ContentPart => ({ type: 'image', name: i.name, mime: i.mime, bytes: i.bytes })),
  ];
  const r = await callModel<{ fields: IntakeAnalysis['fields'] }>(
    deps,
    'analyze',
    [{ role: 'user', content: parts }],
    SCHEMAS.analysis,
    id,
  );
  if (!r.ok) return r;
  let a: IntakeAnalysis = demoteModelAssumptions({ fields: r.value.fields, round: 0 });
  a = applyPostRules(a, chk.value.description);
  const ev = enforceEvidence(a, chk.value.description);
  const s: IntakeSessionState = {
    id,
    status: 'ChoTraLoi',
    input: {
      description: chk.value.description,
      imageNames: chk.value.images.map((i) => i.name),
      language: input.language ?? 'vi',
      ...(input.seed !== undefined ? { seed: input.seed } : {}),
    },
    analysis: ev.analysis,
    questions: [],
    answers: {},
    assumptions: [],
    suggestions: ev.suggestions,
    warnings: chk.value.warnings,
    version: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
  return advance(await persist(s, deps), deps);
}

/** answer (API-INT-02, PSC-INT-02). `useDefaults` = `--use-defaults`. */
export async function answer(
  sessionId: string,
  answers: Answers,
  deps: Deps,
  opts: { useDefaults?: boolean } = {},
): Promise<Result<Step>> {
  const s = await deps.store.load(sessionId);
  if (!s) return err('SESSION_NOT_FOUND', `Không có phiên ${sessionId}`);
  if (s.status !== 'ChoTraLoi') return err('SESSION_STATE', `Phiên đang ${s.status}, không nhận trả lời`);
  const useDefaults = opts.useDefaults ?? false;
  const ap = applyAnswers(s.analysis, s.questions, answers, useDefaults);
  const allAnswers = { ...s.answers, ...ap.answered };
  const ev = enforceEvidence(ap.analysis, s.input.description, allAnswers);
  const next: IntakeSessionState = {
    ...s,
    analysis: ev.analysis,
    answers: allAnswers,
    suggestions: [...s.suggestions, ...ev.suggestions],
    ...(Object.keys(ap.answered).length > 0 ? { lastActivityAt: iso(deps) } : {}),
  };
  if (Object.keys(ap.answered).length > 0) delete next.remindedAt;
  // AC-CR01-01, FR-INT-31: vòng còn câu chưa trả lời → giữ đúng các câu đó, KHÔNG gọi mô hình. Với --use-defaults,
  // câu không bắt buộc chưa trả lời coi như nhận mặc định/giả định (fillDefaults), chỉ câu bắt buộc mới còn chờ.
  const remaining = s.questions.filter((q) => !(q.id in ap.answered) && !(useDefaults && !q.mandatory));
  if (remaining.length > 0) {
    const saved = await persist({ ...next, status: 'ChoTraLoi', questions: remaining }, deps);
    return { ok: true, value: { session: saved, questions: remaining } };
  }
  // analysis.round = vòng vừa trả lời; advance hỏi vòng kế (≤ MAX_ROUNDS).
  return advance(next, deps);
}

/**
 * reopenSession (MOD-INT-22, PSC-INT-12; AC-CR01-01): trả phiên + câu đang chờ, KHÔNG gọi mô hình, không đổi
 * lastActivityAt (mở lại để xem không tính là lượt mới, STM-INT-04).
 */
export async function reopenSession(
  sessionId: string,
  deps: Pick<Deps, 'store'>,
): Promise<Result<{ session: IntakeSessionState; pendingQuestions: ClarifyQuestion[] }>> {
  const s = await deps.store.load(sessionId);
  if (!s) return err('SESSION_NOT_FOUND', `Không có phiên ${sessionId}`);
  if (s.status === 'Huy' || s.status === 'DaXacNhan') return err('SESSION_CLOSED', `Phiên ${sessionId} đã ${s.status}`);
  return { ok: true, value: { session: s, pendingQuestions: s.status === 'ChoTraLoi' ? s.questions : [] } };
}

const DAY_MS = 86_400_000;
export const REMIND_AFTER_DAYS = 27;
export const EXPIRE_AFTER_DAYS = 30;

/**
 * expireSessions (PSC-INT-12, QT-INT-10, STM-INT-04): phiên mở (ChoTraLoi/ChoXacNhan/Loi) không có lượt mới
 * > 30 ngày → Huy; ≥ 27 ngày và chưa nhắc → ghi remindedAt (nơi gọi gửi thông báo). Nơi gọi cấp danh sách phiên.
 */
export async function expireSessions(
  nowMs: number,
  sessions: readonly IntakeSessionState[],
  deps: Pick<Deps, 'store'>,
): Promise<{ expired: string[]; reminded: string[] }> {
  const expired: string[] = [];
  const reminded: string[] = [];
  for (const s of sessions) {
    if (!['ChoTraLoi', 'ChoXacNhan', 'Loi'].includes(s.status)) continue;
    const idle = nowMs - Date.parse(s.lastActivityAt ?? s.createdAt);
    const at = new Date(nowMs).toISOString();
    if (idle > EXPIRE_AFTER_DAYS * DAY_MS) {
      await deps.store.save({ ...s, status: 'Huy', updatedAt: at, version: s.version + 1 });
      expired.push(s.id);
    } else if (idle >= REMIND_AFTER_DAYS * DAY_MS && !s.remindedAt) {
      await deps.store.save({ ...s, remindedAt: at, updatedAt: at, version: s.version + 1 });
      reminded.push(s.id);
    }
  }
  return { expired, reminded };
}

/** Chạy lại bước sinh của phiên DangSinh/Loi (sau khi handoff có res-<n>.json). */
export async function generate(sessionId: string, deps: Deps): Promise<Result<GeneratedBundle>> {
  const s = await deps.store.load(sessionId);
  if (!s) return err('SESSION_NOT_FOUND', `Không có phiên ${sessionId}`);
  const r = await advance({ ...s, analysis: { ...s.analysis, round: MAX_ROUNDS } }, deps);
  if (!r.ok) return r;
  return r.value.session.bundle
    ? { ok: true, value: r.value.session.bundle }
    : err('SESSION_STATE', 'Còn câu hỏi bắt buộc');
}

/** PSC-INT-09: hash = 'sha256:' + sha256Hex(canonicalize({brief, initData: data/** đã sắp})). */
export function briefHash(bundle: GeneratedBundle): string {
  const initData = Object.fromEntries(
    Object.keys(bundle.files)
      .filter((k) => k.startsWith('data/'))
      .sort()
      .map((k) => [k, bundle.files[k]]),
  );
  return `sha256:${sha256Hex(canonicalize({ brief: bundle.files['brief/v1/brief.json'], initData }))}`;
}

/** confirm (STM-INT-01, ERR-INT-08): ChoXacNhan → DaXacNhan; thêm brief/v1/hash.txt vào bundle. */
export async function confirm(
  sessionId: string,
  deps: Deps,
): Promise<Result<{ session: IntakeSessionState; briefVersion: number; hash: string }>> {
  const s = await deps.store.load(sessionId);
  if (!s) return err('SESSION_NOT_FOUND', `Không có phiên ${sessionId}`);
  if (hasConflict(s.analysis) || s.questions.some((q) => q.mandatory))
    return err('ERR-INT-08', 'Còn câu hỏi cần trả lời trước khi xác nhận.');
  if (s.status !== 'ChoXacNhan' || !s.bundle) return err('SESSION_STATE', `Phiên đang ${s.status}, chưa thể xác nhận`);
  const hash = briefHash(s.bundle);
  const bundle = { ...s.bundle, files: { ...s.bundle.files, 'brief/v1/hash.txt': `${hash}\n` } };
  const saved = await persist({ ...s, status: 'DaXacNhan', bundle, confirmed: { briefVersion: 1, hash } }, deps);
  return { ok: true, value: { session: saved, briefVersion: 1, hash } };
}
