// Kiểu công khai của @gamestudio/intake (DDD-01 §3, §4: DTO-INT-01…07; DDD-00 DTO-GEN-01 Result, §2.4 Clock).
import type { LlmClient } from './llm/types.js';

export { err, type IntakeError, type IntakeErrorCode, type Result } from './result.js';

/** DTO-INT-02. */
export type FieldKey =
  | 'title'
  | 'genre'
  | 'camera'
  | 'setting.place'
  | 'setting.era'
  | 'setting.season'
  | 'setting.timeOfDay'
  | 'setting.realPlace'
  | 'artStyle'
  | 'coreLoop'
  | 'player'
  | 'npcs'
  | 'animals'
  | 'features.combat'
  | 'features.hunting'
  | 'features.dialogueMode'
  | 'scale'
  | 'highRiskAssets';

export type FieldStatus = 'tu_mo_ta' | 'gia_dinh' | 'thieu' | 'mau_thuan';

export interface FieldState {
  value: unknown;
  status: FieldStatus;
  /** Trích nguyên văn từ mô tả, hoặc 'traloi:<qid>'. */
  evidence: string[];
  conflictsWith?: FieldKey;
  reason?: string;
  /** Nội bộ: hỏi lại dù đã có giá trị (QT-INT-07: săn → hỏi combat). */
  ask?: boolean;
}

/** DTO-INT-03. */
export interface IntakeAnalysis {
  fields: Partial<Record<FieldKey, FieldState>>;
  round: 0 | 1 | 2;
}

/** DTO-INT-04. */
export interface ClarifyChoice {
  id: string;
  label: string;
  value: unknown;
}
export interface ClarifyQuestion {
  id: string;
  field: FieldKey;
  text: string;
  choices: ClarifyChoice[];
  defaultChoiceId?: string;
  mandatory: boolean;
}
export type Answers = Record<string, string | { text: string }>;

export interface Assumption {
  field: string;
  value: unknown;
  reason: string;
}

/** DTO-INT-01. */
export interface IntakeImage {
  name: string;
  mime: string;
  bytes: Uint8Array;
}
export interface IntakeInput {
  description: string;
  images?: IntakeImage[];
  seed?: number;
  language?: 'vi' | 'en';
}

/** DTO-INT-06 (SCH-INT-04). */
export interface BriefJson {
  title: string;
  sourceRef: string;
  genre: string;
  camera: 'first_person' | 'third_person';
  setting: { place: string; era: string; season: string; timeOfDay: string[]; realPlace: boolean };
  artStyle: { summary: string; refs: string[] };
  coreLoop: string[];
  player: string;
  npcs: { name: string; role: string; count: number }[];
  animals: { species: string; count: number; temperament?: string }[];
  features: { combat: boolean; hunting: boolean; dialogueMode: 'static' | 'ai' | 'hybrid' };
  scale: { zones: number; areaKm2: number };
  highRiskAssets: { asset: string; level: 'Cao' | 'Vua'; approach: 'cc0_truoc' | 'generator' | 'duyet_2_vong' }[];
  assumptions: Assumption[];
  suggestions: string[];
}

/** DTO-INT-07. Đường dẫn tương đối games/<id>/. */
export interface GeneratedBundle {
  gameId: string;
  files: Record<string, string | object>;
  schemaReport: { ok: boolean; errors: { file: string; instancePath: string; message: string }[] };
  warnings: string[];
  briefWordCount: number;
}

export type IntakeStatus = 'ChoTraLoi' | 'DangSinh' | 'ChoXacNhan' | 'DaXacNhan' | 'Loi' | 'Huy';

/** DTO-INT-05 (phần dùng ở phiếu này). */
export interface IntakeSessionState {
  id: string;
  status: IntakeStatus;
  input: { description: string; imageNames: string[]; seed?: number; language: 'vi' | 'en' };
  analysis: IntakeAnalysis;
  questions: ClarifyQuestion[];
  answers: Answers;
  assumptions: Assumption[];
  suggestions: string[];
  warnings: string[];
  bundle?: GeneratedBundle;
  confirmed?: { briefVersion: number; hash: string };
  /** DTO-INT-14: chỉ đổi khi có lượt mới (mô tả, trả lời); mở lại để xem không tính. */
  lastActivityAt?: string;
  /** Đã nhắc phiên sắp huỷ (ngày 27, QT-INT-10). */
  remindedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** IntakeStore (DDD-01 §3.3, phần cần ở phiếu này). */
export interface IntakeStore {
  load(sessionId: string): Promise<IntakeSessionState | null>;
  save(s: IntakeSessionState): Promise<void>;
}

export interface Clock {
  now(): number;
}

/** Dữ liệu mẫu games/_template/data/* do nơi gọi đọc và tiêm (thư viện không đọc tệp). */
export type GameDataFiles = Record<string, unknown>;

export interface Deps {
  llm: LlmClient;
  store: IntakeStore;
  clock: Clock;
  /** Sinh id phiên (ULID ở CLI/web); test tiêm hàm cố định. */
  newId: () => string;
  /** games/_template/data: game.json, world.json, budgets.json, palette.json. */
  template: GameDataFiles;
  /** Id game đã có (để slug không trùng, PSC-INT-03). */
  existingGameIds?: readonly string[];
}
