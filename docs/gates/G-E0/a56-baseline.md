# Baseline Galaxy A56: scaffold gốc (E0-06)

Nguồn: `a56-baseline.json` (Huy đo 23/11/2026, 60 s mỗi lần, đứng yên). Mã: FR-QA-07, FR-RTM-12, 13, OIT-GEN-01, ADR-004.

## Thiết bị
- GPU: **Samsung Xclipse 540**, ANGLE trên Vulkan 1.3.304 → đúng Galaxy A56.
- Trình duyệt: **Samsung Internet 31** (nhân Chrome 148), **không phải Chrome Android** như GD-01/ADR-004 mặc định.
- Màn hình CSS 384 × 832, DPR thiết bị 2,8125 (màn hình đang ở độ phân giải thấp hơn 412 × 915 giả định ở TSD-00 §7.1).

## Kết quả
| Lần | Trần DPR | Canvas | fps tb | p5 | p1 | Khung p50 / p95 / max (ms) | Draw | Tri | Tải (s) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 (mặc định scaffold) | 768 × 1496 | 71,7 | 56,8 | 53,2 | 15,6 / 17,6 / **4.249,5** | 12* | 726* | 0,96 |
| 2 | 1,5 | 576 × 1122 | 60,1 | 55,6 | 53,2 | 16,6 / 18,0 / 22,8 | 26 | 3.226 | 0,19 |

\* Lần 1: số draw/tri chụp ở khung cuối khi phần lớn vật thu thập có thể đã ẩn hoặc ngoài khung nhìn; lần 2 khớp trạng thái đầu (26 / 3.226). Chỉ dùng số lần 2 làm mốc tải cảnh.

## Đánh giá
1. **Đạt mục tiêu 30 fps tier Vừa (CH-01) với dư lớn** ở cả hai DPR: p1 ≥ 53 fps, p95 thời gian khung ≤ 18 ms (ngân sách 33,3 ms).
2. **Trình duyệt có trần khung hình**: fps tb 71,7 với p50 15,6 ms cho thấy màn hình 120 Hz bị giới hạn khoảng 60–72 fps; lần 2 đúng 60 fps. Cảnh scaffold quá nhẹ (≤ 26 draw call, 3 nghìn tri so với ngân sách 120 draw call, 650 nghìn tri) nên **không đo được giới hạn GPU**; baseline này chỉ chứng minh pipeline WebGL2/ANGLE/Vulkan của A56 chạy ổn định, chưa đủ để chốt ngân sách cảnh lớn.
3. **Lần 1 có một khung 4,25 s** (max) dù p99 bình thường: khả năng cao là trình duyệt tạm dừng (chuyển tab, khoá màn hình, thông báo) trong lúc đo. Không ảnh hưởng tb/p5/p1 nhưng nên đo lại nếu cần số max sạch.
4. **OIT-GEN-01 (DPR 1,5):** ở cảnh nhẹ, DPR 2 và 1,5 cùng chạm trần khung hình; số đo **không phân biệt được** hai mức. Giữ đề xuất 1,5 làm giá trị nền cho tier Vừa (fill-rate giảm 44% so với DPR 2, độ nét vẫn đủ trên màn 6,7 inch); đo lại khi có cảnh nặng (G-E2).

## Ghi nhận cho `budgets.json`
`games/_template/data/budgets.json` và schema chưa có (E1, SCH-RTM-03). Giá trị ghi khi tạo ở E1, tier `vua`:
- `targetFps: 30`, `maxRenderDpr: 1.5` (OIT-GEN-01, giá trị nền).
- Giữ ngân sách đã chốt ở SRS-04 §6.3 (draw call 120, vật liệu 32, texture 2048); các số khác giữ "(đề xuất)" tới khi đo cảnh nặng ở G-E2.
- Baseline thiết bị: `a56Baseline: {gpu: "Xclipse 540", browser: "SamsungInternet 31", fpsCap: 60, frameMsP95: 18.0, at: "2026-11-23"}`.

## Lệch so với tài liệu (cần Huy xác nhận)
- **Trình duyệt đo là Samsung Internet**, không phải Chrome Android (GD-01). Đề xuất: chấp nhận cả hai cho A56 vì cùng nhân Chromium; đo cổng sau bằng **Chrome** để khớp GD-01, hoặc ghi Samsung Internet vào GD-01 qua change request.
- **Viewport 384 × 832** thay vì 412 × 915 (TSD-00 §7.1). Có thể A56 đang đặt độ phân giải màn hình FHD+ thấp hoặc cỡ chữ/zoom lớn; QA giả lập nên thêm cấu hình 384 × 832.
