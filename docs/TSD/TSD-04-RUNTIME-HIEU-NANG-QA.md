# TSD-04: Runtime, hiệu năng và QA

| Mục | Nội dung |
|---|---|
| Mã tài liệu | TSD-04 |
| Phiên bản | 1.4 |
| Ngày | 22/11/2026 |
| Tài liệu cha | TSD-00 `TSD-00-TONG-QUAN.md` |
| SRS nguồn | SRS-04 v0.1 (FR-RTM-01…23, FR-QA-01…10, FR-CLI-01…07, NFR-RTM-01…03, NFR-QA-01…02, NFR-CLI-01) |
| Gói | `@gamestudio/schema`, `@gamestudio/rng`, `@gamestudio/expr`, Unity player `engine/unity` (Core, Render, CameraPlayer phần chung, Interaction, UI, Audio; CR-02), `engine/build/packager`, `@gamestudio/qa`, `@gamestudio/cli` |
| Pha | E0 (baseline), E1, E2, E3, E6 |
| Trạng thái | Đã duyệt (Huy, 22/11/2026; bản 1.2 gồm CR-01 duyệt 23/11/2026); **v1.3 runtime Unity theo CR-02** (Huy duyệt phân tích 25/11/2026), chờ Huy xem lại |

---

## 1. Giới thiệu
TSD này là "hợp đồng kỹ thuật" dùng chung: schema và dữ liệu, vòng lặp runtime, nạp/stream zone, tier, ngân sách, điều khiển chung, UI, tương tác và biến game, đóng gói, QA và CLI. Các TSD khác cắm vào đây qua interface hệ thống (IF-RTM-02) và bước build (IF-CLI-02).

---

## 2. Runtime: Unity player `engine/unity` (CR-02, ADR-036)

> Từ v1.3 (CR-02) runtime là **một Unity player chung** (Unity 6 LTS, URP, nền Web) cho mỗi `engineVersion`, viết bằng C#, thay gói TS `@gamestudio/engine` trên Three.js. Mã IF-RTM-01…05 giữ nguyên số, nội dung đổi theo Unity. Số liệu ngân sách tải đo lại ở POC-U1 (OI-GEN-05).

### 2.1 Cấu trúc project

| Thư mục (`engine/unity/Assets/GameStudio/`) | Trách nhiệm |
|---|---|
| `Core/` | `Engine` (khởi động, vòng lặp, đồng hồ, chế độ test), `SystemRegistry`, `EventBus` (sự kiện kiểu, không cấp phát: hàng đợi vòng), `Pools`; một `MonoBehaviour` điều phối gọi các hệ thống theo thứ tự cố định |
| `Loader/` | `ManifestLoader`, `ZoneStreamer`, `AssetCache`; nạp glb bằng glTFast (Meshopt decompress, `KHR_mesh_quantization`), KTX2 bằng KTX for Unity; chia lát bất đồng bộ để không chặn khung |
| `Render/` | URP asset theo tier, vật liệu dùng chung, GPU instancing / SRP Batcher, LOD (`LODGroup` cho vật đơn, theo chunk cho địa hình), shader lightmap RGBM UV2, hậu kỳ URP |
| `Tier/` | Dò thiết bị qua `.jslib` + `SystemInfo`, đo 3 s, hạ tier |
| `Input/` | Input System: cảm ứng (joystick, vuốt), bàn phím/chuột, pointer lock |
| `CameraPlayer/` | Camera ngôi một/ba, `CharacterController` (chi tiết TSD-05) |
| `Interaction/` | Điểm tương tác, biến game, nhiệm vụ, cây thoại (TSD-07) |
| `UI/` | HUD, menu, cài đặt, credit, lớp phủ dev bằng UI Toolkit |
| `Audio/` | Bus tổng/nhạc/hiệu ứng/giọng bằng `AudioMixer`; âm 3D (tắt spatial ở tier Thấp); nạp clip lúc chạy qua `UnityWebRequestMultimedia` |
| `Save/` | Lưu cục bộ qua IndexedDB của nền Web (`.jslib`) |
| `Perf/` | fps, P5/P1, `ProfilerRecorder` (draw call, batch, tri), `FrameTimingManager`; gửi API-WEB-60 |
| `Bridge/` | Cầu nối JS ↔ C#: `.jslib` xuất sự kiện ra trang, hàm nhận `SendMessage` cho khung xem trước (TSD-08 IF-WEB-05) |
| `EditorMode/` (CR-03, trước là `Editor/`) | Chế độ editor trong player (gizmo, chọn, vẽ vùng), chỉ bật khi `mode='preview'` |
| `Shared/Rng`, `Shared/Expr` | Bản C# của `@gamestudio/rng` và `@gamestudio/expr`, kiểm chéo bằng bộ vector chung với TS/Python |
| `Characters/`, `NpcAi/`, `Fx/` | TSD-05, TSD-02 |
| `Combat/`, `Dialogue/` | Module tuỳ chọn, bật bằng dữ liệu (TSD-06, TSD-07) |
| `engine/unity/Tests/` | Unity Test Framework (EditMode, PlayMode), chạy batchmode trên máy dev |

### 2.2 Interface

| Mã | Interface | Mô tả |
|---|---|---|
| IF-RTM-01 | Trang nạp `createUnityInstance(canvas, {dataUrl, frameworkUrl, codeUrl, …})` rồi `SendMessage('GameStudio', 'Boot', json{manifestUrl, mode: 'play'\|'preview'\|'test', seed?})` | Điểm vào duy nhất. Trang `index.html` của bản xuất bản tải player ở `/engine/<semver>/` theo `manifest.engineVersion`; khung xem trước Web Studio dùng cùng player với `mode='preview'`; tiến độ tải báo qua callback `onProgress` của loader và sự kiện `.jslib` |
| IF-RTM-02 | `interface ISystem { string Id; int Order; void Init(EngineContext ctx); void Tick(float dt, float t); void OnZoneLoaded(Zone z); void OnZoneUnloaded(Zone z); void OnRuntimeData(RuntimeDataDiff d); void Dispose(); }` | Thứ tự cố định như bản cũ (input 10, camera-player …); `Engine` gọi `Tick` trong `Update` của bộ điều phối |
| IF-RTM-03 | `EngineContext {Tier, Budgets, Rng, Clock, Bus, Data, Zones, Physics (Unity Physics), Nav (AI Navigation, khi có), Audio, Ui, Save, Log}` | Truyền cho mọi hệ thống |
| IF-RTM-04 | `RuntimeDataSource` | `static` (đọc `runtimeData` trong manifest) hoặc `live` (preview: SPA nhận SSE từ `web/api` rồi đẩy `RuntimeDataDiff` = JSON Patch vào player qua `SendMessage`) |
| IF-RTM-05 | Bề mặt mở rộng cho dữ liệu game | Không còn API cho script TS riêng game (FR-RTM-04, CR-02). Hành vi riêng khai báo bằng sự kiện, `expr`, đồ thị hành vi; danh mục hành động (`fire_event`, `set_flag`, `add_counter`, `quest`, `spawn`, `play_sound`, `show_info`, …) là hợp đồng giữa dữ liệu và player |

### 2.3 Vòng lặp và thời gian
- `Update` của bộ điều phối; `dt` kẹp [0, 0,1 s]. Chế độ test (`?test=1&seed=n`): bước cố định 1/30 s, bỏ qua thời gian thực, RNG gốc = seed (FR-RTM-06).
- Không cấp phát trong `Tick` (FR-RTM-23): struct và mảng cấp phát trước, pool cho đạn/hạt/sự kiện, `NativeArray`/mảng struct cho thực thể động, không LINQ/lambda/boxing trong vòng nóng; kiểm bằng `GC.Alloc` của `ProfilerRecorder` trong test PlayMode.
- Nền Web của Unity chạy một luồng mặc định; giải mã asset chia lát theo khung (TSD-00 §7.2).

### 2.4 Render
- URP, khử răng cưa FXAA ở tier ≥ Vừa (hậu kỳ URP), MSAA tắt; không dùng WebGPU ở bản đầu.
- Không gian màu Linear, tone mapping ACES/Neutral theo `world.postFx`.
- Vật liệu chuẩn URP Lit + shader riêng đọc lightmap RGBM và AO từ UV2 (ADR-026); tier Thấp dùng biến thể Simple Lit **(TSD đề xuất)**.
- Hình tĩnh: gộp theo vật liệu khi đóng gói (packager) + SRP Batcher; vật lặp: GPU instancing (`Graphics.RenderMeshInstanced`); culling theo chunk; LOD bằng `LODGroup` cho vật đơn, theo chunk cho địa hình.
- Bóng: tier Thấp không bóng động; Vừa 1 cascade 1024 cho nhân vật gần; Cao 2 cascade 2048 **(TSD đề xuất, OIT-RTM-01)**; bóng tĩnh nằm trong lightmap.

---

## 3. Thuật toán runtime

| Mã | Thuật toán | Mô tả |
|---|---|---|
| ALG-RTM-01 | Chọn tier khởi động | (1) Trang nạp kiểm WebGL2 trước khi tải player (không có → ERR-RTM-01); (2) player đọc qua `.jslib` `WEBGL_debug_renderer_info` (nếu có), `navigator.deviceMemory`, `hardwareConcurrency`, kích thước màn; (3) tra `tier-table.json` (khớp chuỗi GPU → tier đề xuất; mặc định: deviceMemory ≥ 8 và màn ≥ 1080p → `vua`, ≥ 12 → `cao`, còn lại `thap`); (4) nhớ lựa chọn người chơi trong `localStorage` thắng; (5) sau khi vào game đo 3 s: fps trung bình < 0,85 × mục tiêu → hạ một bậc trước khi người chơi kịp thấy (FR-RTM-07). Kiểm định dạng nén: `KTX2Loader.detectSupport` → chọn `astc`/`etc2`/`bc7`; không có → texture fallback (FR-RTM-11) |
| ALG-RTM-02 | Stream zone | Mỗi zone có `bytes{tier}` và hai phần: `core` (địa hình LOD2–3, collider, vật trong bán kính 60 m quanh điểm xuất phát, texture mip thấp) và `full`. Thứ tự nạp: manifest → `core` zone xuất phát → cho điều khiển → `full` zone xuất phát → zone kề khi khoảng cách tới ranh giới ≤ `prefetchDistance` (100 m) → giải phóng zone cách > `unloadDistance` (2 zone) (FR-RTM-09, 10). Tải bằng `fetch` + `ReadableStream` để báo tiến độ theo byte; tối đa 4 yêu cầu song song; giải mã trên Web Worker; tải lên GPU theo lát ≤ 4 ms/khung. Lỗi: thử lại lùi 2/4/8 s (ERR-RTM-02). Vượt bộ nhớ: giải phóng zone xa sớm, rồi hạ tier (ERR-RTM-05) |
| ALG-RTM-03 | Hạ tier động | Cửa sổ trượt 5 s các khung; nếu fps trung bình < mục tiêu × (1 − 0,15) liên tục 5 s → hạ một tier, báo HUD, khoá không tự nâng trong phiên (FR-RTM-08). Hạ tier áp ngay: bán kính cỏ, cascade bóng, hậu kỳ, DPR; texture tier thấp nạp lại nền theo zone |
| ALG-RTM-04 | Biểu thức an toàn (`@gamestudio/expr` TS cho build/Web Studio, bản C# `Shared/Expr` trong player, cùng bộ vector kiểm; CR-02) | Ngữ pháp: số, chuỗi `'…'`, boolean, định danh có chấm (`quest.trau.state`, `counter.lua`, `flag.x`, `hour`), toán tử `! && \|\| == != < <= > >= + - * / %`, ngoặc, gọi hàm trong danh sách trắng do nơi dùng cấp (`dist`, `event`, `flag`, `rand`, `max`, `min`, `round`). Pratt parser → AST → biên dịch thành closure một lần khi nạp; đánh giá không cấp phát. Kiểm tĩnh: định danh và hàm phải thuộc ngữ cảnh khai báo, nếu không → lỗi có vị trí ký tự (dùng cho ERR-CHR-04, ERR-CBT-02, `dialogue.check`). Không `eval`, không truy cập thuộc tính động |
| ALG-RTM-05 | Biến game và sự kiện | `GameState` lưu `flags: Map<id, bool>`, `counters: Int32Array` theo chỉ số, `quests: Uint8Array` (0 `chua_nhan`, 1 `dang_lam`, 2 `xong`); chỉ số gán lúc nạp từ `game.json.state`. Sự kiện `fire_event` đi qua `EventBus` (hàng đợi vòng 256), xử lý ở đầu khung sau |
| ALG-RTM-06 | Điểm tương tác | Lưới không gian (ô 8 m) chứa điểm tương tác của zone đã nạp; mỗi khung tra ô quanh người chơi, chọn điểm gần nhất thoả `radius` và điều kiện → hiện nút hành động ngữ cảnh; hành động `show_info/start_dialogue/pick_item/change_zone/fire_event` (FR-RTM-19) |
| ALG-RTM-07 | Lưu cục bộ | IndexedDB DB `gs-save`, khoá `<gameId>@<publishVersion>`; lưu khi tạm dừng, đổi zone, mỗi 60 s; nội dung `{pos, zone, state, gameHour}`; phiên bản xuất bản khác → bỏ qua bản lưu cũ (FR-RTM-21) |

### 3.1 Điều khiển chung
- Cảm ứng: joystick ảo nửa trái (bán kính 60 px CSS, vùng chết 10%), vuốt nửa phải xoay camera (độ nhạy cài đặt), chạm nút hành động; mọi nút đặt trong `env(safe-area-inset-*)`, vùng chạm ≥ 48 × 48 px (FR-RTM-15).
- Desktop: WASD/mũi tên, chuột + pointer lock, E, Shift, Esc (FR-RTM-16).
- Chế độ dev `?dev=1` chỉ khi `publish.json.dev=true` hoặc khung xem trước có quyền: flycam, orbit, lớp phủ SCR-RTM-06, chọn tier, tua giờ (FR-RTM-17).

### 3.2 UI trong game
UI Toolkit trong Unity player (CR-02; trước là DOM overlay); cỡ chữ thân 16 px CSS, tương phản ≥ 4,5:1, chuỗi giao diện từ `i18n/<lang>.json` theo `game.json.language` (FR-RTM-18, 22). Credit đọc `manifest.credits` (TSD-03 ALG-AST-07).

---

## 4. Dữ liệu

| Mã | Cấu trúc | Ghi chú |
|---|---|---|
| SCH-RTM-01 | Bộ JSON Schema `engine/schema/*.schema.json` + `index.ts` xuất `validate(kind, data)` (Ajv standalone đã biên dịch) dùng ở CLI, packager và Web Studio; player chỉ kiểm `schemaVersion` và trường bắt buộc khi nạp (CR-02) | Lỗi trả `{instancePath, keyword, message}`; runtime bản dev hiện đường dẫn, bản xuất bản hiện thông báo chung (ERR-RTM-03) |
| SCH-RTM-02 | `migrate/` | Mỗi schema `<tên>/<n>-to-<n+1>.ts` thuần hàm; `engine migrate` sao lưu `data/` vào `data.bak-<ts>/` trước khi ghi |
| SCH-RTM-03 | `budgets.json` | Như SRS-04 mục 6.3; `$defs.tierBudget`; zone ghi đè ở `world.zones[].budgetOverride` (gộp nông theo khoá) |
| SCH-RTM-04 | `manifest.json` | SRS-04 mục 6.5, bổ sung: `zones[].parts{core,full}` mỗi tier, `zones[].lightmaps{timeOfDayId: file}`, `modules{combat?}` (cờ bật module trong player; CR-02 bỏ chunk JS và recast), `fallbacks{texture: 'png'\|'jpg'}`, `surfaceMap` |
| SCH-RTM-05 | Báo cáo `report/1` | Đúng SRS-04 mục 6.4; thêm `tool: {name, version}`, `host` (máy chạy), `stepVersion` |
| SCH-RTM-06 | `publish.json` | `{gameId, publishVersion, publishedAt, engineVersion, schemaVersion, dataHash, tiers[], qa: {result, reportRef}, notMet: bool, dev: bool}`; v1.2 (CR-01, FR-CLI-12) thêm `previousVersion?`, `dataVersion`, `changes[{kind: them\|sua\|xoa, file, objectId, fields[]}]` (≤ 200 mục, phần dư gộp đếm) (FR-CLI-06, FR-WEB-37) |
| SCH-RTM-07 | `qa/views.json`, `qa/routes.json`, `qa/bot/*.json` | `view {id, zone, pos[3], dir[3] \| lookAt[3], fov, timeOfDay, tier?}`; `route {id, zone, points[], speed, durationS}`; `bot {id, seed, steps[{goal: goto\|interact\|wait\|random_walk, …}], maxS}` |
| SCH-RTM-08 | `tier-table.json` | Bảng dò thiết bị (ALG-RTM-01), nằm trong engine, cập nhật theo đo thực |
| SCH-RTM-09 | `build/<id>/cache/index.json` (CR-01) | `[{step, zone?, tier?, inputHash, outputHash, at, durationS, ok}]` bản ghi chạy thành công gần nhất mỗi (bước, zone, tier); bộ điều phối cập nhật nguyên tử sau mỗi bước; `engine status` và `web/api` chỉ đọc tệp này (không quét thư mục cache) |
| SCH-RTM-10 | Báo cáo kiểm nhập `import/1` (CR-01) | `{result: ok\|canNangCap\|chan, gameId, engineVersion, schemaVersion, hasBrief, counts{zones, npcs, animals, assets}, assets{missingProvenance[], pendingReview[]}, problems[{code, path, message}], migrateFrom?}` |

---

## 5. Build: điều phối, đóng gói, CLI

### 5.1 Interface

| Mã | Interface | Mô tả |
|---|---|---|
| IF-CLI-01 | Lệnh `engine` | `new-game`, `build --zone <id> [--tier] [--step] [--force] [--skip-bake]`, `qa --level=nhe\|day-du [--zone] [--dialogue] [--accept-baseline <views> --reason <text>]`, `publish [--target poc\|web] [--out <dir>]`, `doctor [--json]`, `migrate [--dry-run]`, `asset import\|forge\|turntable\|check` (TSD-03). Thư viện `commander`; đầu ra người đọc + `--json`; mã thoát SRS-04 mục 7.2. Mọi lệnh build kiểm trước: brief `DaXacNhan` (FR-INT-17), style bible khi bước cần (FR-INT-22), `engineVersion` khớp (ERR-RTM-04) |
| IF-CLI-02 | Giao thức bước build | `step.json {id, version, deps[], inputs: {dataPointers[], files[], params}, runner: 'node'\|'python'\|'blender', entry, perZone: bool, outputs[]}`. Bộ điều phối ghi `ctx.json {gameDir, zone, tier, seed, inputs (đã trích), upstream: {step: outDir}, outDir, toolVersions}` rồi chạy: node → `import(entry).run(ctx)`; python → `uv run python -I entry --ctx ctx.json`; blender → `blender -b --factory-startup -P entry -- --ctx ctx.json`. Bước ghi đầu ra vào `outDir` và `report.json` (SCH-RTM-05); stdout dòng `PROGRESS <0-100> <msg>` để báo tiến độ; mã thoát ≠ 0 → bước lỗi |
| IF-CLI-03 | Cache | `build/<id>/cache/<step>/<inputHash>/` + `meta.json {outputHash, createdAt, durationS}`; dùng chung giữa job cùng game trên worker (thư mục cache trên kho đối tượng gắn vào worker, FR-WEB-41); dọn theo LRU khi > hạn mức GB |
| IF-CLI-04 | Lệnh làm tiếp/cập nhật (CR-01) | `status --game <id> [--json]` (in `status/1`, TSD-00 SCH-GEN-07; mã thoát 0 kể cả khi còn việc); `build --stale [--zone <id>] [--dry-run] [--json]`; `upgrade [--to <bản>] [--accept-diff] [--no-apply] [--json]`; `import <thư mục\|gói.zip> [--into <id>] [--json]`; `brief confirm --game <id>` (xác nhận brief suy ngược từ CLI). Mã thoát theo SRS-04 mục 7.2: ERR-CLI-02 → 4 (dữ liệu) hoặc 2 (QA Fail), ERR-CLI-03 → 4 |

### 5.2 Thuật toán build

| Mã | Thuật toán | Mô tả |
|---|---|---|
| ALG-CLI-01 | Lập lịch đồ thị | Đọc mọi `step.json` → DAG (kiểm vòng); với `--zone z`: các bước `perZone` chạy cho z, bước toàn cục chạy một lần; tính `inputHash` (TSD-00 ALG-GEN-02) theo thứ tự tô-pô; hit cache → bỏ qua; miss → chạy, song song các bước độc lập ≤ `min(4, lõi/2)`; `--step s` chạy s và các bước sau nó; `--force` bỏ cache. Bước `lighting.bake` có thể bỏ (`--skip-bake`) → packager dùng lightmap cũ hoặc ánh sáng động tạm |
| ALG-CLI-02 | Packager | Theo zone × tier: (1) thu đầu ra hình học tĩnh, instance, nhân vật, âm thanh; (2) kiểm asset: provenance + license + `DaDuyet` (FR-AST-29, ERR-AST-03); (3) gộp mesh tĩnh cùng vật liệu theo chunk 64 m (glTF-Transform `join`, `flatten`, `dedup`, `weld`); (4) vật liệu trùng → gộp; vượt `materials` → atlas (`texture-atlas` bằng sharp, padding 8 px) (FR-AST-19); (5) texture hạ về `maxTexture` tier (QT-AST-06), KTX2 UASTC cho map đánh dấu `sharp`, ETC1S còn lại, kèm PNG/JPG fallback (FR-AST-16); (6) Meshopt + quantize; (7) tách `core`/`full`; (8) chép chunk tuỳ chọn chỉ khi cờ bật (FR-CBT-03, ERR-CBT-04 kiểm ngược); (9) đo chỉ số tĩnh (draw call ước lượng = số mesh × vật liệu sau gộp + instanced batch, tri, vật liệu, MB) → so `budgets` (ALG-GEN-03) → báo cáo; (10) sinh `manifest.json`, `credits` (FR-CLI-04) |
| ALG-CLI-03 | Xuất bản | `engine publish`: lấy bản build đủ tier của phiên bản dữ liệu; chạy QA nhẹ (FR-WEB-37); quét bí mật thư mục (TSD-09 TST-DEV-04); sinh `publish.json`; chép sang `publish/<version>/` (tĩnh, chạy hosting tĩnh, FR-CLI-05); `--target poc` rsync lên máy chủ; `--target web` gọi API-WEB-51. Không đặt cờ "đã duyệt" (FR-CLI-07) |

### 5.3 Làm tiếp, nâng cấp, nhập, xuất bản bản mới (CR-01)

| Mã | Thuật toán | Mô tả |
|---|---|---|
| ALG-CLI-04 | `engine status` | Dựng `StatusSources` từ thư mục game: dữ liệu (đã kiểm schema), `brief/` + style bible, SCH-RTM-09, `reports/qa-*.json` mới nhất theo zone, `publish/*/publish.json`, `.intake/`; gọi `computeStatus` (TSD-00 ALG-GEN-05); in bảng người đọc hoặc `--json`. Chỉ đọc; NFR-CLI-02 ≤ 5 s cho game 4 zone |
| ALG-CLI-05 | `build --stale` | `planStale` → tập (bước, zone, tier) cũ hoặc chưa build ở tier đã từng build (mặc định tier Vừa) → sắp theo đồ thị (ALG-CLI-01) → chạy; `--dry-run` in danh sách + ước lượng rồi thoát; bước hash không đổi không chạy (QT-GEN-11). Bộ điều phối dùng chung `planStale` cho mọi lệnh build để kết quả `status` và việc build thực tế không lệch |
| ALG-CLI-06 | `engine upgrade` | (1) Sao `data/`, `brief/`, `qa/` sang `.upgrade/<ts>/` (tệp asset và cache dùng liên kết cứng/chỉ đọc); (2) `migrate` chuỗi `n→n+1` tới đích (SCH-RTM-02); (3) `build --stale` trên bản sao với thư mục cache phụ (đầu ra mới không ghi vào cache chính); (4) `qa --level=nhe` + visual diff so baseline (FR-QA-05); (5) Pass hoặc `--accept-diff` → đổi tên nguyên tử `.upgrade/<ts>/data` thành `data/` (giữ `data.bak-<ts>/`), gộp cache phụ vào cache chính, ghi báo cáo `kind: upgrade`; lỗi ở bất kỳ bước nào → xoá bản tạm, dữ liệu chính, cache, bản xuất bản giữ nguyên (QT-RTM-08, ERR-CLI-02). `--no-apply` (worker web) dừng sau bước 4 và để lại bản ứng viên + báo cáo |
| ALG-CLI-07 | `engine import` | Nhận thư mục hoặc zip (giải nén an toàn như TSD-08 ALG-WEB-10). Kiểm: có `data/game.json` (không có → ERR-CLI-03), cấu trúc SRS-04 mục 6.1, schema (thử `migrate --dry-run` khi `schemaVersion` cũ → `canNangCap`), `engineVersion` trong dải hỗ trợ, provenance từng asset (thiếu → `pendingReview`, asset vào `ChoDuyet`), `--into <id>`: `gameId` phải khớp (ERR-CLI-03). Ra SCH-RTM-10. `ok`/`canNangCap` → chép vào `games/<id>/` (hoặc áp vào game đã có, giữ `data.bak-<ts>/`); thiếu brief → `reverseBrief` (TSD-01 ALG-INT-11) |
| ALG-CLI-08 | Xuất bản bản mới | `engine publish` khi đã có `publish/<n>/`: tạo `publish/<n+1>/`, không ghi đè; lưu bản chụp dữ liệu nén `publish/<n>/.source-data.json.zst` (không triển khai ra ngoài) để so; `changes[]` = khác biệt theo đối tượng giữa bản chụp của `<n>` và dữ liệu hiện tại (cùng thuật toán TSD-08 ALG-WEB-07); ghi `previousVersion`, `dataVersion` vào `publish.json` (FR-CLI-12, QT-GEN-12) |

---

## 6. QA `@gamestudio/qa`

| Mã | Thuật toán | Mô tả |
|---|---|---|
| ALG-QA-01 | QA nhẹ | Playwright Chromium headless, `--use-gl=angle --use-angle=swiftshader` trên máy không GPU (ghi rõ trong báo cáo: số fps giả lập chỉ để so tương đối); mở bản build qua máy chủ tĩnh cục bộ với `?test=1&seed=<seed>`; smoke: không lỗi console mức error, khung đầu render (pixel không đồng màu) trong 30 s; chụp 3–5 góc đầu `views.json`; đo nhanh 20 s trên route đầu ở viewport 412 × 915 DPR 2,6; kiểm ngân sách từ báo cáo packager + thống kê player (`ProfilerRecorder` qua `.jslib`, CR-02) (FR-QA-02) |
| ALG-QA-02 | QA đầy đủ | Mọi góc; visual regression (ALG-QA-03); perf 3 tier giả lập; bot (ALG-QA-04) khi có `qa/bot`; `engine asset check`; hội thoại (`--dialogue`, TSD-07 ALG-DLG-06); tổng hợp báo cáo `kind: qa` (FR-QA-03) |
| ALG-QA-03 | Visual regression | Ảnh PNG 1280 × 720 mỗi góc; so baseline: SSIM (ssim.js, cửa sổ 8×8, ảnh xám) và tỷ lệ pixel khác (pixelmatch threshold 0,1); "khác" khi SSIM < 0,98 hoặc > 0,5% pixel (OI-QA-01); sinh ảnh diff; chọn ≤ 4 góc điểm tệ nhất cho báo cáo (FR-QA-05). Baseline lưu `qa/baseline/<view>.png` + `baseline.json {view, acceptedBy, at, reason, buildHash}`; chỉ cập nhật bằng `--accept-baseline` hoặc API-WEB-34 (FR-QA-09). Thiếu baseline → `warn` (ERR-QA-02) |
| ALG-QA-04 | Bot playtest | Điều khiển người chơi bằng API test nội bộ (`window.__gsTest`); kịch bản bước mục tiêu + đi ngẫu nhiên có seed; mỗi 0,5 s ghi vị trí; báo `stuck` (dịch < 0,5 m trong 5 s khi có lệnh đi), `out_of_bounds`, `penetration` (tâm viên nang trong collider tĩnh), lỗi console; gom log `stuck` của NPC (FR-CHR-20) (FR-QA-08) |
| ALG-QA-05 | Canvas inspector | Bọc `WebGL2RenderingContext` trong bản test để đếm `drawElements/drawArrays(Instanced)`, chương trình, texture, buffer; đọc thống kê player qua `.jslib` (CR-02); đọc pixel `readPixels` cho kiểm màn đen/màu trung bình (FR-QA-06) |
| ALG-QA-06 | Tóm tắt cho Claude | Báo cáo có `summary` ≤ 20 dòng: kết quả, check Fail/Warn kèm giá trị/giới hạn, góc khác nhất; ảnh chỉ liệt kê đường dẫn (FR-QA-10) |

Đo A56 thật (UC-QA-03, FR-QA-07): link `…/play/<publish>?perf=1&route=<id>&pt=<token đo>`; runtime chạy route tự động, thu fps (avg, P5, P1 từ histogram 1 ms), `frameMs`, `performance.memory` (nếu có), draw call, tri; gửi API-WEB-60, không mạng → hiện JSON để sao chép.

---

## 7. Hiệu năng (cụ thể hoá)

| NFR | Thiết kế đáp ứng |
|---|---|
| NFR-RTM-01 ≤ 10 s tới điều khiển được | `core` zone xuất phát ≤ 8 MB (TSD đề xuất); JS khởi động ≤ 1,2 MB gzip; preload `manifest` + engine bằng `<link rel=modulepreload>`; giải mã trên worker |
| NFR-RTM-02 fps ≥ 30, P5 ≥ 25 | Ngân sách khung TSD-00 mục 7.2; ALG-RTM-03; packager Fail khi vượt draw call/tri |
| NFR-RTM-03 trình duyệt | WebGL2 bắt buộc (nền Web của Unity); kiểm thử Chrome Android ổn định + bản trước, Chrome/Edge desktop |
| NFR-QA-01 QA nhẹ ≤ 5 phút, đầy đủ ≤ 30 phút | QA nhẹ một trình duyệt, ≤ 5 góc; đầy đủ chạy song song góc theo 2 trang; timeout cứng → ERR-QA-01 |
| NFR-QA-02 tất định | Chế độ test bước cố định, RNG seed, tắt hạt phụ thuộc thời gian thực, `preserveDrawingBuffer` khi chụp; ngưỡng nhiễu pixel do SwiftShader |
| NFR-CLI-01 build lại không đổi ≤ 30 s | Băm theo lát dữ liệu (không băm asset lớn mỗi lần: dùng cache `mtime+size → sha256`); cache hit chỉ kiểm `meta.json` |

---

## 8. Kiểm thử

| Mã | Kiểm thử |
|---|---|
| TST-RTM-01 | Schema: mỗi file mẫu hợp lệ; file sai → lỗi có `instancePath` đúng (AC-04-06) |
| TST-RTM-02 | `migrate` chuyển dữ liệu v1 mẫu → v2, giữ bản sao lưu |
| TST-RTM-03 | `expr`: bảng 200 biểu thức (đúng, sai cú pháp, hàm cấm, định danh lạ); không dùng `eval` (grep CI) |
| TST-RTM-04 | Không có mã riêng game (CR-02): `games/*/` chứa tệp mã → `engine validate`/packager lỗi (FR-RTM-04) |
| TST-RTM-05 | Tắt KTX2 (giả lập không hỗ trợ) → dùng fallback, không màn đen (AC-04-05) |
| TST-RTM-06 | Profiler 2 phút ở số thực thể tối đa: không GC > 5 ms; heap không tăng đều (FR-RTM-23, AC-05-08) |
| TST-RTM-07 | Ví dụ FR-RTM-14: 100/112/125 draw call → Pass/Warn/Fail; fps 31/28/26 → Pass/Warn/Fail |
| TST-RTM-08 | Stream: đi qua 3 zone theo route → zone xa được giải phóng, bộ nhớ ≤ ngân sách |
| TST-QA-01 | QA nhẹ zone mẫu ≤ 5 phút, Pass (AC-04-01) |
| TST-QA-02 | Thêm 50 vật liệu → packager Fail `materials`, liệt kê nguồn (AC-04-02) |
| TST-QA-03 | Đổi màu nước → khác ở góc có nước, ≤ 4 ảnh (AC-04-03) |
| TST-QA-04 | Bot 10 phút seed cố định × 2 → kết quả giống, không kẹt (AC-04-07) |
| TST-CLI-01 | Build zone 2 lần không đổi → lần 2 toàn cache, ≤ 30 s (NFR-CLI-01) |
| TST-CLI-02 | Mã thoát: brief chưa xác nhận → 3; schema sai → 4; doctor lỗi → 5 |
| TST-CLI-03 | Bản xuất bản chạy trên `npx serve` tĩnh không cần Web Studio (FR-CLI-05); `publish.json` đủ trường |
| TST-CLI-04 | `status`: 8 thư mục game mẫu, mỗi mẫu một giai đoạn → `stage`, cờ, `next` đúng bảng SRS-00 mục 4.4; game 4 zone ≤ 5 s, không có kết nối mạng nào (NFR-CLI-02, AC-CR01-04) |
| TST-CLI-05 | `build --stale`: đổi vị trí một vật ở z2 → chỉ bước của z2 trong bao đóng chạy, z1 từ cache; `--dry-run` liệt kê đúng và không chạy gì; `status` sau build ra `ChuaQA` (AC-CR01-05) |
| TST-CLI-06 | `upgrade`: migrate giả lập lỗi ở bước 2 / QA Fail không chấp nhận → dữ liệu, cache, `publish/` giống hệt trước (so hash), ERR-CLI-02 mã 4 / 2; thành công → `data.bak-<ts>/` có, báo cáo `kind: upgrade` (AC-CR01-06) |
| TST-CLI-07 | `import`: thư mục hợp lệ không brief → game mới + brief `ChoXacNhan`; thiếu `game.json` → ERR-CLI-03 không ghi gì; zip có đường dẫn `../` → từ chối; `--into` khác `gameId` → ERR-CLI-03 |
| TST-CLI-08 | Xuất bản lần 2 → `publish/2/` mới, `publish/1/` không đổi hash; `changes[]` liệt kê đúng đối tượng đổi; `previousVersion=1` |

---

## 9. Open item kỹ thuật

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| OIT-RTM-01 | Cấu hình bóng động theo tier | Như mục 2.4; chốt sau E2 đo A56 |
| OIT-RTM-02 | (CR-02) `BatchedMesh` của Three.js không còn áp dụng; thử GPU Resident Drawer / SRP Batcher của Unity thay cho gộp mesh ở packager | Thử ở POC-U1/E2 trên A56; giữ gộp tĩnh làm mặc định |
| OIT-QA-01 | Có máy QA có GPU để đo fps giả lập sát thực hơn | Không bắt buộc; số liệu cổng lấy từ A56 thật |

---

## 10. Truy vết

| FR / NFR | Thành phần TSD |
|---|---|
| FR-RTM-01, 02 | SCH-RTM-01, SCH-RTM-02, TST-RTM-01, 02 |
| FR-RTM-03, 04 | IF-RTM-01, IF-RTM-05, TST-RTM-04 |
| FR-RTM-05 | Rule `games/**/data/**`, `step.json` chỉ đọc tham số (IF-CLI-02) |
| FR-RTM-06 | TSD-00 ALG-GEN-01; mục 2.3 chế độ test |
| FR-RTM-07, 08 | ALG-RTM-01, ALG-RTM-03, SCH-RTM-08 |
| FR-RTM-09…11 | ALG-RTM-02, ALG-RTM-01 (định dạng nén), TST-RTM-05, 08 |
| FR-RTM-12…14 | SCH-RTM-03, TSD-00 ALG-GEN-03, TST-RTM-07 |
| FR-RTM-15…17 | Mục 3.1 |
| FR-RTM-18 | Mục 3.2 |
| FR-RTM-19 | ALG-RTM-06 |
| FR-RTM-20 | ALG-RTM-04, ALG-RTM-05, TST-RTM-03 |
| FR-RTM-21 | ALG-RTM-07 |
| FR-RTM-22 | Mục 3.2 |
| FR-RTM-23 | Mục 2.3, TST-RTM-06 |
| FR-QA-01 | SCH-RTM-05 |
| FR-QA-02, 03 | ALG-QA-01, ALG-QA-02, TST-QA-01 |
| FR-QA-04 | SCH-RTM-07 |
| FR-QA-05 | ALG-QA-03, TST-QA-03 |
| FR-QA-06 | ALG-QA-05 |
| FR-QA-07 | Mục 6 (đo A56), API-WEB-60 |
| FR-QA-08 | ALG-QA-04, TST-QA-04 |
| FR-QA-09 | ALG-QA-03 (baseline) |
| FR-QA-10 | ALG-QA-06 |
| FR-CLI-01 | IF-CLI-01 |
| FR-CLI-02 | IF-CLI-03, ALG-CLI-01, TST-CLI-01 |
| FR-CLI-03 | IF-CLI-01, IF-CLI-02, TST-CLI-02 |
| FR-CLI-04 | ALG-CLI-02, SCH-RTM-04 |
| FR-CLI-05…07 | ALG-CLI-03, SCH-RTM-06, TST-CLI-03 |
| NFR-RTM-01…03 | Mục 7 |
| NFR-QA-01, 02 | Mục 7, TST-QA-04 |
| NFR-CLI-01 | Mục 7, TST-CLI-01 |
| FR-CLI-08 | IF-CLI-04, ALG-CLI-04, TST-CLI-04; TSD-00 ALG-GEN-05, SCH-GEN-07 |
| FR-CLI-09 | ALG-CLI-05, SCH-RTM-09, TST-CLI-05 |
| FR-CLI-10 | ALG-CLI-06, TST-CLI-06 |
| FR-CLI-11 | ALG-CLI-07, SCH-RTM-10, TST-CLI-07 |
| FR-CLI-12 | ALG-CLI-08, SCH-RTM-06, TST-CLI-08 |
| NFR-CLI-02 | ALG-CLI-04, TST-CLI-04; TSD-00 ALG-GEN-05 |

## 11. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 22/11/2026 | Claude | Bản đầu từ SRS-04 v0.1 |
| 1.0 | 22/11/2026 | Huy | Duyệt toàn bộ tài liệu |
| 1.1 | 22/11/2026 | Claude | Chốt các số "(đề xuất)" có nguồn từ SRS sau khi Huy duyệt SRS |
| 1.2 | 23/11/2026 | Claude | CR-01 (SRS-04 v1.1): IF-CLI-04, SCH-RTM-06 mở rộng, SCH-RTM-09, 10, mục 5.3 ALG-CLI-04…08, TST-CLI-04…08, truy vết FR-CLI-08…12, NFR-CLI-02 |
| 1.2 | 23/11/2026 | Huy | Duyệt phần bổ sung CR-01 |
| 1.3 | 25/11/2026 | Claude | CR-02 (runtime Unity, ADR-036; Huy duyệt phân tích 25/11/2026): viết lại mục 2 cho Unity player (cấu trúc project, IF-RTM-01…05, vòng lặp, render); ALG-RTM-01, 04; UI Toolkit (3.2); SCH-RTM-01, 04; ALG-QA-01, 05; NFR-RTM-03; OIT-RTM-02 |
| 1.4 | 28/11/2026 | Claude | CR-03 (Huy duyệt 28/11/2026): thư mục chế độ editor trong player đổi `Editor/` thành `EditorMode/` |
