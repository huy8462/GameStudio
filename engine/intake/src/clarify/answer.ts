// Gộp câu trả lời vào phân tích và quyết định vòng tiếp (PSC-INT-02 answer, STM-INT-01; QT-INT-01, 04).
import { FIELD_ORDER, isRequired } from '../config.js';
import type { Answers, Assumption, ClarifyQuestion, FieldKey, IntakeAnalysis } from '../types.js';
import { defaultFor } from './select.js';

/** Áp câu trả lời (choiceId hoặc {text}); `useDefaults` chọn lựa chọn mặc định cho câu không bắt buộc chưa trả lời. */
export function applyAnswers(
  a: IntakeAnalysis,
  questions: readonly ClarifyQuestion[],
  answers: Answers,
  useDefaults: boolean,
): { analysis: IntakeAnalysis; answered: Answers } {
  const out: IntakeAnalysis = { ...a, fields: { ...a.fields } };
  const answered: Answers = {};
  for (const q of questions) {
    let ans = answers[q.id];
    if (ans === undefined && useDefaults && !q.mandatory && q.defaultChoiceId) ans = q.defaultChoiceId;
    if (ans === undefined) continue;
    const value = typeof ans === 'string' ? q.choices.find((c) => c.id === ans)?.value : ans.text;
    if (value === undefined) continue; // choiceId lạ: bỏ qua, câu còn mở
    out.fields[q.field] = { value, status: 'tu_mo_ta', evidence: [`traloi:${q.id}`] };
    answered[q.id] = ans;
  }
  return { analysis: out, answered };
}

/**
 * Hết vòng (round = 2) hoặc không còn câu: trường bắt buộc còn thiếu (không phải mâu thuẫn) nhận mặc định 'gia_dinh'.
 * Trường không có mặc định (vd genre, artStyle) để value null, ghi giả định "mô hình đề xuất khi viết brief".
 */
export function fillDefaults(a: IntakeAnalysis): { analysis: IntakeAnalysis; assumptions: Assumption[] } {
  const out: IntakeAnalysis = { ...a, fields: { ...a.fields } };
  const assumptions: Assumption[] = [];
  for (const [k, f] of Object.entries(out.fields) as [FieldKey, NonNullable<IntakeAnalysis['fields'][FieldKey]>][]) {
    if (f.ask) out.fields[k] = { ...f, ask: false };
  }
  for (const k of FIELD_ORDER) {
    const f = out.fields[k];
    if (!isRequired(k) || (f && f.status !== 'thieu')) continue;
    const value = defaultFor(k) ?? null;
    out.fields[k] = { value, status: 'gia_dinh', evidence: [] };
    assumptions.push({
      field: k,
      value,
      reason:
        value === null
          ? 'không có trong mô tả; mô hình đề xuất khi viết brief'
          : 'mặc định sau vòng hỏi (QT-INT-04, 06)',
    });
  }
  return { analysis: out, assumptions };
}

export const hasConflict = (a: IntakeAnalysis): boolean =>
  Object.values(a.fields).some((f) => f?.status === 'mau_thuan');
