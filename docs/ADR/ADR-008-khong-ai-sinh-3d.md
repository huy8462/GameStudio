# ADR-008: Không dùng AI sinh 3D; asset 3D bằng code

| Mục | Nội dung |
|---|---|
| Mã | ADR-008 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-08, RB-05, QT-03-01 |
| Thay thế | Không (được nới bởi ADR-012) |

## Bối cảnh và lý do
Huy quyết định không dùng Meshy hay Tripo. Asset sinh bằng code mạnh với vật thể cứng, có quy luật (kiến trúc, đá, đồ vật, địa hình, cây), yếu hơn với vật thể hữu cơ chi tiết.

## Quyết định
Không dùng dịch vụ AI sinh 3D (Meshy, Tripo). Asset 3D sinh bằng code: hình học thủ tục Three.js/TypeScript hoặc script Python cho Blender headless, cùng texture thủ tục. Bỏ skill `threejs-3d-generator`.

## Hệ quả
- Đã gỡ `threejs-3d-generator`, mọi tham chiếu Tripo và `TRIPO_API_KEY` khỏi skill gốc (E0-01, `UPSTREAM.md`).
- Generator tham số viết một lần cho mỗi họ asset; biến thể là JSON tham số + seed (asset-forge, E4).
- Asset rủi ro cao (nhân vật, tượng) được nêu rõ trong brief; giảm rủi ro theo brief §4.5 và ADR-012.
- Kiểm thử TC-AST-09: không có `meshy`/`tripo` trong `.claude/**`, cấu hình AI.

## Phương án đã loại
Meshy, Tripo và dịch vụ AI 3D khác.
