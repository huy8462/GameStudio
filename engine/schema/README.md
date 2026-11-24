# @gamestudio/schema

Dữ liệu game: schema, chuẩn tắc hoá, băm, đánh giá ngân sách (MOD-GEN-12; ADR-021). Không `node:*`: dùng được cả CLI, `web/api`, runtime.

## Đã có (phiếu T-0001)

| API | Mã | Việc |
|---|---|---|
| `canonicalize(v)` | MOD-GEN-04 | JSON chuẩn tắc RFC 8785; từ chối NaN, Infinity, `undefined` trong mảng |
| `sha256Hex`, `jsonHash`, `dataHash` | MOD-GEN-05 | SHA-256 (`@noble/hashes`, đồng bộ); `jsonHash` = SHA-256 của JCS, bất biến thứ tự khoá |
| `evaluate(metrics, limits, fpsTarget?)`, `worst` | MOD-GEN-09, ALG-GEN-03 | ≤ 0,9 pass, ≤ 1,0 warn, > 1,0 fail; fps ≥ mục tiêu pass, ≥ 0,9× warn |
| `validate(kind, data)`, `validateFiles`, `kindByPath` | MOD-GEN-07 | Ajv 2020-12; lỗi `{instancePath, keyword, message}` |

## Thêm ở T-0002

| API | Mã | Việc |
|---|---|---|
| `parsePointer`, `formatPointer`, `pointerGet/Has/Set/Add/Remove` | RFC 6901 | Con trỏ JSON, bất biến |
| `applyPatch`, `invertPatch`, `touchedFilesOf` | MOD-GEN-06 | JSON Patch RFC 6902, bất biến, báo tệp bị chạm |
| `SCHEMA_DOCS`, `ROOT_IDS` | MOD-GEN-07 | Danh mục schema cho Ajv |

Schema: `schemas/<tên>/<major>.json`, `$id` = `https://gamestudio.local/schema/<tên>/<major>.json`. Hiện có `common/1`, `budgets/1` (SCH-GEN-03, SCH-RTM-03), `game/1` (SCH-GEN-01, SCH-CBT-01 phần `features`), `world/1` (+ `defs-1`, `parts-1`; SCH-GEN-02, SCH-WLD-01), `palette/1` (8–16 màu có vai trò, BR-05.2). `schemaVersion` là số nguyên.

Schema build (T-0004, `BUILD_KINDS`, không có `kindByPath`): `step/1` (IF-CLI-02), `report/1` (SCH-RTM-05, cho phép trường mở rộng theo `kind`), `cache-index/1` (SCH-RTM-09, kind `cacheIndex`).

Build: `tsc` rồi `scripts/gen-validators.mjs` sinh Ajv standalone `dist/validators.{js,cjs}` (MOD-RTM-04) cho runtime và hook H-03.

Mẫu hợp lệ: `games/_template/data/{budgets,game,world,palette}.json`.

## Chưa có (phiếu sau)
- Schema `entities/*`, `dialogue`, `recipe`, `provenance`, `manifest`, `status`.
- `impact.ts` (MOD-GEN-08), `migrate` (MOD-RTM-03).
- Kiểu TS sinh từ schema (`json-schema-to-typescript`).

## Lệch DDD
`hash.ts` dùng `@noble/hashes` cho cả Node lẫn trình duyệt, không tách bản `node:crypto` qua `exports` điều kiện (DDD-00 MOD-GEN-05): kết quả như nhau, ít bề mặt hơn.
