# DDD-04: Runtime, hiệu năng và QA

| Mục | Nội dung |
|---|---|
| Mã tài liệu | DDD-04 |
| Phiên bản | 1.3 |
| Ngày | 28/11/2026 |
| Tài liệu cha | DDD-00 `DDD-00-TONG-QUAN.md` |
| TSD nguồn | TSD-04 v1.2 (IF-RTM-01…05, SCH-RTM-01…10, ALG-RTM-01…07, IF-CLI-01…04, ALG-CLI-01…08, ALG-QA-01…06, TST-RTM-01…08, TST-QA-01…04, TST-CLI-01…08); TSD-00 v1.2 (ALG-GEN-05, SCH-GEN-07) |
| SRS nguồn | SRS-04 v1.1 (FR-RTM-01…23, FR-QA-01…10, FR-CLI-01…12, NFR-RTM-01…03, NFR-QA-01…02, NFR-CLI-01, 02; CR-01 làm tiếp/cập nhật game) |
| Gói | Unity player `engine/unity` (C#, CR-02), `@gamestudio/expr`, `@gamestudio/schema` (validate, migrate), `engine/build/packager`, `@gamestudio/qa`, `@gamestudio/cli` |
| Pha | E0 (baseline), E1, E2, E3, E6 |
| Trạng thái | Đã duyệt (Huy, 23/11/2026); **v1.1 runtime Unity theo CR-02** (Huy duyệt phân tích 25/11/2026), chờ Huy xem lại |

---

## 1. Giới thiệu
DDD này là hợp đồng chi tiết dùng chung: khung runtime (hệ thống, vòng lặp, sự kiện, pool), nạp/stream zone, tier, render, điều khiển, tương tác và biến game, UI, âm thanh, lưu, đo; biểu thức an toàn; bộ điều phối build và giao thức bước; packager; xuất bản; QA; CLI. DDD-02, 05, 06, 07 cắm vào qua `System` (DTO-RTM-02) và giao thức bước (EP-CLI-02).

---

## 2. Bố trí mã nguồn

### 2.1 Runtime

> Từ v1.1 (CR-02, ADR-036) runtime là Unity player `engine/unity` (C#). Mã MOD-RTM-01…17 giữ số; tệp đổi sang C# trong `engine/unity/Assets/GameStudio/…`. MOD-RTM-03, 04, 15 vẫn là mã TS dùng ở build, CLI và Web Studio.

| Mã | Tệp (`engine/unity/Assets/GameStudio/…`) | Trách nhiệm |
|---|---|---|
| MOD-RTM-01 | `Core/Engine.cs`, `Core/Boot.cs`, `Core/EngineRunner.cs` (`MonoBehaviour` tên `GameStudio`) | Nhận `Boot(json)` qua `SendMessage` (IF-RTM-01), lớp `Engine` (vòng đời STM-RTM-01, vòng lặp, chế độ `play`/`preview`/`test`) |
| MOD-RTM-02 | `Core/SystemRegistry.cs`, `Core/EventBus.cs`, `Core/Pool.cs`, `Core/GameClock.cs` | Đăng ký hệ thống theo `Order`, `EventBus` hàng đợi vòng 256 (struct), `Pool<T>`, `GameClock` (giờ game, thời gian cố định ở test) |
| MOD-RTM-03 | `engine/schema/migrate/<tên>/<n>-to-<n+1>.ts`, `engine/schema/src/migrate.ts`, `engine/cli/src/commands/migrate.ts` | Chuỗi migrate thuần hàm; `engine migrate [--dry-run]` sao lưu `data.bak-<ts>/` (không đổi) |
| MOD-RTM-04 | `engine/schema/dist/validators.js` (sinh), `engine/schema/src/validate.ts`; phía player `Loader/ManifestCheck.cs` | Ajv standalone dùng ở CLI, packager, Web Studio; player chỉ kiểm `schemaVersion`, `engineVersion` và trường bắt buộc (ERR-RTM-03) |
| MOD-RTM-05 | `Loader/ManifestLoader.cs`, `Loader/ZoneStreamer.cs`, `Loader/AssetCache.cs`, `Loader/FetchProgress.cs`, `Loader/GltfLoader.cs` (glTFast + Meshopt decompress), `Loader/Ktx2Loader.cs` (KTX for Unity), `Loader/UploadQueue.cs` | Nạp manifest, stream zone `core`/`full`, cache có đếm tham chiếu, giải mã chia lát theo khung (nền Web một luồng) |
| MOD-RTM-06 | `Render/RenderSystem.cs`, `Render/UrpTierAssets/*.asset`, `Render/Materials.cs`, `Render/Lightmap.cs` + `Shaders/LitRgbmLightmap.shadergraph`, `Render/Instancing.cs`, `Render/Lod.cs`, `Render/Shadows.cs` | URP theo tier, vật liệu dùng chung, lightmap RGBM/AO UV2, GPU instancing, `LODGroup`, cascade bóng |
| MOD-RTM-07 | `Tier/Detect.cs` + `Plugins/WebGL/gs-device.jslib`, `Tier/TierMonitor.cs`, `Tier/ApplyTier.cs`, `Tier/tier-table.json` | Chọn tier khởi động, đo 3 s, hạ tier động, áp thay đổi |
| MOD-RTM-08 | `Input/InputSystemGs.cs`, `Input/TouchJoystick.cs`, `Input/TouchLook.cs`, `Input/KeyboardMouse.cs`, `Input/ActionButtons.cs` | Hệ thống `input` (order 10) trên Unity Input System: hợp nhất cảm ứng/bàn phím thành `InputState` |
| MOD-RTM-09 | `Interaction/InteractionSystem.cs`, `Interaction/GameState.cs`, `Interaction/SpatialGrid.cs`, `Interaction/Actions.cs`, `Interaction/Quests.cs` | Hệ thống `interaction` (order 60): điểm tương tác, `GameState`, nhiệm vụ, danh mục hành động (IF-RTM-05) |
| MOD-RTM-10 | `UI/UiSystem.cs`, `UI/Hud.uxml`, `UI/Menu.uxml`, `UI/Settings.uxml`, `UI/Credits.uxml`, `UI/DevOverlay.uxml`, `UI/LoadingScreen.uxml`, `UI/I18n.cs`, `UI/gs.uss` | UI Toolkit, SCR-RTM-01…06 (màn tải đầu tiên trước khi player sẵn sàng do trang nạp vẽ bằng HTML) |
| MOD-RTM-11 | `Audio/AudioSystem.cs`, `Audio/GsMixer.mixer`, `Audio/SpatialPool.cs`, `Audio/Ambience.cs` | `AudioMixer` bus tổng/nhạc/hiệu ứng/giọng, nguồn 3D pool, âm nền theo vùng/mốc |
| MOD-RTM-12 | `Save/SaveStore.cs` + `Plugins/WebGL/gs-save.jslib` | IndexedDB `gs-save` |
| MOD-RTM-13 | `Perf/PerfMonitor.cs`, `Perf/Histogram.cs`, `Perf/RenderStats.cs` (`ProfilerRecorder`, `FrameTimingManager`), `Perf/PerfRoute.cs`, `Perf/Sender.cs` | fps, P5/P1, draw call/batch/tri, thời gian GPU khi có, route đo, gửi API-WEB-60 |
| MOD-RTM-14 | `Interaction/ActionCatalog.cs` | Danh mục hành động và sự kiện mà dữ liệu game được dùng (IF-RTM-05); không còn API cho script TS riêng game (FR-RTM-04) |
| MOD-RTM-15 | `engine/shared/expr/src/{lexer.ts, parser.ts, ast.ts, check.ts, compile.ts, index.ts}`; bản C# `Shared/Expr/{Lexer.cs, Parser.cs, Check.cs, Compile.cs}`; vector chung `engine/shared/expr/vectors/*.json` | Biểu thức an toàn: TS ở build/Web Studio, C# trong player, cùng bộ vector kiểm (bản C# của `@gamestudio/rng` ở `Shared/Rng/Pcg32.cs` dùng vector `gen_rng_vectors.py`) |
| MOD-RTM-16 | `EditorMode/EditorMode.cs`, `Bridge/EditorBridgeReceiver.cs`, `Plugins/WebGL/gs-bridge.jslib`, `EditorMode/Gizmo.cs`, `EditorMode/Picking.cs` (CR-03: không dùng tên thư mục `Editor/`, tên này dành cho mã build-time như `Build/Editor/`) | Phía player của `EditorBridge` (TSD-08 IF-WEB-05), chỉ bật khi `mode='preview'` |
| MOD-RTM-17 | `Test/TestApi.cs` + `Plugins/WebGL/gs-test.jslib` | `window.__gsTest` cho bot QA, chỉ khi `mode='test'` |

### 2.2 Build, QA, CLI

| Mã | Tệp | Trách nhiệm |
|---|---|---|
| MOD-CLI-01 | `engine/cli/src/main.ts`, `src/commands/{new-game, build, qa, publish, doctor, migrate, validate, asset}.ts`, `src/output.ts`, `src/exit-codes.ts` | `commander`, đầu ra người đọc + `--json`, ánh xạ mã thoát |
| MOD-CLI-02 | `engine/cli/src/orchestrator/{graph.ts, scheduler.ts, ctx.ts, runners/node.ts, runners/python.ts, runners/blender.ts, progress.ts, guards.ts}` | Đọc `step.json`, DAG, lập lịch, chạy tiến trình con, kiểm trước (brief, style bible, `engineVersion`) |
| MOD-CLI-03 | `engine/cli/src/orchestrator/cache.ts` | Cache `build/<id>/cache/<step>/<inputHash>/` + `meta.json`, LRU, thư mục cache chia sẻ trên worker |
| MOD-CLI-04 | `engine/build/packager/src/{index.ts, collect.ts, check-assets.ts, merge.ts, textures.ts, compress.ts, split-core.ts, modules.ts, metrics.ts, manifest.ts, credits.ts}` | Packager theo zone × tier (PSC-CLI-02) |
| MOD-CLI-05 | `engine/cli/src/commands/publish.ts`, `engine/build/packager/src/publish.ts`, `tools/scripts/secret-scan.mjs` | Xuất bản tĩnh, quét bí mật, `publish.json`, đích `poc`/`web` |
| MOD-CLI-06 | `engine/cli/src/commands/{status, upgrade, import, brief}.ts` | Lệnh CR-01 (IF-CLI-04): `status`, `upgrade`, `import`, `brief confirm`; `build.ts` thêm cờ `--stale`, `--dry-run` |
| MOD-CLI-07 | `engine/cli/src/orchestrator/cache-index.ts`, `engine/cli/src/orchestrator/stale.ts`, `engine/cli/src/status/sources-fs.ts` | Chỉ mục cache `cache/index.json` (SCH-RTM-09) cập nhật nguyên tử; `planStaleFs` bọc `planStale` của `@gamestudio/status` (DDD-00 MOD-GEN-20); dựng `StatusSources` từ thư mục game |
| MOD-CLI-08 | `engine/cli/src/upgrade/{workspace.ts, run.ts, apply.ts}` | Không gian `.upgrade/<ts>/`, cache phụ, đổi tên nguyên tử, giữ `data.bak-<ts>/` (ALG-CLI-06, QT-RTM-08) |
| MOD-CLI-09 | `engine/cli/src/import/{unpack.ts, checks.ts, place.ts}` | Giải nén an toàn, kiểm `import/1` (SCH-RTM-10), chép vào `games/<id>/` hoặc áp `--into` (ALG-CLI-07) |
| MOD-CLI-10 | `engine/build/packager/src/publish-diff.ts`, `engine/build/packager/src/source-snapshot.ts` | Bản chụp `.source-data.json.zst`, tính `changes[]` theo đối tượng (ALG-CLI-08) |
| MOD-QA-01 | `engine/qa/src/{run.ts, light.ts, full.ts, server.ts, browser.ts}` | QA nhẹ/đầy đủ, máy chủ tĩnh cục bộ, Playwright |
| MOD-QA-02 | `engine/qa/src/visual/{capture.ts, compare.ts, baseline.ts}` | Chụp góc, SSIM + pixelmatch, baseline |
| MOD-QA-03 | `engine/qa/src/bot/{bot-runner.ts, goals.ts, detectors.ts}` | Bot playtest |
| MOD-QA-04 | `engine/qa/src/inspector/{gl-wrap.ts, stats.ts}` | Bọc `WebGL2RenderingContext`, đếm lệnh vẽ, đọc pixel |
| MOD-QA-05 | `engine/qa/src/report/{summarize.ts, merge.ts}` | Gộp báo cáo, `summary` ≤ 20 dòng |

---

## 3. Thiết kế lớp và giao diện

### 3.1 Runtime

```csharp
// Core/Boot.cs  (IF-RTM-01) — trang nạp gọi: unityInstance.SendMessage('GameStudio', 'Boot', json)
[Serializable] public struct BootOptions {
  public string manifestUrl; public string mode;   // "play" | "preview" | "test"
  public long seed; public string tier;            // "auto" | "thap" | "vua" | "cao" | "toida"
  public bool liveRuntimeData;                      // preview: diff đến qua ApplyRuntimeData
}
// Tiến độ: gs-bridge.jslib → window.dispatchEvent(new CustomEvent('gs:progress', {detail:{phase, loaded, total}}))

// Core/Engine.cs  (IF-RTM-02, IF-RTM-03)
public interface ISystem {
  string Id { get; } int Order { get; }
  void Init(EngineContext ctx);
  void Tick(float dt, float t);
  void OnZoneLoaded(LoadedZone z); void OnZoneUnloaded(LoadedZone z);
  void OnRuntimeData(in RuntimeDataDiff diff); void OnTierChanged(Tier tier);
  void Dispose();
}
public static class Order { public const int Input = 10, CameraPlayer = 20, NpcAi = 30, Characters = 40, Combat = 50, Interaction = 60, Fx = 70, Render = 80, UiAudio = 90; }
public sealed class EngineContext {
  public Camera Camera; public Tier Tier; public TierBudget Budgets; public RngRoot Rng; public GameClock Clock; public EventBus Bus;
  public RuntimeData Data; public ZoneStreamer Zones; public NavService Nav;   // Nav = null khi game không có agent
  public AudioService Audio; public UiService Ui; public SaveStore Save; public ILog Log; public Mode Mode;
  public GameState State; public InputState Input;
}
public sealed class Engine {
  public void Register(ISystem s);                  // chèn theo Order, gọi Init
  public void EnableModule(string name);            // "combat"; theo manifest.modules, mã luôn có trong player
  public void Start(); public void Pause(); public void Resume(); public void StepFixed(int n);   // StepFixed chỉ mode test
  public void ApplyRuntimeData(string jsonPatch);   // IF-RTM-04, gọi qua SendMessage
}

// Core/EventBus.cs — không cấp phát: mảng struct vòng 256
public struct GsEvent { public int Type; public float A, B; public int S; }   // S = chỉ số chuỗi đã intern
public sealed class EventBus { public void Emit(int type, float a = 0, float b = 0, int s = -1); public void On(int type, Action<GsEvent> fn); public void Flush(); }

// Loader/ZoneStreamer.cs
public sealed class ZoneStreamer {
  public Task LoadStart(string zoneId);             // core → cho điều khiển
  public void Tick(Vector3 playerPos);              // prefetch/unload theo PSC-RTM-02
  public ZoneState State(string zoneId);            // STM-RTM-02
  public Task RequestLightmap(string zoneId, string todId); public void ReleaseLightmap(string zoneId, string todId);
}

// Interaction/GameState.cs  (ALG-RTM-05)
public sealed class GameState {
  public bool GetFlag(int i); public void SetFlag(int i, bool v);
  public int GetCounter(int i); public void AddCounter(int i, int d);
  public byte QuestState(int i); public void SetQuest(int i, byte s);
  public SaveState Snapshot(); public void Restore(in SaveState s);
  public int IndexOf(StateKind kind, string id);    // dùng khi biên dịch biểu thức
}

// Interaction/ActionCatalog.cs  (IF-RTM-05) — hợp đồng dữ liệu ↔ player
// fire_event, set_flag, add_counter, quest, spawn, play_sound, show_info, start_dialogue, pick_item, change_zone
```

### 3.2 Biểu thức an toàn (`@gamestudio/expr`, ALG-RTM-04)

```ts
export interface ExprContextSpec { idents: Record<string, 'number' | 'bool' | 'string'>; fns: Record<string, { args: number; ret: 'number' | 'bool' }> }
export interface CompiledExpr { readonly src: string; eval(env: ExprEnv): number | boolean | string }
export interface ExprEnv { ident(slot: number): number | boolean | string; call(fnSlot: number, a0: number, a1: number): number | boolean }
export function compile(src: string, spec: ExprContextSpec): Result<CompiledExpr, ExprError>;
export interface ExprError { code: 'syntax' | 'unknown_ident' | 'unknown_fn' | 'type' | 'arity'; pos: number; message: string }
```
Mỗi nơi dùng cấp `ExprContextSpec` riêng: điều kiện tương tác/hội thoại (`flag`, `counter.*`, `quest.*.state`, `hour`), graph hành vi (`dist`, `hour`, `event`, `flag`, `rand`), công thức sát thương (`atk`, `def`, `weapon`, `max`, `min`, `round`).

### 3.3 Build và CLI

```ts
// orchestrator/graph.ts
export interface StepDef { id: StepId; version: string; deps: StepId[]; inputs: { dataPointers: string[]; files: string[]; params: object };
  runner: 'node' | 'python' | 'blender'; entry: string; perZone: boolean; outputs: string[]; tools: string[]; timeoutS: number }
export function loadGraph(stepsDir: string): Result<StepGraph>;      // kiểm vòng, kiểm deps tồn tại
// orchestrator/scheduler.ts  (ALG-CLI-01)
export async function runBuild(o: { gameDir: string; zone?: string; tier?: Tier; step?: StepId; force?: boolean; skipBake?: boolean; json: boolean }): Promise<BuildOutcome>;
// packager  (ALG-CLI-02)
export async function pack(ctx: StepCtx): Promise<StepResult>;
// qa  (ALG-QA-01, ALG-QA-02)
export async function runQa(o: { buildDir: string; level: 'nhe' | 'day_du'; zone?: string; dialogue?: boolean; seed: number }): Promise<Report1>;
```

### 3.4 Lệnh làm tiếp / cập nhật (CR-01, IF-CLI-04)

```ts
// status/sources-fs.ts  (ALG-CLI-04) — chỉ đọc
export async function loadStatusSourcesFs(gameDir: string): Promise<Result<StatusSources /*DDD-00 DTO-GEN-09*/>>;
// commands/status.ts
export async function cmdStatus(o: { gameDir: string; json: boolean }): Promise<StatusReport /*DTO-GEN-08*/>;   // thoát 0
// orchestrator/cache-index.ts  (SCH-RTM-09)
export function readCacheIndex(buildDir: string): CacheIndexEntry[];
export function recordStep(buildDir: string, e: CacheIndexEntry): void;          // ghi tệp tạm + rename, khoá tệp `index.lock`
// orchestrator/stale.ts  (ALG-CLI-05)
export function planStaleFs(gameDir: string, o: { zone?: string; tiers?: Tier[] }): StalePlan;   // = planStale(sources, graph)
export async function runBuild(o: { …; stale?: boolean; dryRun?: boolean }): Promise<BuildOutcome>;  // mọi build đi qua planStale
// upgrade/run.ts  (ALG-CLI-06)
export async function upgrade(o: { gameDir: string; to?: string; acceptDiff: boolean; noApply: boolean; json: boolean }): Promise<Result<UpgradeReport>>;
// import/checks.ts  (ALG-CLI-07)
export async function importGame(src: string, o: { into?: GameId; gamesDir: string; json: boolean }): Promise<Result<ImportReport /*DTO-CLI-06*/>>;
// packager/publish-diff.ts  (ALG-CLI-08)
export function diffPublish(prev: GameDataFiles, cur: GameDataFiles, max = 200): { changes: PublishChange[]; more: number };
```

---

## 4. Dữ liệu

| Mã | Cấu trúc | Đặc tả |
|---|---|---|
| DTO-RTM-01 | `manifest.json` (SCH-RTM-04) | `{schema:'manifest/1', gameId, publishVersion?, engineVersion, schemaVersion, dataHash, tiers: Tier[], startZone, spawn: {zone, pos:[x,y,z], yaw}, zones: [{id, bounds: {min:[x,z], max:[x,z]}, neighbors: string[], parts: {[tier]: {core: FileRef[], full: FileRef[]}}, bytes: {[tier]: {core, full}}, lightmaps: {[todId]: {[tier]: FileRef[]}}, nav?: {[agentType]: FileRef}}], modules: {combat?: true, dialogueAi?: true} /*CR-02 thay chunks*/, player: {semver, loaderUrl, bytes} /*Unity player dùng chung, POC-U1 ≤ 10 MB Brotli*/, fallbacks: {texture: 'png'\|'jpg'}, surfaceMap: FileRef, runtimeData: RuntimeData, credits: CreditGroup[]}`; `FileRef = {path, bytes, sha256}` |
| DTO-RTM-02 | `RuntimeData` / `RuntimeDataDiff` (IF-RTM-04) | `RuntimeData = {entities: {npc, animals, interactions, player}, dialogue, behaviors, state, atmosphere, postFx, timeOfDay, spawns, ambience}` (phần "chỉ runtime" của dữ liệu); `RuntimeDataDiff = {version: number, ops: JsonPatchOp[] /*tương đối RuntimeData*/}` |
| DTO-RTM-03 | `publish.json` (SCH-RTM-06) | `{schema:'publish/1', gameId, publishVersion, publishedAt, engineVersion, schemaVersion, dataHash, tiers, qa: {result, reportRef}, notMet: bool, dev: bool, dialogueAi: bool, credits: FileRef}`; v0.2 (CR-01, FR-CLI-12) thêm `previousVersion?: number, dataVersion: number, changes: {kind: 'them'\|'sua'\|'xoa', file, objectId, fields: string[]}[] /*≤200*/, changesMore?: number` |
| DTO-RTM-04 | `tier-table.json` (SCH-RTM-08) | `{rules: [{gpuRegex, tier, note}], defaults: {cao: {deviceMemoryMin: 12}, vua: {deviceMemoryMin: 8, minScreenPx: 1080}}, dprMax: {thap: 1.0, vua: 1.5, cao: 2.0, toi_da: 2.5}}` |
| DTO-RTM-05 | Bố trí `GameState` | `flags: Uint8Array(nFlags)`, `counters: Int32Array(nCounters)`, `quests: Uint8Array(nQuests)`; bảng `index: {flags: string[], counters: string[], quests: string[]}` lấy từ `game.json.state` khi nạp; id lạ ở runtime → bỏ qua + log (không cấp phát mới) |
| DTO-RTM-06 | Bản lưu IndexedDB | DB `gs-save`, store `saves`, khoá `<gameId>@<publishVersion>`, giá trị `{v:1, at, pos:[x,y,z], yaw, zone, gameHour, flags: number[], counters: number[], quests: number[], tier?}` |
| DTO-RTM-07 | AST biểu thức | `Num{v}`, `Str{v}`, `Bool{v}`, `Ident{path, slot}`, `Unary{op:'!'\|'-', e}`, `Binary{op, l, r}`, `Call{fn, slot, args[≤2]}` |
| DTO-RTM-08 | Mẫu đo | `{publishId, device: {ua, gpu?, deviceMemory?, dpr, screen}, tier, route, fps: {avg, p5, p1}, frameMs: {p50, p95}, memoryMB?, drawCalls, tris, loadS, thermal?: 'nominal'\|'fair'\|'serious', at}` (SRS-04 mục 7.3) |
| DTO-CLI-01 | `ctx.json` (StepCtx, IF-CLI-02) | `{gameDir, gameId, zone: string\|null, tier: Tier\|null, seed: number, inputs: {data: {[pointer]: unknown}, files: string[], params: object}, upstream: {[stepId]: {outDir, outputHash}}, outDir, tmpDir, toolVersions: {[tool]: string}, logLevel}` |
| DTO-CLI-02 | `StepResult` / `report.json` | `Report1` (DDD-00 DTO-GEN-05) + `outputs: string[]` (tương đối `outDir`) |
| DTO-CLI-03 | `step.json` | Như `StepDef` mục 3.3; ví dụ ở DDD-02 EP-WLD-01…09 |
| DTO-CLI-04 | `meta.json` cache | `{inputHash, outputHash, createdAt, durationS, host, stepVersion}` |
| DTO-CLI-05 | `cache/index.json` (SCH-RTM-09) | `CacheIndexEntry[] = {step: StepId, zone?: string, tier?: Tier, inputHash, outputHash, at, durationS, ok: true}[]`, một mục cho mỗi bộ (bước, zone, tier) thành công gần nhất; `engine status`, `planStale`, `web/api` chỉ đọc tệp này |
| DTO-CLI-06 | `import/1` (SCH-RTM-10) | `{schema:'import/1', result: 'ok'\|'canNangCap'\|'chan', gameId, engineVersion, schemaVersion, hasBrief, counts: {zones, npcs, animals, assets}, assets: {missingProvenance: string[], pendingReview: string[]}, problems: {code, path, message}[], migrateFrom?: number}` |
| DTO-CLI-07 | `UpgradeReport` | Báo cáo `kind:'upgrade'` (Report1 mở rộng): `{from: {engineVersion, schemaVersion}, to: {…}, migrated: string[], rebuilt: {step, zone, tier}[], qa: {result, visualDiff: {view, diffPct}[]}, applied: boolean, candidateDir?: string /*--no-apply*/, backupDir?: string}` |
| DTO-QA-01 | `qa/views.json`, `routes.json`, `bot/*.json` (SCH-RTM-07) | `view {id, zone, pos[3], dir[3] \| lookAt[3], fov, timeOfDay, tier?}`; `route {id, zone, points: [x,y,z][], speed, durationS}`; `bot {id, seed, maxS, steps: ({goal:'goto', target:[x,y,z] \| objectId} \| {goal:'interact', objectId} \| {goal:'wait', s} \| {goal:'random_walk', s, radius})[]}` |
| DTO-QA-02 | `qa/baseline/baseline.json` | `[{view, file, acceptedBy, at, reason, buildHash}]` |

---

## 5. API / giao thức

| Mã | Giao thức | Đặc tả |
|---|---|---|
| EP-RTM-01 | Tham số URL trang chơi | `?test=1&seed=<n>` (chế độ test: bước 1/30 s, RNG = seed, tắt hạt theo thời gian thực); `?dev=1` (chỉ khi `publish.dev=true` hoặc `mode='preview'`); `?tier=thap\|vua\|cao\|toi_da`; `?perf=1&route=<id>&pt=<token>`; `?view=<viewId>` (QA chụp góc) |
| EP-RTM-02 | `window.__gsTest` (mode `test`) | `{ready(): Promise<void>, step(n): void, setPlayer(pos, yaw), moveTo(target, speed): Promise<'arrived'\|'stuck'>, interact(objectId): boolean, getPlayer(): {pos, zone}, events(): {type, a, b, s}[] /*xả hàng đợi*/, stats(): {fps, drawCalls, tris, programs, textures, geometries}, setView(viewId): Promise<void>, setHour(h), errors(): string[]}` |
| EP-RTM-03 | Gửi số đo | `POST /api/perf-samples` (API-WEB-60) thân DTO-RTM-08, header `Authorization: Bearer <pt>`; lỗi mạng → hiện JSON trong hộp thoại để sao chép |
| EP-CLI-01 | Lệnh `engine` (IF-CLI-01) | `new-game` (DDD-01 EP-INT-01); `build --zone <id> [--tier <t>] [--step <s>] [--force] [--skip-bake] [--json]`; `qa --level=nhe\|day-du [--zone] [--dialogue] [--accept-baseline <v1,v2> --reason <txt>]`; `publish [--target poc\|web] [--out <dir>]`; `doctor [--json]` (DDD-09); `migrate [--dry-run]`; `validate [--all\|--staged\|<file>] [--schema <f>]`; `asset …` (DDD-03). Mọi lệnh có `--game <id>` (mặc định thư mục hiện tại) và `--json` |
| EP-CLI-02 | Giao thức tiến trình con bước build (IF-CLI-02) | Bộ điều phối ghi `ctx.json` (DTO-CLI-01) vào `tmpDir`; chạy: node → `import(entry).run(ctx)` trong worker thread riêng; python → `uv run python -I <entry> --ctx <ctx.json>` với `OMP_NUM_THREADS=1`, `NUMBA_NUM_THREADS=1`, `PYTHONHASHSEED=0`; blender → `blender -b --factory-startup --disable-autoexec --python-exit-code 1 -P <entry> -- --ctx <ctx.json>`. Bước ghi `outDir/**` + `outDir/report.json`; stdout dòng `PROGRESS <0-100> <msg>` (dòng khác bỏ qua); stderr là log JSON; mã thoát 0 = xong, ≠ 0 = lỗi; vượt `timeoutS` → `SIGTERM`, 20 s sau `SIGKILL` |
| EP-CLI-03 | Lệnh CR-01 (IF-CLI-04) | `status --game <id> [--json]` → `status/1` (DDD-00 DTO-GEN-08), thoát 0 kể cả còn việc; `build --stale [--zone <id>] [--dry-run] [--json]` (`--dry-run` in `{steps[{step, zone, tier, reason}], estimateS}`); `upgrade [--to <bản>] [--accept-diff] [--no-apply] [--json]` → DTO-CLI-07; `import <thư mục\|gói.zip> [--into <id>] [--json]` → DTO-CLI-06; `brief confirm --game <id>` (gọi `confirm` của phiên `suy_nguoc`, DDD-01 PSC-INT-13). Mã thoát: ERR-CLI-02 → 4 (dữ liệu) / 2 (QA Fail); ERR-CLI-03 → 4; brief `ChoXacNhan` khi build → 3 (ERR-INT-06) |

---

## 6. Luồng xử lý

### SEQ-RTM-01 Khởi động tới điều khiển được
```mermaid
sequenceDiagram
    participant P as index.html
    participant B as Boot (Unity player)
    participant T as Tier/Detect
    participant L as ZoneStreamer
    participant W as GltfLoader/Ktx2Loader
    participant E as Engine
    P->>P: WebGL2? (không → ERR-RTM-01, không tải player)
    P->>B: createUnityInstance(engine/<semver>) rồi SendMessage Boot({manifestUrl, mode})
    B->>T: chọn tier
    B->>B: fetch manifest, kiểm engineVersion, schemaVersion, trường bắt buộc (ERR-RTM-03)
    B->>E: tạo hệ thống bắt buộc theo Order; bật module theo manifest.modules
    B->>L: LoadStart(startZone) → parts[tier].core
    L->>W: tải song song ≤ 4, giải mã KTX2/Meshopt chia lát theo khung
    W-->>L: mesh/texture Unity
    L->>E: tải lên GPU theo lát ≤ 4 ms/khung
    E-->>P: SCR-RTM-01 "Chơi" (chạm bật âm thanh)
    P->>E: start() → đo 3 s (PSC-RTM-01 bước 5)
    L->>L: nạp full zone xuất phát, prefetch zone kề
```

### SEQ-RTM-02 Áp nóng dữ liệu runtime (xem trước)
`web/api` ghi phiên bản → SSE `data.version {impact.runtimeOnly=true, ops}` → SPA `EditorBridge.applyRuntimePatch(ops)` (DDD-08) → `SendMessage('GameStudio','ApplyRuntimeData', json)` → `Engine.ApplyRuntimeData(diff)`: `applyPatch(RuntimeData)` → kiểm schema phần đổi → phát `onRuntimeData(diff)` tới mọi hệ thống theo `order` → từng hệ thống chỉ nạp lại phần của mình (npc-ai: graph/thông số agent; fx: khí quyển; interaction: điểm tương tác, cây thoại) → không tải lại zone. Mục tiêu ≤ 2 s đầu-cuối.

### SEQ-CLI-01 `engine build --zone z1`
```mermaid
sequenceDiagram
    participant C as engine build
    participant G as guards
    participant O as scheduler
    participant K as cache
    participant S as bước (tiến trình con)
    C->>G: brief DaXacNhan? style bible (nếu bước cần)? engineVersion?
    G-->>C: ok | thoát 3 / 4
    C->>O: loadGraph → topo(z1)
    loop theo thứ tự tô-pô (song song ≤ min(4, lõi/2))
        O->>K: inputHash (DDD-00 PSC-GEN-02) → hit?
        alt hit
            K-->>O: outDir + outputHash
        else miss
            O->>S: ctx.json → chạy runner
            S-->>O: PROGRESS … ; report.json ; exit code
            O->>K: lưu meta.json
        end
    end
    O-->>C: gộp report → exit 0/1/2
```

### SEQ-CLI-02 `engine upgrade` (ALG-CLI-06)
```mermaid
sequenceDiagram
    participant U as Người dùng / worker
    participant UP as upgrade/run
    participant WS as .upgrade/<ts>/
    participant M as schema.migrate
    participant B as runBuild(stale, cache phụ)
    participant Q as runQa(nhe)
    U->>UP: engine upgrade [--accept-diff] [--no-apply]
    UP->>WS: sao data/, brief/, qa/; liên kết cứng asset, cache chỉ đọc
    UP->>M: n→n+1… tới đích
    alt migrate lỗi
        UP->>WS: xoá; ERR-CLI-02 (thoát 4)
    end
    UP->>B: build --stale trên bản sao
    UP->>Q: QA nhẹ + visual diff baseline
    alt Fail và không --accept-diff
        UP->>WS: xoá; ERR-CLI-02 (thoát 2)
    else --no-apply
        UP-->>U: để lại ứng viên + UpgradeReport (applied=false)
    else Pass / --accept-diff
        UP->>UP: rename data → data.bak-<ts>, WS/data → data; gộp cache phụ
        UP-->>U: UpgradeReport (applied=true)
    end
```

### SEQ-CLI-03 `engine import` (ALG-CLI-07)
```mermaid
sequenceDiagram
    participant U as Người dùng
    participant IM as import/checks
    participant I as intake.reverseBrief
    U->>IM: engine import <dir|zip> [--into id]
    IM->>IM: giải nén an toàn → tmp; kiểm game.json, cấu trúc, schema, engineVersion, provenance
    alt chan
        IM-->>U: import/1 result=chan, ERR-CLI-03, không ghi gì
    else ok / canNangCap
        IM->>IM: chép vào games/<id>/ (hoặc áp --into, giữ data.bak-<ts>/)
        opt hasBrief = false
            IM->>I: reverseBrief(data) → brief ChoXacNhan
        end
        IM-->>U: import/1 (+ gợi ý `engine upgrade` khi canNangCap)
    end
```

### SEQ-QA-01 QA nhẹ
`engine qa --level=nhe` → `server.ts` phục vụ `build/<id>/` cổng ngẫu nhiên → Chromium (`--use-gl=angle --use-angle=swiftshader`, viewport 412 × 915, DPR 2,6) mở `?test=1&seed=<s>` → `__gsTest.ready()` ≤ 30 s → smoke (lỗi console, pixel khung đầu) → chụp ≤ 5 góc → route đầu 20 s → đọc `stats()` + báo cáo packager → `evaluate` → `report/1` `kind:'qa'` + `summary`.

---

## 7. Máy trạng thái

### STM-RTM-01 Vòng đời engine
| Trạng thái | Sự kiện | Tới |
|---|---|---|
| `KhoiTao` | WebGL2 + manifest hợp lệ | `NapLoi` |
| `KhoiTao` | thiếu WebGL2 / sai schema / lệch `engineVersion` | `Loi` (ERR-RTM-01/03/04) |
| `NapLoi` | `core` zone xuất phát sẵn sàng | `SanSang` (hiện nút "Chơi") |
| `SanSang` | người chơi chạm "Chơi" | `DangChay` |
| `DangChay` | menu / mất tiêu điểm / `visibilitychange` | `TamDung` (lưu PSC-RTM-07) |
| `TamDung` | tiếp tục | `DangChay` |
| `DangChay` | lỗi không phục hồi | `Loi` |
| bất kỳ | `dispose()` | `DaHuy` |

### STM-RTM-02 Trạng thái zone
`ChuaNap → NapCore → CoreSanSang → NapFull → SanSang → GiaiPhong → ChuaNap`. `NapCore`/`NapFull` lỗi 3 lần (lùi 2/4/8 s) → giữ trạng thái trước + hiện thông báo ERR-RTM-02. Chỉ zone `CoreSanSang`/`SanSang` có collider dùng cho người chơi; người chơi không được rời zone tới zone chưa `CoreSanSang` (chặn mềm ở ranh giới).

### STM-RTM-03 Tier
`Tu dong` (dò) → `DoKhoiDau` (3 s) → `On dinh`; `On dinh --fps < 0,85 × mục tiêu liên tục 5 s--> HaBac` → `KhoaHa` (không tự nâng trong phiên). Người chơi chọn tier thủ công → `ThuCong` (không tự hạ, chỉ cảnh báo HUD).

### STM-CLI-01 Phiên nâng cấp (QT-RTM-08)
| Từ | Sự kiện | Tới | Hành động |
|---|---|---|---|
| — | `upgrade` | `DangSao` | tạo `.upgrade/<ts>/`, khoá tệp `games/<id>/.upgrade.lock` |
| `DangSao` | xong | `DangMigrate` | — |
| `DangMigrate` | lỗi | `ThatBai` | xoá bản tạm, ERR-CLI-02 thoát 4 |
| `DangMigrate` | xong | `DangBuild` | build stale, cache phụ |
| `DangBuild` | lỗi bước | `ThatBai` | xoá bản tạm, ERR-CLI-02 thoát 4 |
| `DangBuild` | xong | `DangQA` | QA nhẹ + visual diff |
| `DangQA` | Fail, không `--accept-diff` | `ThatBai` | xoá bản tạm, ERR-CLI-02 thoát 2 |
| `DangQA` | `--no-apply` | `UngVien` | giữ bản tạm + báo cáo cho web (DDD-08 STM-WEB-06) |
| `DangQA` | Pass / `--accept-diff` | `DaAp` | đổi tên nguyên tử, giữ `data.bak-<ts>/`, gộp cache phụ |

Bất biến: ở mọi trạng thái khác `DaAp`, `data/`, `build/<id>/cache/` và `publish/` không đổi byte nào.

---

## 8. Thuật toán chi tiết

### PSC-RTM-01 Chọn tier khởi động (ALG-RTM-01)
```
detect():
  # trang nạp đã kiểm WebGL2 (ERR-RTM-01) trước khi tải player (CR-02)
  {gpu, mem, cores, px, saved} = gs-device.jslib: WEBGL_debug_renderer_info, navigator.deviceMemory ?? 4,
      navigator.hardwareConcurrency ?? 4, min(screen.w, screen.h) * dpr, localStorage['gs.tier']
  if if saved and saved != 'auto' → return saved (ThuCong)
  r = tierTable.rules.find(r => new RegExp(r.gpuRegex,'i').test(gpu)); if r → r.tier
  else mem >= 12 → 'cao'; mem >= 8 and px >= 1080 → 'vua'; else 'thap'
  fmt = SystemInfo.SupportsTextureFormat (KTX for Unity chọn đích chuyển mã): astc ? 'astc' : etc2 ? 'etc2' : bc7 ? 'bc7' : 'fallback' (dùng manifest.fallbacks)
trước "Chơi" (POC-U1: khựng ~2 s khi biên dịch shader lần đầu): ShaderVariantCollection.WarmUp() cho bộ biến thể của tier đã chọn (Render/ShaderWarmup.cs), chia ≤ 8 biến thể/khung, xong mới bật nút "Chơi"
sau start(): đo 3 s; avg < 0.85 × fpsTarget → applyTier(tier - 1) trước khi tắt màn tải mờ dần
```

### PSC-RTM-02 Stream zone (ALG-RTM-02)
```
update(p):                                   # gọi mỗi 0,5 s bởi render-system
  cur = zoneAt(p)
  for n in neighbors(cur): if distToBoundary(p, n) <= prefetchDistance(100 m) and state(n) == ChuaNap: enqueue(n, 'core'), rồi 'full'
  for z in loaded: if graphDistance(cur, z) > unloadDistance(2): unload(z)
  if memoryEstimate() > budgets.memoryMB · 0.9: unload zone xa nhất ngoài cur; nếu vẫn vượt → applyTier(tier-1) (ERR-RTM-05, chỉ log)
queue: tối đa 4 fetch song song, ưu tiên core < full, zone hiện tại < kề
fetch(ref): ReadableStream → cộng byte → onProgress; sha256 không kiểm ở runtime (tin Caddy + immutable), kiểm độ dài
decode: postMessage(worker, buffer, [buffer]) → KTX2 transcode theo fmt / Meshopt decode → trả ArrayBuffer
gpuUpload: hàng đợi; mỗi khung xử lý tới khi performance.now() - t0 > 4 ms (renderer.initTexture, geometry upload)
retry: lỗi → sau 2, 4, 8 s; lần 3 lỗi → ERR-RTM-02, giữ người chơi ở zone hiện tại
```

### PSC-RTM-03 Hạ tier động (ALG-RTM-03)
```
mỗi khung: ring[ i++ % N ] = dtMs (N = 5 s × 60)
mỗi 0,5 s: fps = 1000 / mean(ring over 5 s)
  if state == 'On dinh' and fps < fpsTarget · 0.85: below += 0.5 else below = 0
  if below >= 5: applyTier(tier-1); state = 'KhoaHa'; hud.toast('Đã giảm chất lượng đồ hoạ để mượt hơn')
applyTier(t): cỏ R, cascade bóng, hậu kỳ, DPR (renderer.setPixelRatio(min(devicePixelRatio, dprMax[t]))), số đèn;
              phát onTierChanged; ZoneStreamer nạp nền texture tier mới theo zone (không chặn)
```

### PSC-RTM-04 Biểu thức an toàn (ALG-RTM-04)
```
lex: số (\d+(\.\d+)?), chuỗi '…' (escape \' \\), true/false, định danh [a-z_][a-z0-9_]*(\.[a-z0-9_]+)*, toán tử ! && || == != < <= > >= + - * / %, ( ) ,
     ký tự khác → syntax tại pos; độ dài nguồn ≤ 512 ký tự; độ sâu lồng ≤ 32
Pratt: prec: || 1, && 2, == != 3, < <= > >= 4, + - 5, * / % 6, tiền tố ! - 7, gọi hàm/ngoặc 8
check: Ident.path phải có trong spec.idents (counter.x, quest.x.state, flag.x đối chiếu chỉ số GameState) → slot; Call.fn trong spec.fns và đúng số đối
       kiểu: && || ! cần bool; + - * / % < … cần number; == != cùng kiểu
compile(node) → closure: Binary(+) = (env) => l(env) + r(env); Ident = (env) => env.ident(slot); Call = (env) => env.call(slot, a0(env), a1(env))
  hằng gập lúc biên dịch (Binary hai Num → Num); trả CompiledExpr {src, eval}
không eval/Function; không truy cập thuộc tính động (không có toán tử '.' lúc chạy, path đã thành slot)
```

### PSC-RTM-05 Biến game và sự kiện (ALG-RTM-05)
`fire_event(name)` → `bus.emit(EVT_GAME, hashIdx(name))`; `EventBus` là mảng vòng 256 `GsEvent` cấp sẵn; `flush()` ở đầu khung kế (trước `input`), gọi trình nghe theo thứ tự đăng ký; tràn hàng đợi → bỏ sự kiện cũ nhất + log cảnh báo (một lần/giây). `quest_start x` → `quests[idx]=1`; `quest_complete` → 2; trình nghe UI cập nhật mục tiêu HUD.

### PSC-RTM-06 Điểm tương tác (ALG-RTM-06)
```
grid: Map<cellKey(8 m), Int32Array idx> dựng khi zone nạp từ entities/interactions (+ NPC interactable, động vật animal_action)
mỗi khung: c = cellOf(player); best = -1; bestD2 = ∞
  for cell in 3×3 quanh c: for i in grid[cell]:
     d2 = dist2(player, pt[i]); if d2 <= r[i]² and d2 < bestD2 and cond[i].eval(env): best = i
  hud.setContextAction(best >= 0 ? pt[best].label : null)
nhấn hành động: switch kind: show_info | start_dialogue (DDD-07) | pick_item | change_zone (lưu → loadStart(zone)) | fire_event | animal_action (DDD-05)
```

### PSC-RTM-07 Lưu cục bộ (ALG-RTM-07)
Khoá `<gameId>@<publishVersion>`; lưu khi `TamDung`, đổi zone, mỗi 60 s (đồng hồ thực); `put` trong transaction `readwrite`; khi nạp: bản lưu có `publishVersion` khác → bỏ qua (không xoá, hiện "Bắt đầu mới"); IndexedDB không dùng được (chế độ riêng tư) → tắt lưu, không lỗi.

### PSC-CLI-01 Lập lịch đồ thị (ALG-CLI-01)
```
runBuild(o):
  g = loadGraph(); guards(o) (brief/style/engineVersion)
  plan = o.step ? [o.step] + downstream(o.step) : all steps
  if o.skipBake: plan -= ['lighting.bake']
  nodes = for s in topo(plan): s.perZone ? [(s, o.zone)] : [(s, null)]
  ready = nodes không deps chưa xong; running ≤ min(4, floor(cores/2))
  while nodes còn: chọn ready theo thứ tự tô-pô ổn định
     h = inputHash(s, ctx); if !o.force and cache.has(s, h): mark done (cached=true) ; continue
     r = runStep(s, ctx) ; if r.exit != 0: huỷ nhánh phụ thuộc, tiếp nhánh độc lập; kết quả = lỗi
     cache.put(s, h, outDir, meta)
  gộp report: result = worst(steps); exit = mapExit(result, errors)
```

### PSC-CLI-02 Packager (ALG-CLI-02)
```
pack(ctx) cho mỗi tier trong game.tiers:
  1 thu: chunks địa hình, instances veg/placement, asset glb dùng tới, nhân vật, âm thanh M4A (ADR-037), lightmap mốc baked, nguồn navmesh (`nav/sources.json`, DDD-05 DTO-CHR-06)
  2 checkAssets: mọi AssetRef: provenance hợp lệ + license ∈ cho phép + status DaDuyet (trừ prototypes/**) → thiếu: ERR-AST-03 (fail, liệt kê)
  3 merge tĩnh: theo chunk 64 m, nhóm theo vật liệu: glTF-Transform dedup → weld → join → flatten; vật lặp ≥ 4 lần → EXT_mesh_gpu_instancing
  4 vật liệu: gộp trùng hash; nếu > budgets.materials → texture-atlas (sharp, padding 8 px) cho nhóm vật liệu đơn giản
  5 texture: resize ≤ maxTexture[tier]; map 'sharp' → ktx create --encode uastc --uastc-quality 2 --zstd 18; còn lại --encode basis-lz (ETC1S) --qlevel 128;
     phần core (bước 7): mọi map ≤ 1024² và ETC1S, kể cả map 'sharp' (POC-U1: 8 KTX2 2048² UASTC mất 8,0 s chuyển mã trên A56 lần đầu)
     kèm fallback PNG (map có alpha) / JPG q85 ở độ phân giải ½
  6 hình học: Meshopt (EXT_meshopt_compression) + quantize (vị trí 14 bit, normal 8, uv 12); mọi glb ghi `scene: 0` mặc định (POC-U1: glTFast cần cảnh mặc định, `terrain.mesh` cũ thiếu)
  7 tách core/full: core = địa hình LOD2–3 + collider + vật trong 60 m quanh spawn (zone xuất phát) + mip thấp (texture ½ hoặc ¼); full = phần còn lại
  8 module tuỳ chọn (CR-02): ghi manifest.modules.combat=true khi features.combat.enabled||hunting.enabled; mã module luôn nằm trong Unity player; không còn chunk JS, recast.wasm (NavMesh dựng lúc nạp zone)
     kiểm ngược: cờ tắt mà manifest có modules.combat hoặc asset tag 'combat' → fail ERR-CBT-04 (DDD-06 PSC-CBT-01)
  9 metrics: drawCalls = Σ(mesh sau gộp × số vật liệu) + số lô instancing (Graphics.RenderMeshInstanced) + ước lượng veg (loài × LOD × chunk thấy được tối đa); tris, materials, maxTexture, zoneDownloadMB
     report = evaluate(metrics, budgets[tier]) (DDD-00 PSC-GEN-04); checks[].source = top 5 nguồn đóng góp (lớp veg, rule, asset)
  10 manifest.json (DTO-RTM-01) + credits (DDD-03 PSC-AST-07); dialogue-profiles.json tách riêng (DDD-07 PSC-DLG-10)
```

### PSC-CLI-03 Xuất bản (ALG-CLI-03)
```
publish(target):
  v = dataVersion hiện tại; yêu cầu build đủ game.tiers cho mọi zone của v (thiếu → chạy build)
  qa = runQa(level 'nhe'); notMet = qa.result == 'fail' vì ngân sách
  secret-scan(buildDir) bằng gitleaks detect --no-git --source <dir> --redact → phát hiện → dừng, thoát 4
  publish.json (DTO-RTM-03); copy → publish/<publishVersion>/ (index.html, manifest, zones, engine path tham chiếu /engine/<semver>/)
  target poc: rsync -a --delete publish/<v>/ <poc-host>:/srv/play/<gameId>/<v>/ ; target web: gọi API-WEB-51 với gói
  không bao giờ đặt cờ "đã duyệt"/cổng (FR-CLI-07)
```

### PSC-CLI-04 `engine status` (ALG-CLI-04)
```text
cmdStatus(gameDir):
  src = loadStatusSourcesFs(gameDir):        # chỉ đọc, không mạng
     data = loadGameData(gameDir/data) (đã kiểm schema; lỗi → problems)
     brief = gameDir/brief/*.json (bản mới nhất + trạng thái), styleBible = brief/style-bible.md có/không + trạng thái duyệt
     cache = readCacheIndex(build/<id>)       # SCH-RTM-09, không quét thư mục cache
     qa = reports/qa-*.json mới nhất theo zone; pubs = publish/*/publish.json
     intake = .intake/*.json (phiên mở); proposals = .proposals/*.json ChoDuyet; assets = assets/review.json
  expireSessions(now)                         # DDD-01 PSC-INT-12, CLI chạy tại đây
  r = computeStatus(src, graph)               # DDD-00 PSC-GEN-05
  print(json ? r : table(r) + summarizeVi(r)); exit 0
NFR-CLI-02: game 4 zone ≤ 5 s → chỉ đọc JSON nhỏ; băm dữ liệu dùng fileHash có cache mtime (DDD-00 PSC-GEN-02)
```

### PSC-CLI-05 `build --stale` (ALG-CLI-05)
```text
planStaleFs(gameDir, {zone, tiers}):
  tiers = tiers ?? tiers đã từng build trong cache/index.json ?? ['vua']
  plan = planStale(sources, graph)            # DDD-00: so inputHash mong đợi với index.json
  plan = plan.filter(zone)
runBuild({stale, dryRun}):
  plan = planStaleFs(...)                     # mọi build đều qua đây → status và build không lệch
  if dryRun: print({steps: plan.items, estimateS: Σ durationS gần nhất}); exit 0
  order = topo(plan, graph); run như PSC-CLI-01; bước có inputHash trùng → cached (QT-GEN-11)
  sau mỗi bước ok: recordStep(buildDir, {step, zone, tier, inputHash, outputHash, at, durationS, ok})
```

### PSC-CLI-06 `engine upgrade` (ALG-CLI-06)
```text
upgrade(o):
  lock(gameDir/.upgrade.lock) ?? err(GAME_BUSY "đang nâng cấp") → thoát 3
  ws = gameDir/.upgrade/<ts>; copy data/, brief/, qa/ → ws; hardlink assets; cacheRO = build/<id>/cache (chỉ đọc)
  try:
    for step in migrateChain(schemaVersion → o.to ?? current): ws.data = step(ws.data)       # SCH-RTM-02
    validateAll(ws.data)
    runBuild({gameDir: ws, stale: true, cacheRead: [cacheRO, ws/cache-side], cacheWrite: ws/cache-side})
    qa = runQa({level: 'nhe'}) + visualDiff(baseline)
    if qa.fail and !o.acceptDiff: throw ERR-CLI-02(step='qa', exit=2)
    if o.noApply: return report(applied=false, candidateDir=ws)
    rename(data → data.bak-<ts>); rename(ws/data → data)       # cùng ổ đĩa, nguyên tử từng bước; lỗi giữa chừng → đảo lại
    mergeCache(ws/cache-side → build/<id>/cache); writeReport(kind='upgrade')
  catch e: rm -rf ws; throw ERR-CLI-02(step=e.step, exit = e.qa ? 2 : 4)
  finally: unlock
```

### PSC-CLI-07 `engine import` (ALG-CLI-07)
```text
importGame(src, {into}):
  tmp = src.endsWith('.zip') ? safeUnzip(src) : src   # chặn ../, tuyệt đối, symlink; ≤ 2 GB (như DDD-08 PSC-WEB-10)
  if !exists(tmp/data/game.json): return chan(ERR-CLI-03 'thiếu data/game.json')
  g = read game.json; if into and g.gameId != into: return chan(ERR-CLI-03 'gameId không khớp')
  checkLayout(tmp)  (SRS-04 mục 6.1) → problems
  if schemaVersion < current: dry = migrate(tmp, dryRun) → ok ? result = canNangCap, migrateFrom : chan
  engineVersion ngoài dải → chan
  for a in assets: no provenance → missingProvenance += a; pendingReview += a (asset ChoDuyet)
  if result != chan:
     dest = into ? games/<into> (giữ data.bak-<ts>/) : games/<g.gameId>  (tồn tại và không --into → chan 'đã có game')
     copy tmp → dest
     if !exists(dest/brief): reverseBrief(dest.data)   # DDD-01 PSC-INT-13
  return import/1
```

### PSC-CLI-08 Xuất bản bản mới (ALG-CLI-08)
```text
publish(o):  # mở rộng PSC-CLI-03
  n = max(publish/*) ; target = publish/<n+1>   # không ghi đè, kể cả n = 0 → publish/1
  … đóng gói như PSC-CLI-03 …
  snap = zstd(JSON(canonical(data)))            # .source-data.json.zst, loại khỏi danh sách triển khai
  if n > 0: prev = unzstd(publish/<n>/.source-data.json.zst); {changes, more} = diffPublish(prev, data, 200)
  publish.json += {previousVersion: n || undefined, dataVersion, changes, changesMore: more}
diffPublish: so theo (file, objectId) cùng thuật toán DDD-08 PSC-WEB-07; fields = khoá cấp 1 khác nhau
```

### PSC-QA-01 QA nhẹ (ALG-QA-01)
Như SEQ-QA-01; thời gian cứng 5 phút (ERR-QA-01 → `fail` có `timeout`, giữ phần đã có); báo cáo ghi `"note": "fps giả lập SwiftShader chỉ so tương đối"`.

### PSC-QA-02 QA đầy đủ (ALG-QA-02)
Mọi góc (2 trang song song) → visual (PSC-QA-03) → perf 3 tier giả lập (`?tier=`) trên mọi route → bot (PSC-QA-04) nếu có `qa/bot` → `engine asset check` → `--dialogue` (DDD-07 PSC-DLG-06) → gộp; thời gian cứng 30 phút.

### PSC-QA-03 Visual regression (ALG-QA-03)
```
capture(view): __gsTest.setView(v) → đợi 2 khung ổn định (preserveDrawingBuffer) → PNG 1280×720
compare(img, base): ssim = ssim.js(gray(img), gray(base), {windowSize: 8}); diff = pixelmatch(img, base, out, w, h, {threshold: 0.1}) / (w·h)
  khac = ssim < 0.98 or diff > 0.005 (OI-QA-01); ghi diff-<view>.png
không baseline → warn ERR-QA-02
chọn ≤ 4 góc điểm tệ nhất theo (1 - ssim) + diff cho báo cáo
accept: --accept-baseline v1,v2 --reason "…" → chép ảnh, cập nhật baseline.json {acceptedBy (git user / userId), at, reason, buildHash}
```

### PSC-QA-04 Bot playtest (ALG-QA-04)
```
for bot in qa/bot: rng = Pcg32(bot.seed); t = 0
  for step in bot.steps: goto → __gsTest.moveTo(target); interact → interact(id); wait → step(s·30); random_walk → điểm ngẫu nhiên trong radius trên navmesh
  mỗi 0,5 s (15 bước cố định): ghi pos; stuck nếu có lệnh đi và |Δpos| < 0,5 m trong 5 s; out_of_bounds nếu ngoài playArea;
     penetration nếu tâm viên nang trong collider tĩnh (`__gsTest.overlapCapsule` → `Physics.CheckCapsule`, CR-02); gom events agent.stuck (NPC) ; errors()
  dừng ở maxS
result: fail nếu có stuck người chơi/penetration/lỗi console; warn nếu có agent.stuck NPC < 5 s
```

### PSC-QA-05 Canvas inspector (ALG-QA-05)
Bản test thêm `addInitScript` bọc `WebGL2RenderingContext.prototype.{drawElements, drawArrays, drawElementsInstanced, drawArraysInstanced, useProgram, createTexture, deleteTexture, createBuffer}` → bộ đếm theo khung; `readPixels` vùng 64×64 giữa màn để kiểm màn đen (độ sáng trung bình < 2/255) và màu trung bình.

### PSC-QA-06 Tóm tắt cho Claude (ALG-QA-06)
`summary` ≤ 20 dòng: dòng 1 kết quả tổng; tiếp theo mỗi check `fail` rồi `warn` dạng `<id>: <value>/<limit> (<pct>%) nguồn: <top 2>`; góc khác nhất (SSIM); lỗi console đầu tiên (≤ 160 ký tự). Ảnh chỉ liệt kê đường dẫn trong `artifacts`.

---

## 9. Xử lý lỗi

| Mã | Nơi | Xử lý |
|---|---|---|
| ERR-RTM-01 | PSC-RTM-01 | Màn tải hiện thông báo, dừng, không tải asset |
| ERR-RTM-02 | PSC-RTM-02 | Lùi 2/4/8 s; giữ người chơi ở zone hiện tại; thông báo trên HUD |
| ERR-RTM-03 | `bootstrap` | `mode` dev/preview: hiện `instancePath`; `play`: "Dữ liệu game bị lỗi." |
| ERR-RTM-04 | `guards` (build) và `bootstrap` | Build thoát 4; runtime dừng với thông báo dải phiên bản |
| ERR-RTM-05 | PSC-RTM-02 | Chỉ log; giải phóng sớm, hạ tier |
| ERR-QA-01 | `runQa` | `fail` + `timeout`, báo cáo từng phần |
| ERR-QA-02 | PSC-QA-03 | `warn`, đề nghị `--accept-baseline` |
| ERR-CLI-01 | `commander` | In cách dùng, thoát 4 |
| ERR-CLI-02 | PSC-CLI-06 | "Nâng cấp chưa thành công ở bước <bước>; game giữ nguyên bản cũ."; xoá bản tạm; thoát 4 (dữ liệu) hoặc 2 (QA Fail) |
| ERR-CLI-03 | PSC-CLI-07 | "<đường dẫn> không phải game GameStudio hợp lệ: <lý do>."; không ghi gì; thoát 4 |

---

## 10. Cấu hình

| Mã | Khoá | Mặc định | Nơi |
|---|---|---|---|
| CFG-RTM-01 | `prefetchDistance`, `unloadDistance`, song song tải, lát GPU | 100 m, 2 zone, 4, 4 ms/khung | `loader/config.ts` |
| CFG-RTM-02 | Hạ tier | ngưỡng 0,85 × mục tiêu, cửa sổ 5 s, đo khởi động 3 s | `tier/config.ts` |
| CFG-RTM-03 | `dt` kẹp, bước test | [0; 0,1 s], 1/30 s | `core/clock.ts` |
| CFG-RTM-04 | Bóng theo tier | Thấp không; Vừa 1 cascade 1024; Cao 2 cascade 2048 (TSD đề xuất, OIT-RTM-01) | `render/shadows.ts` |
| CFG-RTM-05 | Cảm ứng | joystick bán kính 60 px, vùng chết 10%, nút ≥ 48 × 48 px trong safe-area | `input/config.ts` |
| CFG-RTM-06 | Lưu | 60 s, DB `gs-save` | `save/save-store.ts` |
| CFG-CLI-01 | Song song bước, cache tối đa | `min(4, lõi/2)`; cache 50 GB/game LRU (DDD đề xuất) | `engine/cli/src/config.ts` |
| CFG-CLI-02 | CR-01 | `changes[]` ≤ 200 mục; giữ `data.bak-<ts>/` 5 bản gần nhất (DDD đề xuất); tier mặc định cho `--stale` khi chưa build: Vừa; zip nhập ≤ 2 GB | `engine/cli/src/config.ts` |
| CFG-QA-01 | Ngưỡng visual | SSIM < 0,98 hoặc > 0,5% pixel (OI-QA-01) | `engine/qa/src/visual/config.ts` |
| CFG-QA-02 | Thời gian cứng | nhẹ 5 phút, đầy đủ 30 phút, smoke 30 s | `engine/qa/src/config.ts` |

---

## 11. Thiết kế kiểm thử

| Mã | Ca | Dữ liệu / bước | Kỳ vọng | TSD |
|---|---|---|---|---|
| TC-RTM-01 | Schema | Mẫu hợp lệ; tệp sai `world.zones[0].polygon` | Hợp lệ 0 lỗi; sai → `instancePath='/zones/0/polygon'` | TST-RTM-01 |
| TC-RTM-02 | Migrate | `fixtures/game-v1` | v2 đúng; `data.bak-*` tồn tại; `--dry-run` không ghi | TST-RTM-02 |
| TC-RTM-03 | Biểu thức | Bảng 200 ca (đúng, sai cú pháp, hàm cấm, định danh lạ, sâu 40) | Đúng kết quả/lỗi + `pos`; grep CI không `eval(`/`new Function` | TST-RTM-03 |
| TC-RTM-04 | Không có mã riêng game (CR-02) | `games/x/` chứa `scripts/a.ts` hoặc tệp `.cs`/`.js` | `engine validate` và packager báo lỗi | TST-RTM-04 |
| TC-RTM-05 | Không KTX2 | Giả lập `detectSupport` trả rỗng | Dùng PNG/JPG fallback, pixel không đen | TST-RTM-05 |
| TC-RTM-06 | GC | Profiler 2 phút số thực thể tối đa | Không GC > 5 ms; heap không tăng đều | TST-RTM-06 |
| TC-RTM-07 | Ngân sách ví dụ | DDD-00 TC-GEN-05 | Đúng | TST-RTM-07 |
| TC-RTM-08 | Stream | Route qua 3 zone | Zone cách > 2 được giải phóng; bộ nhớ ≤ ngân sách | TST-RTM-08 |
| TC-RTM-09 | Hạ tier | Ép `dt` 40 ms 6 s | Hạ 1 bậc, khoá; HUD toast | ALG-RTM-03 |
| TC-RTM-10 | Lưu | Lưu, tải lại cùng/ khác `publishVersion` | Cùng: khôi phục vị trí; khác: bỏ qua | ALG-RTM-07 |
| TC-QA-01 | QA nhẹ | Zone mẫu | ≤ 5 phút, Pass | TST-QA-01 |
| TC-QA-02 | Vượt vật liệu | Thêm 50 vật liệu | Packager Fail `materials`, `source` liệt kê | TST-QA-02 |
| TC-QA-03 | Visual | Đổi màu nước | Khác ở góc có nước, ≤ 4 ảnh trong báo cáo | TST-QA-03 |
| TC-QA-04 | Bot tất định | Bot 10 phút seed cố định × 2 | Cùng chuỗi vị trí; không kẹt | TST-QA-04 |
| TC-CLI-01 | Cache | Build zone 2 lần không đổi | Lần 2 mọi bước `cached`, ≤ 30 s | TST-CLI-01 |
| TC-CLI-02 | Mã thoát | Brief nháp; schema sai; doctor lỗi | 3; 4; 5 | TST-CLI-02 |
| TC-CLI-03 | Bản tĩnh | `npx serve publish/<v>` | Chạy không cần Web Studio; `publish.json` đủ trường | TST-CLI-03 |
| TC-CLI-04 | Giao thức bước | Bước giả in `PROGRESS 50 x`, thoát 1 | Tiến độ 50% được báo; nhánh phụ thuộc bị huỷ; nhánh độc lập chạy tiếp | IF-CLI-02 |
| TC-CLI-05 | `status` | 8 thư mục mẫu `fixtures/status/<stage>/`; game 4 zone; chặn mạng | `stage`, cờ, `next` đúng bảng SRS-00 mục 4.4; ≤ 5 s; 0 kết nối | TST-CLI-04 |
| TC-CLI-06 | `build --stale` | Dời một vật ở z2 | Chỉ bước z2 trong bao đóng chạy, z1 `cached`; `--dry-run` liệt kê đúng, không chạy; `status` sau đó `ChuaQA` | TST-CLI-05 |
| TC-CLI-07 | `upgrade` | Migrate giả lỗi bước 2; QA Fail không chấp nhận; ca thành công | Hash `data/`, `cache/`, `publish/` không đổi, thoát 4 / 2; thành công có `data.bak-<ts>/`, báo cáo `kind: upgrade` | TST-CLI-06 |
| TC-CLI-08 | `import` | Thư mục không brief; thiếu `game.json`; zip có `../`; `--into` khác `gameId` | Game mới + brief `ChoXacNhan`; ERR-CLI-03 không ghi gì; từ chối; ERR-CLI-03 | TST-CLI-07 |
| TC-CLI-09 | Xuất bản lần 2 | Đổi 3 đối tượng rồi `publish` | `publish/2/` mới, hash `publish/1/` không đổi; `changes[]` 3 mục; `previousVersion=1` | TST-CLI-08 |

---

## 12. Open item

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| OID-RTM-01 | Băm SHA-256 tệp zone ở runtime để phát hiện hỏng | Không ở bản đầu (tốn CPU A56); dựa vào `Cache-Control: immutable` + kiểm độ dài |
| OID-RTM-02 | Hạn mức cache bước 50 GB/game trên worker | Theo dõi `storage_usage` W2, chỉnh |

---

## 13. Truy vết

| FR / NFR | Thành phần TSD | Thành phần DDD |
|---|---|---|
| FR-RTM-01, 02 | SCH-RTM-01, SCH-RTM-02, TST-RTM-01, TST-RTM-02 | MOD-RTM-03, MOD-RTM-04, TC-RTM-01, TC-RTM-02 |
| FR-RTM-03, 04 | IF-RTM-01, IF-RTM-05, TST-RTM-04 | MOD-RTM-01, MOD-RTM-14, mục 3.1, TC-RTM-04 |
| FR-RTM-05 | IF-CLI-02 | EP-CLI-02, DTO-CLI-03 |
| FR-RTM-06 | ALG-GEN-01 | EP-RTM-01 (`?test`), CFG-RTM-03, MOD-RTM-17 |
| FR-RTM-07, 08 | ALG-RTM-01, ALG-RTM-03, SCH-RTM-08 | MOD-RTM-07, DTO-RTM-04, PSC-RTM-01, PSC-RTM-03, STM-RTM-03, CFG-RTM-02 |
| FR-RTM-09…11 | ALG-RTM-02, ALG-RTM-01, TST-RTM-05, TST-RTM-08 | MOD-RTM-05, PSC-RTM-02, STM-RTM-02, CFG-RTM-01, TC-RTM-05, TC-RTM-08 |
| FR-RTM-12…14 | SCH-RTM-03, ALG-GEN-03, TST-RTM-07 | CFG-GEN-02 (DDD-00), PSC-CLI-02 bước 9, TC-RTM-07 |
| FR-RTM-15…17 | TSD-04 mục 3.1 | MOD-RTM-08, CFG-RTM-05, EP-RTM-01 (`?dev`) |
| FR-RTM-18 | TSD-04 mục 3.2 | MOD-RTM-10 |
| FR-RTM-19 | ALG-RTM-06 | MOD-RTM-09, PSC-RTM-06 |
| FR-RTM-20 | ALG-RTM-04, ALG-RTM-05, TST-RTM-03 | MOD-RTM-15, DTO-RTM-05, DTO-RTM-07, PSC-RTM-04, PSC-RTM-05, TC-RTM-03 |
| FR-RTM-21 | ALG-RTM-07 | MOD-RTM-12, DTO-RTM-06, PSC-RTM-07, TC-RTM-10 |
| FR-RTM-22 | TSD-04 mục 3.2 | MOD-RTM-10 (`i18n.ts`) |
| FR-RTM-23 | TST-RTM-06 | MOD-RTM-02 (`EventBus`, `Pool`), TC-RTM-06 |
| FR-QA-01 | SCH-RTM-05 | DTO-GEN-05 (DDD-00), DTO-CLI-02 |
| FR-QA-02, 03 | ALG-QA-01, ALG-QA-02, TST-QA-01 | MOD-QA-01, PSC-QA-01, PSC-QA-02, SEQ-QA-01, TC-QA-01 |
| FR-QA-04 | SCH-RTM-07 | DTO-QA-01 |
| FR-QA-05 | ALG-QA-03, TST-QA-03 | MOD-QA-02, PSC-QA-03, TC-QA-03 |
| FR-QA-06 | ALG-QA-05 | MOD-QA-04, PSC-QA-05 |
| FR-QA-07 | TSD-04 mục 6 | MOD-RTM-13, DTO-RTM-08, EP-RTM-03 |
| FR-QA-08 | ALG-QA-04, TST-QA-04 | MOD-QA-03, EP-RTM-02, PSC-QA-04, TC-QA-04 |
| FR-QA-09 | ALG-QA-03 | DTO-QA-02, PSC-QA-03 (accept) |
| FR-QA-10 | ALG-QA-06 | MOD-QA-05, PSC-QA-06 |
| FR-CLI-01 | IF-CLI-01 | MOD-CLI-01, EP-CLI-01 |
| FR-CLI-02 | IF-CLI-03, ALG-CLI-01, TST-CLI-01 | MOD-CLI-03, DTO-CLI-04, PSC-CLI-01, SEQ-CLI-01, TC-CLI-01 |
| FR-CLI-03 | IF-CLI-01, IF-CLI-02, TST-CLI-02 | MOD-CLI-02, EP-CLI-02, DTO-CLI-01, TC-CLI-02, TC-CLI-04 |
| FR-CLI-04 | ALG-CLI-02, SCH-RTM-04 | MOD-CLI-04, DTO-RTM-01, PSC-CLI-02 |
| FR-CLI-05…07 | ALG-CLI-03, SCH-RTM-06, TST-CLI-03 | MOD-CLI-05, DTO-RTM-03, PSC-CLI-03, TC-CLI-03 |
| NFR-RTM-01…03 | TSD-04 mục 7 | PSC-RTM-02 (core ≤ 8 MB), PSC-RTM-01, CFG-RTM-01 |
| NFR-QA-01, 02 | TST-QA-04 | CFG-QA-02, PSC-QA-03, TC-QA-04 |
| NFR-CLI-01 | TST-CLI-01 | DDD-00 PSC-GEN-02 (`fileHash` cache), TC-CLI-01 |
| — | IF-RTM-02, IF-RTM-03, IF-RTM-04 | Mục 3.1 (`System`, `EngineContext`), DTO-RTM-02, SEQ-RTM-01, SEQ-RTM-02, STM-RTM-01, MOD-RTM-16 |
| FR-CLI-08 | IF-CLI-04, ALG-CLI-04, TST-CLI-04; TSD-00 ALG-GEN-05, SCH-GEN-07 | MOD-CLI-06, MOD-CLI-07, EP-CLI-03, mục 3.4, PSC-CLI-04, TC-CLI-05; DDD-00 PSC-GEN-05 |
| FR-CLI-09 | ALG-CLI-05, SCH-RTM-09, TST-CLI-05 | MOD-CLI-07, DTO-CLI-05, PSC-CLI-05, TC-CLI-06 |
| FR-CLI-10 | ALG-CLI-06, TST-CLI-06 | MOD-CLI-08, DTO-CLI-07, SEQ-CLI-02, STM-CLI-01, PSC-CLI-06, ERR-CLI-02, TC-CLI-07 |
| FR-CLI-11 | ALG-CLI-07, SCH-RTM-10, TST-CLI-07 | MOD-CLI-09, DTO-CLI-06, SEQ-CLI-03, PSC-CLI-07, ERR-CLI-03, TC-CLI-08 |
| FR-CLI-12 | ALG-CLI-08, SCH-RTM-06, TST-CLI-08 | MOD-CLI-10, DTO-RTM-03, PSC-CLI-08, CFG-CLI-02, TC-CLI-09 |
| NFR-CLI-02 | ALG-CLI-04, TST-CLI-04 | PSC-CLI-04, TC-CLI-05 |
| — | TST-RTM-01…08, TST-QA-01…04, TST-CLI-01…03 | TC-RTM-01…08, TC-QA-01…04, TC-CLI-01…03 |

---

## 14. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 22/11/2026 | Claude | Bản đầu từ TSD-04 v1.1 |
| 0.2 | 23/11/2026 | Claude | CR-01 theo TSD-04 v1.2 / SRS-04 v1.1: MOD-CLI-06…10, mục 3.4, DTO-RTM-03 mở rộng, DTO-CLI-05…07, EP-CLI-03, SEQ-CLI-02, 03, STM-CLI-01, PSC-CLI-04…08 (ALG-CLI-04…08), ERR-CLI-02, 03, CFG-CLI-02, TC-CLI-05…09 |
| 1.0 | 23/11/2026 | Huy | Duyệt bộ DDD; thay đổi sau đây theo change request |
| 1.1 | 25/11/2026 | Claude | CR-02 (runtime Unity, ADR-036; Huy duyệt phân tích 25/11/2026): viết lại mục 2.1 (MOD-RTM-01…17 sang C# `engine/unity`), 3.1 (giao diện C#), SEQ-RTM-01, 02, PSC-RTM-01, PSC-CLI-02 bước 8 (module thay chunk), TC-RTM-04; MOD-QA-04 giữ bọc WebGL2 |
| 1.2 | 26/11/2026 | Claude | CR-02 sau POC-U1: PSC-RTM-01 làm ấm shader trước "Chơi"; PSC-CLI-02 bước 1 (M4A, nguồn navmesh), 5 (texture core ≤ 1024 ETC1S), 6 (glb có `scene` mặc định), 8, 9; PSC-QA bot dùng `Physics.CheckCapsule` thay BVH |
| 1.3 | 28/11/2026 | Claude | CR-03 (Huy duyệt 28/11/2026): MOD-RTM-16 đổi thư mục `Editor/` thành `EditorMode/` |
