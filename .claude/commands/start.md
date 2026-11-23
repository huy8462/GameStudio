---
description: Bắt đầu phiên - bật git hook, chạy engine doctor, đọc ghi chú dự án
---

Làm theo thứ tự, báo kết quả ≤ 10 dòng (EP-DEV-04):

1. `git config core.hooksPath .githooks` (bật pre-commit, IF-DEV-05).
2. `pnpm doctor` → nếu thoát 5, nêu mục THIẾU/LỆCH và dừng ở đó.
3. Đọc `docs/handoff.md` (nếu có) và `HANDOFF-API.md` mục "Việc còn mở" + "6.1". Không đọc lịch sử chat cũ.
4. Đề xuất phiếu kế tiếp (một dòng) và mô hình khuyến nghị theo bảng trong `CLAUDE.md`.
