---
paths:
  - 'engine/build/**'
  - 'engine/cli/**'
---

# Rule: engine/build, engine/cli (FR-DEV-04, TSD-04 IF-CLI-02)

- Tất định: cùng đầu vào + seed → cùng `outputHash`. Seed theo `deriveSeed(...)`; sắp ổn định mọi danh sách trước khi băm (so byte UTF-8); numpy một luồng.
- Mỗi bước có `step.json` (deps, dataPointers, runner, entry, perZone, outputs) và tăng `version` khi đổi thuật toán.
- Bước ghi đầu ra vào `outDir` + `report.json` (`report/1`); stdout chỉ dòng `PROGRESS <0-100> <msg>`; log JSON một dòng ra stderr.
- Script Blender: Python nhúng 3.13 của Blender 5.2, chỉ thư viện chuẩn + `bpy` (ADR-034).
- Lệnh CLI: mã thoát SRS-04 §7.2; `--json` in một dòng.
- Không ghi khoá hay nội dung mô tả game vào log.
