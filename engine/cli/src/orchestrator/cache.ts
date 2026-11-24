// Cache bước build theo nội dung (MOD-CLI-03, IF-CLI-03, DTO-CLI-04): build/<id>/cache/<step>/<hex>/{out/, meta.json}.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CacheMeta, StepId } from './types.js';

const hex = (hash: string): string => hash.replace(/^sha256:/, '');

export class StepCache {
  constructor(readonly cacheDir: string) {}

  entryDir(step: StepId, inputHash: string): string {
    return join(this.cacheDir, step, hex(inputHash));
  }

  outDir(step: StepId, inputHash: string): string {
    return join(this.entryDir(step, inputHash), 'out');
  }

  /** Hit chỉ kiểm meta.json (NFR-CLI-01): có và inputHash khớp. */
  get(step: StepId, inputHash: string): CacheMeta | undefined {
    const metaPath = join(this.entryDir(step, inputHash), 'meta.json');
    if (!existsSync(metaPath)) return undefined;
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as CacheMeta;
      return meta.inputHash === inputHash ? meta : undefined;
    } catch {
      return undefined;
    }
  }

  /** Thư mục làm việc tạm cho một lần chạy; xoá sạch nếu còn sót. */
  prepareTmp(step: StepId, inputHash: string, runId: string): { outDir: string; tmpDir: string } {
    const base = join(this.cacheDir, '.tmp', `${step}-${hex(inputHash).slice(0, 16)}-${runId}`);
    rmSync(base, { recursive: true, force: true });
    const outDir = join(base, 'out');
    const tmpDir = join(base, 'tmp');
    mkdirSync(outDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });
    return { outDir, tmpDir };
  }

  /** Đưa đầu ra vào cache: đổi tên nguyên tử thư mục out, rồi ghi meta.json (meta có = mục cache hoàn chỉnh). */
  commit(step: StepId, inputHash: string, tmpOutDir: string, meta: CacheMeta): string {
    const dir = this.entryDir(step, inputHash);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const out = join(dir, 'out');
    renameSync(tmpOutDir, out);
    const metaTmp = join(dir, 'meta.json.tmp');
    writeFileSync(metaTmp, `${JSON.stringify(meta, null, 2)}\n`);
    renameSync(metaTmp, join(dir, 'meta.json'));
    rmSync(join(tmpOutDir, '..'), { recursive: true, force: true });
    return out;
  }

  discard(tmpOutDir: string): void {
    rmSync(join(tmpOutDir, '..'), { recursive: true, force: true });
  }
}
