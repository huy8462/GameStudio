# ADR-028: Backend

| Mục | Nội dung |
|---|---|
| Mã | ADR-028 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-13, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Dùng lại gói TS của engine (intake, schema, expr, impact); một CSDL cho ≤ 20 người, ≤ 5 job.

## Quyết định
**Fastify** (Node 24, TS) cho `web/api` và `web/ai-gateway`; **PostgreSQL 17** + **Drizzle ORM** (migration SQL có phiên bản); hàng đợi **pg-boss** (không cần Redis); tiến độ qua `LISTEN/NOTIFY` → SSE.

## Hệ quả
Backend chỉ cần Node + PostgreSQL, không thêm Redis; hàng đợi, phiên, nhật ký, giới hạn tần suất đều nằm trong PostgreSQL (TSD-08 mục 4.2). Quy mô mục tiêu ≥ 20 người, 5 job đồng thời (đề xuất).

## Phương án đã loại
Python API (phải viết lại intake), Redis + BullMQ (thêm dịch vụ).
