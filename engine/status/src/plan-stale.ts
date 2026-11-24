// planStale (DDD-00 PSC-GEN-05, ALG-GEN-05; DDD-04 PSC-CLI-05): duyệt nút theo thứ tự tô-pô, so inputHash mong đợi với
// cache/index.json. Băm do nơi gọi tiêm (`hashOf`) để dùng ĐÚNG công thức của build (PSC-GEN-02), nên "cần build" trên
// báo cáo luôn khớp việc build --stale sẽ làm.
import DEFAULTS from './default-durations.json' with { type: 'json' };
import type { CacheIndexEntry, PlanNode, StaleItem, Tier } from './types.js';

/** CFG-GEN-06: phút mặc định mỗi bước khi chưa có lịch sử (DDD-00 PSC-GEN-03 DEFAULT_MIN). */
export const DEFAULT_MINUTES: Readonly<Record<string, number>> = DEFAULTS;

const median = (xs: number[]): number | undefined => {
  if (xs.length === 0) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

/** Giây ước lượng: trung vị durationS của bước trong chỉ mục (≥ 1 mục), không thì mặc định. */
export function estimateSeconds(step: string, cache: readonly CacheIndexEntry[]): number {
  return median(cache.filter((e) => e.step === step).map((e) => e.durationS)) ?? (DEFAULT_MINUTES[step] ?? 1) * 60;
}

export interface PlanStaleOptions {
  tier: Tier | null;
  /**
   * inputHash mong đợi của nút khi biết outputHash của mọi phụ thuộc (khoá → outputHash). Trả undefined nếu không tính
   * được (vd thiếu dữ liệu). Không gọi khi có phụ thuộc còn cũ.
   */
  hashOf: (node: PlanNode, upstream: Readonly<Record<string, string>>) => string | undefined;
}

export function planStale(
  nodes: readonly PlanNode[],
  cache: readonly CacheIndexEntry[],
  o: PlanStaleOptions,
): StaleItem[] {
  const idx = new Map<string, CacheIndexEntry>();
  for (const e of cache) if ((e.tier ?? null) === o.tier) idx.set(`${e.step}@${e.zone ?? '-'}`, e);
  const stale = new Set<string>();
  const out: StaleItem[] = [];
  for (const n of nodes) {
    const e = idx.get(n.key);
    const upStale = n.deps.some((k) => stale.has(k) || !idx.has(k));
    let reason: StaleItem['reason'] | null;
    let inputHash = '';
    if (upStale) reason = e ? 'upstream_stale' : 'never';
    else {
      const up = Object.fromEntries(n.deps.map((k) => [k, idx.get(k)?.outputHash ?? '']));
      inputHash = o.hashOf(n, up) ?? '';
      reason = !e ? 'never' : e.inputHash !== inputHash ? 'input_changed' : null;
    }
    if (reason) {
      stale.add(n.key);
      out.push({
        key: n.key,
        step: n.step,
        zone: n.zone,
        tier: o.tier,
        reason,
        inputHash,
        estS: estimateSeconds(n.step, cache),
      });
    }
  }
  return out;
}
