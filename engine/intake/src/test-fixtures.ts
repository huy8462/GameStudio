// Dữ liệu thử cho test intake (TC-INT-01…13): mẫu games/_template/data, Deps giả, đáp án mô hình viết sẵn.
// Không build (tsconfig loại test-fixtures.ts).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FakeLlmClient } from './llm/fake.js';
import type { LlmTask } from './llm/types.js';
import { MemoryIntakeStore } from './store.js';
import type { Deps, FieldKey, FieldState, GameDataFiles } from './types.js';

const TEMPLATE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../games/_template/data');

export const TEMPLATE: GameDataFiles = Object.fromEntries(
  ['game.json', 'world.json', 'budgets.json', 'palette.json'].map((f) => [
    f,
    JSON.parse(readFileSync(join(TEMPLATE_DIR, f), 'utf8')),
  ]),
);

export function makeDeps(
  answers: Partial<Record<LlmTask, unknown[]>>,
  ids: string[] = ['phien1'],
): Deps & { llm: FakeLlmClient } {
  let i = 0;
  let t = Date.UTC(2026, 10, 24);
  return {
    llm: new FakeLlmClient(answers),
    store: new MemoryIntakeStore(),
    clock: { now: () => (t += 1000) },
    newId: () => ids[i++] ?? `phien${i}`,
    template: TEMPLATE,
  };
}

export const f = (value: unknown, evidence: string[] = [], status: FieldState['status'] = 'tu_mo_ta'): FieldState => ({
  value,
  status,
  evidence,
});

/** Mẫu 1 (AC-01-01): làng quê low-poly ấm áp, 3 loài, không chiến đấu. */
export const DESC_1 =
  'Làng quê Bắc Bộ thập niên 1990, phong cách low-poly ấm áp. Góc nhìn thứ ba. Buổi sáng mùa hè. ' +
  'Người chơi là một cậu bé đi chăn trâu, dạo quanh làng, trò chuyện với dân làng và tìm gà lạc. Có trâu, gà và vịt.';

export const ANALYSIS_1: { fields: Partial<Record<FieldKey, FieldState>> } = {
  fields: {
    title: f('Mùa hè làng quê', ['Làng quê Bắc Bộ']),
    genre: f('khám phá', ['dạo quanh làng']),
    camera: f('third_person', ['Góc nhìn thứ ba']),
    'setting.place': f('Làng quê Bắc Bộ', ['Làng quê Bắc Bộ']),
    'setting.era': f('thập niên 1990', ['thập niên 1990']),
    'setting.season': f('he', ['mùa hè']),
    'setting.timeOfDay': f(['sang'], ['Buổi sáng']),
    artStyle: f('low-poly ấm áp', ['phong cách low-poly ấm áp']),
    coreLoop: f(
      ['dạo quanh làng', 'trò chuyện với dân làng', 'tìm gà lạc'],
      ['dạo quanh làng, trò chuyện với dân làng và tìm gà lạc'],
    ),
    player: f('cậu bé chăn trâu', ['một cậu bé đi chăn trâu']),
    animals: f(
      [
        { species: 'trâu', count: 2 },
        { species: 'gà', count: 6 },
        { species: 'vịt', count: 4 },
      ],
      ['Có trâu, gà và vịt'],
    ),
  },
};

export const CLARIFY_SCALE = {
  questions: [
    {
      field: 'scale',
      text: 'Game rộng cỡ nào?',
      choices: [
        { id: 'nho', label: 'Một khu nhỏ (0,25 km²)', value: { zones: 1, areaKm2: 0.25 } },
        { id: 'vua', label: 'Cả làng (1 km²)', value: { zones: 4, areaKm2: 1 } },
      ],
    },
  ],
};

export const BRIEF_1 = {
  title: 'Mùa hè làng quê',
  sourceRef: 'intake:mo-hinh-ghi-sai',
  genre: 'Khám phá thư giãn',
  camera: 'first_person', // mô hình ghi sai: mã phải ép lại third_person từ phân tích
  setting: { place: 'Làng quê Bắc Bộ', era: 'thập niên 1990', season: 'hè', timeOfDay: ['sáng'], realPlace: false },
  artStyle: { summary: 'Low-poly ấm áp, màu nắng hè', refs: [] },
  coreLoop: ['Dạo quanh làng', 'Trò chuyện với dân làng', 'Tìm gà lạc'],
  player: 'Cậu bé chăn trâu',
  npcs: [{ name: 'Bà Tư', role: 'dân làng', count: 1 }],
  animals: [
    { species: 'trâu', count: 2 },
    { species: 'gà', count: 6 },
    { species: 'vịt', count: 4 },
  ],
  features: { combat: true, hunting: false, dialogueMode: 'ai' }, // sai: mã ép theo phân tích + ADR-035
  scale: { zones: 1, areaKm2: 0.25 },
  highRiskAssets: [],
  assumptions: [],
  suggestions: [],
};
