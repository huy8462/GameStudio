---
paths:
  - 'web/**'
---

# Rule: web (FR-DEV-04, FR-DEV-06, TSD-08)

- Rigor `standard` cho `web/api`, `web/worker`, `web/ai-gateway`, quyền và xác thực: phiếu bắt buộc có test tự động + rà soát bảo mật ngắn.
- Không khoá API phía client hay trong `web/api`/`web/worker`; chỉ `web/ai-gateway` đọc khoá Gemini/ElevenLabs từ biến môi trường (ADR-031).
- Soạn game bằng Claude Code CLI chạy trên máy người dùng qua cầu nối cục bộ (ADR-035): máy chủ không gọi Claude; không bao giờ nhận, lưu, log hay chuyển tiếp thông tin đăng nhập/token Claude của người dùng; không dùng gói Max của Huy cho người khác. Cầu nối chỉ nghe `127.0.0.1`, có mã ghép đôi và kiểm Origin.
- Hội thoại NPC chỉ kịch bản tĩnh: không có endpoint hội thoại AI khi chơi.
- Kiểm quyền ở backend mỗi request; không tin dữ liệu client.
- Văn bản do AI sinh hiển thị bằng text node; CSP chặn inline script.
- Log JSON một dòng (pino), không ghi khoá, cookie, nội dung hội thoại.
- `web/app` không import `web/api`, `web/ai-gateway`, `web/worker` (dependency-cruiser).
