// Runner node (IF-CLI-02): import(entry).run(ctx) trong tiến trình; ghi ctx.json vào tmpDir để đối chiếu/gỡ lỗi.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { StepCtx, StepDef, StepReturn } from '../types.js';

/** Lỗi bước kèm mã thoát SRS-04 §7.2 (vd 4 dữ liệu, 5 môi trường, 6 dịch vụ ngoài). */
export class StepError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message);
  }
}

export type Runner = (step: StepDef, ctx: StepCtx) => Promise<StepReturn>;

function withTimeout<T>(p: Promise<T>, timeoutS: number | undefined, id: string): Promise<T> {
  if (timeoutS === undefined) return p;
  let timer: NodeJS.Timeout | undefined;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new StepError(`bước '${id}' quá thời gian ${timeoutS} s`, 10)), timeoutS * 1000);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

/** Ghi ctx.json (DTO-CLI-01) vào tmpDir, bỏ hàm progress; trả đường dẫn. */
export function writeCtxJson(ctx: StepCtx): string {
  const { progress: _progress, ...serializable } = ctx;
  const p = join(ctx.tmpDir, 'ctx.json');
  writeFileSync(p, `${JSON.stringify(serializable, null, 2)}\n`);
  return p;
}

export const runNode: Runner = async (step, ctx) => {
  writeCtxJson(ctx);
  const mod = (await import(pathToFileURL(join(step.dir, step.entry)).href)) as {
    run?: (c: StepCtx) => Promise<StepReturn | undefined> | StepReturn | undefined;
  };
  if (typeof mod.run !== 'function') throw new StepError(`bước '${step.id}': entry không xuất hàm run(ctx)`, 4);
  const r = await withTimeout(Promise.resolve(mod.run(ctx)), step.timeoutS, step.id);
  return r ?? {};
};

/** Runner chưa có ở phiếu này (python, blender: phiếu sau). */
export const notYet =
  (runner: string): Runner =>
  (step) =>
    Promise.reject(new StepError(`bước '${step.id}': runner '${runner}' chưa hỗ trợ (phiếu sau)`, 5));
