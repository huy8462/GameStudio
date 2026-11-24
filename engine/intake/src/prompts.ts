// Prompt có phiên bản (MOD-INT-16, DDD-01 §10: system = prompt + luật bám mô tả QT-GEN-03; mô tả gốc đặt trong messages).
// Khác DDD: prompt là hằng TS thay vì prompts/*.md (thư viện không đọc tệp). Đổi nội dung → tăng version.
import type { LlmTask } from './llm/types.js';

const BAM_MO_TA = `Luật bám mô tả (QT-GEN-03, QT-INT-03, QĐ-11):
- Chỉ ghi điều người dùng nói. Mỗi giá trị "tu_mo_ta" phải kèm "evidence" là đoạn TRÍCH NGUYÊN VĂN từ mô tả.
- Không bịa tính năng. Chiến đấu, săn bắt mặc định tắt nếu mô tả không nói rõ (QT-INT-04).
- Không rõ thì để "thieu"; hai ý trái nhau thì "mau_thuan".
- Trả JSON đúng outputSchema, không thêm chữ ngoài JSON.`;

export const PROMPTS: Record<LlmTask, { version: string; text: string }> = {
  analyze: {
    version: 'analyze@1',
    text: `Bạn phân tích mô tả một game web 3D (tiếng Việt) thành các trường của brief.
Trường: title, genre, camera ('first_person'|'third_person'), setting.place, setting.era, setting.season,
setting.timeOfDay (mảng), setting.realPlace (boolean), artStyle (chuỗi một câu), coreLoop (3–5 bước), player,
npcs [{name, role, count}], animals [{species, count}], features.combat, features.hunting (boolean),
features.dialogueMode ('static'), scale ({zones, areaKm2}), highRiskAssets.
Mỗi trường: {value, status: 'tu_mo_ta'|'gia_dinh'|'thieu'|'mau_thuan', evidence: [trích nguyên văn]}.
${BAM_MO_TA}`,
  },
  clarify: {
    version: 'clarify@1',
    text: `Bạn viết câu hỏi làm rõ ngắn (tiếng Việt, ≤ 25 từ) cho đúng các trường được giao, mỗi câu 2–4 lựa chọn.
Mỗi lựa chọn có id (a-z0-9_-), label ngắn và value đúng kiểu của trường.
Không hỏi trường khác; không gợi ý tính năng người dùng không nhắc.
${BAM_MO_TA}`,
  },
  brief: {
    version: 'brief@1',
    text: `Bạn viết brief.json cho game từ các trường đã chốt (phân tích + câu trả lời + giả định).
Giữ nguyên giá trị đã chốt; chỉ viết lời cho title, genre, artStyle.summary, coreLoop, player, tên NPC.
Phần chính ngắn gọn (≤ 400 từ). "assumptions" giữ nguyên danh sách được giao.
${BAM_MO_TA}`,
  },
  repair: {
    version: 'repair@1',
    text: `Bạn sửa một tệp JSON cho khớp schema. Chỉ sửa các chỗ trong danh sách lỗi, giữ nguyên phần còn lại.
Trả về toàn bộ tệp đã sửa, đúng outputSchema.`,
  },
};
