// Luật bằng chứng (PSC-INT-11, QT-INT-03; TC-INT-13): trường 'tu_mo_ta' phải có ≥ 1 bằng chứng là chuỗi con của mô tả
// (NFC, gộp khoảng trắng, không phân biệt hoa thường) hoặc 'traloi:<qid>' của câu đã trả lời. Không có → giá trị sang
// suggestions[], trường thành 'thieu' (vòng < 2) hoặc 'gia_dinh' (vòng 2).
import { containsNorm } from '../text.js';
import type { Answers, FieldKey, IntakeAnalysis } from '../types.js';

export interface EvidenceOutcome {
  analysis: IntakeAnalysis;
  suggestions: string[];
}

export function enforceEvidence(input: IntakeAnalysis, desc: string, answers: Answers = {}): EvidenceOutcome {
  const a: IntakeAnalysis = { ...input, fields: { ...input.fields } };
  const suggestions: string[] = [];
  for (const [k, f] of Object.entries(a.fields) as [FieldKey, NonNullable<IntakeAnalysis['fields'][FieldKey]>][]) {
    if (f.status !== 'tu_mo_ta') continue;
    const valid = f.evidence.filter((e) =>
      e.startsWith('traloi:') ? Object.hasOwn(answers, e.slice('traloi:'.length)) : containsNorm(desc, e),
    );
    if (valid.length > 0) {
      a.fields[k] = { ...f, evidence: valid };
      continue;
    }
    suggestions.push(`${k}: ${JSON.stringify(f.value)} (mô hình đề xuất, không có căn cứ trong mô tả)`);
    a.fields[k] = {
      value: null,
      status: a.round >= 2 ? 'gia_dinh' : 'thieu',
      evidence: [],
      reason: 'thiếu bằng chứng',
    };
  }
  return { analysis: a, suggestions };
}
