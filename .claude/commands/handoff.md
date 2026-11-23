---
description: Kết thúc phiếu - cập nhật docs/handoff.md, nhắc /clear
argument-hint: <T-nnnn>
---

Kết thúc phiếu $ARGUMENTS (EP-DEV-02, ALG-DEV-08, SCH-DEV-08):

1. Cập nhật `docs/handoff.md` (≤ 150 dòng; tạo nếu chưa có) với các mục cố định: `## Ràng buộc`, `## Việc đã xong` (5 phiếu gần nhất, chỉ tiêu đề + kết quả), `## Asset chờ duyệt`, `## Bước tiếp`, `## Cảnh báo mở`.
2. Đặt `status: xong` trong phiếu nếu `done[]` đạt và có `evidence`.
3. So `git diff --name-only` với `write[]` của phiếu; tệp ngoài danh sách mà mục "Sửa ngoài danh sách" trống → cảnh báo (QT-DEV-02).
4. Nếu phiếu chạm `games/<id>/**`: cập nhật `games/<id>/handoff.md` (≤ 60 dòng, SCH-DEV-09).
5. Không ghi khoá, đường dẫn tuyệt đối, email (QT-DEV-06).
6. Chèn `[[ticket:T-nnnn end]]`, nhắc Huy chạy `/clear` trước phiếu sau.

Token-meter (`tools/scripts/token-meter.mjs`) chưa có: bỏ bước ghi `tokens.csv` cho tới khi có.
