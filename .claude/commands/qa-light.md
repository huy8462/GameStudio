---
description: QA mức nhẹ - smoke, góc chuẩn, ngân sách (mỗi phiếu đổi hình)
argument-hint: <gameId> [zoneId]
---

QA nhẹ cho: $ARGUMENTS (FR-QA-*, TSD-04).

Trạng thái: **chưa có ở E0** (`engine qa` làm ở E1). Trước khi có, với player Unity theo skill `engine-unity-qa` (test EditMode, build, `check-local.mjs`).

Khi đã có: `pnpm engine qa --level=nhe --game <id> [--zone <z>] --json`; báo pass/warn/fail theo ALG-GEN-03; chỉ mở tối đa 2–4 ảnh khác biệt nhất.
