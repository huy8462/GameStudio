# @gamestudio/cli

Lệnh `engine` (MOD-GEN-16, MOD-CLI-01, IF-CLI-01). Thư viện `commander`; `--json` in một dòng JSON ở stdout, dòng cho người đọc ở stderr; mã thoát theo SRS-04 §7.2 (`src/exit-codes.ts`).

## Lệnh hiện có (E0)

`engine doctor [--role dev|worker|ci] [--json] [--versions <path>]`: kiểm môi trường theo `tools/versions.json` (SCH-DEV-03, IF-DEV-03, ALG-DEV-06).

- Phiên bản: node, pnpm, python (qua `uv run`), uv, ktx (+ `ktx create`), gltf-transform, ffmpeg (+ `libopus`), gitleaks, playwright, chromium của Playwright, Claude Code (tuỳ chọn). `three` chỉ ghi nhận bản đã chốt.
- Blender 5.2 (ADR-034) và add-on: chạy `src/doctor/blender-probe.py` trong Blender, so phiên bản trong `blender_manifest.toml` và SHA-256 thư mục add-on (sắp theo đường dẫn, bỏ `__pycache__`).
- Biến môi trường theo vai trò (`src/doctor/env-roles.ts`): chỉ báo `co`/`khong`, không in, không băm, không đo độ dài giá trị (FR-DEV-22).
- Thoát 0 khi đạt; 5 khi một mục bắt buộc `missing`/`mismatch` (ERR-DEV-04, ERR-DEV-05). Mục `optional` chỉ cảnh báo.

## `engine validate` (E1, T-0002)

`engine validate [--all | --staged | <tệp...>] [--schema <path>] [--json]`: kiểm dữ liệu game theo JSON Schema của `@gamestudio/schema` (EP-CLI-01, TC-GEN-01, FR-RTM-01).

- `--all`: mọi `games/*/data/**/*.json`; `--staged`: tệp dữ liệu đã `git add` (pre-commit); `<tệp...>`: tệp chỉ định, loại suy schema theo tên (`kindByPath`).
- `--schema <path>`: kiểm các tệp theo một tệp JSON Schema cho trước (handoff intake).
- `--json`: một dòng `validate/1` `{ok, checked, skipped, files[{path, kind, errors[{instancePath, keyword, message}]}]}`.
- Thoát 0 khi mọi tệp hợp lệ; 4 khi có tệp sai schema.

## `engine build` (E1, T-0004 + T-0005; ADR-023)

`engine build [--game <dir>] [--steps <dir>] [--zone <id>] [--tier <tier>] [--step <id>] [--force] [--skip-bake] [--json]`.

- Guards (`src/build-cmd/guards.ts`): brief `brief/v<n>` lớn nhất chưa có `hash.txt` hoặc chưa có brief → 3 (ERR-INT-06); dữ liệu sai schema → 4; `engineVersion` không khớp kiểu caret với `ENGINE_VERSION` → 4 (ERR-RTM-04).
- `src/orchestrator/runBuild` (PSC-CLI-01): DAG `step.json` (`step/1`) tô-pô ổn định, `perZone` nhân theo zone, `inputHash` (PSC-GEN-02), hit cache bỏ qua, song song ≤ min(4, lõi/2), bước lỗi huỷ nhánh phụ thuộc.
- Cache `<game>/build/cache/<bước>/<24 hex đầu inputHash>/{out/, meta.json}` (ngắn để dưới MAX_PATH Windows), chỉ mục `cache/index.json` (SCH-RTM-09); báo cáo gộp `build/reports/build-<zone|all>.json` (`report/1`).
- Runner node: `export function run(ctx)` trong tiến trình. Runner python: `uv run python -I <entry> --ctx ctx.json`, stdout `PROGRESS <0-100> <msg>`, `timeoutS` diệt cả cây tiến trình; ghi tệp với `newline="\n"`. Blender: phiếu sau.
- Thoát 0/1/2 theo kết quả; bước lỗi giữ mã 3–6 của bước, còn lại 10. Bước mẫu: `src/orchestrator/fixtures/`.

## `engine new-game` (E1, T-0013; DDD-01 EP-INT-01, ADR-035)

`engine new-game [--from <tệp>] [--image <tệp>]… [--seed] [--resume <sid>] [--answers <tệp>] [--use-defaults] [--confirm] [--games <dir>] [--json]`. Mô hình là phiên Claude Code qua tệp `req-<n>.json`/`res-<n>.json` (skill `engine-intake`), không gọi API. Phiên ở `games/.intake/pending/<sid>/`; mỗi lần chạy phát lại `analyze` + các lượt trả lời đã lưu. Thoát 3: chờ handoff / trả lời / xác nhận (bản xem trước ở `preview/`); `--confirm` ghi `games/<id>/{data,brief/v1}` nguyên tử, thoát 0; 4: dữ liệu, `res` sai, game đã có.

## Chạy

```
pnpm --filter @gamestudio/cli build
node engine/cli/dist/main.js doctor
pnpm engine validate --all --json
pnpm engine build --game games/<id> --json
```

## Cấu trúc

- `src/main.ts`: điểm vào; `src/commands/{doctor,validate,build,new-game}.ts`: đăng ký lệnh; `src/validate/`, `src/build-cmd/`, `src/new-game/`, `src/orchestrator/`; `clock.ts` (điểm tiêm Clock), `engine-version.ts`.
- Thư mục `build-cmd` (không phải `build`): Vitest, ESLint, tsconfig gốc loại `**/build/**`.
- `src/doctor/`: `run-doctor.ts`, `checks.ts`, `blender-check.ts`, `env-roles.ts`, `versions.ts`, `exec.ts`, `types.ts`, `blender-probe.py`.
- Test: `*.test.ts` (Vitest, runner giả, không gọi công cụ thật): TST-DEV-03, TST-CLI-02.

## Lệch so với DDD-09

- PSC-DEV-06 coi `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` là bắt buộc ở vai trò `dev`. Ở đây để **tuỳ chọn** vì dự án làm qua gói Max (Huy, 23/11/2026) và hai khoá chỉ cần khi sinh ảnh/âm thanh.
- `DoctorCheck` có thêm trường `optional?: true` để báo mục tuỳ chọn.
- `versions.json` có thêm `probe`, `roles`, `optional`, `timeoutS`, `features` (schema: `tools/schema/versions.schema.json`).
