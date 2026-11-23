# ADR-009: Được dùng sinh ảnh (Gemini) và âm thanh (ElevenLabs)

| Mục | Nội dung |
|---|---|
| Mã | ADR-009 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-09, FR-DEV-22 |
| Thay thế | Không |

## Bối cảnh và lý do
Vật liệu, decal, ảnh tham chiếu, UI và âm thanh môi trường là nơi AI 2D/âm thanh nâng chất lượng nhiều nhất với chi phí thấp; bộ gốc đã có skill và script probe.

## Quyết định
Giữ `threejs-image-generator` (Gemini) và `threejs-audio-generator` (ElevenLabs) cho texture, decal, ảnh concept/tham chiếu, UI, âm thanh môi trường và hiệu ứng. Mỗi lần sinh ghi provenance (prompt, model, ngày).

## Hệ quả
- Khoá đặt trong biến môi trường máy dev (hoặc `/etc/gamestudio/ai.env` trên máy chủ); không bao giờ trong mã, log, tài liệu, repo.
- `engine doctor` và probe chỉ báo có/không; hook H-04 chặn đọc `.env` và lệnh in khoá; gitleaks chặn khi commit.
- Ở máy dev, khoá Gemini/ElevenLabs là **tuỳ chọn** trong `engine doctor` (chỉ cần khi sinh ảnh/âm thanh; lệch có ghi chú với PSC-DEV-06, xem `engine/cli/README.md`).
- Trong Web Studio, mọi lời gọi đi qua `web/ai-gateway` (ADR-031).
- Ảnh Gemini dùng làm tham chiếu cho generator, không gửi sang dịch vụ AI 3D (ADR-008).

## Phương án đã loại
Không dùng AI 2D/âm thanh (chất lượng thấp hơn); gọi API từ trình duyệt.
