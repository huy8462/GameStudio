// computeStatus (DDD-00 PSC-GEN-05, STM-GEN-01; SRS-04 §6.6, SRS-00 §4.4): báo cáo tiến độ status/1 tính lại từ dữ liệu, không lưu.
import type { NextAction, Stage, StatusInputs, StatusReport, ZoneStatus } from './types.js';

/** Thứ tự giai đoạn STM-GEN-01 (xét từ trên xuống, lấy dòng đầu đúng). */
export const STAGES: readonly Stage[] = [
  'TaoMoi',
  'ChoXacNhanBrief',
  'ChoDuyetStyle',
  'ChuaBuild',
  'CanBuild',
  'ChuaQA',
  'SanSangXuatBan',
  'DaXuatBan',
];

export const STAGE_LABEL: Readonly<Record<Stage, string>> = {
  TaoMoi: 'Đang tạo game (còn câu hỏi làm rõ)',
  ChoXacNhanBrief: 'Chờ xác nhận brief',
  ChoDuyetStyle: 'Chờ duyệt style bible',
  ChuaBuild: 'Chưa build',
  CanBuild: 'Cần build lại phần đã đổi',
  ChuaQA: 'Chưa QA bản build hiện tại',
  SanSangXuatBan: 'Sẵn sàng xuất bản',
  DaXuatBan: 'Đã xuất bản, không có thay đổi',
};

function zoneStatus(z: string, i: StatusInputs): ZoneStatus {
  const nodes = i.nodes.filter((n) => n.zone === z || n.zone === null);
  const keys = new Set(nodes.map((n) => n.key));
  const built = nodes.every((n) => i.cache.some((e) => `${e.step}@${e.zone ?? '-'}` === n.key));
  const stale = i.stale.filter((s) => keys.has(s.key));
  const staleSteps = [...new Set(stale.map((s) => s.step))];
  const qa = i.qaReports.find((q) => q.zone === z);
  const zs: ZoneStatus = { id: z, built, staleSteps, qa: qa ? (stale.length > 0 ? 'cu' : qa.result) : 'chua' };
  if (staleSteps.length > 0) zs.estimateMinutes = Math.max(1, Math.ceil(stale.reduce((t, s) => t + s.estS, 0) / 60));
  return zs;
}

function stageOf(i: StatusInputs, zones: ZoneStatus[]): Stage {
  if (i.pendingIntake && !i.brief) return 'TaoMoi';
  if (!i.brief || i.brief.status !== 'DaXacNhan') return 'ChoXacNhanBrief';
  if (i.style === 'ChoDuyet') return 'ChoDuyetStyle';
  if (i.stale.some((s) => s.reason === 'never') || zones.some((z) => !z.built)) return 'ChuaBuild';
  if (i.stale.length > 0) return 'CanBuild';
  if (zones.some((z) => z.qa !== 'pass')) return 'ChuaQA';
  const live = i.publications.filter((p) => !p.takenDown);
  if (live.length === 0 || i.counts.versionsSincePublish > 0) return 'SanSangXuatBan';
  return 'DaXuatBan';
}

function nextOf(stage: Stage, i: StatusInputs, zones: ZoneStatus[]): StatusReport['next'] {
  const n = (action: NextAction, args: string, label: string): StatusReport['next'] => ({ action, args, label });
  if (i.canNangCap) return n('upgrade', '', 'Nâng cấp dữ liệu lên engine/schema hiện hành (engine upgrade)');
  switch (stage) {
    case 'TaoMoi':
      return n(
        'answer',
        `--resume ${i.pendingIntake?.sessionId ?? ''}`,
        `Trả lời ${i.pendingIntake?.pendingQuestions ?? 0} câu hỏi làm rõ`,
      );
    case 'ChoXacNhanBrief':
      return n('confirm_brief', '', 'Đọc và xác nhận brief');
    case 'ChoDuyetStyle':
      return n('approve_style', '', 'Duyệt style bible và bảng màu');
    case 'ChuaBuild':
    case 'CanBuild': {
      const todo = zones.filter((z) => z.staleSteps.length > 0);
      const mins = todo.reduce((t, z) => Math.max(t, z.estimateMinutes ?? 0), 0);
      const only = todo.length === 1 && todo[0] ? ` --zone ${todo[0].id}` : '';
      const what = todo.length === 1 && todo[0] ? `zone ${todo[0].id}` : `${todo.length} zone`;
      return n('build', `--stale${only}`, `Build ${stage === 'ChuaBuild' ? '' : 'lại '}${what} (khoảng ${mins} phút)`);
    }
    case 'ChuaQA':
      return n('qa', '--level=nhe', 'Chạy QA nhẹ cho bản build hiện tại');
    case 'SanSangXuatBan':
      return n('publish', '', 'Xuất bản bản mới');
    default:
      return n('none', '', 'Không có việc cần làm');
  }
}

export function computeStatus(i: StatusInputs): StatusReport {
  const zones = i.zones.map((z) => zoneStatus(z, i));
  const stage = stageOf(i, zones);
  const pub = [...i.publications].filter((p) => !p.takenDown).sort((a, b) => b.version - a.version)[0];
  const flags: StatusReport['flags'] = {
    deXuatChoDuyet: i.counts.proposalsPending,
    assetChoDuyet: i.counts.assetsPending,
    jobLoi: i.counts.jobsFailed,
    canNangCap: i.canNangCap,
    thieuProvenance: i.counts.missingProvenance,
    thayDoiChuaXuatBan: i.counts.versionsSincePublish,
    ...(i.counts.lockedBy ? { dangKhoaBoi: i.counts.lockedBy } : {}),
  };
  return {
    schema: 'status/1',
    gameId: i.gameId,
    dataVersion: i.dataVersion,
    stage,
    brief: i.brief,
    style: i.style,
    zones,
    flags,
    lastPublication: pub ? { version: pub.version, dataVersion: pub.dataVersion, chuaDat: pub.notMet } : null,
    pendingIntake: i.pendingIntake,
    next: nextOf(stage, i, zones),
  };
}
