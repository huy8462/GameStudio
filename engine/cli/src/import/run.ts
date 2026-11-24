// `engine import` (FR-CLI-11, ALG-CLI-07, SEQ-CLI-03, PSC-CLI-07; EP-CLI-03): nguồn → kiểm (import/1) → chép → thiếu brief
// thì suy brief nháp (PSC-INT-13, handoff). 'chan' → thoát 4 và KHÔNG ghi gì. Thoát: 0 xong (đã có brief);
// 3 brief nháp chờ handoff/trả lời/xác nhận; 4 dữ liệu (ERR-CLI-03, ERR-RTM-03/04, ERR-INT-09); 10 lỗi khác.
import { validate } from '@gamestudio/schema';

import { EXIT } from '../exit-codes.js';
import { runReverseBrief } from '../brief/run-reverse.js';
import { existingGameIds } from '../new-game/session-dir.js';
import type { Clock } from '../orchestrator/types.js';
import { checkImport, type ImportReport } from './checks.js';
import { placeInto, placeNew } from './place.js';
import { readSource } from './unpack.js';

export interface ImportOptions {
  src: string;
  into?: string;
  gamesDir: string;
  cwd: string;
  engineVersion: string;
  clock: Clock;
}

const EMPTY: Omit<ImportReport, 'problems'> = {
  schema: 'import/1',
  result: 'chan',
  gameId: null,
  engineVersion: null,
  schemaVersion: null,
  hasBrief: false,
  counts: { zones: 0, npcs: 0, animals: 0, assets: 0 },
  assets: { missingProvenance: [], pendingReview: [] },
};

export async function runImport(
  o: ImportOptions,
): Promise<{ exit: number; report: ImportReport; warnings: string[]; backup?: string }> {
  const src = readSource(o.src);
  if (!src.ok) return { exit: EXIT.DATA, report: { ...EMPTY, problems: [src.problem] }, warnings: [] };
  const warnings = src.skipped.map((d) => `Bỏ qua ${d} (không nhập: tạo lại được hoặc của máy khác).`);
  const { report } = checkImport(src.files, {
    ...(o.into !== undefined ? { into: o.into } : {}),
    engineVersion: o.engineVersion,
    existingIds: existingGameIds(o.gamesDir),
  });
  const errs = validate('import', report);
  if (errs.length > 0) throw new Error(`import/1 sai schema: ${JSON.stringify(errs)}`);
  if (report.result === 'chan' || report.gameId === null) return { exit: EXIT.DATA, report, warnings };

  const id = report.gameId;
  let backup: string | undefined;
  let gameDir: string;
  if (o.into !== undefined) {
    const p = placeInto(o.gamesDir, id, src.files, o.clock.now());
    gameDir = p.dest;
    backup = p.backup;
    warnings.push(`Dữ liệu cũ giữ ở games/${id}/${p.backup}/.`);
  } else gameDir = placeNew(o.gamesDir, id, src.files);
  if (report.assets.pendingReview.length > 0)
    warnings.push(`${report.assets.pendingReview.length} asset thiếu provenance: chờ duyệt trước khi xuất bản.`);
  if (report.hasBrief) return { exit: EXIT.OK, report, warnings, ...(backup ? { backup } : {}) };

  const b = await runReverseBrief({ gameDir, gameId: id, cwd: o.cwd, clock: o.clock });
  warnings.push(...b.report.warnings);
  const { warnings: _w, ...brief } = b.report;
  return { exit: b.exit, report: { ...report, brief }, warnings, ...(backup ? { backup } : {}) };
}
