---
description: Tạo ADR mới từ mẫu, số kế tiếp
argument-hint: <tiêu đề quyết định>
---

Tạo ADR cho: $ARGUMENTS (EP-DEV-04, SCH-DEV-07, FR-DEV-11).

1. Số kế tiếp sau số lớn nhất trong `docs/ADR/ADR-*.md`.
2. Chép `.claude/templates/adr.md` thành `docs/ADR/ADR-nnn-<slug-khong-dau>.md`; trạng thái `Đề xuất` cho tới khi Huy chốt.
3. Nếu thay quyết định cũ: điền trường "Thay thế"; **không sửa ADR cũ**, chỉ ghi chú ở `docs/ADR/README.md`.
4. Thêm dòng vào bảng `docs/ADR/README.md`.
