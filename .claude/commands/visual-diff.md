---
description: So ảnh góc chuẩn với baseline (SSIM, pixelmatch), chỉ xem 2–4 ảnh lệch nhất
argument-hint: <gameId> [zoneId]
---

Visual diff cho: $ARGUMENTS (ADR-033, FR-DEV-21).

Trạng thái: **chưa có ở E0** (làm ở E3 cùng visual regression baseline). Không có thì dừng, báo "cần phiếu E3".

Khi đã có: đọc báo cáo JSON (SSIM từng góc), chỉ mở 2–4 ảnh SSIM thấp nhất; không tự cập nhật baseline.
