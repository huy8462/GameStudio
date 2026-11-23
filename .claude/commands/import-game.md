---
description: Nhập game có sẵn (thư mục hoặc gói zip), kiểm và đề xuất nâng cấp
argument-hint: <thư mục | gói.zip>
---

Nhập game: $ARGUMENTS (FR-DEV-27, ALG-DEV-12, EP-DEV-08).

Trạng thái: **chưa có ở E0** (`engine import` làm ở E1). Không có thì dừng, báo "cần phiếu E1".

Khi đã có: `pnpm engine import <src> --json`; báo cáo `import/1` dạng bảng; `chan` → dừng và nêu lý do; thiếu brief → trình brief nháp để Huy duyệt rồi mới `engine brief confirm`; cần nâng cấp → đề xuất phiếu `engine upgrade`.
