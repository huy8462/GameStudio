---
description: Tạo game mới từ mô tả - sinh brief một trang và dữ liệu khởi tạo, chờ xác nhận
argument-hint: <mô tả game>
---

Tạo game từ mô tả: $ARGUMENTS (QĐ-03, QĐ-11; SRS-01, TSD-01, DDD-01 EP-INT-01).

Trạng thái: **chưa có ở E0**. `@gamestudio/intake` và `engine new-game` làm ở E1. Nếu `node engine/cli/dist/main.js new-game --help` báo lệnh không tồn tại, dừng và báo "cần phiếu E1".

Khi đã có: chạy `engine new-game --json` với `HandoffLlmClient`; trình brief một trang; **không** đổi thể loại hay phong cách người dùng mô tả; không build khi brief chưa `DaXacNhan`.
