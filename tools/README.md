# tools/

Công cụ dev (TSD-09, DDD-09).

- `versions.json`: phiên bản công cụ cố định (SCH-DEV-03, CFG-GEN-01), nguồn cho `engine doctor` (`pnpm doctor`). Nâng một bản = phiếu riêng (ADR-017). Add-on Blender: đổi bản thì cập nhật cả `version` và `sha256` (lấy từ `engine doctor --json`, trường `have` khi lệch, hoặc chạy `engine/cli/src/doctor/blender-probe.py`).
- `schema/`: `versions.schema.json`; sau này `project.schema.json` (SCH-DEV-01).
- `scripts/`: `probe-keys.mjs`, `token-meter.mjs`, `structure-check.mjs`, `upstream-check.mjs` (E0-04+).
