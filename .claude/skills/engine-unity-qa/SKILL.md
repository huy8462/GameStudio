---
name: engine-unity-qa
description: "QA player Unity Web của GameStudio: test EditMode, kiểm cục bộ bằng Chromium headless (check-local.mjs), ảnh góc chuẩn, đo A56 khi cần, báo cáo cho phiếu hoặc cổng. Dùng khi đóng phiếu đổi mã engine/unity hoặc chạy /qa-light, /qa-full cho game dựng bằng Unity (CR-02, FR-DEV-02, FR-DEV-21)."
---

# engine-unity-qa: kiểm trước khi đóng phiếu

## Mức nhẹ (mỗi phiếu đổi mã engine/unity)

1. Test EditMode (lệnh trong `engine-unity-build`); đọc `engine/unity/logs/test-results.xml` bằng `Select-String`, đếm `result="Failed"`, không đọc cả log.
2. Build player, lấy dòng `GS_BUILD player result=Succeeded ... withinBudget=true`.
3. `node engine/unity/dev/make-dev-data.mjs` rồi `node engine/unity/dev/check-local.mjs`: `state` phải tới `DangChay`, `errors`/`failed` rỗng.
4. Kiểm repo: `pnpm lint`, `pnpm test`, `pnpm exec tsc -p tsconfig.json`, `pnpm depcruise`, `pnpm format:check`, `node tools/scripts/structure-check.mjs`.
5. Đổi hình thì chụp bằng Chromium (Playwright) cùng góc trước/sau, xem 2–4 ảnh lệch nhất (FR-DEV-21); chưa có `@gamestudio/qa` nên so thủ công.

## Mức đầy đủ (trước cổng)

Thêm đo A56 (`engine-unity-perf`) và, khi `@gamestudio/qa` có, `/qa-full` (visual regression: SSIM ≤ 0,9 Pass, ≤ 1,0 Warn, > 1,0 Fail theo ALG-GEN-03; baseline chỉ đổi kèm `--reason`; bot playtest). Cổng chỉ qua khi Huy xác nhận.

## Bẫy đã gặp

- Thiếu gắn URP asset vào mức Quality: địa hình không vẽ (xem `engine-unity-render`).
- Bản đa luồng mở ở máy chủ thiếu COOP/COEP: trang báo lỗi `crossOriginIsolated`; `check-local` đã gửi sẵn hai tiêu đề.
- Build làm bẩn `ProjectSettings.asset`, `Boot.unity`: hoàn tác trước commit.
- fps của máy dev không GPU không có giá trị so ngân sách.

## Báo cáo

Bảng ngắn: lệnh, kết quả, số đo, lệch ngân sách. Không ghi khoá, đường dẫn tuyệt đối, nội dung hội thoại vào báo cáo (QT-DEV-06). Không tự đổi baseline; lỗi mã sản phẩm báo cho agent phụ trách.
