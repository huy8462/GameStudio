# ADR-002: Chỉ hỗ trợ Claude Code

| Mục | Nội dung |
|---|---|
| Mã | ADR-002 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-02, BRD-00 §6 |
| Thay thế | Không |

## Bối cảnh và lý do
Hỗ trợ nhiều harness (Codex, Cursor) cần adapter và làm loãng cấu hình. Claude Code có sẵn agent, skill, hook, slash command, subagent.

## Quyết định
Quy trình phát triển engine và Web Studio chỉ dùng Claude Code, tận dụng `.claude/agents`, `.claude/skills`, hook trong `settings.json`, lệnh slash. Bỏ phần dành cho Codex của bộ gốc.

## Hệ quả
- Đã gỡ `AGENTS.md`, `install.sh`, `agents/openai.yaml`, `validate-skills.sh`; skill chuyển vào `.claude/skills/` (E0-01).
- Theo QĐ-15 (Huy xác nhận 23/11/2026): QĐ-02 áp dụng cho **quy trình phát triển**. Web Studio gọi **Claude Code qua CLI**, mỗi người dùng tự đăng nhập bằng tài khoản/khoá của họ (ADR-035, thay câu "gọi Claude API qua backend" trong bản diễn giải BRD-00 §6).
- Dự án làm chủ yếu qua gói Max của Huy (Huy chốt 23/11/2026).

## Phương án đã loại
Adapter đa harness (everything-game-dev-code); giữ song song phần Codex.
