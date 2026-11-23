# ADR-006: Add-on Blender kết hợp code bổ sung

| Mục | Nội dung |
|---|---|
| Mã | ADR-006 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-06, BR-46 |
| Thay thế | Không |

## Bối cảnh và lý do
Sapling Tree Gen và A.N.T. Landscape đã cho kết quả tốt ở Thiền viện online; phần còn thiếu (biến thể lá, LOD, impostor, xói mòn theo vùng) viết thêm bằng code sẽ rẻ hơn tự làm lại.

## Quyết định
Script Blender headless gọi Sapling Tree Gen và A.N.T. Landscape qua Python; phần thiếu viết thêm bằng code. Cố định phiên bản Blender và add-on, `engine doctor` kiểm.

## Hệ quả
- Phiên bản Blender: ADR-017, phần Blender thay bằng ADR-034 (Blender 5.2 LTS; add-on `sapling_tree_gen` 1.2.0, `antlandscape` 0.2.0 từ extensions.blender.org).
- `engine doctor` kiểm phiên bản, khả năng nạp và SHA-256 thư mục add-on (E0-03).
- Script Blender chạy bằng Python nhúng của Blender, giao tiếp với bộ điều phối qua JSON (IF-CLI-02).

## Phương án đã loại
Tự viết generator cây và địa hình từ đầu; dùng Blender không cố định phiên bản.
