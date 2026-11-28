// T-0020 (MOD-CLI-04 metrics.ts, PSC-CLI-02 bước 9 phần texture; SRS-04 §6.3 coreZoneMB, coreTextureMax; PSC-GEN-04).
// Báo cáo texture lõi: kích thước từng tệp và tổng, so ngân sách. Vượt → fail kèm tên tệp đóng góp nhiều nhất.
import { type BudgetCheck, type CheckResult, evaluate } from '@gamestudio/schema';

import type { PackedTexture } from './textures.js';

export interface TextureBudget {
  coreTextureMax: number;
  coreZoneMB: number;
}

export interface TextureCheck extends BudgetCheck {
  /** Top 5 tệp đóng góp (PSC-CLI-02 bước 9: checks[].source). */
  source: string[];
}

export interface TextureReport {
  kind: 'packager.textures';
  result: CheckResult;
  metrics: {
    coreTextures: number;
    coreTextureMB: number;
    fullTextureMB: number;
    fallbackMB: number;
    coreTextureMaxPx: number;
  };
  checks: TextureCheck[];
  textures: PackedTexture[];
}

const MB = 1024 * 1024;
const round = (v: number, d = 3): number => Math.round(v * 10 ** d) / 10 ** d;

export function textureReport(textures: readonly PackedTexture[], budget: TextureBudget): TextureReport {
  const sum = (pick: (t: PackedTexture) => number): number => textures.reduce((s, t) => s + pick(t), 0);
  const coreMaxPx = textures.reduce((m, t) => Math.max(m, t.core.width, t.core.height), 0);
  const metrics = {
    coreTextures: textures.length,
    coreTextureMB: round(sum((t) => t.core.bytes) / MB),
    fullTextureMB: round(sum((t) => t.full.bytes) / MB),
    fallbackMB: round(sum((t) => t.fallback.bytes) / MB),
    coreTextureMaxPx: coreMaxPx,
  };
  // Texture là một phần của lõi zone: so tổng texture lõi với coreZoneMB để biết còn bao nhiêu cho mesh và âm thanh.
  const ev = evaluate(
    { coreZoneMB: metrics.coreTextureMB, coreTextureMax: coreMaxPx },
    { coreZoneMB: budget.coreZoneMB, coreTextureMax: budget.coreTextureMax },
  );
  const bySize = [...textures].sort((a, b) => b.core.bytes - a.core.bytes || (a.id < b.id ? -1 : 1));
  const checks = ev.checks.map((c): TextureCheck => {
    // Kích thước cạnh là giới hạn cứng (đúng bằng trần vẫn đạt), không dùng vùng cảnh báo 90 %.
    if (c.id === 'coreTextureMax') {
      const over = textures
        .filter((t) => Math.max(t.core.width, t.core.height) > budget.coreTextureMax)
        .map((t) => t.core.path);
      return { ...c, result: over.length > 0 ? 'fail' : 'pass', source: over.slice(0, 5) };
    }
    return { ...c, source: bySize.slice(0, 5).map((t) => t.core.path) };
  });
  const result: CheckResult = checks.some((c) => c.result === 'fail')
    ? 'fail'
    : checks.some((c) => c.result === 'warn')
      ? 'warn'
      : 'pass';
  return { kind: 'packager.textures', result, metrics, checks, textures: [...textures] };
}
