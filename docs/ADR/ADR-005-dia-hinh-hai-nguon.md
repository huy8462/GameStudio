# ADR-005: Địa hình hai nguồn (thật và thủ tục)

| Mục | Nội dung |
|---|---|
| Mã | ADR-005 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-05, BRD-02, SRS-02 |
| Thay thế | Không |

## Bối cảnh và lý do
Ở Thiền viện online, địa hình do AI 3D sinh ra xấu; địa hình sinh bằng code từ DEM cộng xói mòn đẹp hơn. Game mới có thể đặt ở nơi có thật hoặc thế giới tưởng tượng.

## Quyết định
Module `world`/`terrain` có hai bộ nạp: dữ liệu thật (OSM + DEM) và sinh thủ tục, cùng xuất một định dạng trung gian (heightmap + mask + vector đường/nước). Trộn được: nền DEM thật, chi tiết thêm bằng noise thủ tục.

## Hệ quả
- Công cụ cụ thể ở ADR-025 (numpy, rasterio, Copernicus GLO-30, Overpass/Geofabrik).
- Ghi nguồn OSM (ODbL) và Copernicus trong provenance và màn hình credit (BR-45).
- Bước build tất định theo seed (QT-WLD-01).

## Phương án đã loại
Chỉ một nguồn; địa hình do AI 3D sinh.
