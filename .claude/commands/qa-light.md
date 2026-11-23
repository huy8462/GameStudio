---
description: QA mức nhẹ - smoke, góc chuẩn, ngân sách (mỗi phiếu đổi hình)
argument-hint: <gameId> [zoneId]
---

QA nhẹ cho: $ARGUMENTS (FR-QA-*, TSD-04).

Trạng thái: **chưa có ở E0** (`engine qa` làm ở E1). Trước khi có, với scaffold gốc dùng `node .claude/skills/threejs-qa-release/scripts/inspect-threejs-canvas.mjs` theo skill `threejs-qa-release`.

Khi đã có: `pnpm engine qa --level=nhe --game <id> [--zone <z>] --json`; báo pass/warn/fail theo ALG-GEN-03; chỉ mở tối đa 2–4 ảnh khác biệt nhất.
