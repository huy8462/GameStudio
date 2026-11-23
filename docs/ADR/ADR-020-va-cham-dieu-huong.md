# ADR-020: Va chạm, điều hướng

| Mục | Nội dung |
|---|---|
| Mã | ADR-020 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-05, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Navmesh chuẩn ngành, RVO sẵn có; tránh engine vật lý nặng.

## Quyết định
**three-mesh-bvh** (MIT) cho truy vấn tia/khối với hình tĩnh; bộ điều khiển nhân vật viên nang tự viết; **recast-navigation-js** (MIT, WASM) để dựng navmesh ở build và truy vấn/đám đông (DetourCrowd) ở runtime.

## Hệ quả
Không có vật lý vật rắn đầy đủ; ném/rơi đơn giản tự tính. Navmesh dựng lúc build (TSD-05), WASM recast chỉ tải khi game có NPC/động vật di chuyển (TSD-00 mục 7.4).

## Phương án đã loại
Rapier/Ammo (nặng, không cần vật lý đầy đủ), A* lưới tự viết (kém với địa hình dốc).
