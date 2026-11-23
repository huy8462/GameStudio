# @gamestudio/cli

Lệnh `engine` (MOD-GEN-16, MOD-CLI-01, IF-CLI-01). Thư viện `commander`; `--json` in một dòng JSON ở stdout, dòng cho người đọc ở stderr; mã thoát theo SRS-04 §7.2 (`src/exit-codes.ts`).

## Lệnh hiện có (E0)

`engine doctor [--role dev|worker|ci] [--json] [--versions <path>]`: kiểm môi trường theo `tools/versions.json` (SCH-DEV-03, IF-DEV-03, ALG-DEV-06).

- Phiên bản: node, pnpm, python (qua `uv run`), uv, ktx (+ `ktx create`), gltf-transform, ffmpeg (+ `libopus`), gitleaks, playwright, chromium của Playwright, Claude Code (tuỳ chọn). `three` chỉ ghi nhận bản đã chốt.
- Blender 5.2 (ADR-034) và add-on: chạy `src/doctor/blender-probe.py` trong Blender, so phiên bản trong `blender_manifest.toml` và SHA-256 thư mục add-on (sắp theo đường dẫn, bỏ `__pycache__`).
- Biến môi trường theo vai trò (`src/doctor/env-roles.ts`): chỉ báo `co`/`khong`, không in, không băm, không đo độ dài giá trị (FR-DEV-22).
- Thoát 0 khi đạt; 5 khi một mục bắt buộc `missing`/`mismatch` (ERR-DEV-04, ERR-DEV-05). Mục `optional` chỉ cảnh báo.

## Chạy

```
pnpm --filter @gamestudio/cli build
node engine/cli/dist/main.js doctor
```

## Cấu trúc

- `src/main.ts`: điểm vào; `src/commands/doctor.ts`: đăng ký lệnh.
- `src/doctor/`: `run-doctor.ts`, `checks.ts`, `blender-check.ts`, `env-roles.ts`, `versions.ts`, `exec.ts`, `types.ts`, `blender-probe.py`.
- Test: `*.test.ts` (Vitest, runner giả, không gọi công cụ thật): TST-DEV-03, TST-CLI-02.

## Lệch so với DDD-09

- PSC-DEV-06 coi `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` là bắt buộc ở vai trò `dev`. Ở đây để **tuỳ chọn** vì dự án làm qua gói Max (Huy, 23/11/2026) và hai khoá chỉ cần khi sinh ảnh/âm thanh.
- `DoctorCheck` có thêm trường `optional?: true` để báo mục tuỳ chọn.
- `versions.json` có thêm `probe`, `roles`, `optional`, `timeoutS`, `features` (schema: `tools/schema/versions.schema.json`).
