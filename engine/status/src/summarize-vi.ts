// summarizeVi (DDD-01 PSC-INT-15, ALG-INT-13; FR-INT-34; TC-INT-19): tóm tắt tiến độ ≤ 6 dòng tiếng Việt, không gọi mạng.
// Dùng cho `engine status` (bảng người đọc) và lệnh /resume-game (AC-CR01-12: tóm tắt ≤ 15 dòng có giai đoạn, việc tiếp).
import { STAGE_LABEL } from './compute.js';
import type { StatusReport } from './types.js';

export function summarizeVi(r: StatusReport): string[] {
  const lines: string[] = [`Game ${r.gameId}: ${STAGE_LABEL[r.stage]} (${r.stage}).`];
  if (r.pendingIntake)
    lines.push(`Phiên tạo game ${r.pendingIntake.sessionId} còn ${r.pendingIntake.pendingQuestions} câu hỏi.`);
  if (r.zones.length > 0) {
    const built = r.zones.filter((z) => z.built).length;
    const stale = r.zones.filter((z) => z.staleSteps.length > 0);
    const part =
      stale.length > 0 ? `; cần build lại: ${stale.map((z) => `${z.id} (${z.staleSteps.join(', ')})`).join('; ')}` : '';
    lines.push(`Zone: ${built}/${r.zones.length} đã build${part}.`);
  }
  const f = r.flags;
  const flags = [
    f.canNangCap ? 'cần nâng cấp engine/schema' : '',
    f.deXuatChoDuyet ? `${f.deXuatChoDuyet} đề xuất chờ duyệt` : '',
    f.assetChoDuyet ? `${f.assetChoDuyet} asset chờ duyệt` : '',
    f.jobLoi ? `${f.jobLoi} job lỗi` : '',
    f.thieuProvenance ? `${f.thieuProvenance} asset thiếu provenance` : '',
  ].filter(Boolean);
  if (flags.length > 0) lines.push(`Lưu ý: ${flags.join(', ')}.`);
  if (r.lastPublication)
    lines.push(
      `Bản xuất bản gần nhất: v${r.lastPublication.version}${r.lastPublication.chuaDat ? ' (chưa đạt QA)' : ''}.`,
    );
  lines.push(
    `Việc tiếp: ${r.next.label}${r.next.args ? ` (engine ${r.next.action === 'build' ? 'build' : r.next.action} ${r.next.args})` : ''}.`,
  );
  return lines.slice(0, 6);
}
