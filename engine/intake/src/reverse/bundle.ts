// Brief nháp của phiên suy_nguoc (PSC-INT-13 saveBriefVersion, QT-INT-09): dựng brief.json từ trường đã chốt (dữ liệu,
// mô hình reverse_brief, câu trả lời, mặc định) KHÔNG gọi thêm mô hình và KHÔNG sinh dữ liệu game (dữ liệu đã có).
// Bundle chỉ có brief/v1/*; trạng thái luôn ChoXacNhan tới khi người dùng xác nhận.
import { renderBrief } from '../generate/brief-render.js';
import { SCHEMAS, validateOutput } from '../schemas/index.js';
import type { BriefJson, FieldKey, GeneratedBundle, IntakeSessionState, Result } from '../types.js';
import { err } from '../types.js';

/** Trường bắt buộc không có giá trị (không có mặc định, người dùng không trả lời): giữ chỗ để người dùng sửa. */
export const UNKNOWN = 'chưa rõ (cần bổ sung)';

const str = (v: unknown, fb = UNKNOWN): string => (typeof v === 'string' && v.trim() !== '' ? v.trim() : fb);
const list = (v: unknown): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' ? [v] : []).filter(
    (x): x is string => typeof x === 'string' && x.trim() !== '',
  );
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function buildReverseBrief(s: IntakeSessionState, gameId: string): BriefJson {
  const v = (k: FieldKey): unknown => s.analysis.fields[k]?.value;
  const loop = list(v('coreLoop')).slice(0, 5);
  while (loop.length < 3) loop.push(UNKNOWN);
  const tod = list(v('setting.timeOfDay'));
  const scale = v('scale') as { zones?: unknown; areaKm2?: unknown } | null | undefined;
  const area = typeof scale?.areaKm2 === 'number' && scale.areaKm2 > 0 ? Math.min(scale.areaKm2, 4) : 0.25;
  const zones = typeof scale?.zones === 'number' && Number.isInteger(scale.zones) && scale.zones >= 1 ? scale.zones : 1;
  const cam = v('camera');
  const dm = v('features.dialogueMode');
  return {
    title: str(v('title'), gameId).slice(0, 120),
    sourceRef: `reverse:${gameId}`,
    genre: str(v('genre')),
    camera: cam === 'first_person' ? 'first_person' : 'third_person',
    setting: {
      place: str(v('setting.place')),
      era: str(v('setting.era')),
      season: str(v('setting.season')),
      timeOfDay: tod.length > 0 ? tod : [UNKNOWN],
      realPlace: v('setting.realPlace') === true,
    },
    artStyle: { summary: str(v('artStyle')), refs: [] },
    coreLoop: loop,
    player: str(v('player')),
    npcs: arr<BriefJson['npcs'][number]>(v('npcs')),
    animals: arr<BriefJson['animals'][number]>(v('animals')),
    features: {
      combat: v('features.combat') === true,
      hunting: v('features.hunting') === true,
      dialogueMode: dm === 'ai' || dm === 'hybrid' ? dm : 'static',
    },
    scale: { zones, areaKm2: area },
    highRiskAssets: arr<BriefJson['highRiskAssets'][number]>(v('highRiskAssets')),
    assumptions: s.assumptions,
    suggestions: s.suggestions,
  };
}

export function reverseBundle(s: IntakeSessionState): Result<GeneratedBundle> {
  const gameId = s.reverse?.gameId ?? '';
  const brief = buildReverseBrief(s, gameId);
  const errors = validateOutput(SCHEMAS.brief, brief);
  if (errors.length > 0) return err('ERR-INT-05', 'brief suy ngược sai schema', { errors });
  const r = renderBrief(brief);
  return {
    ok: true,
    value: {
      gameId,
      files: {
        'brief/v1/brief.json': brief,
        'brief/v1/game-brief.md': r.md,
        ...(r.appendix ? { 'brief/v1/game-brief-phu-luc.md': r.appendix } : {}),
      },
      schemaReport: { ok: true, errors: [] },
      warnings: s.warnings,
      briefWordCount: r.mainWords,
    },
  };
}
