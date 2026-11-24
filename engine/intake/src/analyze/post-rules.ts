// Luật hậu kiểm sau phân tích (PSC-INT-10; QT-INT-04, 06, 07; FR-INT-06, 11, 13). Chạy bằng luật, không gọi mô hình.
import { CONFLICTS, KEYWORDS } from '../config.js';
import { findPhrase, norm, sentenceAt } from '../text.js';
import type { FieldKey, FieldState, IntakeAnalysis } from '../types.js';

/** Cụm từ có bị phủ định ngay trước (≤ 2 từ) không: "không đánh nhau", "chẳng có quái vật". */
function negatedAt(text: string, at: number): boolean {
  const before = norm(text)
    .slice(Math.max(0, at - 16), at)
    .toLocaleLowerCase('vi');
  return KEYWORDS.negation.some((w) => new RegExp(`(^|\\s)${w}(\\s+\\S+)?\\s*$`, 'u').test(before));
}

function firstHit(
  text: string,
  phrases: readonly string[],
  allowNegated = true,
): { phrase: string; at: number } | undefined {
  for (const phrase of phrases) {
    for (const at of findPhrase(text, phrase)) if (allowNegated || !negatedAt(text, at)) return { phrase, at };
  }
  return undefined;
}

function set(a: IntakeAnalysis, k: FieldKey, s: FieldState): void {
  a.fields[k] = s;
}

export function applyPostRules(input: IntakeAnalysis, desc: string): IntakeAnalysis {
  const a: IntakeAnalysis = { ...input, fields: { ...input.fields } };

  // Mâu thuẫn (FR-INT-06, AC-01-06): mô tả nhắc cả hai nhóm loại trừ nhau.
  for (const c of CONFLICTS) {
    const hits = Object.entries(c.groups)
      .map(([value, phrases]) => ({ value, hit: firstHit(desc, phrases) }))
      .filter((h) => h.hit !== undefined);
    if (hits.length >= 2) {
      set(a, c.field, {
        value: hits.map((h) => h.value),
        status: 'mau_thuan',
        evidence: hits.map((h) => sentenceAt(desc, h.hit?.at ?? 0)),
        conflictsWith: c.field,
        reason: `Mô tả nhắc cả ${hits.map((h) => `"${h.hit?.phrase ?? ''}"`).join(' và ')}`,
      });
    }
  }

  // Săn bắt (QT-INT-07, AC-01-03): bật hunting, luôn hỏi lại combat.
  const hunt = firstHit(desc, KEYWORDS.hunting, false);
  const fight = firstHit(desc, KEYWORDS.combat, false);
  if (hunt) set(a, 'features.hunting', { value: true, status: 'tu_mo_ta', evidence: [sentenceAt(desc, hunt.at)] });
  if (fight) {
    set(a, 'features.combat', { value: true, status: 'tu_mo_ta', evidence: [sentenceAt(desc, fight.at)] });
  } else {
    // QT-INT-04: không nói rõ → tắt (giả định). Có săn → vẫn hỏi combat, mặc định không bắt buộc.
    set(a, 'features.combat', { value: false, status: 'gia_dinh', evidence: [], ...(hunt ? { ask: true } : {}) });
  }
  if (!hunt) set(a, 'features.hunting', { value: false, status: 'gia_dinh', evidence: [] });
  a.fields['features.dialogueMode'] ??= { value: 'static', status: 'gia_dinh', evidence: [] };

  // Asset rủi ro cao (FR-INT-11, AC-01-07): "tượng|chùa|đình" có "chi tiết|tinh xảo|cầu kỳ" trong ≤ 3 từ ngay sau
  // ("tượng Phật chi tiết"), không chỉ cùng câu ("trong chùa có một bức tượng Phật chi tiết" → chỉ tượng).
  const risky: { asset: string; level: 'Cao'; approach: 'cc0_truoc' }[] = [];
  const evidence: string[] = [];
  for (const obj of KEYWORDS.highRiskObject) {
    for (const at of findPhrase(desc, obj)) {
      const s = sentenceAt(desc, at);
      const words = norm(desc)
        .slice(at)
        .split(/[\s,.;!?]+/u);
      const tail = words.slice(1, 5).join(' ');
      const detail = KEYWORDS.highRiskDetail
        .map((d) => findPhrase(tail, d)[0])
        .filter((i): i is number => i !== undefined);
      if (detail.length === 0) continue;
      // Tên asset: từ khoá + các từ trước cụm "chi tiết" (vd "tượng Phật").
      const before = tail.slice(0, Math.min(...detail)).trim();
      const asset = `${words[0] ?? obj}${before ? ` ${before}` : ''}`;
      if (!risky.some((r) => r.asset === asset)) risky.push({ asset, level: 'Cao', approach: 'cc0_truoc' });
      if (!evidence.includes(s)) evidence.push(s);
    }
  }
  if (risky.length > 0) {
    const prev = a.fields.highRiskAssets?.status === 'tu_mo_ta' ? (a.fields.highRiskAssets.value as typeof risky) : [];
    const merged = [...risky, ...prev.filter((p) => !risky.some((r) => r.asset === p.asset))];
    set(a, 'highRiskAssets', { value: merged, status: 'tu_mo_ta', evidence });
  }
  return a;
}
