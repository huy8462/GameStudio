# @gamestudio/intake

Tiếp nhận mô tả game (MOD-GEN-13; DDD-01; T-0012): mô tả → phân tích → câu hỏi làm rõ → brief + dữ liệu khởi tạo hợp lệ schema. Một mã cho CLI và Web Studio (NFR-INT-03).

**Không gọi API Claude** (ADR-035). Mô hình đến qua `LlmClient` tiêm vào:

- `HandoffLlmClient` (`@gamestudio/intake/node`): ghi `req-<n>.json`, đọc `res-<n>.json` (DTO-INT-09) do phiên Claude Code của người dùng viết. Không cần khoá API.
- `FakeLlmClient`: đáp án viết sẵn cho test.
- Sau W1: client gọi `claude -p` qua cầu nối cục bộ trên máy người dùng.

## API (DDD-01 §3.2, phần đã có)

| Hàm | Việc |
|---|---|
| `analyze(input, deps)` | Kiểm đầu vào (ERR-INT-01/02) → mô hình `analyze` → luật hậu kiểm → luật bằng chứng → câu hỏi vòng 1 hoặc sinh luôn |
| `answer(sessionId, answers, deps, {useDefaults})` | Gộp trả lời; ≤ 2 vòng, ≤ 5 câu/vòng; hết vòng → mặc định `gia_dinh` (trừ mâu thuẫn) → sinh |
| `generate(sessionId, deps)` | Chạy lại bước sinh (sau handoff) |
| `confirm(sessionId, deps)` | `ChoXacNhan → DaXacNhan`; ERR-INT-08 khi còn mâu thuẫn; `hash` PSC-INT-09 + `brief/v1/hash.txt` |

Kết quả `GeneratedBundle.files` (khoá tương đối `games/<id>/`): `data/{game,world,budgets,palette}.json`, `data/entities/{npc,animals}/*.json`, `brief/v1/{brief.json, game-brief.md, game-brief-phu-luc.md?}`. Ghi ra đĩa là việc của lệnh `engine new-game` (phiếu sau).

## Quy tắc chính

- Mô hình chỉ viết văn bản; mã chốt các giá trị: id (slug bỏ dấu), seed, zone lưới 500 m, camera, tính năng (combat/hunting từ phân tích, hội thoại luôn `static`), quy mô, giả định (PSC-INT-03).
- Mọi đầu ra mô hình kiểm bằng JSON Schema (`src/schemas/*.schema.json`); brief sai → tự sửa ≤ 3 lần (PSC-INT-04).
- Từ khoá so **giữ dấu** theo ranh giới từ (tránh "sân" ≠ "săn"), phủ định "không/chẳng" trước cụm.
- Thư viện không đọc tệp, không đọc biến môi trường: mẫu `games/_template/data` tiêm qua `deps.template`.

## Test

`src/intake.test.ts` (AC-01-01, 02, 03, 06, 07; TC-INT-09, 13), `src/llm/handoff.test.ts` (TC-INT-12).

## Chưa có

`engine new-game`, `FileIntakeStore`, skill `engine-intake`; style bible; đề xuất thay đổi/áp/impact; mở lại/hết hạn phiên; suy brief; ước lượng quy mô.
