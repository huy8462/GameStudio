# ADR-027: Frontend Web Studio

| Mục | Nội dung |
|---|---|
| Mã | ADR-027 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-12, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Xem trước phải là đúng engine xuất bản (FR-WEB-16).

## Quyết định
**React 19 + Vite + TypeScript**, TanStack Query (dữ liệu máy chủ), Zustand (trạng thái editor + hoàn tác), **Tailwind CSS + Radix UI**, **@xyflow/react** (sơ đồ hành vi, cây thoại), Monaco (JSON thô W4); khung xem trước nhúng trực tiếp `@gamestudio/engine` (không dùng react-three-fiber).

## Hệ quả
Web Studio là SPA tĩnh do Caddy phục vụ; editor nhúng đúng bản engine của bản xuất bản qua `EditorBridge` (TSD-08 IF-WEB-05).

## Phương án đã loại
Vue/Svelte (Claude Code quen React hơn trong scaffold), R3F (tạo lớp engine thứ hai).
