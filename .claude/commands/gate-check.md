---
description: Kiểm điều kiện cổng và dựng báo cáo cổng (chưa qua cho tới khi Huy xác nhận)
argument-hint: <G-E0 | G-E1 | …>
---

Kiểm cổng $ARGUMENTS (EP-DEV-03, ALG-DEV-07, FR-DEV-09, 10, QT-DEV-03):

1. Điều kiện lấy từ `docs/gates/$ARGUMENTS.conditions.json` nếu có; nếu chưa có, lấy từ bảng cổng SRS-00 §4.3 (đọc theo mục, không đọc nguyên tệp) và ghi ra tệp đó.
2. Tự kiểm điều kiện đo được (ví dụ G-E0: `pnpm doctor` thoát 0; có ADR-001…015; có `CLAUDE.md` < 150 dòng, `project.yaml`, hook, mẫu; baseline A56 trong `budgets.json`).
3. Chép `.claude/templates/gate-report.md` thành `docs/gates/$ARGUMENTS.md`; điền kết quả, 2–4 ảnh khác biệt nhất (nếu có), rủi ro, đề xuất.
4. Luôn để `status: chua_qua`, `huyConfirm: null`. Chỉ Huy đổi sang `da_qua`.
