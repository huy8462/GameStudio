// Golden test intake (TC-INT-01 mẫu 1, 02, 03, 06, 07, 09, 13; AC-01-01, 02, 03, 06, 07) với FakeLlmClient.
import { canonicalize, validateFiles } from '@gamestudio/schema';
import { describe, expect, it } from 'vitest';

import { applyPostRules } from './analyze/post-rules.js';
import { enforceEvidence } from './analyze/evidence.js';
import { validateInput } from './analyze/validate-input.js';
import { analyze, answer, confirm } from './session.js';
import { ANALYSIS_1, BRIEF_1, CLARIFY_SCALE, DESC_1, f, makeDeps } from './test-fixtures.js';
import type { BriefJson, IntakeAnalysis } from './types.js';

const qClarify = (field: string, values: [string, unknown][]) => ({
  questions: [{ field, text: `Hỏi ${field}?`, choices: values.map(([id, value]) => ({ id, label: id, value })) }],
});

async function runSample1(ids = ['phien1']) {
  const deps = makeDeps({ analyze: [ANALYSIS_1], clarify: [CLARIFY_SCALE], brief: [BRIEF_1] }, ids);
  const a = await analyze({ description: DESC_1 }, deps);
  if (!a.ok) throw new Error(a.error.message);
  const b = await answer(a.value.session.id, {}, deps, { useDefaults: true });
  if (!b.ok) throw new Error(b.error.message);
  return { deps, a: a.value, b: b.value };
}

describe('AC-01-01 / TC-INT-01 mẫu 1: brief đúng mô tả', () => {
  it('chỉ hỏi quy mô; chấp nhận mặc định → brief + dữ liệu hợp lệ schema, giá trị chốt được ép', async () => {
    const { deps, a, b } = await runSample1();
    expect(a.questions.map((q) => q.field)).toEqual(['scale']);
    expect(a.questions[0]).toMatchObject({ id: 'q-scale-1', mandatory: false, defaultChoiceId: 'nho' });
    expect(b.session.status).toBe('ChoXacNhan');
    const files = b.session.bundle?.files ?? {};
    const brief = files['brief/v1/brief.json'] as BriefJson;
    expect(brief.artStyle.summary).toContain('ow-poly ấm áp');
    expect(brief.animals).toHaveLength(3);
    expect(brief.features).toEqual({ combat: false, hunting: false, dialogueMode: 'static' });
    expect(brief.camera).toBe('third_person');
    expect(brief.sourceRef).toBe('intake:phien1');
    expect(Object.keys(files).sort()).toEqual([
      'brief/v1/brief.json',
      'brief/v1/game-brief.md',
      'data/budgets.json',
      'data/entities/animals/ga.json',
      'data/entities/animals/trau.json',
      'data/entities/animals/vit.json',
      'data/entities/npc/ba-tu.json',
      'data/game.json',
      'data/palette.json',
      'data/world.json',
    ]);
    const report = validateFiles(Object.fromEntries(Object.entries(files).filter(([k]) => k.startsWith('data/'))));
    expect(Object.values(report).flat()).toEqual([]);
    expect(files['data/game.json']).toMatchObject({
      id: 'mua-he-lang-que',
      camera: { mode: 'third_person' },
      briefVersion: 1,
    });
    expect(String(files['brief/v1/game-brief.md'])).toContain('## Vòng chơi tối thiểu');
    expect(deps.llm.count()).toBe(3); // analyze, clarify, brief
  });

  it('confirm → DaXacNhan, hash sha256 (PSC-INT-09) và brief/v1/hash.txt', async () => {
    const { deps, b } = await runSample1();
    const c = await confirm(b.session.id, deps);
    if (!c.ok) throw new Error(c.error.message);
    expect(c.value.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(c.value.session.status).toBe('DaXacNhan');
    expect(c.value.session.bundle?.files['brief/v1/hash.txt']).toBe(`${c.value.hash}\n`);
  });
});

describe('TC-INT-09: tất định', () => {
  it('cùng mô tả + câu trả lời → cùng byte phần cấu trúc và cùng hash', async () => {
    const [x, y] = [await runSample1(['p1']), await runSample1(['p1'])];
    const fx = x.b.session.bundle?.files ?? {};
    const fy = y.b.session.bundle?.files ?? {};
    for (const k of ['data/game.json', 'data/world.json', 'data/budgets.json'])
      expect(canonicalize(fx[k])).toBe(canonicalize(fy[k]));
    const world = fx['data/world.json'] as { seed: number; zones: { id: string }[] };
    expect(world.zones.map((z) => z.id)).toEqual(['z1']);
  });

  it('quy mô 1 km² → 4 zone lưới 500 m, láng giềng 4 hướng', async () => {
    const deps = makeDeps({ analyze: [ANALYSIS_1], clarify: [CLARIFY_SCALE], brief: [BRIEF_1] });
    const a = await analyze({ description: DESC_1 }, deps);
    if (!a.ok) throw new Error(a.error.message);
    const b = await answer(a.value.session.id, { 'q-scale-1': 'vua' }, deps);
    if (!b.ok) throw new Error(b.error.message);
    const world = b.value.session.bundle?.files['data/world.json'] as { zones: { id: string; neighbors: string[] }[] };
    expect(world.zones.map((z) => `${z.id}:${z.neighbors.join(',')}`)).toEqual([
      'z1:z2,z3',
      'z2:z1,z4',
      'z3:z1,z4',
      'z4:z2,z3',
    ]);
    expect((b.value.session.bundle?.files['brief/v1/brief.json'] as BriefJson).scale).toEqual({ zones: 4, areaKm2: 1 });
  });
});

describe('AC-01-02 / TC-INT-02: thiếu góc nhìn', () => {
  it('có câu hỏi camera, mặc định ngôi thứ ba (kể cả khi mô hình tự giả định)', async () => {
    const desc = 'Làng quê Bắc Bộ, phong cách low-poly ấm áp. Có trâu, gà và vịt.';
    const fields = { ...ANALYSIS_1.fields, camera: f('third_person', [], 'gia_dinh') };
    const deps = makeDeps({
      analyze: [{ fields }],
      clarify: [
        qClarify('camera', [
          ['ba', 'third_person'],
          ['nhat', 'first_person'],
        ]),
      ],
    });
    const r = await analyze({ description: desc }, deps);
    if (!r.ok) throw new Error(r.error.message);
    const q = r.value.questions.find((x) => x.field === 'camera');
    expect(q).toMatchObject({ mandatory: false, defaultChoiceId: 'ba' });
  });
});

describe('AC-01-03 / TC-INT-03: săn bắt', () => {
  it('"săn hươu trong rừng" → hunting=true, hỏi combat (không bắt buộc, mặc định tắt)', () => {
    const a = applyPostRules({ fields: {}, round: 0 }, 'Người chơi đi săn hươu trong rừng.');
    expect(a.fields['features.hunting']).toMatchObject({ value: true, status: 'tu_mo_ta' });
    expect(a.fields['features.combat']).toMatchObject({ value: false, status: 'gia_dinh', ask: true });
  });
  it('"5 con gà ở sân" không bật săn (so giữ dấu: sân ≠ săn); "không đánh nhau" không bật chiến đấu', () => {
    const a = applyPostRules({ fields: {}, round: 0 }, 'Thả 5 con gà ở sân. Game nhẹ nhàng, không đánh nhau.');
    expect(a.fields['features.hunting']?.value).toBe(false);
    expect(a.fields['features.combat']).toMatchObject({ value: false, status: 'gia_dinh' });
    expect(a.fields['features.combat']?.ask).toBeUndefined();
  });
});

describe('AC-01-06 / TC-INT-06: mâu thuẫn phong cách', () => {
  it('câu hỏi bắt buộc không có mặc định; confirm → ERR-INT-08', async () => {
    const desc = 'Làng quê phong cách hiện thực nhưng nhân vật kiểu hoạt hình. Góc nhìn thứ ba.';
    const deps = makeDeps({
      analyze: [{ fields: { camera: f('third_person', ['Góc nhìn thứ ba']) } }],
      clarify: [
        qClarify('artStyle', [
          ['thuc', 'hien_thuc'],
          ['hoat', 'hoat_hinh'],
        ]),
      ],
    });
    const r = await analyze({ description: desc }, deps);
    if (!r.ok) throw new Error(r.error.message);
    const q = r.value.questions[0];
    expect(q).toMatchObject({ field: 'artStyle', mandatory: true });
    expect(q?.defaultChoiceId).toBeUndefined();
    const c = await confirm(r.value.session.id, deps);
    expect(!c.ok && c.error.code).toBe('ERR-INT-08');
  });
});

describe('AC-01-07 / TC-INT-07: asset rủi ro', () => {
  it('"tượng Phật chi tiết" → mức Cao, hướng CC0 trước', () => {
    const a = applyPostRules({ fields: {}, round: 0 }, 'Trong chùa có một bức tượng Phật chi tiết. Có cây đa.');
    expect(a.fields.highRiskAssets?.value).toEqual([{ asset: 'tượng Phật', level: 'Cao', approach: 'cc0_truoc' }]);
  });
});

describe('TC-INT-13 / QT-INT-03: bằng chứng', () => {
  it('giá trị không có căn cứ trong mô tả → sang suggestions, trường thành thieu', () => {
    const a: IntakeAnalysis = {
      round: 0,
      fields: { artStyle: f('cyberpunk', ['phong cách cyberpunk']), camera: f('third_person', ['góc   nhìn THỨ BA']) },
    };
    const r = enforceEvidence(a, 'Một ngôi làng, góc nhìn thứ ba.');
    expect(r.analysis.fields.artStyle).toMatchObject({ status: 'thieu', value: null });
    expect(r.suggestions[0]).toMatch(/^artStyle: "cyberpunk"/);
    expect(r.analysis.fields.camera?.status).toBe('tu_mo_ta'); // chuẩn hoá khoảng trắng, hoa thường
  });
});

describe('ERR-INT-01/02: kiểm đầu vào', () => {
  it('mô tả quá ngắn bị chặn; ảnh sai định dạng bị bỏ kèm cảnh báo', () => {
    expect(validateInput({ description: '  ngắn  ' })).toMatchObject({ ok: false, error: { code: 'ERR-INT-01' } });
    const r = validateInput({
      description: DESC_1,
      images: [{ name: 'a.gif', mime: 'image/gif', bytes: new Uint8Array(3) }],
    });
    expect(r.ok && r.value.warnings[0]).toMatch(/^ERR-INT-02 Ảnh a\.gif/);
    expect(r.ok && r.value.images).toEqual([]);
  });
});
