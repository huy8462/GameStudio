# DDD tổng quan: Thiết kế chi tiết GameStudio

| Mục | Nội dung |
|---|---|
| Mã tài liệu | DDD-00 |
| Phiên bản | 1.1 |
| Ngày | 23/11/2026 |
| Chủ sở hữu / người duyệt | Huy |
| Người soạn | Claude |
| Nguồn | TSD-00…09 v1.1, riêng TSD-00, 01, 04, 09 v1.2 và TSD-08 v1.3 (đã duyệt, CR-01); SRS-00…09 v1.0, riêng SRS-00 v1.2, SRS-01, 04, 09 v1.1, SRS-06 v1.1, SRS-08 v1.2 (đã duyệt); ADR-016…033 (đã chốt), BRD-00 v0.5 |
| Quyết định áp dụng | QĐ-13 chiến đấu/săn bắt là module tuỳ chọn, mặc định tắt; QĐ-14 hội thoại NPC tĩnh, AI khi chạy tuỳ chọn và chỉ qua cổng AI phía server; QĐ-15 Web Studio riêng, chỉ người được mời (CH-23); TD-01…18 (ADR-016…033) |
| Trạng thái | Đã duyệt (Huy, 23/11/2026); **v1.1 runtime Unity theo CR-02** (Huy duyệt phân tích 25/11/2026), chờ Huy xem lại |

> DDD đi một tầng dưới TSD: TSD nói **dùng gì và theo thuật toán nào**, DDD nói **viết vào tệp nào, lớp và hàm nào, chữ ký kiểu ra sao, bảng CSDL có cột và chỉ mục gì, API nhận và trả gì, luồng gọi và máy trạng thái ra sao, xử lý lỗi và cấu hình thế nào, kiểm thử những ca nào**. Mục tiêu là một phiếu Claude Code có thể mở đúng một mục DDD, viết mã và test mà không phải đoán. DDD không định nghĩa lại mã của SRS/TSD, không tự chốt số SRS còn mở. Hai số còn mở theo SRS được thiết kế thành **tham số cấu hình** với giá trị khởi tạo: LOD hành vi 30/80 m (OI-CHR-07) và ngân sách chiến đấu tier Vừa 3 kẻ tấn công / 20 đạn (OI-CBT-05).

### Danh mục DDD

| Mã | Tài liệu | TSD nguồn | Nhóm mã | Phạm vi mã nguồn |
|---|---|---|---|---|
| DDD-00 | DDD tổng quan (tài liệu này) | TSD-00 | `GEN` | Quy ước chung, gói `rng`, `schema` (phần lõi), `status` (tiến độ game, CR-01), hash, impact, ngân sách, cấu hình, triển khai, lỗi |
| DDD-00-PL-A | [Ma trận truy vết TSD/SRS → DDD](DDD-00-PL-A-MA-TRAN-TRUY-VET.md) (sinh tự động) | TSD-00…09 | — | — |
| DDD-01 | [Tạo game từ mô tả](DDD-01-TAO-GAME-TU-MO-TA.md) | TSD-01 | `INT` | `engine/intake/**` |
| DDD-02 | [Thế giới, địa hình và môi trường](DDD-02-THE-GIOI-DIA-HINH-MOI-TRUONG.md) | TSD-02 | `WLD` | `engine/build/steps/{world-*,terrain-*,water,vegetation,placement,lighting-bake}`, `engine/build/py/heightfield`, `engine/runtime/src/{render/terrain,render/water,render/vegetation,fx}` |
| DDD-03 | [Asset 3D, vật liệu và âm thanh](DDD-03-ASSET-VAT-LIEU-AM-THANH.md) | TSD-03 | `AST` | `engine/build/{asset-import,asset-forge,kit-builder,materials,audio}` |
| DDD-04 | [Runtime, hiệu năng và QA](DDD-04-RUNTIME-HIEU-NANG-QA.md) | TSD-04 | `RTM`, `QA`, `CLI` | `engine/runtime/src/{core,loader,render,tier,input,interaction,ui,audio,save,perf,api}`, `engine/shared/expr`, `engine/build/packager`, `engine/qa`, `engine/cli` |
| DDD-05 | [Nhân vật, NPC và động vật](DDD-05-NHAN-VAT-NPC-DONG-VAT.md) | TSD-05 | `CHR` | `engine/runtime/src/{camera-player,characters,npc-ai}`, `engine/families/**`, bước `navmesh`, `characters-bake` |
| DDD-06 | [Chiến đấu và săn bắt (tuỳ chọn)](DDD-06-CHIEN-DAU-SAN-BAT.md) | TSD-06 | `CBT` | `engine/runtime/src/combat/**` (chunk riêng) |
| DDD-07 | [Hội thoại NPC](DDD-07-HOI-THOAI-NPC.md) | TSD-07 | `DLG` | `engine/runtime/src/{interaction/dialogue,dialogue-ai}`, bước `dialogue-check`, `web/ai-gateway/src/dlg/**` |
| DDD-08 | [Web Studio](DDD-08-WEB-STUDIO.md) | TSD-08 | `WEB` | `web/{shared,api,ai-gateway,worker,app,deploy}/**` |
| DDD-09 | [Studio AI, quy trình, bảo mật dev](DDD-09-STUDIO-AI-QUY-TRINH-BAO-MAT.md) | TSD-09 | `DEV` | `.claude/**`, `.githooks/**`, `tools/**`, `.github/workflows/**` |

---

## 1. Giới thiệu

### 1.1 Mục đích
Đặc tả thiết kế chi tiết để triển khai. Mỗi DDD-0x theo cùng một khung mục (mục 1.5) và truy vết về thành phần TSD (`ALG`, `SCH`, `IF`, `TST`, `TD`) và yêu cầu SRS (`FR`, `NFR`).

### 1.2 Đối tượng đọc
Huy (duyệt), phiên điều phối (cắt phiếu theo mục DDD), agent Claude Code theo vùng (`engine-dev`, `tech-artist`, `world-builder`, `asset-designer`, `gameplay-ui`, `qa`, `docs`, `web-dev` khi tách), người soạn `docs/TEST`.

### 1.3 Quy ước mã của DDD

DDD chỉ **tham chiếu** mã SRS (FR, NFR, QT, UC, SCR, API, ERR, OI) và TSD (TD, ALG, SCH, IF, TST, OIT). Mã mới của DDD:

| Loại | Mẫu | Nội dung | Ví dụ |
|---|---|---|---|
| Module / lớp | `MOD-<NHÓM>-nn` | Một tệp hoặc nhóm tệp có trách nhiệm rõ: đường dẫn, lớp/hàm xuất, phụ thuộc | MOD-WEB-07 |
| Kiểu / cấu trúc dữ liệu | `DTO-<NHÓM>-nn` | Kiểu TypeScript/Python, định dạng tệp, thông điệp | DTO-INT-03 |
| Bảng CSDL | `TBL-<NHÓM>-nn` | Bảng PostgreSQL: cột, kiểu, ràng buộc, chỉ mục | TBL-WEB-04 |
| Endpoint | `EP-<NHÓM>-nn` | Chi tiết yêu cầu/phản hồi của một `API-` SRS hoặc endpoint nội bộ | EP-WEB-12 |
| Luồng | `SEQ-<NHÓM>-nn` | Sơ đồ tuần tự | SEQ-DLG-01 |
| Máy trạng thái | `STM-<NHÓM>-nn` | Trạng thái, sự kiện, điều kiện, hành động | STM-AST-01 |
| Giả mã | `PSC-<NHÓM>-nn` | Thuật toán viết dạng giả mã đủ để code | PSC-WLD-06 |
| Cấu hình | `CFG-<NHÓM>-nn` | Khoá cấu hình, mặc định, nơi đặt | CFG-CHR-01 |
| Ca kiểm thử | `TC-<NHÓM>-nn` | Thiết kế ca kiểm thử: tiền điều kiện, bước, kỳ vọng | TC-WEB-05 |
| Open item thiết kế | `OID-<NHÓM>-nn` | Câu hỏi chi tiết cần đo hoặc Huy chốt | OID-GEN-01 |

Nhóm như SRS/TSD: `GEN`, `INT`, `WLD`, `AST`, `RTM`, `QA`, `CLI`, `CHR`, `CBT`, `DLG`, `WEB`, `DEV`. Mã được **định nghĩa** ở ô đầu của dòng bảng hoặc ở tiêu đề `###`/`####`; mọi chỗ khác là tham chiếu. Nhãn số liệu: không ghi = đã chốt ở SRS/TSD; **(TSD đề xuất)** giữ nguyên nhãn TSD; **(DDD đề xuất)** = giá trị chi tiết DDD đưa ra để code, hiệu chỉnh qua phiếu khi có số đo; số SRS còn mở ghi mã OI.

### 1.4 Tài liệu liên quan
`docs/SRS/`, `docs/TSD/`, `docs/ADR/` (ADR-016…033), `docs/BRD/`, `docs/UIUX/` (wireframe W1/W3), `docs/TEST/` (ca kiểm thử chi tiết sinh từ mục "Thiết kế kiểm thử" của DDD), brief bản 6.

### 1.5 Khung mục của DDD-01…09
1 Giới thiệu · 2 Bố trí mã nguồn (MOD) · 3 Thiết kế lớp và giao diện (chữ ký kiểu) · 4 Dữ liệu (DTO, TBL) · 5 API / giao thức (EP) · 6 Luồng xử lý (SEQ) · 7 Máy trạng thái (STM) · 8 Thuật toán chi tiết (PSC) · 9 Xử lý lỗi · 10 Cấu hình (CFG) · 11 Thiết kế kiểm thử (TC) · 12 Open item (OID) · 13 Truy vết · 14 Lịch sử thay đổi. Mục không áp dụng ghi "Không có".

---

## 2. Quy ước thiết kế chung

### 2.1 Mã nguồn
- TypeScript 5.x `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`; ESM; Node 24 (TD-02). Python 3.12 (`uv`), Ruff, mypy `--strict` cho `engine/build/py/**`.
- Một tệp ≤ ~300 dòng (NFR-GEN-11). Tên tệp `kebab-case.ts`; lớp `PascalCase`; hàm/biến `camelCase`; hằng `SCREAMING_SNAKE`; trạng thái nghiệp vụ `PascalCase` không dấu (`ChoDuyet`); giá trị liệt kê `snake_case` (`tho_o`).
- Mỗi gói: `src/index.ts` chỉ xuất API công khai; `README.md` ≤ 60 dòng; test cạnh mã `*.test.ts` (Vitest) hoặc `tests/test_*.py` (pytest).
- Không `any` ở API công khai; kiểu dữ liệu game sinh từ JSON Schema (`json-schema-to-typescript`) vào `engine/schema/src/generated/*.d.ts`, không sửa tay (TD-06).

### 2.2 Kiểu dùng chung (`@gamestudio/schema/src/common.ts`)

| Mã | Kiểu | Định nghĩa |
|---|---|---|
| DTO-GEN-01 | `Result<T, E>` | `type Result<T, E = AppError> = { ok: true; value: T } \| { ok: false; error: E }`; hàm thư viện không ném lỗi nghiệp vụ, chỉ ném lỗi lập trình (bất biến bị vi phạm) |
| DTO-GEN-02 | `AppError` | `{ code: ErrCode; message: string; params?: Record<string, string \| number>; field?: string; cause?: unknown }`; `ErrCode` là union chuỗi của mọi mã `ERR-*` trong SRS (sinh từ `web/shared/src/errors.ts`, mục 5) |
| DTO-GEN-03 | Định danh | `type GameId = string & {__brand:'GameId'}` (kebab-case, `^[a-z0-9][a-z0-9-]{1,62}$`); `type Ulid = string & {__brand:'Ulid'}` (26 ký tự Crockford); `type AssetRef = \`asset:${string}@${number}\``; `type JsonPointer = string` (RFC 6901, bắt đầu `/`) |
| DTO-GEN-04 | `JsonPatchOp` | RFC 6902: `{op:'add'\|'remove'\|'replace'\|'move'\|'copy'\|'test', path: JsonPointer, from?: JsonPointer, value?: unknown}` |
| DTO-GEN-05 | `Report1` | Đúng TSD-04 SCH-RTM-05 (`report/1`): `{schema:'report/1', kind:'build'\|'qa'\|'perf'\|'gate', step?, gameId, zone?, tier?, inputHash?, cached, startedAt, durationS, seed?, metrics: Record<string, number>, budget: Record<string, number>, result:'pass'\|'warn'\|'fail', checks: Check[], warnings: string[], artifacts: string[], summary: string, tool:{name, version}, host, stepVersion?}`; `Check = {id, result, value?, limit?, message?, source?: string[]}` |
| DTO-GEN-06 | `Tier` | `'thap' \| 'vua' \| 'cao' \| 'toi_da'` |
| DTO-GEN-07 | `ImpactResult` | `{runtimeOnly: boolean, buildSteps: StepId[], zones: string[], estimateMinutes: number, pointersRuntime: JsonPointer[], pointersBuild: JsonPointer[]}` |

### 2.3 Lỗi, mã thoát, HTTP
- CLI: lỗi nghiệp vụ trả `Result` tới tầng lệnh; tầng lệnh ánh xạ `ErrCode` → mã thoát theo bảng mục 5.2; `--json` in `{ok, code?, message?, report?}` một dòng ở stdout, người đọc ở stderr.
- Web: `AppError` → HTTP theo cột HTTP của SRS; envelope `{error:{code, message, params?, field?}}` (TSD-08 IF-WEB-01).
- Runtime trình duyệt: lỗi hiển thị theo SCR-RTM-01; lỗi không mong đợi ghi `console.error` có tiền tố `[gs]` (QA smoke bắt).

### 2.4 Tất định
- Không `Math.random()`, `Date.now()` trực tiếp trong `engine/**` (ESLint `no-restricted-properties`); dùng `rng` (mục 3.1) và `clock` tiêm (`Clock {now(): number}`).
- Mọi danh sách được sắp ổn định trước khi băm hoặc ghi (`localeCompare` không dùng; so byte UTF-8).
- `numpy` một luồng: biến môi trường `OMP_NUM_THREADS=1`, `NUMBA_NUM_THREADS=1` do bộ điều phối đặt khi chạy bước Python.

---

## 3. Gói dùng chung

### 3.1 `@gamestudio/rng` (ALG-GEN-01)

| Mã | Module | Nội dung |
|---|---|---|
| MOD-GEN-01 | `engine/shared/rng/src/pcg32.ts` | `class Pcg32 { constructor(seed: number, stream?: number); nextU32(): number; float(): number /* [0,1) */; int(min: number, max: number): number /* đóng hai đầu */; pick<T>(arr: readonly T[]): T; shuffleInPlace<T>(arr: T[]): void; fork(id: string): Pcg32; state(): {state: bigint, inc: bigint} }`. Trạng thái 64 bit lưu bằng hai `Uint32` (hi/lo) để không cấp phát `BigInt` trong vòng nóng; `state()` chỉ dùng cho test |
| MOD-GEN-02 | `engine/shared/rng/src/derive-seed.ts` | `deriveSeed(...parts: (string \| number)[]): number` = 4 byte đầu SHA-256(`parts.join('\|')`) big-endian, `>>> 0`. Bản trình duyệt dùng SHA-256 thuần JS đồng bộ (`@noble/hashes/sha256`, ~4 KB) vì `crypto.subtle` là bất đồng bộ |
| MOD-GEN-03 | `engine/build/py/gsrng.py` | `class Pcg32` và `derive_seed(*parts)` cùng thuật toán; vector chuẩn `engine/shared/rng/vectors.json` (5 seed × 1.000 giá trị) dùng chung cho Vitest và pytest |

#### PSC-GEN-01 PCG32 và `fork`
```
MULT = 6364136223846793005 (64 bit), seed khởi tạo theo chuẩn pcg32_srandom_r:
  state = 0; inc = (stream << 1) | 1; step(); state += seed; step()
step(): old = state; state = old * MULT + inc (mod 2^64)
nextU32(): old = state; step()
  xorshifted = uint32(((old >> 18) ^ old) >> 27); rot = uint32(old >> 59)
  return (xorshifted >>> rot) | (xorshifted << ((-rot) & 31))
float(): nextU32() / 2^32
int(a, b): range = b - a + 1; nếu range là 0 (toàn dải) trả nextU32()
  threshold = (2^32 - range) % range; lặp r = nextU32() tới khi r >= threshold; trả a + (r % range)
fork(id): return new Pcg32(deriveSeed(this.nextU32(), id), stream = deriveSeed(id) )
```
`fork` tiêu thụ đúng một giá trị của luồng cha nên thứ tự gọi `fork` là một phần của tất định; mỗi hệ thống gọi `fork` một lần khi `init` theo thứ tự `order` (TSD-04 IF-RTM-02).

### 3.2 `@gamestudio/schema` phần lõi

| Mã | Module | Nội dung |
|---|---|---|
| MOD-GEN-04 | `engine/schema/src/jcs.ts` | `canonicalize(value: unknown): string` theo RFC 8785 (khoá sắp theo đơn vị mã UTF-16, số theo ECMAScript `Number.prototype.toString`, chuỗi escape tối thiểu); từ chối `NaN`, `Infinity`, `undefined` trong mảng |
| MOD-GEN-05 | `engine/schema/src/hash.ts` | `sha256Hex(data: string \| Uint8Array): string` (Node: `node:crypto`; trình duyệt: `@noble/hashes`) — gói chọn bản cài qua `exports` điều kiện `"browser"`/`"node"`; `dataHash(files: Record<string, unknown>): string` = SHA-256 của chuỗi nối `path + '\n' + canonicalize(json) + '\n'` theo đường dẫn đã sắp |
| MOD-GEN-06 | `engine/schema/src/patch.ts` | `applyPatch(doc, ops, opts?: {validate?: boolean}): Result<{doc, touchedFiles: string[]}>` (bất biến: trả bản mới, chia sẻ cấu trúc không đổi); `invertPatch(docBefore, ops): JsonPatchOp[]`; `pointerGet/Set/Remove`; `touchedFiles` = tiền tố `/<file>` của mỗi `path` (dữ liệu web lưu dạng `{ "game.json": {...}, "world.json": {...}, "entities/npc/ong-lao.json": {...} }` nên mã hoá `~1` cho `/` trong tên tệp) |
| MOD-GEN-07 | `engine/schema/src/validate.ts` | `validate(kind: SchemaKind, data: unknown): ValidationError[]`; `validateFiles(files): Record<path, ValidationError[]>` chọn `kind` theo đường dẫn (bảng `kindByPath` mục 3.3); Ajv standalone sinh lúc build gói vào `dist/validators.js` (ESM) và `dist/validators.cjs` (cho hook H-03, DDD-09) |
| MOD-GEN-08 | `engine/schema/src/impact.ts` | `impact(changed: JsonPointer[], ctx: {impactMap: ImpactMap, stepGraph: StepGraph, zonesOf: (p) => string[], history?: DurationHistory}): ImpactResult` (ALG-GEN-04, PSC-GEN-03) |
| MOD-GEN-09 | `engine/schema/src/budget.ts` | `evaluate(metrics, limits, fpsTarget?): {result, checks}` (ALG-GEN-03, PSC-GEN-04) |

### 3.3 Bảng `kindByPath` (SCH-GEN-01…06)

| Mẫu đường dẫn (glob, tương đối `games/<id>/`) | `SchemaKind` | `$id` |
|---|---|---|
| `data/game.json` | `game` | `https://gamestudio.local/schema/game/1.json` |
| `data/world.json` | `world` | `…/world/1.json` |
| `data/palette.json`, `data/budgets.json` | `palette`, `budgets` | `…/palette/1.json`, `…/budgets/1.json` |
| `data/entities/player.json` | `player` | `…/player/1.json` |
| `data/entities/npc/*.json` | `npc` hoặc `npc-template` (theo trường `template: true`) | `…/npc/1.json` |
| `data/entities/animals/*.json` | `animal` | `…/animal/1.json` |
| `data/entities/interactions/*.json`, `weapons/*.json` | `interaction`, `weapon` | — |
| `data/behaviors/*.json` | `behavior-graph` | — |
| `data/dialogue/*.json` | `dialogue` | — |
| `assets/recipes/*.json`, `**/*.provenance.json` | `recipe`, `provenance` | — |
| `build/**/manifest.json`, `build/**/reports/*.json`, `publish.json` | `manifest`, `report`, `publish` | — |

Thêm major: tạo `engine/schema/schemas/<tên>/<n+1>.json` (giữ bản cũ), `engine/schema/migrate/<tên>/<n>-to-<n+1>.ts` (DDD-04 MOD-RTM-03).

### 3.4 Hash bước build (ALG-GEN-02)

#### PSC-GEN-02 `inputHash` và `outputHash`
```
inputHash(step, ctx):
  slices = {}
  for ptr in sort(step.inputs.dataPointers):          # JSON Pointer có thể chứa '*' cho phần tử mảng
      for (p, v) in resolvePointer(ctx.data, ptr):     # đã sắp theo p
          slices[p] = sha256Hex(canonicalize(v))
  files = {}
  for g in step.inputs.files: for f in sort(glob(ctx.gameDir, g)): files[rel(f)] = fileHash(f)
  up = { s: ctx.upstream[s].outputHash for s in sort(step.deps) }
  return 'sha256:' + sha256Hex(canonicalize({step: step.id, stepVersion: step.version,
           toolVersions: sort(step.tools).map(t => t + '@' + versions[t]),
           dataSlices: slices, files, upstream: up, zone: ctx.zone ?? null, tier: ctx.tier ?? null, seed: ctx.seed}))
fileHash(f): tra cache `build/<id>/.hashcache.json` theo (path, mtimeMs, size); trùng → dùng lại; khác → đọc luồng SHA-256
outputHash(outDir): list = sort([(rel(f), sha256(f)) for f in walk(outDir) if f != 'report.json'])
  return 'sha256:' + sha256Hex(list.map(([p,h]) => p + ' ' + h).join('\n'))
```
`report.json` không vào `outputHash` vì có thời điểm chạy; `meta.json` của cache ghi `{outputHash, createdAt, durationS}` (DDD-04 MOD-CLI-03).

### 3.5 Phân tích ảnh hưởng (ALG-GEN-04)

#### PSC-GEN-03 `impact`
```
impactMap: [{pointer: '/world.json/vegetation', steps: ['vegetation'], perZone: true}, ...]   # sinh từ mọi step.json
runtimeOnlyPatterns: ['/entities~1npc~1*', '/entities~1animals~1*', '/entities~1interactions~1*',
                      '/dialogue~1*', '/world.json/atmosphere', '/world.json/postFx', '/game.json/state']  # SRS-04 mục 6.2
impact(changed):
  direct = set(); rtPtrs = []; bPtrs = []
  for p in changed:
     hits = [e for e in impactMap if isPrefixOrEqual(e.pointer, p) or isPrefixOrEqual(p, e.pointer)]
     if hits empty and matchesAny(runtimeOnlyPatterns, p) and not isNewAppearance(p): rtPtrs.push(p); continue
     if hits empty: bPtrs.push(p); direct.add('packager'); continue        # an toàn: không rõ thì build lại gói
     bPtrs.push(p); direct |= hits.steps
  steps = downstreamClosure(stepGraph, direct)                              # BFS theo cạnh deps đảo
  zones = steps.some(perZone) ? union(zonesOf(p) for p in bPtrs) : []      # zonesOf: theo toạ độ đối tượng / zone khai báo; không rõ → mọi zone
  est = sum over (s in steps, z in zones or ['*']): median(last5(history[s][z])) ?? DEFAULT_MIN[s]
  return {runtimeOnly: bPtrs empty, buildSteps: topoSort(steps), zones: sort(zones), estimateMinutes: ceil(est), pointersRuntime: rtPtrs, pointersBuild: bPtrs}
isNewAppearance(p): p chạm '/appearance/model' hoặc thêm phần tử loài/mẫu chưa có trong bản build (cần asset mới)
```
`DEFAULT_MIN` (DDD đề xuất): `world.fetch` 3, `world.heightfield` 2, `terrain.erode` 3, `terrain.mesh` 1, `terrain.splat` 1, `materials` 2, `assets` 5, `water` 1, `vegetation` 3, `placement` 2, `navmesh` 2, `lighting.bake` 90, `audio` 1, `dialogue.check` 0,2, `packager` 3, `qa` 5 (phút).

### 3.6 Đánh giá ngân sách (ALG-GEN-03)

#### PSC-GEN-04 `evaluate`
```
evaluate(metrics, limits, fpsTarget):
  checks = []
  for k in sort(keys(limits)) where k in metrics:
     r = metrics[k] / limits[k]
     res = r <= 0.9 ? 'pass' : r <= 1.0 ? 'warn' : 'fail'
     checks.push({id: k, result: res, value: metrics[k], limit: limits[k]})
  if fpsTarget and 'fpsAvg' in metrics:
     f = metrics.fpsAvg; res = f >= fpsTarget ? 'pass' : f >= 0.9*fpsTarget ? 'warn' : 'fail'
     checks.push({id:'fps', result: res, value: f, limit: fpsTarget})
  result = worst(checks)   # fail > warn > pass; rỗng → pass
```
Ví dụ kiểm (TST-RTM-07): draw call 100/112/125 với giới hạn 120 → pass/warn/fail; fps 31/28/26 với mục tiêu 30 → pass/warn/fail.

### 3.7 Tiến độ game và luồng làm tiếp/cập nhật (CR-01, TSD-00 mục 2.5, ALG-GEN-05)

Ba trường hợp của SRS-00 mục 4.4 (A đang làm dở, B cập nhật game đã có, C nhập game có sẵn) dùng **một** cơ chế: tính báo cáo tiến độ → làm việc còn thiếu → build phần cũ → QA nhẹ → xuất bản bản số mới. Không có đường build riêng cho game cũ. Gói `@gamestudio/status` là lõi dùng chung cho `engine status` / `build --stale` / `upgrade` / `import` (DDD-04 mục 3.4), API-WEB-83 và job web (DDD-08 mục 3.5), lệnh `/resume-game`, `/import-game` (DDD-09).

| Mã | Tệp | Nội dung |
|---|---|---|
| MOD-GEN-20 | `engine/status/src/{types.ts, sources.ts, plan-stale.ts, compute.ts, stages.ts, summarize-vi.ts, default-durations.json}` | Gói `@gamestudio/status`: thuần TS, không I/O (mọi đọc qua `StatusSources`), không gọi mạng/mô hình. Xuất `planStale`, `computeStatus`, `summarizeVi` (DDD-01 PSC-INT-15), `STAGES` |

```ts
// engine/status/src/sources.ts  (DTO-GEN-09)
export interface StatusSources {
  gameId: string;
  data(): Promise<{ version: number; data: GameData; schemaVersion: number; engineVersion: string }>;
  brief(): Promise<{ status: 'Nhap' | 'ChoXacNhan' | 'DaXacNhan'; version: number } | null>;
  style(): Promise<'ChuaCo' | 'ChoDuyet' | 'DaDuyet'>;
  cacheIndex(): Promise<CacheIndexEntry[]>;                 // DDD-04 DTO-CLI-05 (SCH-RTM-09)
  stepGraph(): Promise<StepGraph>;                          // DDD-04 MOD-CLI-02 loadGraph
  assetHashes(): Promise<Record<AssetId, string>>;          // từ registry, không băm tệp lớn
  qaReports(): Promise<{ zone: string; buildDataHash: string; result: 'pass' | 'fail'; at: string }[]>;
  publications(): Promise<{ version: number; dataVersion: number; notMet: boolean; takenDown: boolean }[]>;
  pendingIntake(): Promise<{ sessionId: string; pendingQuestions: number } | null>;
  counts(): Promise<{ proposalsPending: number; assetsPending: number; jobsFailed: number; missingProvenance: number; versionsSincePublish: number; lockedBy?: string }>;
  supported(): { schemaVersion: number; engineRange: string };
}
// engine/status/src/plan-stale.ts
export interface StaleItem { step: StepId; zone: string | null; tier: Tier; reason: 'never' | 'input_changed' | 'upstream_stale'; inputHash: string; estS: number }
export function planStale(data: GameData, graph: StepGraph, cache: CacheIndexEntry[], assetHashes: Record<AssetId, string>, o?: { zone?: string; tiers?: Tier[] }): StaleItem[];
// engine/status/src/compute.ts
export async function computeStatus(src: StatusSources, now?: Date): Promise<StatusReport>;   // DTO-GEN-08
```

| Mã | Cấu trúc | Đặc tả |
|---|---|---|
| DTO-GEN-08 | `StatusReport` `status/1` (SCH-GEN-07, SRS-04 mục 6.6) | `{schema:'status/1', gameId, dataVersion, stage: Stage, brief: {status, version} \| null, style, zones: [{id, built: bool, staleSteps: StepId[], estimateMinutes?, qa: 'pass'\|'fail'\|'cu'\|'chua'}], flags: {deXuatChoDuyet, assetChoDuyet, jobLoi, canNangCap: bool, thieuProvenance, thayDoiChuaXuatBan, dangKhoaBoi?: string}, lastPublication?: {version, dataVersion, chuaDat}, pendingIntake?: {sessionId, pendingQuestions}, next: {action: 'answer'\|'confirm_brief'\|'approve_style'\|'build'\|'qa'\|'publish'\|'upgrade'\|'none', args: string, label: string}}`; `Stage = 'TaoMoi'\|'ChoXacNhanBrief'\|'ChoDuyetStyle'\|'ChuaBuild'\|'CanBuild'\|'ChuaQA'\|'SanSangXuatBan'\|'DaXuatBan'`. Schema `engine/schema/status.schema.json`; không lưu (QT-WEB-11) |
| DTO-GEN-09 | `StatusSources` | Mục trên; CLI cài bằng thư mục `games/<id>/` (DDD-04 MOD-CLI-07), web cài bằng CSDL + kho đối tượng (DDD-08 MOD-WEB-35) |

#### STM-GEN-01 Giai đoạn tiến độ (SRS-00 mục 4.4)
Giá trị suy ra mỗi lần đọc, xét từ trên xuống, lấy dòng đầu đúng: `TaoMoi` (phiên tạo game `Nhap`, chưa có brief) → `ChoXacNhanBrief` → `ChoDuyetStyle` → `ChuaBuild` (zone chưa từng build ở tier Vừa) → `CanBuild` (zone có bước cũ) → `ChuaQA` (bản build hiện tại chưa có QA nhẹ) → `SanSangXuatBan` → `DaXuatBan`. Sau khi xuất bản, thay đổi có bước build bị ảnh hưởng đưa về `CanBuild`; thay đổi chỉ runtime đưa về `ChuaQA`. Cờ `canNangCap` ngoài dải `engineVersion` chặn build (next = `upgrade`).

#### PSC-GEN-05 `planStale` và `computeStatus` (ALG-GEN-05)
```
planStale(data, graph, cache, assetHashes, o):
  idx = map (step, zone, tier) → entry cache mới nhất ok=true
  tiers = o.tiers ?? ({'vua'} ∪ tier đã có trong cache)
  out = []; stale = Set()
  for s in topo(graph):                                    # thứ tự đồ thị
    for z in (s.perZone ? zonesOf(data, o.zone) : [null]): for t in tiers:
      upOut = s.deps.map(d => stale.has(key(d,z,t)) ? '<stale>' : idx[d,z,t]?.outputHash ?? '<none>')
      h = sha256(JCS({data: pick(data, s.inputs.dataPointers), assets: hashesOf(s, z, assetHashes),
                      up: upOut, v: s.version, params: s.inputs.params}))     # cùng công thức DDD-00 PSC-GEN-02
      e = idx[s.id, z, t]
      reason = !e ? 'never' : (e.inputHash != h ? 'input_changed' : (upOut contains '<stale>' ? 'upstream_stale' : null))
      if reason: out.push({step:s.id, zone:z, tier:t, reason, inputHash:h, estS: medianDurationS(s, cache) ?? DEFAULT[s.id]}); stale.add(key)
  return out
computeStatus(src):
  [d, b, st, cache, g, ah, qa, pubs, intake, c] = await all(...)
  stale = planStale(d.data, g, cache, ah)
  zones = zonesOf(d.data).map(z => {id:z, built: cache có packager ok cho (z,'vua'), staleSteps: stale.filter(z).step,
          estimateMinutes: ceil(Σ estS/60), qa: qaState(z, qa, d)})
  flags = {deXuatChoDuyet:c.proposalsPending, assetChoDuyet:c.assetsPending, jobLoi:c.jobsFailed,
           canNangCap: d.schemaVersion < src.supported().schemaVersion || !inRange(d.engineVersion), thieuProvenance:c.missingProvenance,
           thayDoiChuaXuatBan:c.versionsSincePublish, dangKhoaBoi:c.lockedBy}
  stage = first(STAGES where cond(...))                    # STM-GEN-01
  next = flags.canNangCap && !inRange ? upgrade : NEXT[stage](zones ưu tiên zone cũ có ước lượng ngắn nhất)
  return {schema:'status/1', ...}
```
Không băm tệp asset (dùng hash registry), không gọi mạng → ≤ 5 s cho game 4 zone (NFR-CLI-02). `build --stale` của CLI và `dryRun` của web dùng chính `planStale`, nên "cần build" trên báo cáo luôn khớp việc build sẽ làm.

---

## 4. Cấu trúc monorepo chi tiết

### 4.1 Gói và điểm vào

| Mã | Gói (`package.json` `name`) | Thư mục | `exports` chính | Build |
|---|---|---|---|---|
| MOD-GEN-10 | `@gamestudio/rng` | `engine/shared/rng` | `.` | `tsc` |
| MOD-GEN-11 | `@gamestudio/expr` | `engine/shared/expr` | `.` | `tsc` |
| MOD-GEN-12 | `@gamestudio/schema` | `engine/schema` | `.`, `./patch`, `./validators` (ESM + CJS), `./types` | `tsc` + `scripts/gen-validators.ts` + `scripts/gen-types.ts` |
| MOD-GEN-13 | `@gamestudio/intake` | `engine/intake` | `.` | `tsc` |
| MOD-GEN-14 | Unity player (CR-02, thay `@gamestudio/engine`) | `engine/unity` | `GameStudio.Runtime` (player), `GameStudio.Editor` (chế độ preview trong player), `GameStudio.Tests` | Unity Web build (Brotli), đầu ra `dist/engine/<semver>/` (loader, `.wasm`, `.data`, `.framework.js`); build batchmode trên máy dev |
| MOD-GEN-15 | `@gamestudio/qa` | `engine/qa` | `.` | `tsc` |
| MOD-GEN-16 | `@gamestudio/cli` | `engine/cli` | `bin: {engine: dist/main.js}` | `tsc` |
| MOD-GEN-17 | `@gamestudio/web-shared`, `-api`, `-ai-gateway`, `-worker`, `-app` | `web/*` | xem DDD-08 | `tsc` / Vite |
| MOD-GEN-21 | `@gamestudio/status` | `engine/status` | `.` | `tsc`; phụ thuộc `@gamestudio/schema` (JCS, hash), không phụ thuộc `node:*` (dùng được trong `web/api` và CLI) |

`pnpm-workspace.yaml`: `packages: ['engine/*', 'engine/shared/*', 'engine/build/*', 'web/*']`. `pyproject.toml` gốc khai báo workspace `uv` cho `engine/build/py` và các bước Python.

### 4.2 Luật phụ thuộc (TSD-00 mục 4.2)
Cấu hình `.dependency-cruiser.cjs`: (1) `no-circular`; (2) `engine/unity/**` không chứa mã TS/JS ngoài `.jslib`; (3) `games/**` không chứa tệp mã (FR-RTM-04, CR-02); (4) `web/app/**` không tới `web/api/**`, `web/ai-gateway/**`, `web/worker/**`; (5) `web/**` không chứa bản sao logic intake: cấm import đường dẫn `engine/intake/src/**` trực tiếp, chỉ `@gamestudio/intake` (TST-INT-10).

---

## 5. Danh mục lỗi chung

### 5.1 Tệp mã lỗi
`web/shared/src/errors.ts` là nguồn duy nhất của `ErrCode` cho cả engine và web: `export const ERRORS = { 'ERR-INT-01': {http: 422, exit: 4, msg: 'Mô tả cần từ 10 đến 20.000 ký tự.'}, … } as const`. Gói engine import kiểu `ErrCode` qua `@gamestudio/schema/types` (bản sao sinh tự động bằng `scripts/sync-errors.ts` để engine không phụ thuộc `web/*`). Câu thông báo lấy nguyên văn bảng mã lỗi SRS; tham số `<…>` thành `{name}`.

### 5.2 Ánh xạ mã thoát CLI (SRS-04 mục 7.2)

| Mã thoát | Nhóm `ErrCode` |
|---|---|
| 0 / 1 / 2 | Không lỗi; kết quả `pass` / `warn` / `fail` của báo cáo |
| 3 | ERR-INT-03, 06, 07, 08; style bible chưa duyệt (ALG-AST-08); asset chưa duyệt; `HandoffLlmClient` đang chờ |
| 4 | ERR-INT-01, 02, 05; ERR-WLD-02, 03, 04; ERR-AST-01, 02, 03, 04, 06, 07, 08; ERR-RTM-03, 04; ERR-CHR-01…04, 06; ERR-CBT-01…03; ERR-DLG-08; ERR-CLI-01 |
| 5 | ERR-WLD-07; ERR-DEV-04, 05 |
| 6 | ERR-INT-04; ERR-WLD-01; ERR-AST-05 (khi không có phương án thủ tục) |
| 10 | Ngoại lệ không bắt |

---

## 6. Cấu hình chung

| Mã | Nơi đặt | Khoá | Mặc định | Ghi chú |
|---|---|---|---|---|
| CFG-GEN-01 | `tools/versions.json` | Phiên bản công cụ (TSD-09 SCH-DEV-03) | Theo E0 | Nguồn cho `engine doctor` và `toolVersions` trong `inputHash` |
| CFG-GEN-02 | `games/<id>/data/budgets.json` | Ngân sách theo tier (SRS-04 mục 6.3) | Sao từ `games/_template` | `combat.attackers`/`combat.projectiles` Vừa 3/20 (OI-CBT-05); `behaviorLod.nearM`/`farM` 30/80 (OI-CHR-07) đặt trong `$defs.tierBudget` để chỉnh không sửa code |
| CFG-GEN-03 | Biến môi trường dịch vụ web | `DATABASE_URL`, `OBJECT_ROOT=/srv/gs-objects`, `PUBLIC_ORIGIN`, `GATEWAY_URL=http://ai-gateway:8081`, `GS_GATEWAY_TOKEN_<SVC>`, `JWT_KEYS_FILE`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `LOG_LEVEL=info` | — | Chi tiết theo dịch vụ ở DDD-08 CFG-WEB-01…04; khoá AI chỉ có ở `ai-gateway` |
| CFG-GEN-04 | `engine/runtime/src/tier/tier-table.json` | Bảng dò thiết bị (TSD-04 SCH-RTM-08) | A56 → `vua` | Cập nhật theo số đo |
| CFG-GEN-05 | `project.yaml` | `rigor`, `overrides`, `targetDevice`, `tiers`, `gates` (TSD-09 SCH-DEV-01) | `minimal` | DDD-09 |
| CFG-GEN-06 | `engine/status/src/default-durations.json` | Ước lượng thời gian mặc định mỗi bước (giây) khi `cache/index.json` chưa có lịch sử | Theo E1 | Dùng cho `estimateMinutes`; thay bằng trung vị `durationS` thật khi có ≥ 3 lần chạy |

Biến môi trường được đọc **một lần** khi khởi động bằng `loadConfig()` của từng dịch vụ, kiểm bằng JSON Schema; thiếu biến bắt buộc → thoát mã 5 với tên biến, không in giá trị (FR-DEV-22).

---

## 7. Log, đo và quan sát

| Mã | Thành phần | Thiết kế |
|---|---|---|
| MOD-GEN-18 | `engine/shared/log` (Node) | Bọc `pino`: `createLogger({svc, level})` với `redact: ['req.headers.authorization','req.headers.cookie','*.apiKey','*.token','*.sessionToken']`; trường bắt buộc `ts, level, svc, requestId|jobId, msg` |
| MOD-GEN-19 | `engine/build/py/gslog.py` | `structlog` JSON một dòng, cùng trường; bước build ghi `stderr`, tiến độ `PROGRESS n msg` ở `stdout` (TSD-04 IF-CLI-02) |

Không ghi nội dung hội thoại, mô tả game hay khoá vào log (trừ `debug=true` hội thoại theo FR-DLG-17, DDD-07).

---

## 8. Triển khai chi tiết (TD-17)

### 8.1 Compose

| Dịch vụ | Mạng | Volume | Người dùng | Healthcheck |
|---|---|---|---|---|
| `caddy` | `edge`, `app` | `/srv/gs-objects/public:ro`, `caddy_data` | `caddy` | `wget -qO- localhost:2019/config/` |
| `api` | `app`, `db` | `/srv/gs-objects:rw` | `node` (uid 1000) | `GET /healthz` |
| `ai-gateway` | `app`, `db`, `egress-ai` | không | `node` | `GET /healthz` |
| `worker` × 3 | `db`, `egress-data`, `app` (tới `ai-gateway`) | `/srv/gs-objects:rw`, `/work` (tmpfs 20 GB hoặc thư mục cục bộ) | `gs` (uid 1001) | Nhịp `worker_status` 30 s |
| `postgres` | `db` | `pg_data`, `pg_wal_archive` | `postgres` | `pg_isready` |
| `backup` | `db`, `egress-backup` | `/srv/gs-objects:ro` | `restic` | — |

Mạng `egress-*` đi qua proxy egress (Squid hoặc Caddy forward proxy) có danh sách miền; `ai-gateway` chỉ ra `api.anthropic.com`, `generativelanguage.googleapis.com`, `api.elevenlabs.io`; worker chỉ ra miền CC0, Copernicus, Overpass, Geofabrik.

### 8.2 Vai trò CSDL

| Vai trò | Quyền |
|---|---|
| `gs_api` | Toàn quyền DML trên lược đồ `app` trừ `UPDATE/DELETE` trên `audit_log`, `game_versions` (trừ cột `name`, `starred`) |
| `gs_gateway` | `SELECT` `ai_config`, `quotas`, `game_quotas`, `publications`, `share_links`, `games` (cột `owner_id`); `SELECT, INSERT` `usage_records`, `llm_calls`, `dialogue_turns`; `INSERT` `notifications`; DML `rate_buckets`, `dialogue_cache` |
| `gs_worker` | DML `jobs`, `job_reports`, `events_outbox`, `worker_status`, lược đồ `pgboss` |
| `gs_migrate` | Chủ sở hữu lược đồ, chỉ dùng khi chạy migration |

---

## 9. Bảo mật chung (chi tiết TSD-00 mục 8)
- Header do Caddy đặt cho mọi phản hồi: `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` như TSD-00 mục 8.2; trang chơi thêm `worker-src 'self' blob:`; `connect-src 'self'` (cổng AI cùng gốc qua `/api/dialogue/*`).
- Khoá ký JWT: tệp `JWT_KEYS_FILE` (JSON `{kid: {purpose: 'preview'|'perf'|'dlg', secret, createdAt}}`), xoay bằng thêm `kid` mới, giữ `kid` cũ tới khi token cũ hết hạn (TD-15).
- Quét bí mật ba lớp (pre-commit, CI, trước xuất bản) dùng chung `gitleaks.toml` (DDD-09).

---

## 10. Thiết kế kiểm thử chung

| Mã | Ca | Tiền điều kiện / dữ liệu | Bước | Kỳ vọng | TSD |
|---|---|---|---|---|---|
| TC-GEN-01 | Mọi dữ liệu mẫu hợp lệ | `games/_template/**`, `games/*/data/**` | `engine validate --all` | 0 lỗi; mã thoát 0 | TST-GEN-01 |
| TC-GEN-02 | Vector RNG TS = Python | `vectors.json` 5 seed × 1.000 | Vitest + pytest đọc cùng tệp | Trùng 100%; `deriveSeed("42","vegetation","z1","7")` = giá trị ghi trong tệp | TST-GEN-02 |
| TC-GEN-03 | Hash bất biến thứ tự khoá | Hai JSON khác thứ tự khoá | `inputHash` | Bằng nhau; đổi `toolVersions` → khác | TST-GEN-03 |
| TC-GEN-04 | Đồ thị gói | Toàn repo | `depcruise --validate` | Không vòng, không vi phạm luật mục 4.2 | TST-GEN-04 |
| TC-GEN-05 | `evaluate` theo ví dụ | Bảng ví dụ mục 3.6 | Vitest | Đúng pass/warn/fail | ALG-GEN-03 |
| TC-GEN-06 | `impact` | Đổi `/world.json/timeOfDay/1`, `/world.json/atmosphere/fogDensity`, `/entities~1npc~1ong-lao.json/schedule` | Vitest | Lần lượt: `lighting.bake`+`packager`+`qa`; runtimeOnly; runtimeOnly | ALG-GEN-04 |
| TC-GEN-07 | `computeStatus` 8 giai đoạn | 8 bộ `StatusSources` giả (mỗi giai đoạn một) + tổ hợp cờ | Vitest golden | `stage`, `flags`, `next` đúng bảng SRS-00 mục 4.4; kết quả giống nhau giữa cài đặt thư mục (CLI) và CSDL (web) trên cùng dữ liệu |
| TC-GEN-08 | `planStale` | Đổi vị trí một vật ở z2; đổi `step.version` của `placement`; xoá mục cache | Vitest | Chỉ bước trong bao đóng xuôi của z2; mọi zone của `placement` + hạ nguồn; mục bị xoá báo `never` |

Bố trí: test đơn vị cạnh mã; test tích hợp web `web/*/tests/int/**` (Testcontainers); e2e `web/app/e2e/**`; QA game `games/<id>/qa/**`; dữ liệu cố định `engine/**/fixtures/**` (≤ 5 MB mỗi gói, tệp lớn hơn để ở kho đối tượng test).

---

## 11. Open item thiết kế chung

| Mã | Câu hỏi | Đề xuất | Liên quan |
|---|---|---|---|
| OID-GEN-01 | Ngưỡng LOD hành vi 30/80 m | Để là cấu hình `budgets.behaviorLod` (CFG-GEN-02), đo ở E6 rồi Huy chốt | OI-CHR-07, DDD-05 |
| OID-GEN-02 | Ngân sách chiến đấu tier Vừa 3/20 | Cấu hình `budgets.combat`; chốt khi có game đầu tiên bật chiến đấu | OI-CBT-05, DDD-06 |
| OID-GEN-03 | SHA-256 đồng bộ trong trình duyệt bằng `@noble/hashes` (+~4 KB) | Chấp nhận; chỉ dùng khi suy seed lúc nạp, không trong vòng nóng | MOD-GEN-02 |

---

## 12. Truy vết

DDD-01…09 có mục "Truy vết" ánh xạ FR/NFR và thành phần TSD sang thành phần DDD. Ma trận đầy đủ: [Phụ lục A](DDD-00-PL-A-MA-TRAN-TRUY-VET.md), sinh bằng `tools/ddd-trace.py` (từ gốc repo: `python docs/DDD/tools/ddd-trace.py`); mã thoát 0 khi mọi mã TSD (`TD`, `ALG`, `SCH`, `IF`, `TST`) và mọi FR/NFR của SRS đều có thành phần DDD, không có mã DDD trùng hoặc tham chiếu mã chưa định nghĩa.

### 12.1 Quyết định kỹ thuật → DDD

| TD | Thành phần DDD |
|---|---|
| TD-01 | Mục 4 (MOD-GEN-10…17), DDD-09 |
| TD-02 | CFG-GEN-01; DDD-09 |
| TD-03 | DDD-04 (render), DDD-02 (shader địa hình, nước, cỏ) |
| TD-04 | DDD-04 (hệ thống, vòng lặp), DDD-05 (`AgentStore`) |
| TD-05 | DDD-05 (controller, `NavService`) |
| TD-06 | MOD-GEN-07, mục 3.3 |
| TD-07 | DDD-04 (`@gamestudio/expr`) |
| TD-08 | PSC-GEN-02; DDD-04 (bộ điều phối) |
| TD-09 | DDD-04 (packager), DDD-03 |
| TD-10 | DDD-02 (bước Python) |
| TD-11 | DDD-02 (bake) |
| TD-12 | DDD-08 (`web/app`) |
| TD-13 | DDD-08 (`web/api`, CSDL, pg-boss) |
| TD-14 | DDD-08 (`ObjectStore`) |
| TD-15 | DDD-08 (OIDC, phiên), mục 9 |
| TD-16 | DDD-08 (`ai-gateway`), DDD-01, DDD-07 |
| TD-17 | Mục 8 |
| TD-18 | DDD-04 (`@gamestudio/qa`) |

### 12.2 Thành phần chung TSD-00 → DDD

| Thành phần TSD | FR / NFR | Thành phần DDD |
|---|---|---|
| SCH-GEN-01…06 | — | Mục 3.3, MOD-GEN-07; chi tiết schema ở DDD-01, 02, 03, 04, 05, 06, 07 |
| ALG-GEN-01 | NFR-GEN-06 | MOD-GEN-01…03, PSC-GEN-01, TC-GEN-02 |
| ALG-GEN-02 | NFR-GEN-05, NFR-GEN-06 | PSC-GEN-02, TC-GEN-03 |
| ALG-GEN-03 | NFR-GEN-01 | MOD-GEN-09, PSC-GEN-04, TC-GEN-05 |
| ALG-GEN-04 | — | MOD-GEN-08, PSC-GEN-03, TC-GEN-06 |
| SCH-GEN-07, ALG-GEN-05 | NFR-CLI-02 | Mục 3.7, MOD-GEN-20, MOD-GEN-21, DTO-GEN-08, DTO-GEN-09, STM-GEN-01, PSC-GEN-05, CFG-GEN-06, TC-GEN-07, TC-GEN-08 |
| TST-GEN-01…04 | — | TC-GEN-01…04 |

### 12.3 NFR chung (SRS-00) → DDD

| NFR | Thành phần TSD | Thành phần DDD |
|---|---|---|
| NFR-GEN-01 | TSD-00 mục 7.2, 7.3 | CFG-GEN-02, PSC-GEN-04; DDD-04 (tier, hạ tier) |
| NFR-GEN-02 | TSD-00 mục 7.4 | DDD-04 (stream zone, packager tách `core`/`full`) |
| NFR-GEN-03 | TSD-00 mục 7.5 | DDD-08 (hiệu năng web) |
| NFR-GEN-04 | TSD-08 ALG-WEB-03 | DDD-08 (job, đường nhanh) |
| NFR-GEN-05 | ALG-GEN-02 | PSC-GEN-02 |
| NFR-GEN-06 | ALG-GEN-01 | PSC-GEN-01, mục 2.4 |
| NFR-GEN-07 | TSD-00 mục 8 | Mục 9; DDD-08 (bảo mật web) |
| NFR-GEN-08 | TSD-08 ALG-WEB-05 | DDD-08 (hạn mức), DDD-07 (hạn mức hội thoại) |
| NFR-GEN-09 | TSD-00 mục 9.2 | Mục 8 |
| NFR-GEN-10 | TD-03 | DDD-04 (trang nạp kiểm WebGL2 trước khi tải Unity player, CR-02) |
| NFR-GEN-11 | TSD-00 mục 4.3 | Mục 2.1 |
| NFR-GEN-12 | TSD-09 ALG-DEV-02 | DDD-09 (token-meter) |
| NFR-GEN-13 | TSD-00 mục 4.3 | DDD-08 (i18n), DDD-04 (UI trong game) |
| NFR-GEN-14 | TSD-03 ALG-AST-07 | DDD-03 (credit) |

---

## 13. Thuật ngữ bổ sung

| Thuật ngữ | Nghĩa |
|---|---|
| Thành phần DDD | Một mã DDD (MOD, DTO, TBL, EP, SEQ, STM, PSC, CFG, TC, OID) |
| Giả mã | Mô tả thuật toán gần mã, tên hàm khớp tên sẽ code, không phụ thuộc ngôn ngữ |
| Brand type | Kiểu chuỗi có "nhãn" để trình biên dịch không lẫn `GameId` với `Ulid` |
| Chia sẻ cấu trúc | Bản JSON mới dùng lại nhánh không đổi của bản cũ, không sao chép sâu |

---

## 14. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 22/11/2026 | Claude | Bản đầu: DDD-00…09, Phụ lục A, `tools/ddd-trace.py`; soạn từ TSD-00…09 v1.1 và SRS v1.0 |
| 0.2 | 23/11/2026 | Claude | CR-01 (Huy yêu cầu 23/11/2026: luồng làm tiếp/cập nhật game đang làm dở hoặc đã có), theo SRS-00 v1.2 và TSD-00 v1.2: mục 3.7 gói `@gamestudio/status` (MOD-GEN-20, 21, DTO-GEN-08, 09, STM-GEN-01, PSC-GEN-05, CFG-GEN-06, TC-GEN-07, 08); DDD-01, 04, 08, 09 bổ sung phần CR-01 |
| 1.0 | 23/11/2026 | Huy | Duyệt bộ DDD; thay đổi sau đây theo change request |
| 1.1 | 25/11/2026 | Claude | CR-02 (runtime Unity, ADR-036): MOD-GEN-14 thành Unity player `engine/unity`; luật dependency-cruiser (2), (3); dòng NFR-GEN-10 |
