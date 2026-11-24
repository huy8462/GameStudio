---
description: Làm tiếp một game - tóm tắt tiến độ ≤ 15 dòng và đề xuất phiếu tiếp theo
argument-hint: <gameId> [yêu cầu]
---

Làm tiếp game: $ARGUMENTS (FR-DEV-26, ALG-DEV-11, EP-DEV-07).

Đã có từ E1 (T-0014, AC-CR01-12):

1. Chạy `pnpm engine status --game games/<id> --json`: một dòng `status/1` (SRS-04 §6.6) gồm `stage`, `zones[].staleSteps`, `flags`, `next`. Chỉ đọc, không mô hình, không mạng.
2. Đọc `games/<id>/handoff.md` nếu có. **Không** đọc `games/<id>/data/**` hay `build/**`: mọi điều cần biết nằm trong báo cáo tiến độ.
3. In ≤ 15 dòng: giai đoạn, zone cần build lại (bước nào, ước lượng), cờ, việc tiếp theo (`next.label` + lệnh `engine <next.action> <next.args>`), rồi bản nháp phiếu tiếp theo (`/ticket`).
4. Việc tiếp là build: đề xuất `pnpm engine build --game games/<id> --stale --dry-run` trước, rồi `--stale`.
5. Yêu cầu mở rộng phạm vi → phiếu có bước tạo đề xuất kèm `briefUpdate`, không sửa brief trực tiếp.
