# ADR-012: Được dùng mô hình 3D CC0, ưu tiên trước generator

| Mục | Nội dung |
|---|---|
| Mã | ADR-012 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-12, BRD-03 §3, QT-03-02 |
| Thay thế | Không; **bổ sung và nới** ADR-008 |

## Bối cảnh và lý do
Nhân vật và tượng là phần asset bằng code yếu nhất (brief §4.5). Mô hình CC0 có sẵn giảm rủi ro mà vẫn không dùng AI 3D.

## Quyết định
Thứ tự nguồn khi cần asset 3D: (1) mô hình CC0 hợp phong cách mô tả, (2) generator code của Claude, (3) chỉnh mô hình CC0 bằng code/Blender cho khớp. Vẫn không dùng Meshy/Tripo.

## Hệ quả
- Mô hình CC0 đi qua `asset-import`: kiểm license CC0, chuẩn hoá scale/pivot/trục, decimate và LOD theo ngân sách A56, đồng bộ vật liệu với bảng màu, gắn khung xương dùng chung nếu là nhân vật, ghi provenance (nguồn, URL, tác giả, ngày tải).
- Mô hình CC0 vẫn qua cổng turntable 4 góc và ngân sách A56.
- Agent `asset-designer` và skill gốc đã sửa (E0-01) theo thứ tự này.

## Phương án đã loại
Chỉ dùng generator (rủi ro chất lượng nhân vật); AI 3D (ADR-008).
