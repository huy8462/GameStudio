---
description: Đo nhanh hiệu năng (fps, draw call, tri, bộ nhớ) so ngân sách tier Vừa
argument-hint: <gameId> [zoneId]
---

Perf snapshot cho: $ARGUMENTS (QT-RTM-02, ALG-GEN-03).

Trạng thái: **chưa có ở E0**. Với player Unity: theo skill `engine-unity-perf` (`?perf=1`, `check-local.mjs` cục bộ, đo A56 qua poc khi Huy đồng ý); báo số liệu dạng bảng ngắn.

Khi đã có `engine qa --perf`: chạy giả lập viewport A56 (412 × 915, DPR theo tier), so `budgets.json`: ≤ 0,9 Pass, ≤ 1,0 Warn, > 1,0 Fail.
