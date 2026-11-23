# ADR-032: Triển khai

| Mục | Nội dung |
|---|---|
| Mã | ADR-032 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-17, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Một máy chủ, ít vận hành.

## Quyết định
**Docker Compose** trên Ubuntu Server 24.04 LTS; **Caddy** (HTTPS tự động, HSTS); sao lưu **restic** ra vị trí ngoài máy; giám sát bằng endpoint `/healthz` + Uptime Kuma.

## Hệ quả
Toàn bộ dịch vụ chạy trên một máy chủ Linux; quay lui bằng đổi tag ảnh; sẵn sàng theo giờ làm việc, không cam kết HA (TSD-00 mục 9, TSD-08 mục 8).

## Phương án đã loại
Kubernetes (quá tải cho quy mô).
