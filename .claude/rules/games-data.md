---
paths:
  - 'games/**/data/**'
---

# Rule: dữ liệu game (FR-DEV-04, QT-GEN-01)

- Dữ liệu là nguồn sự thật duy nhất: mọi con số chơi (tốc độ, sát thương, ngân sách) nằm ở đây, không cứng trong mã.
- Mỗi tệp hợp lệ JSON Schema 2020-12 và có `schemaVersion`; hook H-03 kiểm khi ghi.
- Id `kebab-case`; tham chiếu `asset:<id>@<version>`, `audio:<id>@<version>`, `graph:<id>`.
- Không đổi thể loại/phong cách đã xác nhận trong brief (QĐ-11); mở rộng phạm vi phải qua đề xuất thay đổi có `briefUpdate`.
- Sửa `budgets.json`: chạy `/perf-snapshot` (hook H-05 nhắc).
