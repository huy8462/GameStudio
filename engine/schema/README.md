# @gamestudio/schema

Dữ liệu game: schema, chuẩn tắc hoá, băm, đánh giá ngân sách (MOD-GEN-12; ADR-021). Không `node:*`: dùng được cả CLI, `web/api`, runtime.

## Đã có (phiếu T-0001)

| API | Mã | Việc |
|---|---|---|
| `canonicalize(v)` | MOD-GEN-04 | JSON chuẩn tắc RFC 8785; từ chối NaN, Infinity, `undefined` trong mảng |
| `sha256Hex`, `jsonHash`, `dataHash` | MOD-GEN-05 | SHA-256 (`@noble/hashes`, đồng bộ); `jsonHash` = SHA-256 của JCS, bất biến thứ tự khoá |
| `evaluate(metrics, limits, fpsTarget?)`, `worst` | MOD-GEN-09, ALG-GEN-03 | ≤ 0,9 pass, ≤ 1,0 warn, > 1,0 fail; fps ≥ mục tiêu pass, ≥ 0,9× warn |
| `validate(kind, data)`, `validateFiles`, `kindByPath` | MOD-GEN-07 | Ajv 2020-12; lỗi `{instancePath, keyword, message}` |

Schema: `schemas/<tên>/<major>.json`, `$id` = `https://gamestudio.local/schema/<tên>/<major>.json`. Hiện có `budgets/1` (SCH-GEN-03, SCH-RTM-03): 4 tier đủ chỉ số SRS-04 §6.3 + `maxRenderDpr`, `behaviorLod`, `combat`, và `a56Baseline` (thông tin, không phải giới hạn).

Mẫu: `games/_template/data/budgets.json` (baseline A56 từ G-E0).

## Chưa có (phiếu sau)
- Schema `game`, `world`, `palette`, `entities/*`, `dialogue`, `recipe`, `provenance`, `manifest`, `report`, `status`.
- `patch.ts` (MOD-GEN-06), `impact.ts` (MOD-GEN-08), `migrate` (MOD-RTM-03).
- Ajv standalone biên dịch sẵn `dist/validators.{js,cjs}` cho runtime và hook H-03 (MOD-RTM-04).
- Kiểu TS sinh từ schema (`json-schema-to-typescript`).

## Lệch DDD
`hash.ts` dùng `@noble/hashes` cho cả Node lẫn trình duyệt, không tách bản `node:crypto` qua `exports` điều kiện (DDD-00 MOD-GEN-05): kết quả như nhau, ít bề mặt hơn.
