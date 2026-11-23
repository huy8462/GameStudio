---
gate: G-E0
date: 2026-11-23
autoChecks:
  - { id: c1, desc: "ADR-001…015 (QĐ-01…15)", result: dat, evidence: "docs/ADR/README.md; 35 ADR (001…035)" }
  - { id: c2, desc: "engine doctor đạt", result: dat, evidence: "engine doctor --json: ok=true, 17/20 ok, 3 khoá tuỳ chọn thiếu" }
  - { id: c3, desc: "Baseline A56 scaffold gốc", result: dat, evidence: "docs/gates/G-E0/a56-baseline.json, a56-baseline.md" }
  - { id: c4, desc: ".claude/, CLAUDE.md, project.yaml", result: dat, evidence: "structure-check.mjs: 8 agent, 8 skill gốc, 15 lệnh, CLAUDE.md 75 dòng; 36 test hook/cấu trúc" }
  - { id: c5, desc: "Fork, UPSTREAM.md, LICENSE trùng vendor", result: dat, evidence: "structure-check.mjs (upstream-check); vendor/upstream = 8286774" }
  - { id: c6, desc: "Quét bí mật", result: dat, evidence: "pre-commit gitleaks (đã chặn 3 khoá giả); gitleaks toàn lịch sử sạch" }
  - { id: c7, desc: "LICENSES.md", result: dat, evidence: "LICENSES.md" }
manualChecks:
  - { id: m1, desc: "Chấp nhận baseline đo bằng Samsung Internet 31 (Chromium 148) thay Chrome Android (GD-01)" }
  - { id: m2, desc: "Chấp nhận phần E0 hoãn sang E1 (budgets.json, token-meter, ticket-new, skill engine-*) và không có CI GitHub (repo cục bộ)" }
a56: { fpsAvg: 60.1, fpsP5: 55.6, frameMsP95: 18.0, memMB: 9.5, loadS: 0.19 }
images:
  - docs/gates/G-E0/canh-scaffold-dpr15.png
  - docs/gates/G-E0/khung-do-perf.png
risks:
  - "Cảnh scaffold quá nhẹ (26 draw call, 3,2k tri): chưa biết giới hạn GPU A56 với cảnh thật; ngân sách 650k tri/120 draw chưa được kiểm (đo lại ở G-E2)."
  - "Trình duyệt giới hạn khoảng 60–72 fps: số fps chỉ cho biết 'dư', không cho biết còn dư bao nhiêu."
  - "Lần đo 1 có một khung 4,25 s (nghi trình duyệt tạm dừng)."
  - "Phần lớn tài liệu đã duyệt chưa phản ánh ADR-034/035 (Blender 5.2, Claude Code CLI, NPC tĩnh): change request ở W1."
proposal: "Đề xuất QUA G-E0. Baseline A56 dùng giá trị nền maxRenderDpr 1,5 cho tier Vừa (OIT-GEN-01); ghi vào budgets.json khi tạo ở E1. Bắt đầu E1 (schema, rng, expr, intake với HandoffLlmClient, bộ chạy bước, địa hình, QA khung, CLI)."
huyConfirm: { by: Huy, at: 2026-11-24T00:37, note: "Đồng ý m1 (baseline đo bằng Samsung Internet) và m2 (phần hoãn sang E1)" }
status: da_qua
---

# Báo cáo cổng G-E0

Dựng bằng `/gate-check G-E0` ngày 23/11/2026. Điều kiện từ SRS-00 §4.3 (`G-E0.conditions.json`). **Cổng chỉ qua khi Huy điền `huyConfirm`** (QT-DEV-03).

## Điều kiện tự kiểm
| Mã | Điều kiện | Kết quả | Bằng chứng |
|---|---|---|---|
| c1 | ADR-001…015 (QĐ-01…15) | Đạt | `docs/ADR/` có ADR-001…035 |
| c2 | `engine doctor` đạt | Đạt | 17/20 OK; thiếu 3 khoá tuỳ chọn (Gemini, ElevenLabs, Anthropic) |
| c3 | Baseline A56 bằng scaffold gốc | Đạt (có lệch, xem m1) | `G-E0/a56-baseline.md` |
| c4 | `.claude/`, `CLAUDE.md` < 150, `project.yaml` | Đạt | 8 agent, 8 skill gốc, 15 lệnh, 5 hook, 6 mẫu; `CLAUDE.md` 75 dòng |
| c5 | Fork + `UPSTREAM.md` + `LICENSE` | Đạt | `LICENSE` trùng `vendor/upstream` (`8286774`) |
| c6 | Quét bí mật | Đạt | pre-commit gitleaks; toàn lịch sử sạch |
| c7 | `LICENSES.md` | Đạt | Có |

Kiểm tra mã: 53 test Vitest, lint, kiểm kiểu, depcruise, Prettier, Ruff, 4 script truy vết đều đạt.

## Điều kiện cần Huy xác nhận
- **m1:** Baseline đo bằng **Samsung Internet 31** (nhân Chromium 148), không phải Chrome Android như GD-01. GPU đúng Xclipse 540 (A56).
- **m2:** Các phần E0 hoãn sang E1:
  - `budgets.json` + schema: ghi giá trị baseline khi tạo; điều kiện "baseline ghi trong `budgets.json`" vì vậy mới **ghi ở `a56-baseline.md`**.
  - `token-meter.mjs`, `ticket-new.mjs`.
  - 10–15 skill `engine-*`.
  - Không có CI GitHub (repo cục bộ, OIT-GEN-04); thay bằng pre-commit.

## Số đo Galaxy A56 (tier Vừa, DPR 1,5)
fps tb 60,1 · p5 55,6 · p1 53,2 · khung p95 18,0 ms (ngân sách 33,3 ms) · tải 0,19 s · 26 draw call · 3.226 tri. Lần DPR 2: fps tb 71,7 · p5 56,8. Chi tiết và đánh giá: `G-E0/a56-baseline.md`.

## Ảnh
- `G-E0/canh-scaffold-dpr15.png`: cảnh scaffold (chụp bằng trình duyệt giả lập A56 trên máy dev, **không phải ảnh từ A56**).
- `G-E0/khung-do-perf.png`: khung đo `?perf=1`.

## Rủi ro mở
Xem `risks` ở đầu tệp. Quan trọng nhất: cảnh scaffold quá nhẹ, ngân sách cảnh lớn chưa được kiểm trên A56 (đo lại ở G-E2).

## Đề xuất
**Qua G-E0.** Dùng DPR 1,5 làm giá trị nền tier Vừa. Bắt đầu E1.

## Huy xác nhận
Người: **Huy**. Thời điểm: **24/11/2026 00:37**. Đồng ý cả m1 và m2. **G-E0 đã qua.**

Theo m1: các cổng sau đề xuất đo bằng Chrome Android để khớp GD-01; Samsung Internet vẫn chấp nhận được nếu ghi rõ. Theo m2: việc hoãn được đưa vào phiếu E1.
