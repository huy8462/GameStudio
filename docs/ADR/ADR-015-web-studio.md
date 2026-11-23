# ADR-015: Web Studio riêng, chỉ người được mời

| Mục | Nội dung |
|---|---|
| Mã | ADR-015 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định, BRD v0.4); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-15, CH-23, BRD-08, SRS-08, TSD-08 |
| Thay thế | Không |

## Bối cảnh và lý do
Người tạo game không nên phải biết Claude Code, dòng lệnh hay cấu trúc tệp. Cần một giao diện riêng, không chỉ là skill trong Claude.

## Quyết định
GameStudio có giao diện web riêng (Web Studio): chat/mô tả để sinh và sửa game, xem trước 3D trực tiếp, trình chỉnh sửa trực quan (cảnh, NPC, động vật), quản lý người dùng, lưu trữ có phiên bản, chia sẻ và xuất bản link chơi thử. Chỉ người được mời dùng (CH-23).

## Hệ quả
- Cần backend, CSDL, kho đối tượng, hàng đợi và worker build; GD-05 (không backend) không còn đúng. Công nghệ ở ADR-027…032.
- Một nguồn sự thật: bộ JSON game dùng chung cho chat, editor, CLI, Claude Code; engine runtime là thư viện dùng chung cho xem trước, editor và bản xuất bản.
- Diễn giải tác động lên ADR-002 và ADR-007 ghi ở BRD-00 §6 (cần Huy xác nhận): QĐ-02 áp dụng cho quy trình phát triển; QĐ-07 vẫn giữ.
- Huy chốt 23/11/2026: phát triển chủ yếu qua gói Max; Web Studio là kiến trúc đích, làm từ W1 sau G-E1.

## Phương án đã loại
Chỉ dùng Claude Code làm giao diện tạo game; mở Web Studio công khai.
