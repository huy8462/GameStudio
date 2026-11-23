# ADR-023: Điều phối build

| Mục | Nội dung |
|---|---|
| Mã | ADR-023 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-08, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Build tăng dần (FR-CLI-02), một CLI cho dev và worker.

## Quyết định
Bộ chạy bước TS trong `engine/cli`: mỗi bước khai báo `step.json` (phụ thuộc, bộ chọn đầu vào, `runner: node | python | blender`); giao thức tiến trình con JSON vào/ra (TSD-04 IF-CLI-02); cache nội dung theo SHA-256.

## Hệ quả
Dev và worker dùng cùng một đường build; mỗi bước có `step.json`, cache theo hash đầu vào (TSD-04 IF-CLI-02, IF-CLI-03). Bước mới thêm bằng phiếu, không có đường build thứ hai trên web.

## Phương án đã loại
Make/Bazel (khó đọc, Windows), Python làm điều phối (tách xa runtime TS).
