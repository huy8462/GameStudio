// Sinh brief + dữ liệu khởi tạo (PSC-INT-01 cuối, MOD-INT-04, 07; PSC-INT-04 vòng tự sửa ≤ 3; STM-INT-01 DangSinh → ChoXacNhan).
// Mô hình viết brief (văn bản); mã ép các giá trị đã chốt (camera, tính năng, quy mô, giả định), rồi sinh phần tất định.
import { validateFiles } from '@gamestudio/schema';

import { REPAIR_ATTEMPTS } from '../config.js';
import { callModel } from '../llm/call.js';
import { SCHEMAS, validateOutput } from '../schemas/index.js';
import type { BriefJson, Deps, FieldKey, GeneratedBundle, IntakeSessionState, Result } from '../types.js';
import { err } from '../types.js';
import { renderBrief } from './brief-render.js';
import { buildDeterministic } from './deterministic.js';

const v = (s: IntakeSessionState, k: FieldKey): unknown => s.analysis.fields[k]?.value;

/** Giá trị đã chốt từ phân tích ghi đè lên brief của mô hình (mô hình không được đổi quyết định đã có). */
function pinBrief(b: BriefJson, s: IntakeSessionState): BriefJson {
  const cam = v(s, 'camera');
  const scale = v(s, 'scale') as { zones?: number; areaKm2?: number } | null | undefined;
  const risky = v(s, 'highRiskAssets');
  return {
    ...b,
    sourceRef: `intake:${s.id}`,
    camera: cam === 'first_person' || cam === 'third_person' ? cam : b.camera,
    features: {
      combat: v(s, 'features.combat') === true,
      hunting: v(s, 'features.hunting') === true,
      dialogueMode: 'static', // ADR-035: hội thoại NPC chỉ kịch bản tĩnh
    },
    scale:
      scale && typeof scale.areaKm2 === 'number'
        ? { zones: Math.max(1, Math.ceil(scale.areaKm2 / 0.25)), areaKm2: scale.areaKm2 }
        : b.scale,
    highRiskAssets:
      Array.isArray(risky) && risky.length > 0 ? (risky as BriefJson['highRiskAssets']) : b.highRiskAssets,
    assumptions: s.assumptions,
    suggestions: [...new Set([...s.suggestions, ...b.suggestions])],
  };
}

async function writeBrief(s: IntakeSessionState, deps: Deps): Promise<Result<BriefJson>> {
  const fields = Object.fromEntries(
    Object.entries(s.analysis.fields).map(([k, f]) => [k, { value: f?.value, status: f?.status }]),
  );
  const ctx = { sessionId: s.id, fields, assumptions: s.assumptions, suggestions: s.suggestions };
  const r = await callModel<BriefJson>(
    deps,
    'brief',
    [{ role: 'user', content: `Mô tả:\n${s.input.description}\n\nĐã chốt (JSON):\n${JSON.stringify(ctx)}` }],
    SCHEMAS.brief,
    s.id,
  );
  if (!r.ok) return r;
  let brief = pinBrief(r.value, s);
  // PSC-INT-04: chỉ phần do mô hình sinh được gửi sửa.
  for (let attempt = 1; attempt <= REPAIR_ATTEMPTS; attempt++) {
    const errs = validateOutput(SCHEMAS.brief, brief);
    if (errs.length === 0) return { ok: true, value: brief };
    const fix = await callModel<BriefJson>(
      deps,
      'repair',
      [
        {
          role: 'user',
          content: `Tệp brief.json:\n${JSON.stringify(brief)}\n\nLỗi:\n${errs.map((e) => `${e.instancePath}: ${e.message}`).join('\n')}`,
        },
      ],
      SCHEMAS.brief,
      s.id,
    );
    if (!fix.ok) return fix;
    brief = pinBrief(fix.value, s);
  }
  const left = validateOutput(SCHEMAS.brief, brief);
  return left.length === 0
    ? { ok: true, value: brief }
    : err('ERR-INT-05', 'brief.json sai schema sau 3 lần tự sửa', { errors: left });
}

export async function generateBundle(s: IntakeSessionState, deps: Deps): Promise<Result<GeneratedBundle>> {
  const b = await writeBrief(s, deps);
  if (!b.ok) return b;
  const { gameId, files } = buildDeterministic({
    brief: b.value,
    description: s.input.description,
    answers: s.answers,
    ...(s.input.seed !== undefined ? { seed: s.input.seed } : {}),
    language: s.input.language,
    template: deps.template,
    existingGameIds: deps.existingGameIds ?? [],
  });
  const report = validateFiles(files);
  const errors = Object.entries(report).flatMap(([file, es]) =>
    es.map((e) => ({ file, instancePath: e.instancePath, message: e.message })),
  );
  if (errors.length > 0) {
    // Phần tất định sai schema là lỗi lập trình (PSC-INT-04), không gửi mô hình sửa.
    throw new Error(`intake: dữ liệu tất định sai schema: ${JSON.stringify(errors)}`);
  }
  const r = renderBrief(b.value);
  const out: GeneratedBundle['files'] = {
    ...files,
    'brief/v1/brief.json': b.value,
    'brief/v1/game-brief.md': r.md,
    ...(r.appendix ? { 'brief/v1/game-brief-phu-luc.md': r.appendix } : {}),
  };
  return {
    ok: true,
    value: {
      gameId,
      files: out,
      schemaReport: { ok: true, errors: [] },
      warnings: s.warnings,
      briefWordCount: r.mainWords,
    },
  };
}
