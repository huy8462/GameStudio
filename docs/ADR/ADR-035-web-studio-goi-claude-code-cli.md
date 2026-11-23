# ADR-035: Web Studio gọi Claude Code qua CLI, mỗi người dùng tự đăng nhập

| Mục | Nội dung |
|---|---|
| Mã | ADR-035 |
| Trạng thái | Đã chốt (Huy, 23/11/2026; OIT-ADR35-01, 02 đóng cùng ngày) |
| Ngày | 23/11/2026 |
| Người chốt | Huy |
| Nguồn | Huy chốt 23/11/2026 khi xác nhận diễn giải QĐ-15 (BRD-00 §6); QĐ-02, QĐ-07, QĐ-15 |
| Thay thế | (1) ADR-031 **phần Claude**: soạn game chuyển sang Claude Code CLI trên máy người dùng; hội thoại NPC bằng Claude (`claude-haiku-5-5`) bị bỏ. Phần Gemini và ElevenLabs của ADR-031 giữ nguyên. (2) ADR-014 **phần "AI sinh khi chạy"**: hội thoại NPC chỉ dùng kịch bản tĩnh |

## Bối cảnh và lý do
Huy xác nhận diễn giải QĐ-15: QĐ-02 (chỉ Claude Code) áp dụng cho quy trình phát triển; Web Studio gọi Claude Code qua CLI; QĐ-07 (dùng nội bộ) giữ nguyên. Về xác thực, Huy chọn mỗi người dùng tự đăng nhập Claude Code bằng tài khoản hoặc khoá của chính họ.

Điều khoản Claude Code (trang Legal and compliance, đọc 23/11/2026) đặt các ràng buộc:
- Gói Pro/Max chỉ dành cho việc dùng cá nhân thông thường. Không được dùng thông tin đăng nhập gói của Huy để phục vụ người khác.
- Chạy Claude Code trong sản phẩm hay dịch vụ của mình phải đồng ý Commercial Terms. Binary phải giữ nguyên, không gỡ hay chặn phương thức đăng nhập nào. Mỗi người dùng cuối tự xác thực bằng khoá API, gói Claude hoặc nhà cung cấp đám mây của chính họ, và tự trả phí.
- Không được thu, lưu hay chuyển tiếp thông tin đăng nhập Claude.ai hay token phiên. Việc đăng nhập phải đi qua luồng của Anthropic.

## Quyết định
1. Việc AI soạn game của Web Studio (tiếp nhận mô tả → brief + dữ liệu, đề xuất thay đổi, nháp kịch bản thoại) chạy bằng **Claude Code CLI ở chế độ không tương tác**: `claude -p --output-format json --json-schema <schema> --model <mô hình> --max-turns <n> --no-session-persistence`. Công cụ bị giới hạn bằng `--tools` hoặc `--disallowedTools`, và chạy trong thư mục làm việc riêng của phiên.
2. **Người dùng tự đăng nhập** Claude Code bằng tài khoản hoặc khoá của họ, qua luồng của Anthropic. Web Studio **không** nhận, lưu, ghi log hay chuyển tiếp thông tin đăng nhập hay token của người dùng. Chi phí tính cho chính người dùng.
3. Binary Claude Code dùng nguyên bản, cố định phiên bản trong `tools/versions.json` (`claudeCode`).
4. Đầu ra vẫn đi qua bộ kiểm JSON Schema của `@gamestudio/intake` như cũ (TSD-01). Intake giữ giao diện `LlmClient` và thêm một cài đặt `ClaudeCodeCliClient` bên cạnh `HandoffLlmClient`.
5. **Nơi chạy (OIT-ADR35-01, Huy chốt):** Claude Code chạy **trên máy của chính người dùng**. Một **chương trình cầu nối nhỏ** cài trên máy đó nhận yêu cầu từ Web Studio, gọi `claude -p …`, rồi trả JSON về. Người dùng đăng nhập Claude Code trên máy họ bằng luồng của Anthropic. Máy chủ Web Studio không chạy Claude Code và không thấy thông tin đăng nhập.
6. **Hội thoại NPC khi chơi (OIT-ADR35-02, Huy chốt):** chỉ dùng **kịch bản thoại tĩnh**; không gọi AI khi chơi. Chunk `dialogue-ai` và dịch vụ hội thoại trong `ai-gateway` không làm. Kịch bản thoại vẫn có thể được AI soạn nháp lúc làm game (qua cầu nối ở mục 5), rồi lưu thành dữ liệu tĩnh.

## Hệ quả
- **Bỏ:**
  - Khoá Claude trên máy chủ và mọi lời gọi Claude từ máy chủ; `ai-gateway` chỉ còn Gemini và ElevenLabs.
  - Hạn mức và chi phí Claude theo người dùng ở máy chủ (ALG-WEB-05 phần Claude); cấu hình mô hình theo tác vụ ở SCR-WEB-13 cho Claude. Hạn mức nay do gói hoặc khoá của từng người dùng quyết định.
  - Hội thoại NPC do AI sinh khi chơi: chunk `dialogue-ai`, dịch vụ hội thoại, token phiên chơi cho hội thoại, ALG-DLG-04 và các FR-DLG về AI khi chạy.
- **Thêm (thiết kế ở W1):** chương trình cầu nối cục bộ. Cần định:
  - giao thức với Web Studio (chỉ nghe `127.0.0.1`, xác thực bằng mã ghép đôi, kiểm Origin chống trang lạ gọi vào);
  - cách cài và cập nhật;
  - danh sách công cụ cho phép khi gọi `claude -p`;
  - thư mục làm việc tạm theo phiên.
  
  Web Studio phải báo rõ khi người dùng chưa cài cầu nối hoặc chưa đăng nhập Claude Code.
- **Ảnh hưởng chức năng:** tạo/sửa game bằng lời chỉ dùng được trên máy đã cài cầu nối và đăng nhập Claude Code. Trên điện thoại vẫn xem trước, chỉnh sửa trực quan và chơi được, nhưng không chat với AI.
- **Phải đổi tài liệu đã duyệt** (Huy chốt: change request khi bắt đầu W1, không sửa ngay):
  - SRS-01, SRS-07, SRS-08, SRS-09;
  - TSD-00 §2–3, TSD-01, TSD-07, TSD-08 (IF-WEB-03, ALG-WEB-05, SCH-WEB-06/09);
  - DDD-01 (CFG-INT-01), DDD-07, DDD-08, DDD-09;
  - UIUX-02, UIUX-04 (chat, trang cấu hình AI, chi phí);
  - BRD-07, BRD-09 nếu cần.
- **Trước khi cho người khác dùng:** Huy xem và đồng ý Commercial Terms của Anthropic cho việc chạy Claude Code trong Web Studio (dù dùng nội bộ).
- Phát triển engine của Huy vẫn qua gói Max trên máy Huy (ADR-002), không đổi.
- Hiện chưa có mã Web Studio nào nên chưa phải sửa mã.

## Mục mở đã đóng (Huy, 23/11/2026)
- **OIT-ADR35-01:** Claude Code chạy trên máy người dùng, nối với Web Studio qua chương trình cầu nối nhỏ (Quyết định mục 5).
- **OIT-ADR35-02:** Hội thoại NPC khi chơi chỉ dùng kịch bản tĩnh (Quyết định mục 6).

## Phương án đã loại
- Dùng gói Max của Huy cho mọi người dùng: trái điều khoản.
- Giữ nguyên ADR-031 cho việc soạn game: Huy chọn Claude Code CLI.
- Chạy Claude Code trong sandbox từng người trên máy chủ: phức tạp, rủi ro điều khoản.
- Hội thoại NPC bằng Claude API với khoá Console của Huy: Huy chọn chỉ kịch bản tĩnh.
