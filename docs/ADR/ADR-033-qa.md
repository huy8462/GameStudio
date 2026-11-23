# ADR-033: QA

| Mục | Nội dung |
|---|---|
| Mã | ADR-033 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-18, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Theo bộ gốc threejs-game-skills.

## Quyết định
**Playwright** + Chromium; SSIM bằng `ssim.js`, khác pixel bằng `pixelmatch`; thống kê render từ `renderer.info` + `EXT_disjoint_timer_query_webgl2` khi có.

## Hệ quả
QA nhẹ và đầy đủ, visual diff, đo hiệu năng chạy cùng một bộ Playwright trên máy dev, CI và worker (TSD-04 mục 6).

## Phương án đã loại
Puppeteer (bộ gốc đã dùng Playwright).
