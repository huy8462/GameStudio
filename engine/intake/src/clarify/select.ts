// Chọn câu hỏi làm rõ (PSC-INT-02, ALG-INT-02; QT-INT-01, 06, 07; CFG-INT-06): mâu thuẫn trước, rồi trường bắt buộc
// còn thiếu, theo FIELD_ORDER, ≤ 5 câu/vòng, ≤ 2 vòng. Mô hình chỉ viết văn bản câu hỏi + lựa chọn; id, mandatory,
// defaultChoiceId do mã quyết định.
import { canonicalize } from '@gamestudio/schema';

import { DEFAULTS, FIELD_ORDER, isRequired, MAX_QUESTIONS, MAX_ROUNDS } from '../config.js';
import { callModel } from '../llm/call.js';
import { SCHEMAS } from '../schemas/index.js';
import type { ClarifyQuestion, Deps, FieldKey, IntakeAnalysis, Result } from '../types.js';

export const defaultFor = (k: FieldKey): unknown => DEFAULTS[k];

/** Trường cần hỏi theo thứ tự ưu tiên (không gọi mô hình). */
export function pendingFields(a: IntakeAnalysis): FieldKey[] {
  const conflicts = FIELD_ORDER.filter((k) => a.fields[k]?.status === 'mau_thuan');
  const missing = FIELD_ORDER.filter((k) => {
    const f = a.fields[k];
    return (isRequired(k) && (f === undefined || f.status === 'thieu')) || f?.ask === true;
  });
  return [...new Set([...conflicts, ...missing])];
}

const same = (x: unknown, y: unknown): boolean => {
  try {
    return canonicalize(x) === canonicalize(y);
  } catch {
    return false;
  }
};

interface ClarifyOut {
  questions: { field: string; text: string; choices: { id: string; label: string; value: unknown }[] }[];
}

export async function selectQuestions(
  a: IntakeAnalysis,
  round: number,
  desc: string,
  sessionId: string,
  deps: Pick<Deps, 'llm'>,
): Promise<Result<ClarifyQuestion[]>> {
  if (round > MAX_ROUNDS) return { ok: true, value: [] };
  const picked = pendingFields(a).slice(0, MAX_QUESTIONS);
  if (picked.length === 0) return { ok: true, value: [] };
  const ask = picked.map((k) => ({ field: k, current: a.fields[k] ?? null, default: defaultFor(k) ?? null }));
  const r = await callModel<ClarifyOut>(
    deps,
    'clarify',
    [{ role: 'user', content: `Mô tả:\n${desc}\n\nTrường cần hỏi (JSON):\n${JSON.stringify(ask)}` }],
    SCHEMAS.clarify,
    sessionId,
  );
  if (!r.ok) return r;
  const out: ClarifyQuestion[] = [];
  for (const k of picked) {
    const q = r.value.questions.find((x) => x.field === k);
    if (!q) continue; // mô hình bỏ sót: vòng sau hỏi lại
    const mandatory = a.fields[k]?.status === 'mau_thuan';
    const def = defaultFor(k);
    const match = mandatory || def === undefined ? undefined : q.choices.find((c) => same(c.value, def));
    out.push({
      id: `q-${k}-${round}`,
      field: k,
      text: q.text,
      choices: q.choices,
      mandatory,
      ...(match ? { defaultChoiceId: match.id } : {}),
    });
  }
  return { ok: true, value: out };
}
