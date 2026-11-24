// AC-CR01-01, TC-INT-16 (TST-INT-12): trả lời một phần → mở lại thấy đúng câu còn lại, không gọi mô hình;
// ngày 27 nhắc một lần, > 30 ngày Huy (QT-INT-10, STM-INT-04).
import { describe, expect, it } from 'vitest';

import { analyze, answer, expireSessions, reopenSession } from './session.js';
import { ANALYSIS_1, BRIEF_1, DESC_1, makeDeps } from './test-fixtures.js';
import type { FieldKey } from './types.js';

/** Bỏ 4 trường khỏi phân tích mẫu 1 → vòng 1 có 4 câu hỏi. */
const FOUR: FieldKey[] = ['setting.era', 'artStyle', 'player', 'title'];
const analysis = {
  fields: Object.fromEntries(Object.entries(ANALYSIS_1.fields).filter(([k]) => !FOUR.includes(k as FieldKey))),
};
const clarify = {
  questions: [...FOUR, 'scale'].map((field) => ({
    field,
    text: `Hỏi ${field}?`,
    choices: [
      { id: 'a', label: 'A', value: field === 'scale' ? { zones: 1, areaKm2: 0.25 } : `giá trị a của ${field}` },
      { id: 'b', label: 'B', value: field === 'scale' ? { zones: 4, areaKm2: 1 } : `giá trị b của ${field}` },
    ],
  })),
};

async function start() {
  const deps = makeDeps({ analyze: [analysis], clarify: [clarify], brief: [BRIEF_1] });
  const a = await analyze({ description: DESC_1 }, deps);
  if (!a.ok) throw new Error(a.error.message);
  return { deps, sid: a.value.session.id, qs: a.value.questions };
}

describe('AC-CR01-01: phiên dở', () => {
  it('trả lời 2/5 câu → còn đúng 3 câu, không gọi mô hình; mở lại → 3 câu đó, 0 lời gọi mới', async () => {
    const { deps, sid, qs } = await start();
    expect(qs.map((q) => q.field)).toEqual(['setting.era', 'artStyle', 'player', 'scale', 'title']);
    const calls = deps.llm.count();
    const r = await answer(sid, { [qs[0]?.id ?? '']: 'a', [qs[1]?.id ?? '']: 'b' }, deps);
    if (!r.ok) throw new Error(r.error.message);
    expect(r.value.session.status).toBe('ChoTraLoi');
    expect(r.value.questions.map((q) => q.field)).toEqual(['player', 'scale', 'title']);
    expect(r.value.session.analysis.fields['setting.era']).toMatchObject({
      value: 'giá trị a của setting.era',
      status: 'tu_mo_ta',
    });
    expect(deps.llm.count()).toBe(calls);

    const o = await reopenSession(sid, deps);
    if (!o.ok) throw new Error(o.error.message);
    expect(o.value.pendingQuestions.map((q) => q.id)).toEqual(r.value.questions.map((q) => q.id));
    expect(o.value.session.lastActivityAt).toBe(r.value.session.lastActivityAt); // mở lại không tính là lượt mới
    expect(deps.llm.count()).toBe(calls);

    // Trả nốt → đi tiếp (sinh brief), lúc này mới gọi mô hình.
    const rest = Object.fromEntries(o.value.pendingQuestions.map((q) => [q.id, 'a']));
    const done = await answer(sid, rest, deps);
    if (!done.ok) throw new Error(done.error.message);
    expect(done.value.session.status).toBe('ChoXacNhan');
    expect(deps.llm.count('brief')).toBe(1);
    expect(deps.llm.count('clarify')).toBe(1); // không có vòng clarify thứ hai
  });

  it('--use-defaults: câu không bắt buộc (kể cả không có mặc định) không kẹt; vòng 2 hỏi lại trường thiếu rồi giả định', async () => {
    const deps = makeDeps({ analyze: [analysis], clarify: [clarify, clarify], brief: [BRIEF_1] });
    const a = await analyze({ description: DESC_1 }, deps);
    if (!a.ok) throw new Error(a.error.message);
    const r1 = await answer(a.value.session.id, {}, deps, { useDefaults: true });
    if (!r1.ok) throw new Error(r1.error.message);
    // PSC-INT-02: vòng 2 hỏi lại các trường bắt buộc chưa có mặc định (era, artStyle, player, title).
    expect(r1.value.session.analysis.round).toBe(2);
    expect(r1.value.questions.map((q) => q.field)).toEqual(['setting.era', 'artStyle', 'player', 'title']);
    const r2 = await answer(a.value.session.id, {}, deps, { useDefaults: true });
    if (!r2.ok) throw new Error(r2.error.message);
    expect(r2.value.session.status).toBe('ChoXacNhan');
    expect(r2.value.session.assumptions.map((x) => x.field)).toEqual(['setting.era', 'artStyle', 'player', 'title']);
  });

  it('phiên đã xác nhận/huỷ → SESSION_CLOSED; không có → SESSION_NOT_FOUND', async () => {
    const { deps, sid } = await start();
    expect(await reopenSession('khong-co', deps)).toMatchObject({ ok: false, error: { code: 'SESSION_NOT_FOUND' } });
    const s = await deps.store.load(sid);
    if (!s) throw new Error('thiếu phiên');
    await deps.store.save({ ...s, status: 'Huy' });
    expect(await reopenSession(sid, deps)).toMatchObject({ ok: false, error: { code: 'SESSION_CLOSED' } });
  });
});

describe('expireSessions (QT-INT-10)', () => {
  it('ngày 27 nhắc một lần; ngày 31 Huy; phiên đã xác nhận không đụng', async () => {
    const { deps, sid } = await start();
    const s0 = await deps.store.load(sid);
    if (!s0) throw new Error('thiếu phiên');
    const base = Date.parse(s0.lastActivityAt ?? s0.createdAt);
    const day = 86_400_000;

    expect(await expireSessions(base + 26 * day, [s0], deps)).toEqual({ expired: [], reminded: [] });
    expect(await expireSessions(base + 27 * day, [s0], deps)).toEqual({ expired: [], reminded: [sid] });
    const s1 = await deps.store.load(sid);
    expect(s1?.remindedAt).toBeDefined();
    expect(await expireSessions(base + 28 * day, s1 ? [s1] : [], deps)).toEqual({ expired: [], reminded: [] });
    expect(await expireSessions(base + 31 * day, s1 ? [s1] : [], deps)).toEqual({ expired: [sid], reminded: [] });
    expect((await deps.store.load(sid))?.status).toBe('Huy');
    expect(await expireSessions(base + 99 * day, [{ ...s0, status: 'DaXacNhan' }], deps)).toEqual({
      expired: [],
      reminded: [],
    });
  });
});
