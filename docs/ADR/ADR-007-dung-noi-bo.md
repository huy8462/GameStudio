# ADR-007: Dùng nội bộ

| Mục | Nội dung |
|---|---|
| Mã | ADR-007 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-07, CH-23, BR-44 |
| Thay thế | Không |

## Bối cảnh và lý do
Sản phẩm phục vụ nhóm nội bộ; không phát hành ra ngoài hay thương mại hoá.

## Quyết định
Dùng nội bộ. Vẫn giữ nguyên `LICENSE` và thông báo bản quyền MIT của threejs-game-skills; ghi công trong `UPSTREAM.md`.

## Hệ quả
- Web Studio chỉ cho người được mời (CH-23); chia sẻ game trong phạm vi đó hoặc qua link chơi thử có hạn (TSD-08).
- `LICENSES.md` vẫn liệt kê nguồn dữ liệu, thư viện, dịch vụ, asset CC0 (FR-DEV-24).
- Kiểm `LICENSE` trùng `vendor/upstream` trong `tools/scripts/structure-check.mjs`.
- Repo chỉ đặt cục bộ trên máy Huy (Huy chốt 23/11/2026).

## Phương án đã loại
Phát hành công khai; bỏ LICENSE gốc.
