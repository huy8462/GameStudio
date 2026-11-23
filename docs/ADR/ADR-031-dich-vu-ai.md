# ADR-031: Dịch vụ AI

| Mục | Nội dung |
|---|---|
| Mã | ADR-031 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-16, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Mô hình mạnh nhất cho phần cần suy luận, mô hình nhỏ cho phần đông lượt.

## Quyết định
SDK chính thức `@anthropic-ai/sdk`; mặc định `claude-opus-5-5` cho tiếp nhận/đề xuất thay đổi/viết nháp kịch bản, `claude-haiku-5-5` cho hội thoại NPC (mô hình nhỏ, OI-DLG-04); đầu ra JSON bằng **structured outputs** (`output_config.format`); `@google/genai` cho Gemini; ElevenLabs qua REST; mô hình theo loại việc cấu hình được trên SCR-WEB-13.

## Hệ quả
Khoá Claude/Gemini/ElevenLabs chỉ nằm trong `ai-gateway`; chi phí mỗi lần gọi được ghi và tính hạn mức (TSD-08 ALG-WEB-05). Quản trị đổi mô hình theo loại việc mà không sửa mã.

## Phương án đã loại
Gọi trực tiếp từ client (vi phạm QT-GEN-04).
