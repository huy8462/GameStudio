# ADR-010: Được dùng thư viện CC0 (vật liệu scan, HDRI)

| Mục | Nội dung |
|---|---|
| Mã | ADR-010 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-10, BRD-03, OIT-GEN-06 |
| Thay thế | Không |

## Bối cảnh và lý do
Ở Thiền viện online, vật liệu scan CC0 cùng bake ánh sáng tạo bước nhảy chất lượng lớn nhất.

## Quyết định
Module `materials` có bộ nạp CC0 (ví dụ Poly Haven: vật liệu scan, HDRI bầu trời): tải về kho cục bộ, ghi nguồn và license CC0 vào provenance, chuẩn hoá độ phân giải theo tier rồi nén KTX2. Kết hợp với vật liệu thủ tục.

## Hệ quả
- Chỉ tải từ danh sách trắng miền, chặn IP nội bộ, giới hạn kích thước (chống SSRF, TSD-00 §8). Danh sách dịch vụ CC0 ngoài Poly Haven do Huy duyệt ở E2 (OIT-GEN-06).
- Asset không có provenance coi như chưa có license, không vào bản build (QT-03-03).
- Nén KTX2 theo ADR-024.

## Phương án đã loại
Chỉ vật liệu thủ tục; tải vật liệu từ nguồn không rõ license.
