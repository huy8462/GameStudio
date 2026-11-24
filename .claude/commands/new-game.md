---
description: Tạo game mới từ mô tả - sinh brief một trang và dữ liệu khởi tạo, chờ xác nhận
argument-hint: <mô tả game>
---

Tạo game từ mô tả: $ARGUMENTS (QĐ-03, QĐ-11; SRS-01, TSD-01, DDD-01 EP-INT-01; T-0013).

1. Ghi mô tả nguyên văn vào tệp tạm (UTF-8), chạy `pnpm engine new-game --from <tệp> --json`.
2. Làm theo skill `engine-intake`: trả lời từng `req-<n>.json` bằng `res-<n>.json`, chạy lại `--resume <sessionId>`; đưa câu hỏi làm rõ cho người dùng nguyên văn.
3. Trình brief một trang (`preview`); **không** đổi thể loại hay phong cách người dùng mô tả. Chỉ `--confirm` khi người dùng xác nhận.
4. Sau xác nhận: `pnpm engine build --game games/<id>` (không build khi brief chưa `DaXacNhan`, guard thoát 3).
