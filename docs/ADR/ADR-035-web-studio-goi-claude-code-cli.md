# ADR-035: Web Studio gọi Claude Code qua CLI, mỗi người dùng tự đăng nhập

| Mục | Nội dung |
|---|---|
| Mã | ADR-035 |
| Trạng thái | Đã chốt (nguyên tắc); 2 mục mở OIT-ADR35-01, 02 chờ Huy |
| Ngày | 23/11/2026 |
| Người chốt | Huy |
| Nguồn | Huy chốt 23/11/2026 khi xác nhận diễn giải QĐ-15 (BRD-00 §6); QĐ-02, QĐ-07, QĐ-15 |
| Thay thế | ADR-031, **chỉ phần việc soạn game bằng AI trong Web Studio** (tiếp nhận mô tả, đề xuất thay đổi, nháp kịch bản): thay "SDK `@anthropic-ai/sdk` + khoá do máy chủ giữ" bằng "Claude Code CLI, người dùng tự đăng nhập". Phần Gemini, ElevenLabs và hội thoại NPC khi chạy của ADR-031 giữ nguyên tới khi chốt OIT-ADR35-02 |

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

## Hệ quả
- **Bỏ:** ai-gateway giữ khoá Claude cho việc soạn game, hạn mức/chi phí Claude theo người tính ở máy chủ (ALG-WEB-05 phần Claude), mô hình theo tác vụ cấu hình ở SCR-WEB-13 cho phần này. Hạn mức nay do gói hoặc khoá của từng người dùng quyết định.
- **Phải đổi tài liệu đã duyệt** (change request khi bắt đầu W1, không sửa ngay): SRS-01/08/09, TSD-00 §2–3, TSD-01, TSD-08 (IF-WEB-03, ALG-WEB-05, SCH-WEB-06/09), DDD-01 CFG-INT-01, DDD-08, DDD-09, UIUX-04 (trang cấu hình AI, chi phí).
- **Trước khi cho người khác dùng:** Huy xem và đồng ý Commercial Terms của Anthropic cho việc chạy Claude Code trong Web Studio (dù dùng nội bộ).
- Phát triển engine của Huy vẫn qua gói Max trên máy Huy (ADR-002), không đổi.
- Hiện chưa có mã Web Studio nào nên chưa phải sửa mã.

## Mục mở (cần Huy chốt trước W1)
- **OIT-ADR35-01: Claude Code chạy ở đâu?** Vì máy chủ không được giữ thông tin đăng nhập của người dùng:
  - (a) **Đề xuất:** chạy trên máy của chính người dùng qua một tiến trình cầu nối cục bộ. Người dùng đăng nhập Claude Code trên máy họ; Web Studio gửi yêu cầu tới cầu nối và nhận JSON về.
  - (b) Mỗi người dùng có một sandbox riêng trên máy chủ. Người dùng tự đăng nhập trong sandbox đó qua luồng của Anthropic; thông tin đăng nhập nằm trong sandbox, `web/api` không đọc được. Cách này phức tạp hơn và cần rà soát kỹ điều khoản.
- **OIT-ADR35-02: Hội thoại NPC khi chạy (QĐ-14).** Người chơi qua link chơi thử không đăng nhập Claude. Các hướng:
  - (a) Giữ ADR-031 cho riêng phần này: dùng Claude API với khoá Console của Huy trong `ai-gateway`. Đây là cách điều khoản cho phép với nhà phát triển.
  - (b) Chỉ dùng kịch bản tĩnh, tắt AI khi chạy.

## Phương án đã loại
- Dùng gói Max của Huy cho mọi người dùng: trái điều khoản.
- Giữ nguyên ADR-031 cho việc soạn game: Huy chọn Claude Code CLI.
