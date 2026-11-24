# @gamestudio/status

Tiến độ game và kế hoạch build lại (MOD-GEN-20, 21; DDD-00 §3.7, ALG-GEN-05; CR-01; T-0014). Thuần TS: không I/O, không mạng, không mô hình. Mọi dữ liệu do nơi gọi nạp sẵn (CLI: `engine/cli/src/status/`, `orchestrator/stale.ts`; web sau W1).

## API

| Hàm | Việc |
|---|---|
| `planStale(nodes, cache, {tier, hashOf})` | Duyệt nút (bước, zone) theo thứ tự tô-pô, so `inputHash` mong đợi với `cache/index.json`: `never` / `input_changed` / `upstream_stale`; ước lượng giây = trung vị `durationS` của bước, không có thì `default-durations.json` (CFG-GEN-06) |
| `computeStatus(inputs)` | Báo cáo `status/1` (SRS-04 §6.6): giai đoạn STM-GEN-01, zone (`built`, `staleSteps`, `estimateMinutes`, `qa`), cờ, `next` |
| `summarizeVi(report)` | Tóm tắt ≤ 6 dòng tiếng Việt (dùng cho `engine status`, `/resume-game`) |

`hashOf(node, upstream)` do nơi gọi tiêm, phải là **đúng** công thức `inputHash` của build (PSC-GEN-02), để "cần build" trên báo cáo khớp việc `engine build --stale` sẽ làm.

## Giai đoạn (STM-GEN-01)

`TaoMoi` (phiên tạo game còn câu hỏi, chưa brief) → `ChoXacNhanBrief` → `ChoDuyetStyle` → `ChuaBuild` (có nút chưa từng build) → `CanBuild` (có nút cũ) → `ChuaQA` → `SanSangXuatBan` → `DaXuatBan`. `canNangCap` → `next = upgrade`.

## Test

`src/status.test.ts` (planStale: never/input_changed/upstream_stale/tier; computeStatus từng giai đoạn; tóm tắt ≤ 6 dòng).
