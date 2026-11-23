# ADR-003: Game do người dùng mô tả

| Mục | Nội dung |
|---|---|
| Mã | ADR-003 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-03, BRD-01, SRS-01 |
| Thay thế | Không |

## Bối cảnh và lý do
Engine phải dùng lại cho nhiều game; không gắn với thể loại, bối cảnh hay phong cách cố định như Thiền viện online.

## Quyết định
Có bước tiếp nhận mô tả (`/new-game`, `@gamestudio/intake`): từ mô tả sinh `game-brief.md` một trang và dữ liệu khởi tạo (`game.json`, `world.json`, `palette.json`…), hỏi người dùng xác nhận trước khi dựng. Game mẫu ở E6–E7 cũng làm theo cách này.

## Hệ quả
- Brief có máy trạng thái `Nhap → ChoXacNhan → DaXacNhan(vN)`; build từ chối khi brief chưa xác nhận (FR-INT-17, mã thoát 3).
- Engine theo hướng dữ liệu: mọi giá trị game nằm trong `games/<id>/data/**` hợp lệ schema.
- Một gói intake dùng chung cho CLI và Web Studio (`LlmClient` tiêm từ ngoài, TSD-01).

## Phương án đã loại
Engine chuyên một thể loại; dựng game trực tiếp từ mô tả không qua bước xác nhận.
