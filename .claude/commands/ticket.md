---
description: Tạo phiếu phạm vi hẹp theo mẫu, có Mô hình khuyến nghị
argument-hint: <mô tả việc cần làm>
---

Tạo phiếu cho: $ARGUMENTS (EP-DEV-01, SCH-DEV-02, FR-DEV-07).

1. Số phiếu: `T-nnnn` kế tiếp trong `docs/tickets/` (bắt đầu T-0001).
2. Chép `.claude/templates/ticket.md` thành `docs/tickets/T-nnnn.md`, điền: tiêu đề, pha, `read[]`, `write[]` (glob hẹp nhất có thể), `done[]` đo được, mã truy vết.
3. Rigor (ALG-DEV-01): mặc định theo `project.yaml`; nếu một glob trong `write[]` khớp `overrides` thì lấy mức cao nhất. Ghi danh sách bắt buộc tương ứng.
4. Mô hình khuyến nghị theo bảng trong `CLAUDE.md`.
5. In đường dẫn phiếu và chèn dấu mốc `[[ticket:T-nnnn start]]` vào câu trả lời (dùng cho đo token).

Chưa có `tools/scripts/ticket-new.mjs` (E0 làm tay theo các bước trên).
