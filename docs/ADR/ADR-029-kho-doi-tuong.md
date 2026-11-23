# ADR-029: Kho đối tượng

| Mục | Nội dung |
|---|---|
| Mã | ADR-029 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-14, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Một máy chủ; ít dịch vụ; GĐ-WEB-02 cho phép.

## Quyết định
Giao diện `ObjectStore` (get/put/list/presign); cài đặt **thư mục cục bộ** `/srv/gs-objects` do Caddy phục vụ tĩnh; có thể đổi sang S3/MinIO bằng cấu hình.

## Hệ quả
Sao lưu kho đối tượng bằng restic (TSD-08 mục 8.2); tệp riêng tư tải qua `forward_auth`. Có thể chuyển S3/MinIO bằng cấu hình nếu quy mô tăng.

## Phương án đã loại
MinIO ngay từ W1 (thêm vận hành).
