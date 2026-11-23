---
description: Làm tiếp một game - tóm tắt tiến độ ≤ 15 dòng và đề xuất phiếu tiếp theo
argument-hint: <gameId> [yêu cầu]
---

Làm tiếp game: $ARGUMENTS (FR-DEV-26, ALG-DEV-11, EP-DEV-07).

Trạng thái: **chưa có ở E0** (`engine status` làm ở E1). Không có thì dừng, báo "cần phiếu E1".

Khi đã có: chạy `pnpm engine status --game <id> --json`; đọc `games/<id>/handoff.md`; **không** đọc `games/<id>/data/**`; in ≤ 15 dòng + bản nháp phiếu. Yêu cầu mở rộng phạm vi → phiếu có bước tạo đề xuất kèm `briefUpdate`, không sửa brief trực tiếp.
