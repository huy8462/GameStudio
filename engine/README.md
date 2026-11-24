# engine/

Thư viện engine và công cụ build (TSD-00 §4.1, DDD-00 §4.1). Gói tạo dần theo pha; hiện có `cli/` (lệnh `doctor`, `validate`, `build [--stale]`, `new-game`, `status`; bộ điều phối `src/orchestrator/`), `status/` (tiến độ game, `planStale`, thuần), `shared/rng/`, `shared/expr/` (biểu thức an toàn, ADR-022), `intake/` (lõi tiếp nhận mô tả, DDD-01; không gọi API Claude, ADR-035), `schema/` (jcs, hash, budget, pointer, patch, schema dữ liệu game và build, validators biên dịch sẵn), `build/py/` (`gsrng`, `gsio`, `heightfield/` gồm io, noise, procedural, erode, png), `build/steps/` (`world-fetch`, `world-heightfield`, `terrain-erode`, `terrain-splat` bằng python; `terrain-mesh` là gói node `@gamestudio/step-terrain-mesh`, cần `pnpm -r build`). Python: numpy 2.5.5, numba 0.68.1 ghim (`tools/versions.json`); nhân numba `parallel=False, fastmath=False`.

Bước python (`build/steps/<id>/main.py`, IF-CLI-02): thêm `build/py` vào `sys.path` (vì `python -I`), import `gsio` trước (stdout UTF-8, `single_thread_env()` trước numpy), ghi tệp bằng `gsio.write_text/write_json` (`newline="\n"`), báo `gsio.progress`, trả mã 4/5/6 theo SRS-04 §7.2. Test: `uv run pytest`, `uv run mypy`.

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
