# ADR-011: Engine bám đúng mô tả của người dùng

| Mục | Nội dung |
|---|---|
| Mã | ADR-011 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-11, BRD-01, SRS-01 |
| Thay thế | Không |

## Bối cảnh và lý do
Đổi phong cách mỹ thuật giữa chừng ở Thiền viện online buộc làm lại toàn bộ. Người dùng là người quyết định game của mình.

## Quyết định
Bước tiếp nhận không đổi thể loại hay phong cách người dùng mô tả, không tự đề xuất phong cách khác. Khi mô tả cần asset khó sinh bằng code (nhân vật, tượng chi tiết), engine vẫn làm đúng phong cách, chỉ báo rõ mức rủi ro chất lượng và tăng đầu tư cho các asset đó.

## Hệ quả
- Brief có mục "asset rủi ro cao"; style bible và bảng màu chốt trước khi sản xuất asset (FR-INT-20…22).
- Prompt intake cấm đổi phong cách; mở rộng phạm vi sau xác nhận phải qua đề xuất thay đổi có `briefUpdate`.
- Rule `.claude/rules/games-data.md` và agent `asset-designer` nhắc luật này.

## Phương án đã loại
Engine tự "nâng cấp" phong cách cho dễ sinh asset.
