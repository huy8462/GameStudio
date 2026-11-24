// reverseBrief (API-INT-06, IF-INT-06, MOD-INT-23, PSC-INT-13, ALG-INT-11; FR-INT-32, QT-INT-09, AC-CR01-02):
// suy brief nháp từ dữ liệu game có sẵn. Thiếu game.json/world.json → ERR-INT-09 TRƯỚC mọi lời gọi mô hình.
// Trường cấu trúc suy tất định (deriveFields); trường văn bản do mô hình reverse_brief đề xuất kèm nguồn (qua LlmClient,
// trên CLI là handoff, ADR-035); nguồn không có trong bản tóm tắt → 'thieu' → hỏi lại (PSC-INT-02). Brief luôn ChoXacNhan.
import { FIELD_ORDER } from '../config.js';
import { callModel } from '../llm/call.js';
import { SCHEMAS } from '../schemas/index.js';
import { advance, persist, type Step } from '../session.js';
import type {
  BriefJson,
  ClarifyQuestion,
  Deps,
  FieldKey,
  FieldSource,
  FieldState,
  GameDataFiles,
  IntakeSessionState,
  Result,
  SourcePaths,
} from '../types.js';
import { err } from '../types.js';
import { deriveFields } from './derive.js';
import { compact, coveredBy, summarizeData, valueAt } from './summary.js';

/** DTO-INT-16. `brief` chỉ có khi đã đủ trường (không còn câu hỏi); còn câu hỏi thì trả lời qua answer(sessionId). */
export interface ReverseBriefResult {
  brief?: BriefJson;
  briefStatus: 'ChoXacNhan';
  fieldSources: Partial<Record<FieldKey, FieldSource>>;
  sourcePaths: SourcePaths;
  questions: ClarifyQuestion[];
  sessionId: string;
  session: IntakeSessionState;
}

export const REQUIRED_DATA = ['game.json', 'world.json'] as const;

interface ProseOut {
  fields: Partial<Record<FieldKey, { value: unknown; sources: string[] }>>;
}

/** Chuyển Step của phiên suy_nguoc thành ReverseBriefResult. */
export function toReverseResult(step: Step): ReverseBriefResult {
  const s = step.session;
  const brief = s.bundle?.files['brief/v1/brief.json'] as BriefJson | undefined;
  return {
    ...(brief ? { brief } : {}),
    briefStatus: 'ChoXacNhan',
    fieldSources: s.reverse?.fieldSources ?? {},
    sourcePaths: s.reverse?.sourcePaths ?? {},
    questions: step.questions,
    sessionId: s.id,
    session: s,
  };
}

/** `data`: tệp trong games/<id>/data/ (khoá tương đối data/, vd 'game.json', 'entities/npc/a.json'), đã đọc JSON. */
export async function reverseBrief(
  data: GameDataFiles,
  ctx: { gameId: string; language?: 'vi' | 'en' },
  deps: Deps,
): Promise<Result<ReverseBriefResult>> {
  for (const f of REQUIRED_DATA)
    if (data[f] === undefined)
      return err('ERR-INT-09', `Không đủ dữ liệu để tạo brief: thiếu ${f}. Hãy tạo game mới (engine new-game).`, {
        file: f,
      });

  const derived = deriveFields(data);
  const head: [string, unknown][] = [];
  for (const d of Object.values(derived))
    for (const p of d?.sources ?? []) if (!head.some(([x]) => x === p)) head.push([p, compact(valueAt(data, p))]);
  const summary = summarizeData(data, head);

  const id = deps.newId();
  const r = await callModel<ProseOut>(
    deps,
    'reverse_brief',
    [{ role: 'user', content: `Tóm tắt dữ liệu game (con trỏ = giá trị):\n${summary.text}` }],
    SCHEMAS.reverseBrief,
    id,
  );
  if (!r.ok) return r;

  const fields: Partial<Record<FieldKey, FieldState>> = {};
  const fieldSources: Partial<Record<FieldKey, FieldSource>> = {};
  const sourcePaths: SourcePaths = {};
  // Bằng chứng = con trỏ nguồn; con trỏ nằm trong bản tóm tắt (= "mô tả" của phiên) nên luật bằng chứng giữ được.
  const take = (k: FieldKey, value: unknown, sources: string[]): void => {
    fields[k] = { value, status: 'tu_mo_ta', evidence: sources };
    fieldSources[k] = 'suy_tu_du_lieu';
    sourcePaths[k] = sources;
  };
  for (const [k, d] of Object.entries(derived) as [FieldKey, { value: unknown; sources: string[] }][])
    take(k, d.value, d.sources);
  for (const [k, p] of Object.entries(r.value.fields) as [FieldKey, { value: unknown; sources: string[] }][]) {
    if (fields[k] !== undefined) continue; // trường tất định thắng đề xuất của mô hình
    const ok = p.sources.length > 0 && p.sources.every((x) => coveredBy(summary.paths, x));
    if (ok) take(k, p.value, p.sources);
  }
  for (const k of FIELD_ORDER) {
    if (fields[k] !== undefined) continue;
    fields[k] = { value: null, status: 'thieu', evidence: [] };
    fieldSources[k] = 'thieu';
  }

  const now = new Date(deps.clock.now()).toISOString();
  const s: IntakeSessionState = {
    id,
    kind: 'suy_nguoc',
    reverse: { gameId: ctx.gameId, fieldSources, sourcePaths },
    status: 'ChoTraLoi',
    input: { description: summary.text, imageNames: [], language: ctx.language ?? 'vi' },
    analysis: { fields, round: 0 },
    questions: [],
    answers: {},
    assumptions: [],
    suggestions: [],
    warnings: summary.truncated ? ['Dữ liệu dài: bản tóm tắt gửi mô hình đã cắt ở 6 KB (CFG-INT-07).'] : [],
    version: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  };
  // advance: hỏi trường bắt buộc còn 'thieu' (PSC-INT-02), hoặc dựng brief nháp ChoXacNhan (reverseBundle).
  const step = await advance(await persist(s, deps), deps);
  return step.ok ? { ok: true, value: toReverseResult(step.value) } : step;
}
