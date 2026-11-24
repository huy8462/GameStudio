// Render brief Markdown (MOD-INT-06, PSC-INT-05, QT-INT-02; mẫu SRS-01 §6.1). Phần chính > 400 từ → giả định chi tiết và
// gợi ý sang game-brief-phu-luc.md, giữ bảng tóm tắt một dòng/mục. Khác DDD: template literal thay Handlebars (không thêm
// phụ thuộc).
import { BRIEF_MAX_WORDS } from '../config.js';
import { wordCount } from '../text.js';
import type { BriefJson } from '../types.js';

const CAMERA: Record<BriefJson['camera'], string> = { first_person: 'Ngôi thứ nhất', third_person: 'Ngôi thứ ba' };
const onOff = (b: boolean): string => (b ? 'Bật' : 'Tắt');
const val = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v));

function main(b: BriefJson): string {
  const s = b.setting;
  return [
    `# ${b.title}`,
    '',
    `- **Mô tả gốc:** \`${b.sourceRef}\``,
    `- **Thể loại:** ${b.genre}`,
    `- **Góc nhìn:** ${CAMERA[b.camera]}`,
    `- **Bối cảnh:** ${s.place}; ${s.era}; mùa ${s.season}; ${s.timeOfDay.join(', ')}${s.realPlace ? ' (địa điểm thật)' : ''}`,
    `- **Phong cách mỹ thuật:** ${b.artStyle.summary}${b.artStyle.refs.length ? ` (tham chiếu: ${b.artStyle.refs.join(', ')})` : ''}`,
    `- **Người chơi:** ${b.player}`,
    '',
    '## Vòng chơi tối thiểu',
    ...b.coreLoop.map((x, i) => `${i + 1}. ${x}`),
    '',
    '## NPC và động vật',
    ...(b.npcs.length ? b.npcs.map((n) => `- ${n.name} (${n.role}) × ${n.count}`) : ['- Không có NPC']),
    ...(b.animals.length ? b.animals.map((a) => `- ${a.species} × ${a.count}`) : ['- Không có động vật']),
    '',
    '## Tính năng tuỳ chọn',
    `- Chiến đấu: ${onOff(b.features.combat)}; Săn bắt: ${onOff(b.features.hunting)}; Hội thoại: ${b.features.dialogueMode}`,
    '',
    `## Quy mô`,
    `- ${b.scale.zones} zone, ${b.scale.areaKm2} km²`,
    '',
    '## Asset rủi ro cao',
    ...(b.highRiskAssets.length
      ? b.highRiskAssets.map((r) => `- ${r.asset}: mức ${r.level}, hướng ${r.approach}`)
      : ['- Không có']),
  ].join('\n');
}

const assumptionsFull = (b: BriefJson): string[] =>
  b.assumptions.map((a) => `- \`${a.field}\` = ${val(a.value)}: ${a.reason}`);
const assumptionsShort = (b: BriefJson): string[] => b.assumptions.map((a) => `- \`${a.field}\` = ${val(a.value)}`);
const suggestions = (b: BriefJson): string[] =>
  b.suggestions.length ? b.suggestions.map((x) => `- ${x}`) : ['- Không có'];

/** Trả {md, appendix?, mainWords}. */
export function renderBrief(b: BriefJson): { md: string; appendix?: string; mainWords: number } {
  const body = main(b);
  const mainWords = wordCount(body);
  if (mainWords <= BRIEF_MAX_WORDS) {
    const md = [
      body,
      '',
      '## Giả định',
      ...(b.assumptions.length ? assumptionsFull(b) : ['- Không có']),
      '',
      '## Gợi ý (chưa áp dụng)',
      ...suggestions(b),
      '',
    ].join('\n');
    return { md, mainWords };
  }
  const md = [
    body,
    '',
    '## Giả định (tóm tắt)',
    ...assumptionsShort(b),
    '',
    'Chi tiết giả định và gợi ý: [phụ lục](game-brief-phu-luc.md)',
    '',
  ].join('\n');
  const appendix = [
    `# Phụ lục: ${b.title}`,
    '',
    '## Giả định',
    ...assumptionsFull(b),
    '',
    '## Gợi ý (chưa áp dụng)',
    ...suggestions(b),
    '',
  ].join('\n');
  return { md, appendix, mainWords };
}
