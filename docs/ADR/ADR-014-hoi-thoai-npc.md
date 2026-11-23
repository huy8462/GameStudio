# ADR-014: Hội thoại NPC tĩnh, AI khi chạy là tuỳ chọn

| Mục | Nội dung |
|---|---|
| Mã | ADR-014 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định, BRD v0.3); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-14, BRD-07, SRS-07, TSD-07 |
| Thay thế | Không |

## Bối cảnh và lý do
Kịch bản tĩnh rẻ, tất định, chạy không cần mạng; một số game/NPC cần hội thoại linh hoạt do AI sinh.

## Quyết định
Hội thoại NPC mặc định là kịch bản tĩnh theo dữ liệu (cây thoại, điều kiện, sự kiện); có thể bật hội thoại do AI sinh khi chạy, tuỳ nhu cầu từng game/NPC. Kịch bản tĩnh luôn là đường dự phòng.

## Hệ quả
- `dialogue-ai` là chunk riêng, chỉ nạp khi bật (giống ADR-013).
- AI khi chạy chỉ đi qua cổng AI phía server (`web/ai-gateway`), không bao giờ từ trình duyệt; mô hình nhỏ `claude-haiku-5-5` (ADR-031); token phiên chơi ngắn hạn, giới hạn tần suất và hạn mức.
- `action` do AI trả chỉ thuộc danh sách trắng; game kiểm lại. Văn bản AI hiển thị bằng text node.
- Không ghi nội dung hội thoại vào log (trừ chế độ gỡ lỗi FR-DLG-17).

## Phương án đã loại
Chỉ kịch bản tĩnh; AI cho mọi hội thoại; gọi AI trực tiếp từ client.
