---
description: Build một zone (tăng dần theo cache), đọc báo cáo JSON
argument-hint: <gameId> <zoneId> [tier]
---

Build zone: $ARGUMENTS (IF-CLI-01, FR-CLI-02).

Trạng thái: **chưa có ở E0** (`engine build` làm ở E1–E2). Kiểm `node engine/cli/dist/main.js build --help`; không có thì dừng, báo "cần phiếu E1".

Khi đã có: `pnpm engine build --game <gameId> --zone <zoneId> [--tier <t>] --json`; chỉ đọc dòng JSON kết quả và `report.json` của bước lỗi, không đọc log dài. Mã thoát 3 = brief/style chưa duyệt; 4 = dữ liệu sai; 5 = môi trường.
