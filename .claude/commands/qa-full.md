---
description: QA đầy đủ trước cổng - visual regression, perf, bot playtest
argument-hint: <gameId> [zoneId]
---

QA đầy đủ cho: $ARGUMENTS (TSD-04, TSD-00 §10).

Trạng thái: **chưa có ở E0** (`engine qa --level=day-du` làm ở E1–E3). Không có thì dừng, báo "cần phiếu E1".

Khi đã có: `pnpm engine qa --level=day-du --game <id> --json`; tổng hợp kết quả xấu nhất; không tự chấp nhận baseline mới (cần `--accept-baseline … --reason` và Huy đồng ý).
