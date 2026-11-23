# engine/

Thư viện engine và công cụ build (TSD-00 §4.1, DDD-00 §4.1). Hiện **chưa có gói**: gói tạo dần theo pha.

| Thư mục | Gói | Mã | Pha |
|---|---|---|---|
| `schema/` | `@gamestudio/schema` | MOD-GEN-12 | E1 |
| `shared/rng/` | `@gamestudio/rng` | MOD-GEN-10 | E1 |
| `shared/expr/` | `@gamestudio/expr` | MOD-GEN-11 | E1 |
| `intake/` | `@gamestudio/intake` | MOD-GEN-13 | E1 |
| `runtime/` | `@gamestudio/engine` | MOD-GEN-14 | E2 |
| `qa/` | `@gamestudio/qa` | MOD-GEN-15 | E1 |
| `cli/` | `@gamestudio/cli` (lệnh `engine`) | MOD-GEN-16 | E0 (`doctor`), E1 |
| `status/` | `@gamestudio/status` | MOD-GEN-21 | E1 |
| `build/steps/`, `build/py/`, `build/blender/`, `build/packager/` | bước build | TSD-02…04 | E1+ |

Quy ước: tệp ≤ ~300 dòng; `src/index.ts` chỉ xuất API công khai; `README.md` ≤ 60 dòng; test `*.test.ts` cạnh mã; không `Math.random()`/`Date.now()` (ESLint chặn). Gói mới: `package.json` `"type": "module"`, `tsconfig.json` extends `../../tsconfig.base.json`.
