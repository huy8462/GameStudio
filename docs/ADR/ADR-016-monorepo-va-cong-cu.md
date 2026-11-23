# ADR-016: Monorepo và công cụ

| Mục | Nội dung |
|---|---|
| Mã | ADR-016 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-01, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Ít bề mặt; một lockfile; Claude Code dễ đọc.

## Quyết định
Monorepo (OI-DEV-02); **pnpm workspaces** cho TS, **uv** cho Python; không dùng Turborepo/Nx ở bản đầu, chạy song song bằng `pnpm -r`.

## Hệ quả
Một lệnh `pnpm install` + `uv sync` dựng toàn bộ môi trường; schema, engine, web dùng chung kiểu qua workspace. CI chạy theo gói bị ảnh hưởng để giữ thời gian ngắn. Nếu số gói tăng mạnh có thể thêm Turborepo sau mà không đổi cấu trúc.

## Phương án đã loại
Nx/Turborepo (thêm cấu hình), nhiều repo (khó đồng bộ schema).
