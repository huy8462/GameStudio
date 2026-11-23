# ADR-013: Chiến đấu và săn bắt là tính năng tuỳ chọn

| Mục | Nội dung |
|---|---|
| Mã | ADR-013 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định, BRD v0.3); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-13, BRD-06, SRS-06, TSD-06 |
| Thay thế | Không |

## Bối cảnh và lý do
Có game cần chiến đấu/săn bắt động vật, có game không. Tính năng không dùng không được làm nặng bản game.

## Quyết định
Chiến đấu và săn bắt do người dùng lựa chọn trong mô tả game; engine hỗ trợ dưới dạng tính năng tuỳ chọn, **mặc định tắt**.

## Hệ quả
- `/new-game` nhận diện yêu cầu chiến đấu/săn bắt và ghi vào `game.json`; brief nêu rõ để người dùng xác nhận (BR-75).
- Mã `combat` là chunk riêng, chỉ nạp bằng `import()` khi cờ bật; packager chỉ chép chunk khi bật; không chi phí khi tắt (TSD-00 §2.4 #7). ESLint chặn import tĩnh `combat/**` (E0-02).
- Công thức sát thương mặc định `max(1, atk + weapon - def)` qua `@gamestudio/expr` (SRS-06 v1.1).

## Phương án đã loại
Chiến đấu luôn có trong engine; không hỗ trợ chiến đấu.
