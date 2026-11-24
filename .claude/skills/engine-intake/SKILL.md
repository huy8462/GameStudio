---
name: engine-intake
description: "Trả lời yêu cầu handoff của `engine new-game` (tạo game từ mô tả, DDD-01 EP-INT-02, ADR-035): đọc req-<n>.json trong thư mục phiên, viết res-<n>.json đúng outputSchema, kiểm bằng engine validate, chạy lại lệnh. Dùng khi engine new-game thoát 3 kèm HANDOFF_PENDING hoặc khi người dùng muốn tạo game mới từ mô tả."
---

# engine-intake: Claude Code làm mô hình cho `engine new-game`

Engine không gọi API Claude (ADR-035). Khi cần mô hình, `engine new-game` ghi **một** yêu cầu `req-<n>.json` rồi thoát 3. Phiên Claude Code này đọc yêu cầu, viết câu trả lời `res-<n>.json`, rồi chạy lại lệnh. Không cần khoá API, không đọc hay in khoá nào.

## Quy trình

1. Chạy `pnpm engine new-game --from <tệp mô tả> --json` (hoặc `--resume <sessionId> --json`). Đọc **một dòng JSON**:
   - `error.code = HANDOFF_PENDING`: có `handoff.reqFile`, `handoff.resFile` → bước 2.
   - `questions[]`: đưa câu hỏi cho người dùng **nguyên văn**, nêu lựa chọn mặc định (`defaultChoiceId`); câu `mandatory` phải hỏi, không tự chọn. Ghi câu trả lời vào tệp JSON `{"<id câu>": "<id lựa chọn>"}` rồi chạy `--resume <sid> --answers <tệp>`; người dùng đồng ý mặc định thì `--use-defaults`.
   - `status = ChoXacNhan`: trình `preview` (game-brief.md) cho người dùng; chỉ khi người dùng xác nhận mới chạy `--resume <sid> --confirm`.
   - `error.code = HANDOFF_INVALID`: `res-<n>.json` sai; sửa theo thông báo rồi chạy lại.
2. Đọc `req-<n>.json` (`schema: intake-handoff/1`): `task`, `system` (luật phải theo), `messages` (mô tả gốc, dữ liệu đã chốt; ảnh là `{path}` tương đối thư mục phiên), `outputSchema`.
3. Viết `res-<n>.json`:
   ```json
   { "schema": "intake-handoff/1", "n": <n>, "data": <đúng outputSchema>, "answeredBy": "claude-code", "at": "<ISO 8601>" }
   ```
   Trước khi ghi, lưu `data` ra tệp tạm và kiểm: `pnpm engine validate --schema <outputSchema.json> <data.json> --json` (thoát 0 mới ghi).
4. Chạy lại `pnpm engine new-game --resume <sessionId> --json`. Lặp tới khi có câu hỏi, chờ xác nhận, hoặc xong.

## Luật khi viết `data` (QT-INT-03, QĐ-11)

- `analyze`: mỗi trường `tu_mo_ta` phải có `evidence` là **trích nguyên văn** từ mô tả (mã kiểm lại, sai thì trường bị xoá thành `thieu`). Không rõ thì `thieu`; hai ý trái nhau thì `mau_thuan`. Không tự giả định trường bắt buộc: mặc định do mã điền sau vòng hỏi.
- Không bịa tính năng: chiến đấu, săn bắt chỉ bật khi mô tả nói rõ. Hội thoại NPC luôn `static`.
- `clarify`: đúng các trường được giao, câu ≤ 25 từ, 2–4 lựa chọn; `value` đúng kiểu trường (vd `camera`: `"third_person"`).
- `brief`: giữ nguyên giá trị đã chốt trong `messages`; chỉ viết lời (title, genre, artStyle.summary, coreLoop 3–5 bước, player, tên NPC). Mã sẽ ép lại camera, tính năng, quy mô, giả định.
- Bám đúng thể loại và phong cách người dùng mô tả; không đổi sang thứ "hay hơn".

## Không làm

- Không sửa `req-<n>.json`, `session.json`, `rounds.json`, `input.json`.
- Không ghi nhiều `res` trước: mỗi lần chỉ trả lời yêu cầu đang chờ.
- Không `--confirm` thay người dùng.
