---
description: Nhập game có sẵn (thư mục hoặc gói zip), kiểm và đề xuất nâng cấp
argument-hint: <thư mục | gói.zip>
---

Nhập game: $ARGUMENTS (FR-DEV-27, ALG-DEV-12, EP-DEV-08; FR-CLI-11, T-0016).

1. `pnpm engine import <src> --json` (cập nhật game đã có: thêm `--into <id>`). Đọc một dòng `import/1`, trình dạng bảng: `result`, `gameId`, `counts`, `problems`, asset `pendingReview`.
2. `result = chan` (thoát 4): dừng, nêu từng `problems[]` (code, path, lý do). Không ghi gì vào `games/`.
3. Có `brief` trong báo cáo (game chưa có brief, PSC-INT-13):
   - `brief.handoff`: làm theo skill `engine-intake` (task `reverse_brief`), rồi `pnpm engine brief draft --game <id> --json`.
   - `brief.questions`: hỏi Huy nguyên văn; ghi câu trả lời ra tệp JSON rồi `engine brief draft --game <id> --answers <tệp>`.
   - `brief.status = ChoXacNhan`: trình `brief.preview` (game-brief.md) và `fieldSources` cho Huy duyệt. Chỉ khi Huy đồng ý mới `pnpm engine brief confirm --game <id>`. Không bao giờ tự xác nhận (QT-INT-09).
4. Sau xác nhận: `pnpm engine status --game games/<id>`; build bằng `engine build --stale`.
5. `canNangCap` (chưa xảy ra ở schema bản 1): đề xuất phiếu `engine upgrade`.

Không chạy mã nào trong game nhập (`scripts/` chỉ được chép).
