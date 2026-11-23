# ADR-025: Địa hình

| Mục | Nội dung |
|---|---|
| Mã | ADR-025 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-10, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Đủ cho bbox ≤ 4 km²; COG đọc theo cửa sổ.

## Quyết định
Python: `numpy`, `rasterio` (GeoTIFF COG), `pyproj` (UTM), `shapely`, `numba` (xói mòn, chế độ một luồng, tất định); DEM từ **Copernicus GLO-30 trên AWS Open Data** (COG công khai); OSM qua **Overpass API** có cache, dự phòng trích từ **Geofabrik** (`osmium`).

## Hệ quả
Bước địa hình chạy Python 3.12 qua runner `python`; dữ liệu DEM/OSM được cache theo bbox và ghi provenance (TSD-02). Overpass có giới hạn tần suất nên có đường dự phòng Geofabrik.

## Phương án đã loại
GDAL toàn phần trong TS; dịch vụ tile thương mại.
