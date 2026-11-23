# tools/

Công cụ dev (TSD-09, DDD-09).

- `versions.json`: phiên bản công cụ cố định (SCH-DEV-03, CFG-GEN-01), nguồn cho `engine doctor` (`pnpm doctor`). Nâng một bản = phiếu riêng (ADR-017). Add-on Blender: đổi bản thì cập nhật cả `version` và `sha256` (lấy từ `engine doctor --json`, trường `have` khi lệch, hoặc chạy `engine/cli/src/doctor/blender-probe.py`).
- `schema/`: `versions.schema.json`; sau này `project.schema.json` (SCH-DEV-01).
- `scripts/structure-check.mjs [--json]`: kiểm 8 agent, 8 skill gốc, 15 lệnh, 5 hook, `CLAUDE.md` < 150 dòng, `LICENSE` trùng `vendor/upstream`, `UPSTREAM.md` ghi đúng commit (TST-DEV-05, kiêm upstream-check).
- `scripts/hooks-*.test.ts`: test hook `.claude/hooks/` (TST-DEV-01, 02).
- Chưa có: `token-meter.mjs`, `ticket-new.mjs`, `probe-keys.mjs` (dùng `pnpm doctor`), `licenses.mjs`.
