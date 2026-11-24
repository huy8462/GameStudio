// Cấu hình và luật dữ liệu intake (DDD-01 §10 CFG-INT-02, 04, 06; MOD-INT-16 rules/{conflicts,keywords,defaults,field-order}).
// Khác DDD: luật để trong mã TS thay vì rules/*.json (thư viện không đọc tệp lúc chạy); nội dung giữ nguyên ý nghĩa.
import type { FieldKey } from './types.js';

export const LIMITS = { minChars: 10, maxChars: 20_000, maxImages: 5, maxImageBytes: 10 * 1024 * 1024 } as const;
export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_QUESTIONS = 5;
export const MAX_ROUNDS = 2;
export const BRIEF_MAX_WORDS = 400;
export const REPAIR_ATTEMPTS = 3;

/** CFG-INT-02, CFG-INT-07. */
export const MAX_OUTPUT_TOKENS = {
  analyze: 4000,
  clarify: 1500,
  brief: 8000,
  repair: 8000,
  reverse_brief: 4000,
} as const;

/** CFG-INT-07: tóm tắt dữ liệu gửi reverse_brief ≤ 6 KB. */
export const REVERSE_SUMMARY_MAX_BYTES = 6 * 1024;

/** PSC-INT-02 FIELD_ORDER. */
export const FIELD_ORDER: readonly FieldKey[] = [
  'genre',
  'camera',
  'setting.place',
  'setting.era',
  'setting.season',
  'setting.timeOfDay',
  'artStyle',
  'coreLoop',
  'player',
  'features.combat',
  'features.hunting',
  'features.dialogueMode',
  'scale',
  'title',
];

/** DTO-INT-02: bắt buộc mọi khoá trừ npcs, animals, highRiskAssets (và setting.realPlace có mặc định false). */
export const OPTIONAL: ReadonlySet<FieldKey> = new Set<FieldKey>([
  'npcs',
  'animals',
  'highRiskAssets',
  'setting.realPlace',
]);
export const isRequired = (k: FieldKey): boolean => !OPTIONAL.has(k);

/** PSC-INT-02 defaultFor (rules/defaults.json); QT-INT-04, QT-INT-06. */
export const DEFAULTS: Partial<Record<FieldKey, unknown>> = {
  camera: 'third_person',
  'features.combat': false,
  'features.hunting': false,
  'features.dialogueMode': 'static',
  'setting.season': 'he',
  'setting.timeOfDay': ['sang'],
  'setting.realPlace': false,
  scale: { zones: 1, areaKm2: 0.25 },
  npcs: [],
  animals: [],
  highRiskAssets: [],
};

/** PSC-INT-10 rules/conflicts.json: cụm từ trong mô tả (giữ dấu, không phân biệt hoa thường). */
export const CONFLICTS: readonly { field: FieldKey; groups: Record<string, readonly string[]> }[] = [
  {
    field: 'artStyle',
    groups: {
      hien_thuc: ['hiện thực', 'chân thực', 'tả thực', 'realistic'],
      hoat_hinh: ['hoạt hình', 'cartoon', 'chibi'],
    },
  },
  {
    field: 'camera',
    groups: {
      first_person: ['góc nhìn thứ nhất', 'ngôi thứ nhất', 'first person', 'first-person'],
      third_person: ['góc nhìn thứ ba', 'ngôi thứ ba', 'third person', 'third-person'],
    },
  },
];

/** PSC-INT-10 rules/keywords.json. */
export const KEYWORDS = {
  hunting: ['săn', 'đi săn', 'bẫy thú', 'bắn thú'],
  combat: ['chiến đấu', 'đánh nhau', 'giết', 'quái vật', 'đánh quái', 'kẻ thù'],
  negation: ['không', 'chẳng', 'không có'],
  highRiskObject: ['tượng', 'chùa', 'đình'],
  highRiskDetail: ['chi tiết', 'tinh xảo', 'cầu kỳ'],
} as const;
