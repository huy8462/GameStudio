# DDD-08: Web Studio

| Mục | Nội dung |
|---|---|
| Mã tài liệu | DDD-08 |
| Phiên bản | 1.1 |
| Ngày | 26/11/2026 |
| Tài liệu cha | DDD-00 `DDD-00-TONG-QUAN.md` |
| TSD nguồn | TSD-08 v1.4 (IF-WEB-01…06, SCH-WEB-01…11, ALG-WEB-01…19, TST-WEB-01…17) |
| SRS nguồn | SRS-08 v1.3 (FR-WEB-01…69, NFR-WEB-01…09; CR-01 làm tiếp/cập nhật/nhập game) |
| Gói | `web/shared`, `web/api`, `web/ai-gateway`, `web/worker`, `web/app`, `web/deploy` |
| Pha | W1…W4 |
| Trạng thái | Đã duyệt (Huy, 23/11/2026); **v1.1 khung xem trước nhúng Unity player theo CR-02 và POC-U1**, chờ Huy xem lại |

> Web Studio là công cụ **nội bộ, chỉ người được mời** (QĐ-15). Mọi ghi dữ liệu game là JSON Patch qua `@gamestudio/schema`; việc nặng chỉ chạy bằng `engine` CLI trên worker; khoá dịch vụ AI chỉ nằm trong env của `ai-gateway`.

---

## 1. Giới thiệu
Thiết kế chi tiết năm dịch vụ và SPA: bố trí mã nguồn, plugin Fastify, lược đồ CSDL đầy đủ (31 bảng), từng endpoint REST/SSE/nội bộ, hợp đồng job, store editor và `EditorBridge`, luồng xử lý chính, máy trạng thái, mã giả cho 14 thuật toán TSD, xử lý lỗi, cấu hình theo dịch vụ, triển khai và kiểm thử.

Quy ước chung: khoá chính ULID (`text`, 26 ký tự) trừ bảng có khoá tự nhiên; thời điểm `timestamptz`; tiền `numeric(12,6)` USD; tên cột `snake_case` trong CSDL, `camelCase` trong DTO (Drizzle ánh xạ); mọi bảng thuộc lược đồ `app`.

---

## 2. Bố trí mã nguồn

| Mã | Tệp | Trách nhiệm |
|---|---|---|
| MOD-WEB-01 | `web/shared/src/dto/*.ts` | Kiểu DTO dùng chung + JSON Schema (TypeBox) cho route; xuất `Static<>` |
| MOD-WEB-02 | `web/shared/src/errors.ts` | Bảng ERR-WEB-* và ERR-* các nhóm khác: `{code, http, messageVi, params}`; `class AppError` |
| MOD-WEB-03 | `web/shared/src/permissions.ts` | Ma trận quyền SCH-WEB-10: `Action`, `can(sysRole, gamePerm, action)`, `ACTIONS_BY_ROUTE` |
| MOD-WEB-04 | `web/shared/src/sse.ts` | Kiểu sự kiện SSE (DTO-WEB-06) và bộ phân tích phía client |
| MOD-WEB-05 | `web/api/src/server.ts`, `src/main.ts` | Dựng Fastify, đăng ký plugin theo thứ tự (mục 3.1), route, khởi động/dừng êm |
| MOD-WEB-06 | `web/api/src/plugins/auth.ts`, `src/services/sessions.ts` | Phiên `gs_sid`, LRU 30 s, `NOTIFY gs_auth` (PSC-WEB-01) |
| MOD-WEB-07 | `web/api/src/plugins/permission.ts` | Kiểm quyền theo khai báo route; khởi động thất bại nếu route thiếu `action` (PSC-WEB-02) |
| MOD-WEB-08 | `web/api/src/plugins/{csrf.ts, request-id.ts, errors.ts, rate-limit.ts, idempotency.ts}` | Kiểm `Origin`, `x-request-id`, chuyển `AppError` → JSON, token bucket bộ nhớ, `Idempotency-Key` |
| MOD-WEB-09 | `web/api/src/plugins/quota.ts`, `src/services/quota.ts` | Kiểm hạn mức trước hành động (PSC-WEB-05) |
| MOD-WEB-10 | `web/api/src/routes/{auth.ts, me.ts}` | EP-WEB-01…03 |
| MOD-WEB-11 | `web/api/src/routes/{intake.ts, games.ts, brief.ts, style.ts, chat.ts, proposals.ts}` | EP-WEB-04…12 |
| MOD-WEB-12 | `web/api/src/routes/{data.ts, lock.ts, versions.ts}` | EP-WEB-13…15, EP-WEB-26 |
| MOD-WEB-13 | `web/api/src/routes/{jobs.ts, baseline.ts}` | EP-WEB-16…20 |
| MOD-WEB-14 | `web/api/src/routes/{assets.ts, packages.ts, uploads.ts}` | EP-WEB-21…25, EP-WEB-27 |
| MOD-WEB-15 | `web/api/src/routes/{members.ts, publish.ts, links.ts, play.ts, perf.ts, authz.ts, dialogue-test.ts}` | EP-WEB-28…32, EP-WEB-39; EP-DLG-04 (DDD-07) |
| MOD-WEB-16 | `web/api/src/routes/admin/*.ts` | EP-WEB-33…37, EP-WEB-44…51 |
| MOD-WEB-17 | `web/api/src/services/{versions.ts, locks.ts, jobs.ts, publish.ts, notifications.ts, audit.ts, object-store.ts, storage-usage.ts, game-facts.ts}` | Nghiệp vụ; route chỉ gọi service |
| MOD-WEB-18 | `web/api/src/db/{schema/*.ts, client.ts, migrations/*.sql}`, `drizzle.config.ts` | Lược đồ mục 4.2, pool 20, migration mở rộng-trước |
| MOD-WEB-19 | `web/api/src/events/{hub.ts, outbox.ts, listen.ts}` | `LISTEN gs_events` → SSE hub (PSC-WEB-15) |
| MOD-WEB-20 | `web/app/src/{main.tsx, router.tsx, query-client.ts, api/client.ts, api/sse.ts}` | TanStack Router/Query, client REST có `x-request-id`, nối SSE |
| MOD-WEB-21 | `web/app/src/editor/{store.ts, undo.ts, autosave.ts, merge.ts, selectors.ts}` | Store Zustand editor (DTO-WEB-08), hoàn tác, lưu tự động, hợp nhất khi 409 |
| MOD-WEB-22 | `web/app/src/preview/{editor-bridge.ts, unity-loader.ts, preview-frame.tsx, player-loading.tsx, tier-sim.tsx, qr.tsx, stats-overlay.tsx}` | `EditorBridge` (IF-WEB-05) gọi Unity player qua `SendMessage` và nhận sự kiện `gs:*` từ `.jslib` (CR-02); nạp player một lần mỗi phiên trang, màn chờ tải player có tiến độ, khung xem trước, giả lập tier, QR |
| MOD-WEB-23 | `web/app/src/features/workspace/{workspace.tsx, panel-registry.ts, top-bar.tsx, object-tree.tsx, gizmo-tools.tsx, json-raw.tsx}` | SCR-WEB-05/06; đăng ký panel chuyên biệt của DDD-01/02/03/05/06/07 |
| MOD-WEB-24 | `web/app/src/features/{auth, library, account, intake, jobs, versions, share, admin, notifications, play}/**` | SCR-WEB-01…04, 07…14 |
| MOD-WEB-25 | `web/app/src/i18n/{vi.json, t.ts}`, `src/format.ts` | Chuỗi tiếng Việt, `Intl` vi-VN, Asia/Ho_Chi_Minh |
| MOD-WEB-26 | `web/ai-gateway/src/{server.ts, auth-service.ts, routes/internal/{llm.ts, image.ts, audio.ts}}` | EP-WEB-40…42; xác thực token dịch vụ |
| MOD-WEB-27 | `web/ai-gateway/src/providers/{anthropic.ts, gemini.ts, elevenlabs.ts}` | Bọc SDK, chuẩn hoá `usage`, lọc lỗi nhà cung cấp |
| MOD-WEB-28 | `web/ai-gateway/src/{pricing.ts, ratelimit.ts, usage.ts, quota.ts, config-cache.ts}` | Tính chi phí, `rate_buckets`, ghi `usage_records`/`llm_calls`, đọc `ai_config` |
| MOD-WEB-29 | `web/worker/src/{main.ts, doctor.ts, heartbeat.ts, handlers/{build, qa, bake, asset, publish, export, import, purge}.ts}` | Nhận job pg-boss, nhịp `worker_status` |
| MOD-WEB-30 | `web/worker/src/{sandbox.ts, workdir.ts, progress.ts, commands.ts}` | `execFile` danh sách lệnh cố định, thư mục tạm, đọc tiến độ JSON (PSC-WEB-03) |
| MOD-WEB-31 | `web/deploy/{compose.yaml, compose.studio-test.yaml, Caddyfile, Dockerfile.node, Dockerfile.worker, egress/squid.conf}` | Triển khai (mục 10) |
| MOD-WEB-32 | `web/deploy/backup/{pg-dump.sh, restic-objects.sh, restore-drill.md}` | Sao lưu/khôi phục (SEQ-WEB-06) |
| MOD-WEB-33 | `web/api/src/cron.ts` | Lịch pg-boss: `purge.games` 02:00, `cleanup.builds`, `cleanup.outbox`, `cleanup.notifications`, `dlg.purge` |
| MOD-WEB-34 | `web/api/src/services/{admin-overview.ts, admin-system.ts, moderation.ts, announcements.ts, owner-transfer.ts}` | Nghiệp vụ quản trị mở rộng SRS-08 v1.1 (PSC-WEB-16…18) |
| MOD-WEB-35 | `web/api/src/routes/{status.ts, import.ts, upgrade.ts}`, `web/api/src/services/{status-sources-db.ts, status-cache.ts, stale-plan.ts, import-checks.ts, upgrade-candidates.ts, link-retarget.ts}` | CR-01: EP-WEB-52…56; `StatusSources` từ CSDL + kho đối tượng, đệm `game_status_cache` (PSC-WEB-19…23) |
| MOD-WEB-36 | `web/worker/src/handlers/{upgrade.ts, import-check.ts}`, `handlers/build.ts` (nhánh `stale`), `handlers/publish.ts` (nhánh `changes`) | Job `upgrade` khe nặng (`engine upgrade --no-apply --json`), job nhẹ kiểm nhập (`engine import --json` trên bản tạm) |
| MOD-WEB-37 | `web/app/src/features/progress/{progress-panel.tsx, stage-bar.tsx, pending-list.tsx, stale-build-dialog.tsx}`, `features/library/{stage-badge.tsx, filter-dang-do.ts}`, `features/import/{import-wizard.tsx, import-report.tsx, import-diff.tsx}`, `features/upgrade/upgrade-review.tsx`, `features/share/link-mode.tsx` | SCR-WEB-19 panel Tiến độ, huy hiệu/bộ lọc thư viện, màn nhập game, duyệt nâng cấp, chế độ link (TSD-08 mục 3.7) |

Luật phụ thuộc (DDD-00 `.dependency-cruiser.cjs`): `web/app` chỉ tới `web/shared`, `@gamestudio/engine`, `@gamestudio/schema`; `web/api` không tới `@anthropic-ai/sdk`; `web/worker` không tới `web/api`.

---

## 3. Thiết kế lớp và giao diện

### 3.1 Khung `web/api`
Thứ tự plugin: `request-id` → `errors` → `helmet`-tương đương (header phụ, phần chính ở Caddy) → `rate-limit` → `csrf` (phương thức ghi) → `auth` (đặt `req.user` hoặc để trống) → `permission` (`preHandler`) → `quota` (khi route khai báo) → `idempotency` (khi có header) → route.

```ts
// web/api/src/plugins/permission.ts
declare module 'fastify' {
  interface FastifyContextConfig { action: Action | 'public' | 'authenticated'; gameParam?: string; quota?: QuotaKind; audit?: AuditAction }
  interface FastifyRequest { user?: SessionUser; game?: GameRow; perm?: GamePerm | null }
}
export const permissionPlugin: FastifyPluginAsync;   // onRoute: thiếu config.action → throw khi khởi động

// web/shared/src/permissions.ts  (SCH-WEB-10)
export type SysRole = 'admin' | 'creator' | 'viewer';
export type GamePerm = 'chu' | 'sua' | 'xem';
export type Action = 'game.view' | 'game.play_preview' | 'game.edit' | 'game.brief_confirm' | 'game.style_approve'
  | 'asset.review' | 'job.create' | 'job.cancel' | 'baseline.accept' | 'game.publish' | 'link.manage' | 'game.share'
  | 'game.duplicate' | 'game.archive' | 'game.delete' | 'game.export' | 'game.create' | 'game.import'
  | 'admin.users' | 'admin.quotas' | 'admin.usage' | 'admin.config'
  | 'admin.overview' | 'admin.jobs' | 'admin.audit' | 'admin.moderation' | 'admin.announce'   // v0.2 (SRS-08 v1.1)
  | 'game.status' | 'game.build_stale' | 'game.upgrade' | 'game.import_into' | 'link.retarget';  // v0.3 (CR-01): Xem; Sửa+khoá ×3; chủ game
export const MATRIX: Record<SysRole, Record<GamePerm | 'none', ReadonlySet<Action>>>;
export function can(role: SysRole, perm: GamePerm | null, a: Action, gameStatus?: GameStatus): boolean;

// web/api/src/services/versions.ts
export interface WriteDataInput { gameId: string; userId: string; sessionId: string; baseVersion: number;
  patch: JsonPatchOp[]; source: 'chat' | 'editor' | 'json' | 'restore' | 'import'; summary: string }
export interface WriteDataResult { version: number; dataHash: string; merged: boolean; impact: Impact; warnings: BudgetWarning[] }
export async function writeData(tx: Tx, i: WriteDataInput): Promise<WriteDataResult>;          // PSC-WEB-04
export async function readVersion(gameId: string, n?: number): Promise<{ n: number; data: GameData }>;   // PSC-WEB-07
export async function diffVersions(gameId: string, a: number, b: number): Promise<ObjectDiff[]>;
export async function restore(gameId: string, n: number, userId: string): Promise<number>;

// web/api/src/services/locks.ts  (PSC-WEB-06)
export async function acquire(gameId: string, user: SessionUser): Promise<LockState>;   // ERR-WEB-06 khi người khác giữ
export async function heartbeat(gameId: string, sessionId: string): Promise<void>;
export async function release(gameId: string, sessionId: string): Promise<void>;
export async function takeover(gameId: string, owner: SessionUser): Promise<LockState>;
export function assertHeld(tx: Tx, gameId: string, sessionId: string): Promise<void>;

// web/api/src/services/jobs.ts  (PSC-WEB-03)
export async function createJob(u: SessionUser, gameId: string, req: CreateJobReq): Promise<JobRow>;
export async function cancelJob(jobId: string, u: SessionUser): Promise<void>;

// web/api/src/services/object-store.ts
export interface ObjectStore {
  putFile(key: ObjectKey, src: string | Readable, o?: { contentType?: string }): Promise<{ bytes: number; sha256: string }>;
  getStream(key: ObjectKey): Promise<Readable>; exists(key: ObjectKey): Promise<boolean>;
  putContentAddressed(buf: Buffer, ext: string): Promise<ObjectKey>;   // private/data/<sha256>.<ext>
  remove(prefix: ObjectKey): Promise<void>; sizeOf(prefix: ObjectKey): Promise<number>;
}
export type ObjectKey = `private/${string}` | `public/${string}`;    // chặn '..', đường dẫn tuyệt đối
```

### 3.2 `web/ai-gateway`

```ts
// routes/internal/llm.ts  (EP-WEB-40)
export interface LlmCallReq { task: AiTask; userId?: string; gameId?: string; system?: string | TextBlock[];
  messages: MessageParam[]; schema?: JsonSchema; maxTokens?: number; tools?: ToolDef[] }
export interface LlmCallRes { output: unknown; text?: string; stopReason: string; usage: Usage; costUsd: number; model: string; usageId: string }
// providers/anthropic.ts
export async function callClaude(cfg: AiConfigRow, req: LlmCallReq, signal: AbortSignal): Promise<ProviderResult>;
// model = cfg.model; output_config = {effort: cfg.effort, format: schema ? {type:'json_schema', schema} : undefined}
// quota.ts
export async function preCheck(kind: 'ai', userId: string | undefined, gameOwnerId?: string): Promise<void>;  // 429 ERR-WEB-05
```

### 3.3 `web/worker`

```ts
export interface JobPayload { jobId: string; gameId: string; type: JobType; params: JobParams; dataVersion: number;
  snapshotRef: ObjectKey; requestedBy: string; attempt: number }               // IF-WEB-04
export type JobOutcome = 'ok' | 'fail_data' | 'fail_env' | 'cancelled';
export const COMMANDS: Record<JobType, (p: JobParams) => string[]>;            // mảng argv cố định, không chuỗi shell
export async function runEngine(argv: string[], cwd: string, onLine: (j: CliProgressLine) => void, signal: AbortSignal): Promise<number>;
```

### 3.4 `web/app`

```ts
// editor/store.ts  (DTO-WEB-08)
export interface EditorState {
  gameId: string; baseVersion: number; doc: GameData; pending: JsonPatchOp[]; undo: OpGroup[]; redo: OpGroup[];
  selection: { objectId: string; pointer: string } | null; lock: LockView; needsBuild: Set<string> /*pointer*/;
  apply(group: OpGroup): void;            // áp doc cục bộ ≤ 100 ms, đẩy undo (≤ 100), xoá redo, hẹn autosave
  undoOnce(): void; redoOnce(): void;
  onServerVersion(e: DataVersionEvt): void;
  flush(force?: boolean): Promise<void>;  // PATCH pending ngay (cướp khoá, đóng tab)
}
export interface OpGroup { ops: JsonPatchOp[]; inverse: JsonPatchOp[]; label: string; at: number }

// preview/editor-bridge.ts  (IF-WEB-05)
export interface EditorBridge {
  load(manifestUrl: string, o: { zone: string; tier: Tier; mode: 'free' | 'player' | 'qa_view'; viewId?: string }): Promise<void>;
  applyRuntimePatch(ops: JsonPatchOp[]): Promise<void>;
  setCamera(m: 'free' | 'player' | { viewId: string }): void; setTimeOfDay(h: number): void; simulateTier(t: Tier): void;
  pick(x: number, y: number): Promise<{ objectId: string; pointer: string } | null>; highlight(objectId: string | null): void;  // CR-02: kết quả về qua gs:pick
  setGizmo(kind: 'move' | 'rotate' | 'scale' | null, snap: { ground: boolean; grid: 0 | 0.5 | 1 | 5 }): void;
  on(e: 'gizmoChange', cb: (pointer: string, value: unknown) => void): () => void;
  stats(): Promise<{ fps: number; drawCalls: number; tris: number; gpuMemMB: number; wasmHeapMB: number }>;  // CR-02: từ PerfMonitor qua gs:stats
  showProxy(pointer: string, pos: Vec3): void;          // vật đặt chờ build
  combat?: { applyBalance(rows: BalanceRow[]): void; simulateHit(a: string, w: string, t: string): { dmg: number; hits: number } };
  dispose(): void;
}
export async function createBridge(canvas: HTMLCanvasElement, engineVersion: string,
  onProgress?: (p: { phase: 'player' | 'manifest' | 'zone'; loaded: number; total: number }) => void): Promise<EditorBridge>;
// CR-02: kiểm WebGL2 trước (không có → ERR-RTM-01, không tải player); nạp /engine/<v>/Build/gs.loader.js rồi
// createUnityInstance(canvas, {dataUrl, frameworkUrl, codeUrl /*.br*/, streamingAssetsUrl}, onPlayerProgress);
// SendMessage('GameStudio','Boot', {manifestUrl, mode:'preview', liveRuntimeData:true}); mọi phương thức trên → SendMessage('GameStudio', <tên>, json);
// pick/stats trả về qua sự kiện gs:pick, gs:stats (gs-bridge.jslib) nên bản thật là Promise; dispose() → unityInstance.Quit().
// Player giữ lại khi đổi game hoặc build (chỉ Boot lại), vì nạp player mất 3,8–9,1 s trên A56 (POC-U1).
```

Panel chuyên biệt đăng ký vào `panel-registry.ts`: `{id, title, icon, when: (doc) => boolean, component, pointers: string[]}` — ví dụ `combat-balance` chỉ khi `features.combat.enabled || hunting.enabled` (DDD-06).

---

## 4. Dữ liệu

### 4.1 DTO

| Mã | Cấu trúc | Đặc tả |
|---|---|---|
| DTO-WEB-01 | `ApiError` | `{error: {code: 'ERR-…', message: string /*vi*/, params?: object, field?: string /*instancePath*/, requestId}}` |
| DTO-WEB-02 | `Page<T>` | `{items: T[], next?: string /*ULID con trỏ*/}`; truy vấn `?before=<ulid>&limit=1..100` (mặc định 50) |
| DTO-WEB-03 | `Me` | `{id, email, name, role, quota: {aiUsdPerDay, aiUsedToday, concurrentJobs, storageGb, storageUsedGb, maxGames, games}}` |
| DTO-WEB-04 | `GameSummary` / `GameDetail` | `{id, name, status, ownerId, myPerm, currentVersion, thumbUrl?, updatedAt, features}`; chi tiết thêm `{lock: LockView, latestBuild?: {buildId, manifestUrl, engineVersion}, briefVersion, styleApproved}` |
| DTO-WEB-05 | `CreateJobReq` / `JobView` | `{type, zone?, tier?, steps?: StepId[], force?: bool, skipBake?: bool}`; `{id, type, status, progress: {steps: [{id, status, pct}], etaS}, result?, estimateS, createdAt, startedAt?, finishedAt?, cacheHits, reportRefs}` |
| DTO-WEB-06 | Sự kiện SSE | `job.progress {jobId, step, status, pct, etaS}`, `job.done {jobId, result, reportRefs}`, `data.version {gameId, version, author, source, impact: {runtimeOnly, buildSteps, zones}, ops?}` (`ops` chỉ khi `runtimeOnly` và ≤ 64 KB), `lock.changed {gameId, holder?: {userId, name}}`, `proposal.created {proposalId}`, `asset.pending {assetId}`, `notify {id, kind}`, `quota.warn {kind, pct}`; mỗi sự kiện có `id` = id `events_outbox` |
| DTO-WEB-07 | `PatchDataReq` / `PatchDataRes` | `{baseVersion, patch: JsonPatchOp[] (≤ 2.000 op), source, summary ≤ 200}` → `{version, dataHash, merged, impact, warnings: [{kind:'budget', zone, metric, value, limit}]}` |
| DTO-WEB-08 | Store editor | Mục 3.4 `EditorState` |
| DTO-WEB-09 | `ObjectDiff` | `{file, zone?, objectId?, pointer, kind: 'add' \| 'remove' \| 'change', fields?: string[]}` |
| DTO-WEB-10 | `manifest-goi.json` | `{formatVersion: 1, gameId, dataVersion, dataHash, engineVersion, assets: [{id, version, sha256}], createdAt}` |
| DTO-WEB-11 | `PerfSample` | `{route, tier, device: {ua, w, h, dpr}, fps: {p50, p5}, frameMsP95, drawCalls, tris, gpuMemMB?, loadMs, at}` (DDD-04) |
| DTO-WEB-12 | Token JWT | `preview {aud:'preview', gameId, buildId, exp: +24 h}`, `perf {aud:'perf', gameId, buildId, exp: +24 h}`; `kid` theo `JWT_KEYS_FILE` (DDD-00) |
| DTO-WEB-13 | `AdminOverview` | `{kpi: {activeUsers7d, jobs24h: {ok, fail, running, waiting}, aiUsdToday, aiUsd7d, storagePct, apiP95Ms}, alerts: [{kind: 'worker_down'\|'job_fail_env'\|'quota_high'\|'backup_late'\|'storage_high'\|'link_open_long', severity: 'error'\|'warn'\|'info', params, link}], at}` (FR-WEB-51) |
| DTO-WEB-14 | `Announcement` | `{id, text ≤ 200, level: 'ThongTin'\|'CanhBao', showFrom, showUntil, createdBy, createdAt}`; SSE `announce {id}` trên kênh `global` (FR-WEB-58) |
| DTO-WEB-15 | `AdminSystem` | `{workers: WorkerStatus[], jobs: {byStatus, avgDurationSByType7d}, storage: {totalBytes, capacityBytes, byOwner[]}, backup: {dbAt, objectsAt, drillAt}, apiP95Ms}` (FR-WEB-48) |
| DTO-WEB-16 | `StatusView` (API-WEB-83) | `status/1` (DDD-00 DTO-GEN-08) + `{cached: boolean, computedAt, unpublishedChanges?: {n, sincePublicationN}}` (MSG-WEB-06); thư viện dùng bản rút gọn `{gameId, stage, pendingCount}` từ `game_status_cache` |
| DTO-WEB-17 | `ImportValidateRes` (API-WEB-84) | `{importToken /*hiện một lần, base64url 16 byte*/, expiresAt, report: ImportReport /*DDD-04 DTO-CLI-06*/, gameIdExists: boolean}`; `ImportIntoRes = {diff: VersionDiff /*DTO-WEB-09*/, confirmToken}` → gọi lại với `{importToken, baseVersion, confirm: true}` |
| DTO-WEB-18 | `UpgradeCandidateView` | `{jobId, gameId, baseVersion, from: {engineVersion, schemaVersion}, to: {…}, report: UpgradeReport /*DDD-04 DTO-CLI-07*/, images: {view, beforeUrl, afterUrl, diffPct}[], status: 'cho'\|'chap_nhan'\|'bo'}` |

### 4.2 Bảng CSDL

| Mã | Bảng | Cột (kiểu, ràng buộc) | Chỉ mục / ghi chú |
|---|---|---|---|
| TBL-WEB-01 | `users` | `id text PK`, `email citext unique not null`, `name text`, `role text check in (admin,creator,viewer)`, `status text check in (HoatDong,BiKhoa) default HoatDong`, `created_at`, `last_login_at` | — |
| TBL-WEB-02 | `invitations` | `id PK`, `email citext not null`, `role`, `quota_init jsonb`, `invited_by text FK users`, `status check in (ChuaDung,DaDung,DaHuy)`, `created_at` | unique partial `(email) WHERE status='ChuaDung'` |
| TBL-WEB-03 | `sessions` | `id_hash bytea PK` (SHA-256), `user_id FK`, `created_at`, `last_seen_at`, `expires_at`, `ip inet`, `ua text`, `revoked_at null` | `(user_id)`; `last_seen_at` ghi tối đa 1 lần/phút |
| TBL-WEB-04 | `games` | `id PK`, `name text ≤ 80`, `owner_id FK users`, `status check in (DangLam,LuuTru,DaXoa)`, `deleted_at null`, `current_version int`, `thumb_ref text`, `features jsonb`, `created_at`, `updated_at` | `(owner_id, status)` |
| TBL-WEB-05 | `game_versions` | `game_id FK`, `n int`, `author_id`, `at`, `source check in (chat,editor,json,restore,import,upgrade)` (v0.3 thêm `upgrade`), `summary`, `data_hash bytea`, `name text null`, `starred bool`, `prev_n int`, `kind check in (full,patch)`, `blob_ref text null`, `patch jsonb null`, `patch_bytes int` | PK `(game_id, n)`; trigger `deny_update` trừ `name`, `starred`, và `patch` khi gộp mốc (cột `merge_open bool`) |
| TBL-WEB-06 | `game_heads` | `game_id PK FK`, `version int`, `data jsonb`, `data_hash bytea`, `bytes int` | Đọc nhanh bản mới nhất |
| TBL-WEB-07 | `game_members` | `game_id FK`, `user_id FK`, `perm check in (chu,sua,xem)`, `added_by`, `added_at` | PK `(game_id, user_id)`; unique partial `(game_id) WHERE perm='chu'`; `(user_id)` |
| TBL-WEB-08 | `edit_locks` | `game_id PK`, `user_id`, `session_id bytea`, `acquired_at`, `heartbeat_at`, `last_activity_at`, `grace_session_id bytea null`, `grace_until null` | Ân hạn 10 s sau cướp khoá |
| TBL-WEB-09 | `intake_sessions` | `id PK`, `owner_id`, `game_id null`, `status`, `analysis jsonb`, `questions jsonb`, `answers jsonb`, `images jsonb` (`[{ref, bytes}]`), `created_at`, `updated_at` | DDD-01 DTO-INT-01…04 |
| TBL-WEB-10 | `brief_versions` | `game_id`, `n int`, `brief jsonb`, `brief_md text`, `status check in (ChoXacNhan,DaXacNhan,ThayThe)`, `confirmed_by null`, `confirmed_at null` | PK `(game_id, n)` |
| TBL-WEB-11 | `change_proposals` | `id PK`, `game_id`, `author_kind check in (ai,user)`, `base_version`, `ops jsonb`, `summary`, `status` (SRS-01 mục 6.4), `decided_by`, `decided_at`, `applied_version null`, `major bool` | `(game_id, created_at desc)` |
| TBL-WEB-12 | `chat_messages` | `id PK`, `game_id`, `author_id null`, `kind check in (user,ai,proposal,job,system)`, `body text`, `ref_id null`, `created_at`, `tsv tsvector generated (to_tsvector('simple', unaccent(body)))` | `(game_id, id desc)`; GIN `(tsv)` |
| TBL-WEB-13 | `jobs` | `id PK`, `game_id`, `type check in (build,qa,bake,asset,publish,export,import,purge,upgrade)` (v0.3 thêm `upgrade`; `import` có `params.mode in (check,apply)`; `build` có `params.stale`), `params jsonb`, `status check in (Cho,DangChay,Xong,Loi,DaHuy)`, `result check in (ok,fail_data,fail_env,cancelled) null`, `progress jsonb`, `requested_by`, `worker_id null`, `attempt int`, `estimate_s int`, `data_version int`, `cache_hits int`, `boss_id uuid`, `created_at`, `started_at`, `finished_at` | `(game_id, created_at desc)`, `(requested_by) WHERE status in ('Cho','DangChay')` |
| TBL-WEB-14 | `job_reports` | `job_id FK`, `step text`, `report jsonb` (`report/1`) | PK `(job_id, step)` |
| TBL-WEB-15 | `events_outbox` | `id bigserial PK`, `channel text` (`game:<id>`, `user:<id>`, `job:<id>`), `payload jsonb`, `at` | `(channel, id)`; xoá > 1 giờ |
| TBL-WEB-16 | `worker_status` | `worker_id PK`, `host`, `doctor jsonb`, `ready bool`, `slots jsonb`, `heartbeat_at`, `version` | Quá 90 s không nhịp → coi như chết |
| TBL-WEB-17 | `publications` | `id PK`, `public_id text unique` (ULID dùng trong URL), `game_id`, `n int`, `data_version`, `publish_json jsonb`, `not_met bool`, `has_dialogue_ai bool`, `url`, `created_by`, `created_at`, `taken_down_at null`, `taken_down_by null`, `takedown_reason text null` (v0.2), `previous_id FK publications null`, `changes jsonb not null default '[]'` (≤ 200 mục, `changes_more int`) (v0.3) | unique `(game_id, n)`; `(game_id, n desc) WHERE taken_down_at IS NULL AND not_met = false` cho link `moiNhat` |
| TBL-WEB-18 | `share_links` | `id PK`, `publication_id FK`, `token_hash bytea unique`, `token_hint char(4)`, `expires_at null`, `require_login bool`, `created_by`, `created_at`, `revoked_at null`, `revoked_by null`, `revoke_reason text null` (v0.2), `last_used_at`, `mode check in (coDinh,moiNhat) default 'coDinh'`, `game_id` (v0.3, để chuyển mọi link của game) | `(game_id, mode)` |
| TBL-WEB-19 | `quotas` | `user_id PK`, `ai_usd_per_day numeric default 5`, `concurrent_jobs int default 2`, `storage_gb int default 20`, `max_games int default 20`, `updated_by`, `updated_at` | Hàng `user_id='*'` = mặc định hệ thống |
| TBL-WEB-20 | `game_quotas` | `game_id PK`, `dialogue_usd_day numeric default 0`, `dialogue_debug bool default false` | DDD-07 |
| TBL-WEB-21 | `usage_records` | `id PK`, `at`, `day date` (Asia/Ho_Chi_Minh), `user_id null`, `game_id null`, `publication_id null`, `task`, `service check in (anthropic,gemini,elevenlabs)`, `model`, `in_tokens`, `out_tokens`, `cache_read_tokens`, `cache_write_tokens`, `units numeric null`, `cost_usd numeric(12,6)` | `(user_id, day)`, `(game_id, day)`, `(day, task)` |
| TBL-WEB-22 | `llm_calls` | `usage_id PK FK`, `prompt_hash bytea`, `prompt_excerpt text ≤ 500`, `stop_reason`, `latency_ms`, `request_id` | DDD-01 SCH-INT-07 |
| TBL-WEB-23 | `rate_buckets` | `key text PK`, `tokens real`, `updated_at` | DDD-07 PSC-DLG-03; khoá `llm:u:<userId>:<task>`, `dlg:*` |
| TBL-WEB-24 | `ai_config` | `task PK` (intake, proposal, chat_qa, dialogue_draft, dialogue_runtime, dialogue_test, dialogue_qa, image, audio, voice), `provider`, `model`, `effort null`, `max_tokens`, `price_in`, `price_out`, `price_cache_read`, `price_cache_write`, `price_unit null`, `rpm int`, `enabled bool`, `extra jsonb` (vd. `dlg` của DDD-07), `updated_by`, `updated_at` | Không có cột khoá; `configured` tính lúc chạy |
| TBL-WEB-25 | `cc0_sources` | `domain text PK` (FQDN), `name`, `license_note`, `enabled`, `added_by`, `added_at` | DDD-03 |
| TBL-WEB-26 | `audit_log` | `id PK`, `at`, `user_id null`, `action`, `object_type`, `object_id`, `before jsonb null`, `after jsonb null`, `ip inet`, `request_id` | `(at desc)`, `(object_type, object_id)`; `gs_api` chỉ `INSERT`; job xoá > 1 năm chạy vai `gs_migrate` |
| TBL-WEB-27 | `notifications` | `id PK`, `user_id`, `kind`, `game_id null`, `payload jsonb`, `count int default 1`, `read_at null`, `created_at`, `group_key text` | `(user_id, created_at desc)`; unique partial `(user_id, group_key) WHERE read_at IS NULL AND created_at > now()-5 phút` thực hiện bằng upsert ứng dụng |
| TBL-WEB-28 | `idempotency_keys` | `key text`, `user_id`, `route`, `status int`, `response jsonb`, `created_at` | PK `(user_id, key)`; xoá > 24 giờ |
| TBL-WEB-29 | `storage_usage` | `game_id PK`, `owner_id`, `bytes bigint`, `updated_at` | Cập nhật sau mỗi job |
| TBL-WEB-30 | `perf_samples` | `id PK`, `game_id`, `build_id`, `sample jsonb` (DTO-WEB-11), `at` | `(game_id, at desc)` |
| TBL-WEB-31 | `style_bibles` | `game_id`, `n int`, `bundle_ref` (ObjectKey), `status check in (ChoDuyet,DaDuyet,ThayThe)`, `approved_by`, `approved_at` | PK `(game_id, n)`; DDD-01 DTO-INT-12 |
| TBL-WEB-32 | `announcements` | `id PK`, `text varchar(200) not null`, `level check in (ThongTin,CanhBao)`, `show_from timestamptz`, `show_until timestamptz`, `created_by FK users`, `created_at`, `deleted_at null` | `(show_from, show_until)`; v0.2 |
| TBL-WEB-33 | `ops_heartbeats` | `key text PK` (`backup.db`, `backup.objects`, `restore.drill`), `at timestamptz`, `ok bool`, `note text` | Job `backup` và biên bản diễn tập ghi; v0.2 |
| TBL-WEB-34 | `import_checks` | `id PK`, `token_hash bytea unique` (SHA-256 của `importToken`), `uploaded_by FK users`, `tmp_ref text` (`private/tmp/imports/<id>.zip`), `report jsonb` (`import/1`), `game_id_in_package text`, `into_game_id null`, `expires_at` (+24 giờ), `used_at null`, `created_at` | `(expires_at)`; dọn hằng giờ; v0.3 |
| TBL-WEB-35 | `upgrade_candidates` | `job_id PK FK jobs`, `game_id`, `base_version int`, `from_versions jsonb`, `to_versions jsonb`, `candidate_ref text` (snapshot ứng viên `private/upgrades/<gameId>/<jobId>/`), `report jsonb`, `status check in (cho,chap_nhan,bo)`, `decided_by null`, `decided_at null` | `(game_id) WHERE status = 'cho'` (tối đa 1 ứng viên chờ/game: mới tạo → cũ thành `bo`); v0.3 |
| TBL-WEB-36 | `game_status_cache` | `game_id PK`, `data_version int`, `cache_etag text`, `max_job_updated_at`, `max_proposal_updated_at`, `stage text`, `flags jsonb`, `report jsonb`, `computed_at` | Chỉ là đệm (QT-WEB-11): xoá hàng = tính lại; v0.3 |

Bảng của nhóm khác cùng lược đồ: `assets`, `asset_reviews`, `asset_usages` (DDD-03 TBL-AST-01…03), `dialogue_turns`, `dialogue_cache` (DDD-07 TBL-DLG-01, 02).

Bố trí kho đối tượng (SCH-WEB-08): `/srv/gs-objects/private/{data/<sha256>.json.zst, builds/<gameId>/<buildId>/, assets/<id>/<version>/, exports/<jobId>.zip, uploads/<uploadId>/, cache/<gameId>/, dialogue/<publicationId>.json, intake/<sessionId>/}`, `public/{engine/<semver>/, play/<publicationId>/}`. Mọi khoá đi qua `ObjectStore` (MOD-WEB-17), kiểm tiền tố và không cho `..`.

---

## 5. API / giao thức

Quy ước (IF-WEB-01): mọi route dưới `/api`, JSON UTF-8, thân ≤ 1 MB (trừ ghi rõ), lỗi DTO-WEB-01, `x-request-id` (ULID), phân trang DTO-WEB-02, `Idempotency-Key` tuỳ chọn cho POST. Bảng ánh xạ quyền/hạn mức/kiểm toán (IF-WEB-06) là cột "Quyền" dưới đây, khai báo trong `config` của route.

| Mã | Phương thức, đường dẫn (API SRS) | Quyền · hạn mức · kiểm toán | Yêu cầu → phản hồi |
|---|---|---|---|
| EP-WEB-01 | `GET /api/auth/google/start`, `GET /api/auth/google/callback` (API-WEB-01) | public · IP 30/phút · `login`, `login_denied` | start → 302 Google (PKCE, `state`, `nonce` cookie `gs_oidc` 10 phút); callback → 302 `/` + `Set-Cookie gs_sid`; lỗi → 302 `/login?err=ERR-WEB-01\|02` |
| EP-WEB-02 | `POST /api/auth/logout` (API-WEB-02) | authenticated | → 204, xoá cookie, `revoked_at` |
| EP-WEB-03 | `GET /api/me` (API-WEB-03) | authenticated | → `Me` (DTO-WEB-03) |
| EP-WEB-04 | `POST /api/intake` (API-WEB-10) | `game.create` · AI | `multipart`: `text` ≤ 8.000 ký tự, `images[]` ≤ 5 × 10 MB (png/jpg/webp) → `{sessionId, analysis, questions}` (DDD-01 DTO-INT-01, 03) |
| EP-WEB-05 | `POST /api/intake/{id}/answers` (API-WEB-11) | chủ phiên · AI | `{answers: Answers \| null, useDefaults?: bool}` → `{status, questions?, brief?}` |
| EP-WEB-06 | `POST /api/intake/{id}/confirm` (API-WEB-12) | chủ phiên · số game · `game_create` | `{briefVersion}` → 201 `{gameId, version: 1, fastJobId}` (job đường nhanh PSC-WEB-03 bước 5) |
| EP-WEB-07 | `PUT /api/games/{id}/brief`, `POST /api/games/{id}/brief/confirm` (API-WEB-13) | `game.brief_confirm` · AI khi sinh lại | `{brief}` → `{n, status:'ChoXacNhan'}`; confirm `{n}` → `{n, appliedVersion}` |
| EP-WEB-08 | `POST /api/games/{id}/style/approve` (API-WEB-14) | `game.style_approve` | `{n}` → `{n, status:'DaDuyet'}` |
| EP-WEB-09 | `GET /api/games?filter=mine\|shared\|archived\|trash`; `PATCH /api/games/{id}`; `POST /api/games/{id}/duplicate`; `DELETE /api/games/{id}` (API-WEB-15) | `game.view` / `game.archive` / `game.duplicate` (số game) / `game.delete` (`game_delete`) | `Page<GameSummary>`; PATCH `{name?, status?: 'DangLam'\|'LuuTru'}`; duplicate → 201 `{gameId}`; DELETE → 202 `{deletedAt, purgeAt}`; `POST …/restore` khôi phục từ thùng rác |
| EP-WEB-10 | `POST /api/games/{id}/chat` (API-WEB-20) | `game.edit` (câu hỏi: `game.view`) · AI | `{text ≤ 4.000}` → `{message: ChatMessage, reply: {kind:'answer', text} \| {kind:'proposal', proposalId}}` |
| EP-WEB-11 | `GET /api/games/{id}/chat?before=&q=` (API-WEB-21) | `game.view` | `Page<ChatMessage>`; `q` tìm qua `tsv` |
| EP-WEB-12 | `POST /api/proposals/{id}/decision` (API-WEB-22) | `game.edit` + giữ khoá | `{decision: 'approve'\|'partial'\|'reject', opIds?: string[]}` → `{status, appliedVersion?, briefVersion?}`; 409 khi `baseVersion` cũ (ERR-INT-07) |
| EP-WEB-13 | `GET /api/games/{id}/data?version=` (API-WEB-23) | `game.view` | → `{version, dataHash, data}`; `ETag: "<dataHash>"`, hỗ trợ `If-None-Match` |
| EP-WEB-14 | `PATCH /api/games/{id}/data` (API-WEB-24) | `game.edit` + giữ khoá | `PatchDataReq` → `PatchDataRes` (DTO-WEB-07); 409 ERR-WEB-07 `{latestVersion}`; 422 ERR-WEB-08 `{field}`; 423 ERR-WEB-06 |
| EP-WEB-15 | `POST /api/games/{id}/lock`, `DELETE …/lock`, `POST …/lock/takeover` (API-WEB-25) | `game.edit`; takeover: `chu` · `lock_takeover` | → `LockView {holder?, mine, expiresAt}`; 423 khi người khác giữ |
| EP-WEB-16 | `POST /api/games/{id}/jobs` (API-WEB-30) | `job.create` · job đồng thời (`stale` cần `game.build_stale`) | `CreateJobReq` → 202 `JobView`; worker chưa sẵn → 202 + `warning: ERR-WEB-11`. v0.3: `{type:'build', dryRun: true}` → 200 `{steps: [{step, zone, tier, reason}], estimateMinutes}` không tạo job (PSC-WEB-20); `{type:'build', stale: true}` → job `params.stale` |
| EP-WEB-17 | `GET /api/jobs/{id}`, `GET /api/jobs/{id}/events` (API-WEB-31) | `game.view` | `JobView`; SSE chỉ `job.*` của job đó |
| EP-WEB-18 | `POST /api/jobs/{id}/cancel` (API-WEB-32) | `job.cancel` | → 202 `{status}` |
| EP-WEB-19 | `GET /api/jobs/{id}/reports` (API-WEB-33) | `game.view` | → `[{step, report}]`; ảnh QA qua `private/builds` + `forward_auth` |
| EP-WEB-20 | `POST /api/games/{id}/baseline/accept` (API-WEB-34) | `baseline.accept` | `{jobId, views?: string[]}` → 202 job `qa --accept-baseline` (DDD-04) |
| EP-WEB-21 | `GET /api/assets?q=&kind=&tag=&source=&license=&status=` (API-WEB-40) | authenticated | `Page<AssetView>` (DDD-03) |
| EP-WEB-22 | `POST /api/assets/import` (API-WEB-41) | `game.edit` game đích · dung lượng | `{url, kind?, gameId, realSize?, family?}` → 202 `{jobId}` (job `asset`, DDD-03 EP-AST-01) |
| EP-WEB-23 | `POST /api/assets/forge` (API-WEB-42) | `game.edit` · AI | `{gameId, recipe, variants?, confirmCost?: bool}` → 202 `{jobId, estimateUsd}` |
| EP-WEB-24 | `POST /api/assets/{id}/review` (API-WEB-43) | `asset.review` | `{decision: 'approve'\|'reject', reason?, scope?: 'one'\|'batch'}` → `{status, round}` |
| EP-WEB-25 | `POST /api/assets/{id}/deprecate` (API-WEB-44) | admin hoặc chủ game sở hữu · `asset_deprecate` | `{replacementId?}` → `{status:'NgungDung', affectedGames}` |
| EP-WEB-26 | `GET /api/games/{id}/versions`, `GET …/versions/{a}/diff/{b}`, `POST …/versions/{n}/restore`, `PATCH …/versions/{n}` (API-WEB-45) | `game.view` / `game.edit` | `Page<VersionView>`; `ObjectDiff[]`; restore → `{version}`; PATCH `{name?, starred?}` |
| EP-WEB-27 | `POST /api/games/{id}/export`, `POST /api/games/import`, `POST /api/uploads`, `PUT /api/uploads/{id}/parts/{k}`, `POST /api/uploads/{id}/complete` (API-WEB-46) | `game.export` / `game.import` · dung lượng, số game | export → 202 `{jobId}`; tải lên theo phần 8 MB/phần, ≤ 2 GB (ERR-WEB-12); import `{uploadId}` → 202 `{jobId}` |
| EP-WEB-28 | `PUT /api/games/{id}/members` (API-WEB-50) | `game.share` · `member_change` | `{members: [{userId, perm: 'sua'\|'xem'\|null}]}` → danh sách mới; `null` = thu hồi |
| EP-WEB-29 | `POST /api/games/{id}/publish` (API-WEB-51) | `game.publish` · `publish` | `{dataVersion?, acceptNotMet?: bool}` → 202 `{jobId}`; job xong với `notMet` và chưa `acceptNotMet` → chờ xác nhận `POST /api/publications/{id}/confirm` |
| EP-WEB-30 | `POST /api/publications/{id}/links`, `DELETE /api/links/{id}`, `GET /api/publications/{id}/links` (API-WEB-52) | `link.manage` · `link_create`, `link_revoke` | `{ttlDays: 1\|7\|30\|null, requireLogin}` → 201 `{id, url /*chỉ trả một lần*/, tokenHint, expiresAt}` |
| EP-WEB-31 | `GET /p/{linkToken}` (API-WEB-53) | theo link · IP 30/phút | 200 HTML trang chơi (`<base href="/play/<publicationId>/">`, meta `gs-publish-id`); 410 SCR-WEB-14 (ERR-WEB-09); `requireLogin` không phiên → 302 đăng nhập |
| EP-WEB-32 | `POST /api/perf-samples` (API-WEB-60) | JWT `aud=perf` | `PerfSample` → 204 |
| EP-WEB-33 | `GET/POST/DELETE /api/admin/invites` (API-WEB-70) | `admin.users` · `invite` | `{email, role, quotaInit?}` → 201 |
| EP-WEB-34 | `PATCH /api/admin/users/{id}` (API-WEB-71) | `admin.users` · `user_lock`, `role_change` | `{status?, role?}` → user; khoá → PSC-WEB-01 thu hồi phiên |
| EP-WEB-35 | `GET/PUT /api/admin/quotas` (API-WEB-72) | `admin.quotas` · `quota_change` | `{defaults?, users?: [{userId, …}], games?: [{gameId, dialogueUsdDay}]}` |
| EP-WEB-36 | `GET /api/admin/usage?from=&to=&groupBy=day\|user\|game\|task` (API-WEB-73) | `admin.usage` | `{rows: [{key, costUsd, calls, inTokens, outTokens}], blocks: [...]}` |
| EP-WEB-37 | `GET/PUT /api/admin/config` (API-WEB-74) | `admin.config` · `config_change` | `{ai: AiConfigView[] (kèm `configured`), cc0: Cc0Source[]}`; không bao giờ trả/nhận khoá |
| EP-WEB-38 | `GET /api/events?game=<id>` (IF-WEB-02) | `game.view` | SSE `text/event-stream`; heartbeat `: ping` 20 s; `Last-Event-ID` đọc bù ≤ 1 giờ |
| EP-WEB-39 | `GET /api/_authz/object` (Caddy `forward_auth`) | cookie phiên hoặc `?t=` preview | Header `X-Forwarded-Uri` → 204 cho phép / 401 / 403; kiểm `private/builds/<gameId>/…` cần `game.view` hoặc JWT preview đúng `gameId`,`buildId`; `private/assets/<id>/…` cần đăng nhập |
| EP-WEB-40 | `POST /internal/llm` (ai-gateway) | token dịch vụ | `LlmCallReq` → `LlmCallRes` (mục 3.2); 429 ERR-WEB-05; 502 lỗi nhà cung cấp đã lọc |
| EP-WEB-41 | `POST /internal/image` (ai-gateway) | token dịch vụ | `{task, userId?, gameId?, prompt, refs: ObjectKey[], size, n ≤ 4}` → `{images: [{b64, mime}], usage, costUsd}` |
| EP-WEB-42 | `POST /internal/audio` (ai-gateway) | token dịch vụ | `{task, userId?, gameId?, text?, voiceId?, prompt?, durationS?}` → `audio/mpeg` (bản gốc ElevenLabs; bước `audio` chuyển sang M4A/AAC theo ADR-037) + header `x-cost-usd`, `x-usage-id` |
| EP-WEB-43 | `GET /internal/dialogue-profiles/{publicationId}` (api, chỉ mạng `app`) | token dịch vụ của `ai-gateway` | → `dialogue-profiles.json` (DDD-07 DTO-DLG-03); `ETag` |
| EP-WEB-44 | `GET /api/admin/overview` (API-WEB-75) | `admin.overview` | → `AdminOverview` (DTO-WEB-13); cache 30 s (PSC-WEB-17) |
| EP-WEB-45 | `GET /api/admin/system`, `GET /api/admin/jobs?status=&type=&before=` (API-WEB-76) | `admin.overview` | → `AdminSystem` (DTO-WEB-15); `Page<JobView & {gameName, requestedByName}>` |
| EP-WEB-46 | `POST /api/admin/jobs/{id}/cancel`, `POST /api/admin/jobs/{id}/retry` (API-WEB-77) | `admin.jobs` · `job_cancel_admin`, `job_retry_admin` | `{reason}` → 202 `{status}`; retry chỉ khi `Loi`/`DaHuy`, tạo job mới cùng `params` |
| EP-WEB-47 | `GET /api/admin/audit?from=&to=&user=&action=&object=&before=&format=csv` (API-WEB-78) | `admin.audit` | `Page<AuditRow>`; `format=csv` → `text/csv` luồng ≤ 10.000 dòng |
| EP-WEB-48 | `GET /api/admin/games?q=&owner=&status=&before=`, `POST /api/admin/games/{id}/transfer` (API-WEB-79) | `admin.moderation` · `owner_transfer` | `Page<GameSummary & {ownerName, bytes, publications, openLinks}>`; transfer `{newOwnerId, oldOwnerPerm: 'sua'\|null, reason}` → `{ownerId}` (PSC-WEB-18) |
| EP-WEB-49 | `GET /api/admin/links?open=&requireLogin=&before=`, `DELETE /api/admin/links/{id}`, `POST /api/admin/publications/{id}/takedown` (API-WEB-80) | `admin.moderation` · `link_revoke_admin`, `publication_takedown` | DELETE/takedown `{reason ≥ 10 ký tự}` → 200; thông báo chủ game MSG-WEB-05 (PSC-WEB-18) |
| EP-WEB-50 | `GET /api/admin/dialogue-stats?from=&to=&game=` (API-WEB-81) | `admin.usage` | `{rows: [{gameId, npcId, day, turns, blockedInPct, fallbackOutPct, costUsd}]}` từ TBL-DLG-01; không trả nội dung |
| EP-WEB-51 | `GET/POST/PATCH/DELETE /api/admin/announcements`, `GET /api/announcements` (API-WEB-82) | `admin.announce` · `announce` / authenticated | `Announcement` (DTO-WEB-14); GET công khai trả thông báo đang hiện |
| EP-WEB-52 | `GET /api/games/{id}/status` (API-WEB-83) | `game.status` | → 200 `StatusView` (DTO-WEB-16), `ETag` = khoá đệm; `If-None-Match` → 304 |
| EP-WEB-53 | `POST /api/games/import/validate` (zip, tải theo phần qua EP-WEB-25), `POST /api/games/import` `{importToken}`, `POST /api/games/{id}/import` `{importToken, baseVersion, confirm?}` (API-WEB-84) | validate/import: `game.create` · dung lượng, số game; vào game có sẵn: `game.import_into` + giữ khoá | validate → 200 `ImportValidateRes` (DTO-WEB-17); import → 201 `{gameId, version: 1, briefStatus}`; import vào game: lần 1 → 200 `{diff}`, lần 2 `confirm` → 200 `{version}`; lỗi 422 ERR-WEB-14 |
| EP-WEB-54 | `POST /api/games/{id}/upgrade`, `GET /api/games/{id}/upgrade/{jobId}`, `POST /api/games/{id}/upgrade/{jobId}/accept`, `POST …/reject` (API-WEB-85) | `game.upgrade` + giữ khoá · job đồng thời | tạo → 202 `{jobId}`; GET → `UpgradeCandidateView` (DTO-WEB-18); accept → 200 `{version}`; `baseVersion` đổi → 409 ERR-WEB-07 |
| EP-WEB-55 | `PATCH /api/links/{id}` `{mode, publicationId?}`, `POST /api/games/{id}/links/retarget` `{publicationId}` (API-WEB-86) | `link.retarget` (chủ game) | → 200 `{updated: n}`; ghi `audit_log action=link.retarget` từng link |
| EP-WEB-56 | `GET /api/intake/{id}`, `GET /api/me/intake?open=1` (chi tiết thêm của API-WEB-10…12 cho FR-WEB-62, DDD-01 SEQ-INT-04) | chủ phiên | → `{session, pendingQuestions}` (không gọi AI); danh sách phiên dở `ChoTraLoi`/`ChoXacNhan`/`Loi` |

Danh sách asset cho quản trị (FR-WEB-57): EP-WEB-21 nhận thêm `scope=all&provenance=missing&owner=` khi người gọi là Quản trị.

Token dịch vụ: `GS_GATEWAY_TOKEN_API`, `GS_GATEWAY_TOKEN_WORKER`, `GS_GATEWAY_TOKEN_QA` (gọi cổng) và `GS_API_TOKEN_GATEWAY` (cổng gọi EP-WEB-43); so sánh `crypto.timingSafeEqual`.

---

## 6. Luồng xử lý

### SEQ-WEB-01 Đăng nhập
```mermaid
sequenceDiagram
    participant B as Trình duyệt
    participant A as api
    participant G as Google
    participant DB as PostgreSQL
    B->>A: GET /api/auth/google/start
    A-->>B: 302 Google (code_challenge, state, nonce) + cookie gs_oidc
    B->>G: đăng nhập
    G-->>B: 302 /callback?code&state
    B->>A: GET /callback
    A->>G: đổi code (PKCE) → id_token
    A->>A: kiểm iss/aud/exp/nonce, email_verified
    A->>DB: users / invitations theo email
    alt chưa mời / bị khoá
        A-->>B: 302 /login?err=ERR-WEB-01|02 (audit login_denied)
    else
        A->>DB: INSERT sessions(id_hash), cập nhật lời mời DaDung lần đầu
        A-->>B: 302 / + Set-Cookie gs_sid (HttpOnly; Secure; SameSite=Lax)
    end
```

### SEQ-WEB-02 Sửa trong editor → lưu → áp nóng
```mermaid
sequenceDiagram
    participant UI as Panel/gizmo
    participant S as Store (MOD-WEB-21)
    participant A as api
    participant DB as PostgreSQL
    participant E as EditorBridge
    UI->>S: apply(OpGroup)
    S->>S: doc cục bộ (≤ 100 ms), undo, hẹn 2 s
    S->>A: PATCH /data {baseVersion, pending}
    A->>DB: tx SERIALIZABLE: khoá, FOR UPDATE heads, applyPatch, kiểm schema, versions, heads
    A->>DB: INSERT events_outbox + NOTIFY gs_events
    A-->>S: 200 {version, impact}
    DB-->>A: LISTEN → hub
    A-->>S: SSE data.version {impact, ops}
    alt runtimeOnly
        S->>E: applyRuntimePatch(ops) (≤ 2 s)
    else
        S->>S: needsBuild += pointers; nút Build(n)
    end
```

### SEQ-WEB-03 Job build
`POST jobs` → `createJob` (quyền, hạn mức, `estimateS`, `singletonKey`) → `INSERT jobs` + `boss.send('job.build', payload, {priority, singletonKey})` → worker `work('job.build')` (khe nặng) → `UPDATE jobs SET status='DangChay'` → workdir + snapshot + cache → `execFile('engine', ['build', '--zone', z, '--tier', t, '--json'])` → mỗi dòng tiến độ → `progress.ts` gộp 1 lần/giây → `UPDATE jobs.progress` + `NOTIFY` → kết thúc: tải `build/` lên `private/builds/<gameId>/<buildId>/`, `job_reports`, `storage_usage`, `notifications` → SSE `job.done`.

### SEQ-WEB-04 Xuất bản và link
`POST publish` → job `publish` (PSC-WEB-09) → `publications` (+ `not_met`) → SPA hiện MSG-WEB-03 nếu `not_met` → xác nhận → chủ game tạo link `POST links` → token hiện một lần → người chơi `GET /p/{token}` → trang chơi → (game có NPC AI) EP-DLG-01 (DDD-07).

### SEQ-WEB-05 Cướp khoá
B (chủ game) `POST lock/takeover` → `edit_locks` đổi sang B, ghi `grace_session_id = A`, `grace_until = now+10 s` → `NOTIFY lock.changed` → SPA của A nhận SSE → `store.flush(force)` gửi PATCH (được nhận trong ân hạn) → A chuyển chế độ xem, hiện MSG-WEB-04 → kiểm toán `lock_takeover`.

### SEQ-WEB-06 Sao lưu và diễn tập khôi phục
01:00 hằng ngày `backup` chạy `pg-dump.sh` (`pg_dump -Fc` → `restic backup --stdin`; `restic forget --keep-daily 30`); CN 03:00 `restic-objects.sh` (`/srv/gs-objects`, `--keep-weekly 8`). Diễn tập mỗi pha W theo `restore-drill.md`: `docker compose -f compose.studio-test.yaml up -d postgres` → `restic restore latest` → `pg_restore` → khôi phục kho đối tượng → `up` toàn bộ → kiểm khói (đăng nhập, mở game, build một zone) → ghi `docs/TEST/dien-tap-khoi-phuc-<ngày>.md` kèm thời gian.

### SEQ-WEB-07 Làm tiếp game đang dở (UC-WEB-10)
Thư viện lọc "Đang dở" (đọc `game_status_cache`) → "Làm tiếp" → SCR-WEB-05 mở SCR-WEB-19 → `GET status` (EP-WEB-52; đệm trượt → PSC-WEB-19 dựng `StatusSources` + `computeStatus`) → tin chat đầu `summarizeVi` → nút chính theo `next[0]` (ví dụ "Build phần thay đổi" → EP-WEB-16 `dryRun` → hộp xác nhận danh sách bước → EP-WEB-16 `stale`) → job xong `job.done` → xoá đệm → SSE `status.changed` → panel cập nhật (`ChuaQA`) → QA nhẹ → Xuất bản → `Publication` n+1 (PSC-WEB-21).

### SEQ-WEB-08 Nhập game (UC-WEB-12)
Tải zip theo phần → `validate` (EP-WEB-53) → job nhẹ `import` `mode=check` (worker `engine import --json` trên bản tạm, không ghi game) → `import_checks` + `importToken` → màn nhập hiện báo cáo → "Nhập" → `POST /api/games/import` → tạo game `DangLam`, `GameVersion` 1 nguồn `import`, asset thiếu provenance `ChoDuyet`, thiếu brief → `reverseBrief` (DDD-01 PSC-INT-13) → mở SCR-WEB-05 với SCR-WEB-19 (`ChoXacNhanBrief`). Nhập vào game có sẵn: `POST /api/games/{id}/import` lần 1 trả khác biệt → xác nhận → lần 2 ghi phiên bản.

### SEQ-WEB-09 Nâng cấp engine/schema (UC-WEB-11)
Cờ `canNangCap` trên SCR-WEB-19 → `POST upgrade` (EP-WEB-54) → job `upgrade` khe nặng → worker chụp snapshot `dataVersion`, chạy `engine upgrade --no-apply --json` (DDD-04 PSC-CLI-06) → tải ứng viên + ảnh trước/sau → `upgrade_candidates` `cho` → SPA hiện báo cáo → "Chấp nhận" → `accept` (kiểm khoá, `baseVersion`) → `GameVersion` nguồn `upgrade` → xoá đệm tiến độ (`CanBuild`/`ChuaQA` theo kết quả). Job lỗi → `Loi` + ERR-WEB-15, `game_heads` không đổi.

---

## 7. Máy trạng thái

### STM-WEB-01 Job

| Từ | Sự kiện | Đến |
|---|---|---|
| — | tạo | `Cho` |
| `Cho` | worker nhận | `DangChay` |
| `Cho` | huỷ | `DaHuy` (`cancelled`) |
| `DangChay` | thoát 0 | `Xong` (`ok`) |
| `DangChay` | thoát 4 (dữ liệu) | `Loi` (`fail_data`) |
| `DangChay` | thoát 5, OOM, mất kho, worker chết | `attempt < 3` → `Cho` (trễ 30 s, 120 s); ngược lại `Loi` (`fail_env`) |
| `DangChay` | huỷ | SIGTERM → 20 s → SIGKILL → `DaHuy` |

### STM-WEB-02 Khoá sửa
`Trong` → (acquire) → `DangGiu{user, session}` → (heartbeat mỗi 60 s) → `DangGiu`; `now − heartbeat_at > 180 s` hoặc `now − last_activity_at > 15 phút` → `HetHan` (coi như `Trong` cho lần acquire kế); release → `Trong`; takeover → `DangGiu{chủ game}` + `AnHan{A, 10 s}`.

### STM-WEB-03 Game
`DangLam` ⇄ `LuuTru` (PATCH status); `DangLam`/`LuuTru` → `DaXoa` (DELETE, `deleted_at`); `DaXoa` → `DangLam` (restore trong 30 ngày, chỉ chủ); `DaXoa` quá 30 ngày → job `purge` → xoá hàng.

### STM-WEB-04 Người dùng và lời mời
Lời mời `ChuaDung` → `DaDung` (đăng nhập lần đầu) / `DaHuy` (quản trị xoá). Người dùng `HoatDong` ⇄ `BiKhoa`; vào `BiKhoa` → thu hồi mọi phiên.

### STM-WEB-05 Link chơi thử
`HieuLuc` → `HetHan` (`expires_at < now`) / `ThuHoi` (`revoked_at`, chủ game hoặc Quản trị có lý do); cả hai trả 410. Bản xuất bản (v0.2): `HienHanh` → `GoBo` (`taken_down_at`, Quản trị) → mọi link của bản đó và `/play/<publicationId>/` trả 410; `GoBo` → `HienHanh` chỉ bằng thao tác Quản trị (ghi kiểm toán). Bản xuất bản bị xoá cùng game khi `purge`.

### STM-WEB-06 Ứng viên nâng cấp (v0.3)
| Từ | Sự kiện | Tới | Ghi chú |
|---|---|---|---|
| — | job `upgrade` xong `ok` | `cho` | ứng viên `cho` cũ của game → `bo` |
| `cho` | accept, khoá đúng người, `baseVersion = head` | `chap_nhan` | ghi `GameVersion` nguồn `upgrade` |
| `cho` | accept, `baseVersion ≠ head` | `cho` | 409 ERR-WEB-07; người dùng chạy lại nâng cấp |
| `cho` | reject / có ứng viên mới / quá 7 ngày | `bo` | dọn `candidate_ref` qua `cleanup.builds` |

### STM-WEB-07 Phiếu kiểm nhập (v0.3)
`Moi` (validate xong, `used_at` null) → `DaDung` (import thành công, `used_at = now`) ; `Moi` → `HetHan` (`expires_at < now`, dọn hằng giờ, xoá `tmp_ref`). Token dùng một lần; dùng lại hoặc hết hạn → 422 ERR-WEB-14.

Link chơi thử (bổ sung STM-WEB-05, v0.3): đích của link `coDinh` = `publication_id`; `moiNhat` = bản mới nhất `taken_down_at IS NULL AND not_met = false`, không có → 410 SCR-WEB-14.

---

## 8. Thuật toán chi tiết

### PSC-WEB-01 Đăng nhập và phiên (ALG-WEB-01)
```
callback(code, state):
  verify state == cookie.gs_oidc.state; tokens = oidc.callback(code, verifier)
  claims = verify(id_token, iss=accounts.google.com, aud=OIDC_CLIENT_ID, nonce)
  if !claims.email_verified: deny ERR-WEB-01
  email = lower(claims.email)
  u = users[email]; if u?.status == BiKhoa: deny ERR-WEB-02
  if !u: inv = invitations[email, ChuaDung] else deny ERR-WEB-01
         tx: INSERT users(role=inv.role); INSERT quotas(inv.quotaInit ∪ defaults); inv.status = DaDung
  raw = randomBytes(32); INSERT sessions(id_hash=sha256(raw), expires_at=now+7d); cookie gs_sid=base64url(raw)
  audit('login')
authenticate(req):
  h = sha256(cookie); s = lru.get(h) ?? db(sessions h) (cache 30 s)
  if !s or s.revoked_at or now > s.expires_at or now - s.last_seen_at > 12h: 401 ERR-WEB-03
  if now - s.last_seen_at > 60 s: UPDATE last_seen_at (bất đồng bộ)
lockUser(id): UPDATE sessions SET revoked_at=now WHERE user_id=id; NOTIFY gs_auth id
  → mọi tiến trình xoá LRU theo user; hub SSE đóng kết nối của user (≤ 30 s)
```

### PSC-WEB-02 Kiểm quyền (ALG-WEB-02)
```
onRoute(r): if !r.config.action: throw StartupError(`route ${r.url} thiếu action`)
preHandler(req):
  a = config.action; if a=='public': return; if !req.user: 401 ERR-WEB-03
  if a=='authenticated': return
  if config.gameParam:
     g = games[params.id]; perm = game_members[g.id, user.id]?.perm ?? null
     if !g or (perm == null and user.role != 'admin'): 404       # không lộ sự tồn tại
     if g.status == DaXoa and !(perm=='chu' and a in {'game.delete','game.view'}): 404
     if user.role=='admin' and perm==null and a not in READ_ACTIONS: 403 ERR-WEB-04
  if !can(user.role, perm, a, g?.status): 403 ERR-WEB-04
list queries: luôn JOIN game_members ON user_id = $me (cách ly)
```

### PSC-WEB-03 Lập lịch và chạy job (ALG-WEB-03)
```
createJob(u, gameId, req):
  running = count(jobs WHERE requested_by=u AND status in (Cho,DangChay))
  if running >= quota.concurrentJobs: 429 ERR-WEB-05('job')
  est = median(last 20 jobs same type & zone).durationS ?? DEFAULT_EST[type]
  prio = req.type=='bake' ? 0 : 100 - min(99, floor(est/60)); fast-path → 100
  key = `${gameId}:${type}:${zone??'*'}:${dataHash}`
  tx: INSERT jobs; bossId = boss.send(`job.${type}`, payload, {priority: prio, singletonKey: key, retryLimit: 0})
  if !anyWorkerReady(): warning ERR-WEB-11
worker:
  boss.work('job.build|bake|asset', {batchSize:1, teamSize:1}, run)     # khe nặng
  boss.work('job.qa|publish|export|import|purge', {batchSize:1, teamSize:1}, run)   # khe nhẹ
run(p):
  UPDATE jobs SET status=DangChay, worker_id, started_at
  dir = /work/<jobId>; restoreSnapshot(p.snapshotRef → dir/games/<id>/data); link cache private/cache/<gameId>
  argv = COMMANDS[p.type](p.params)                    # đã kiểm schema; không shell
  code = runEngine(argv, dir, line => progress.push(line), abort.signal)
  outcome = code==0 ? ok : code==4 ? fail_data : (code==130||aborted) ? cancelled : fail_env
  if outcome==fail_env and p.attempt < 2: requeue(delay = [30,120][p.attempt]) ; return
  upload outputs; INSERT job_reports; update storage_usage; notify; rm -rf dir
fast path sau confirm: createJob(type=build, zone=first, tier=vua, skipBake=true, prio=100)
```

### PSC-WEB-04 Ghi dữ liệu game (ALG-WEB-04)
```
writeData(tx SERIALIZABLE, i):
  locks.assertHeld(tx, i.gameId, i.sessionId) or (grace session) else 423 ERR-WEB-06
  head = SELECT * FROM game_heads WHERE game_id FOR UPDATE
  if i.baseVersion != head.version: 409 ERR-WEB-07 {latestVersion: head.version}
  next = applyPatch(clone(head.data), i.patch) ; lỗi op → 422
  for file in touchedFiles(i.patch): validate(file) → lỗi 422 ERR-WEB-08 {field: instancePath}
  warnings = estimateBudget(next, tier='vua')            # không chặn (FR-WEB-28)
  last = game_versions[head.version]
  merge = last.author==i.userId and last.source=='editor'==i.source and now-last.at < 60 s
          and last.merge_open and !readByJobOrPublish(last)
  hash = sha256(JCS(next))
  if merge: last.patch = compose(last.patch, i.patch); last.data_hash = hash; n = last.n
  else: n = head.version+1; kind = (n % 20 == 0 or patchBytesSinceFull > 256 KB) ? full : patch
        if full: blob = putContentAddressed(zstd(JCS(next)))
        INSERT game_versions(n, kind, blob_ref?, patch?)
  UPDATE game_heads SET version=n, data=next, data_hash=hash; UPDATE games.current_version
  impact = schema.impact(head.data, i.patch)             # DDD-00 PSC-GEN-03
  outbox('game:'+id, data.version {version:n, impact, ops: impact.runtimeOnly ? i.patch : undefined})
  return {version:n, dataHash:hash, merged:merge, impact, warnings}
client 409: tải data mới → rebase pending bằng applyPatch; op chạm pointer đã đổi → hiện so sánh để người dùng chọn
```

### PSC-WEB-05 Hạn mức và chi phí (ALG-WEB-05)
```
cost(u, cfg) = in*priceIn + out*priceOut + cacheRead*priceCacheRead + cacheWrite*priceCacheWrite + (units*priceUnit ?? 0)
dayVN(t) = (t AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
preCheck(userId):
  used = cache5s(SUM(cost_usd) FROM usage_records WHERE user_id AND day = dayVN(now))
  q = quotas[userId] ?? quotas['*']
  if used >= q.aiUsdPerDay: audit('quota_block'); notify admin; 429 ERR-WEB-05('ai')
  # cho gọi khi used < quota, không cắt giữa chừng: 4,1 → gọi (1,0) → 5,1 → lượt sau chặn
postRecord: INSERT usage_records(day=dayVN(now), cost); pct = (used+cost)/quota
  if pct >= 0.8 and chưa cảnh báo hôm nay: outbox('user:'+id, quota.warn {kind:'ai', pct}); notification
storage: sum(storage_usage.bytes WHERE owner_id) >= storageGb → 429 khi tạo job/nhập
games: count(games WHERE owner_id AND status in (DangLam, LuuTru)) >= maxGames → 429 khi tạo/nhân bản/nhập
admin đổi quotas → NOTIFY gs_quota → xoá cache ngay
```

### PSC-WEB-06 Khoá sửa (ALG-WEB-06)
```sql
-- acquire
INSERT INTO edit_locks (game_id, user_id, session_id, acquired_at, heartbeat_at, last_activity_at)
VALUES ($g, $u, $s, now(), now(), now())
ON CONFLICT (game_id) DO UPDATE SET user_id=$u, session_id=$s, acquired_at=now(), heartbeat_at=now(), last_activity_at=now()
WHERE edit_locks.session_id = $s
   OR edit_locks.heartbeat_at < now() - interval '180 seconds'
   OR edit_locks.last_activity_at < now() - interval '15 minutes'
RETURNING *;   -- không hàng → 423 ERR-WEB-06 {holder}
```
`heartbeat`: `UPDATE … SET heartbeat_at=now() WHERE session_id=$s`. Mỗi `writeData` đặt `last_activity_at=now()`. `takeover`: chỉ `chu`; ghi `grace_session_id`, `grace_until=now()+10 s`; `assertHeld` chấp nhận phiên ân hạn tới `grace_until`.

### PSC-WEB-07 Phiên bản (ALG-WEB-07)
```
readVersion(g, n): if n == head.version: return head.data
  f = max full ≤ n; data = lru64.get(g,f) ?? decompress(blob f)
  for k in f+1..n: data = applyPatch(data, versions[k].patch)
  assert sha256(JCS(data)) == versions[n].data_hash      # sai → lỗi 500 + log "version_corrupt"
diff(a, b): A = read(a), B = read(b)
  for each array whose elements have 'id': map theo id → add/remove/change(fields khác nhau)
  else: so theo JSON Pointer (lá) → change
  nhóm theo file, zone
restore(n): writeData(baseVersion=head, patch = jsonDiff(head.data, read(n)), source='restore', summary=`Khôi phục #${n}`)
```

### PSC-WEB-08 Chat (ALG-WEB-08)
```
postChat(g, u, text):
  INSERT chat_messages(user)
  cls = gateway.llm(task='chat_qa', schema={kind: question|change|other}, messages=[text + tóm tắt game])
  if cls.kind=='question':
     facts = gameFacts(head.data) (≤ 4 KB: đếm npc/animal/công trình theo zone và loại, zone, giờ, cờ)
     ans = gateway.llm(task='chat_qa', tools=[read_game_data(pointer) ≤ 3 lần, ≤ 8 KB mỗi lần], messages=[facts, text])
     INSERT chat_messages(ai, ans.text); return answer
  if cls.kind=='change':
     p = intake.propose(head.data, text) (DDD-01 PSC-INT-07) ; INSERT change_proposals(base_version=head.version)
     INSERT chat_messages(proposal, ref_id=p.id); outbox proposal.created; return proposal
decision(p, d, opIds): if p.base_version < head.version: p.status='HetHan'; 409 ERR-INT-07
  ops = d=='partial' ? p.ops ∩ opIds : p.ops
  writeData(source='chat', patch=ops); if impact.major: tạo brief vN+1 ChoXacNhan (DDD-01 PSC-INT-08)
```

### PSC-WEB-09 Xuất bản và link (ALG-WEB-09)
```
publishJob(g, v):
  missing = assets used in v without valid provenance; if missing: fail_data ERR-WEB-10 {n, list}
  run `engine publish --target web --data-version v --json` (DDD-04)
  pubId = ulid(); copy build/publish/** → public/play/<pubId>/ (bất biến)
  if build/private/dialogue-profiles.json: put private/dialogue/<pubId>.json; has_dialogue_ai = true
  INSERT publications(public_id=pubId, not_met = report.qa.budget == 'Fail')
createLink(pub, ttl, requireLogin):
  raw = randomBytes(16); token = base64url(raw)          # 22 ký tự, 128 bit
  INSERT share_links(token_hash = sha256(token), token_hint = token[-4:], expires_at = ttl ? now+ttl : null)
  return url = `${PUBLIC_ORIGIN}/p/${token}` (chỉ trả một lần)
play(token):
  l = share_links[sha256(token)]; if !l or l.revoked_at or (l.expires_at and l.expires_at < now): 410 SCR-WEB-14
  if l.require_login and !session: 302 /login?next=/p/<token>
  UPDATE last_used_at (≤ 1 lần/phút); render play.html(base=/play/<publicationId>/, publishId, linkToken)
```

### PSC-WEB-10 Vòng đời game, nhân bản, gói (ALG-WEB-10)
```
duplicate(g): checkQuota(games); tx: INSERT games; INSERT game_heads(data=head.data, version=1);
  INSERT game_versions(1, source=import, kind=full); copy asset_usages; INSERT game_members(chu)
delete(g): status=DaXoa, deleted_at=now; audit('game_delete')
cron 02:00: for g in games WHERE status=DaXoa AND deleted_at < now-30d: createJob(purge)
purge(g): DELETE versions/heads/chat/jobs/links/publications; remove private/builds/<g>, private/cache/<g>, public/play/<pub of g>;
  snapshot blobs không còn game_versions tham chiếu → remove; assets chỉ thuộc g và không có asset_usages khác → remove
export(g): dựng games/<id>/ từ head (hoặc version) + assets + provenance + manifest-goi.json → zip → private/exports/<jobId>.zip
import(upload):
  zip entries: path normalize, không '..', không tuyệt đối, đuôi ∈ ALLOWED, ≤ 20.000 tệp, tổng giải nén ≤ 2 GB
  kiểm sha256 từng asset theo manifest-goi; `engine validate` + `engine migrate --dry-run`
  tạo game mới version 1 source=import; asset trùng sha256 → dùng lại
```

### PSC-WEB-11 Thông báo (ALG-WEB-11)
```
notify(userId, kind, gameId, payload):
  gk = `${kind}:${gameId}`
  UPDATE notifications SET count=count+1, payload=$p, created_at=now()
    WHERE user_id AND group_key=gk AND read_at IS NULL AND created_at > now()-5min
  không hàng → INSERT; outbox('user:'+userId, notify {id, kind})
nguồn: job.done/Loi (người yêu cầu), member_change (người được chia sẻ), asset.pending (người có asset.review), quota ≥ 80%
cron xoá > 90 ngày; không email (OI-WEB-04)
```

### PSC-WEB-12 Giới hạn tần suất (ALG-WEB-12)
```
api (bộ nhớ, mỗi tiến trình): bucket(user, 'write') cap 60, 1/s; bucket(user,'read') cap 600, 10/s;
  bucket(ipHash, 'public') cap 30, 0.5/s cho /api/auth/*, /p/*
ai-gateway: rate_buckets (SQL như DDD-07 PSC-DLG-03) với khoá `llm:u:<user>:<task>` cap = ai_config.rpm, refill rpm/60
vượt → 429 + Retry-After = ceil(-tokens/refill)
```

### PSC-WEB-13 Áp nóng xem trước (ALG-WEB-13)
```
store.onServerVersion(e):
  if e.version <= baseVersion and e.author == me: return            # bản của mình đã áp cục bộ
  if e.impact.runtimeOnly:
     ops = e.ops ?? fetchPatch(baseVersion → e.version)
     bridge.applyRuntimePatch(ops)                                   # DDD-04 Engine.applyRuntimeData
  else:
     needsBuild ∪= pointersOf(ops); topBar.buildCount = |needsBuild|  (MSG-WEB-02)
     for p in placedObjects đổi vị trí: bridge.showProxy(p, pos)
  if e.author != me: rebase doc + pending
```

### PSC-WEB-14 Xem trước trên điện thoại (ALG-WEB-14)
```
qr(gameId, buildId): t = jwt.sign({aud:'preview', gameId, buildId}, key(preview), 24h)
  url = `${PUBLIC_ORIGIN}/preview/${gameId}?t=${t}`; perf link thêm `&perf=1&route=<id>&pt=${jwt(aud:'perf')}`
  vẽ bằng `qrcode` phía client
authz/object(uri, t): nếu uri ∈ private/builds/<gameId>/<buildId>/** và verify(t).gameId,buildId khớp → 204
simulateTier: CSS khung 412×915 + safe-area giả (env(safe-area-inset-*) qua biến CSS) + bridge.simulateTier(t)
overlay: bridge.stats() mỗi 500 ms, tô đỏ chỉ số vượt budgets[t]
```

### PSC-WEB-15 Hub SSE (IF-WEB-02)
```
outbox(channel, payload) trong cùng tx: INSERT events_outbox RETURNING id; NOTIFY gs_events, json{channel,id}
listen: một kết nối pg riêng LISTEN gs_events → hub.dispatch(channel, id) → đọc payload (batch theo id) → gửi tới client đăng ký channel
client nối: kiểm quyền game.view; đăng ký 'game:<id>', 'user:<me>'; nếu Last-Event-ID: đọc bù events_outbox WHERE id > last AND channel IN (...) (≤ 1 giờ)
heartbeat ': ping' 20 s; user bị khoá → đóng; tối đa 6 kết nối/người
mọi client đăng ký thêm kênh 'global' (sự kiện `announce`, v0.2)
```

### PSC-WEB-16 Bảo vệ quản trị (QT-WEB-09, v0.2)
```
patchUser(actor, target, {status?, role?}):
  if target.id == actor.id and (status == BiKhoa or role != 'admin'): 409 ERR-WEB-13
  if target.role == 'admin' and (status == BiKhoa or role != 'admin'):
     tx SERIALIZABLE: n = count(users WHERE role='admin' AND status='HoatDong' AND id != target.id)
     if n == 0: 409 ERR-WEB-13
```

### PSC-WEB-17 Tổng quan và cảnh báo (FR-WEB-51, v0.2)
```
overview(): cache 30 s
  kpi.activeUsers7d = count(users WHERE last_login_at > now-7d)
  kpi.jobs24h = group jobs WHERE created_at > now-24h by status/result
  kpi.aiUsdToday/7d = sum(usage_records.cost_usd) theo day (Asia/Ho_Chi_Minh)
  kpi.storagePct = sum(storage_usage.bytes) / OBJECT_CAPACITY_BYTES ; kpi.apiP95Ms = histogram 1 giờ
  alerts:
    worker: ready=false → error 'worker_down' (params: doctor lệch); now-heartbeat_at > 90 s → error
    jobs Loi result=fail_env trong 24 h → warn
    quota: aiUsedToday / aiUsdPerDay ≥ 0,8 → warn (≥ 1 → error)
    ops_heartbeats: backup.db > 26 h, backup.objects > 8 ngày → error 'backup_late'
    storagePct > 0,8 → warn ; share_links không revoked, require_login=false, expires_at null hoặc > now+30d → info
  sắp xếp error → warn → info
```

### PSC-WEB-18 Kiểm duyệt và chuyển chủ (FR-WEB-55, 59, v0.2)
```
revokeLinkAdmin(admin, linkId, reason): assert len(reason) ≥ 10
  UPDATE share_links SET revoked_at=now, revoked_by=admin, revoke_reason=reason
  notify(owner, 'moderation', MSG-WEB-05); audit('link_revoke_admin', before/after)
takedown(admin, pubId, reason): UPDATE publications SET taken_down_at=now, taken_down_by, takedown_reason
  revoke mọi share_links của bản đó (revoked_by=admin, cùng lý do); EP-WEB-39 từ chối `public/play/<pubId>/` khi taken_down_at (Caddy forward_auth cho `/play/*`)
  notify(owner); audit('publication_takedown')
transfer(admin, g, newOwner, oldPerm, reason): newOwner.status=HoatDong và role ∈ {creator, admin}
  tx: UPDATE game_members SET perm=oldPerm (hoặc DELETE khi null) WHERE perm='chu'
      UPSERT game_members(g, newOwner, 'chu'); UPDATE games.owner_id; storage_usage.owner_id
  notify(cũ, mới); audit('owner_transfer')
cancel/retry job (EP-WEB-46): như cancelJob/createJob của PSC-WEB-03 nhưng bỏ qua kiểm quyền game, hạn mức tính cho người tạo job gốc
```

### PSC-WEB-19 Báo cáo tiến độ (ALG-WEB-15, v0.3)
```text
getStatus(gameId):
  key = (head.version, etag(cache/<gameId>/index.json), max(jobs.updated_at), max(change_proposals.updated_at ∪ asset_usages.updated_at))
  row = game_status_cache[gameId]; if row and row.key == key: return row.report (cached=true)      # ≤ 50 ms
  src = StatusSources {                         # DDD-00 DTO-GEN-09, cài bằng CSDL + kho đối tượng
    data: game_heads.data, brief: brief_versions mới nhất + trạng thái, style: trạng thái style bible,
    cacheIndex: objects cache/<gameId>/index.json, qa: job_reports QA mới nhất theo zone,
    proposals: change_proposals ChoDuyet (gắn HetHan khi baseVersion < head), assets: asset_usages ChoDuyet,
    jobs: jobs Loi chưa thử lại, publications: mới nhất chưa gỡ, intake: intake_sessions mở, lock: edit_locks }
  r = computeStatus(src, graph)                 # cùng mã với engine status (DDD-00 PSC-GEN-05)
  upsert game_status_cache(gameId, key, r.stage, r.flags, r); return r
invalidate(gameId) on data.version | job.done | proposal.* | asset.review: DELETE cache row; NOTIFY status.changed
Mục tiêu P95 ≤ 500 ms; thư viện chỉ đọc cột stage/flags (không gọi computeStatus từng thẻ)
```

### PSC-WEB-20 Build phần thay đổi (ALG-WEB-16, v0.3)
```text
POST jobs {type:'build', dryRun:true}: plan = planStale(sources(gameId), graph)  # trong api, không job
   return {steps: plan.items, estimateMinutes: ceil(Σ durationS gần nhất / 60)}; plan rỗng → SPA nút "Đã build đủ"
POST jobs {type:'build', stale:true}: createJob(type=build, params={stale:true}, singletonKey = `${gameId}:build:stale:${head.dataHash}`)
worker build.ts: params.stale → execFile(engine, ['build','--stale','--json']); upload cache/<gameId>/index.json
```

### PSC-WEB-21 Xuất bản bản mới và link (ALG-WEB-17, v0.3)
```text
SCR-WEB-09 trước xác nhận: diff = versionDiff(prevPublication.data_version, head)   # PSC-WEB-07
job publish xong: pj = publish.json (có changes[], previousVersion)
  tx: INSERT publications(n = max(n)+1, previous_id = bản trước, changes = pj.changes)  # bản cũ không đổi (QT-WEB-10)
resolveLink(token):  # mở rộng PSC-WEB-09
  l = share_links[sha256(token)]; kiểm thu hồi/hết hạn như cũ
  pub = l.mode == 'coDinh' ? l.publication_id
      : SELECT id FROM publications WHERE game_id = l.game_id AND taken_down_at IS NULL AND not_met = false ORDER BY n DESC LIMIT 1
  pub null hoặc gỡ → 410 SCR-WEB-14
retarget(gameId, publicationId, linkId?):     # EP-WEB-55, chủ game
  tx: UPDATE share_links SET publication_id = $p WHERE (id = linkId) OR (game_id = gameId AND mode = 'coDinh' AND revoked_at IS NULL)
      INSERT audit_log(action='link.retarget', link_id, from, to) cho từng hàng
Nhắc gỡ bớt khi số bản chưa gỡ > 10 (OID-WEB-07)
```

### PSC-WEB-22 Nhập game (ALG-WEB-18, v0.3)
```text
validate(zip):  # tải theo phần ≤ 2 GB vào private/tmp/imports/<id>.zip
  job import mode=check (khe nhẹ): giải nén an toàn → engine import --json (DDD-04 PSC-CLI-07, thư mục tạm, không ghi game)
  token = random(16); INSERT import_checks(token_hash = sha256(token), report, expires_at = now+24h)
  return {importToken: token, report, gameIdExists}
import({importToken}):
  c = import_checks[sha256(t)]; c null | hết hạn | đã dùng | uploaded_by ≠ me | report.result = chan → 422 ERR-WEB-14
  tx: tạo games(DangLam), GameVersion 1 source='import', asset thiếu provenance → asset_usages ChoDuyet, used_at = now
  !report.hasBrief → reverseBrief(data) (DDD-01 PSC-INT-13) → brief_versions ChoXacNhan
  report.result = canNangCap → cờ canNangCap hiện trên SCR-WEB-19
importInto(gameId, {importToken, baseVersion, confirm}):
  giữ khoá; c.game_id_in_package ≠ gameId → ERR-WEB-14; baseVersion ≠ head → 409 ERR-WEB-07
  !confirm → return {diff: versionDiff(head, packageData)}
  confirm → ghi GameVersion mới source='import' (PSC-WEB-04 bước 6–8), lịch sử giữ nguyên
cron hằng giờ cleanup.imports: xoá import_checks hết hạn + tmp_ref
```

### PSC-WEB-23 Nâng cấp engine/schema (ALG-WEB-19, v0.3)
```text
POST upgrade: cần game.upgrade + khoá; createJob(type='upgrade', heavy, params={baseVersion: head.version})
worker upgrade.ts: snapshot(head) → workdir; execFile(engine, ['upgrade','--no-apply','--json'])
  ok: upload ứng viên → private/upgrades/<gameId>/<jobId>/; INSERT upgrade_candidates(status='cho', report, ảnh trước/sau)
  lỗi (thoát 4/2): job Loi, result fail_data, ERR-WEB-15 trong report; game_heads không đổi
accept(jobId): c = upgrade_candidates[jobId] (status cho); khoá đúng người; c.base_version ≠ head.version → 409 ERR-WEB-07
  tx: ghi GameVersion source='upgrade' từ candidate_ref (PSC-WEB-04 bước 6–8); gộp cache phụ vào cache/<gameId>/; c.status='chap_nhan'
  publications cũ không đổi (QT-GEN-12); invalidate status
```

---

## 9. Xử lý lỗi

| Mã | Nơi phát | HTTP | Xử lý / hiển thị |
|---|---|---|---|
| ERR-WEB-01 | PSC-WEB-01 | 403 (302 về `/login?err=`) | SCR-WEB-01 hiện câu; kiểm toán `login_denied` |
| ERR-WEB-02 | PSC-WEB-01 | 403 | Như trên |
| ERR-WEB-03 | `auth` plugin | 401 | SPA xoá cache, chuyển đăng nhập, giữ `pending` trong `sessionStorage` để lưu lại sau |
| ERR-WEB-04 | `permission` | 403 (404 khi không được xem) | Thông báo chung |
| ERR-WEB-05 | `quota` (api), cổng | 429 | Thông báo theo `params.kind`; nút liên hệ quản trị |
| ERR-WEB-06 | PSC-WEB-04, 06 | 423 | Chuyển chế độ xem, hiện người giữ |
| ERR-WEB-07 | PSC-WEB-04 | 409 | Rebase tự động; xung đột → hộp so sánh |
| ERR-WEB-08 | PSC-WEB-04, Ajv route | 422 | Lỗi dưới trường theo `field` |
| ERR-WEB-09 | PSC-WEB-09 | 410 | SCR-WEB-14 |
| ERR-WEB-10 | Job publish | 422 (kết quả job) | Danh sách asset thiếu provenance, liên kết SCR-AST-02 |
| ERR-WEB-11 | `createJob` | 202 + `warning` | Thẻ job "chờ máy build" |
| ERR-WEB-12 | Tải lên | 413/415 | Thông báo tệp |
| ERR-WEB-13 | PSC-WEB-16 | 409 | Hộp lỗi trên SCR-WEB-10; nút Khoá/đổi vai trò vô hiệu từ trước khi biết là quản trị cuối |
| ERR-WEB-14 | PSC-WEB-22 | 422 | "Không nhập được gói: <lý do>."; màn nhập hiện lý do (`params.reason`: `cau_truc`, `schema`, `gameId_khong_khop`, `token_het_han`) |
| ERR-WEB-15 | PSC-WEB-23 | 200 (job `Loi`) | "Nâng cấp chưa thành công ở bước <bước>; game giữ nguyên bản cũ." trên thẻ job và SCR-WEB-19 |
| (nội bộ) 5xx | `errors` plugin | 500/502 | `{code:'ERR-SYS', requestId}`; log pino đầy đủ, không lộ chi tiết nhà cung cấp |

---

## 10. Cấu hình và triển khai

| Mã | Dịch vụ | Biến / khoá | Mặc định |
|---|---|---|---|
| CFG-WEB-01 | `api` | `DATABASE_URL` (vai `gs_api`), `OBJECT_ROOT=/srv/gs-objects`, `PUBLIC_ORIGIN`, `ALLOWED_ORIGINS`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `JWT_KEYS_FILE` (kid `preview`, `perf`), `GATEWAY_URL=http://ai-gateway:8081`, `GS_GATEWAY_TOKEN_API`, `GS_API_TOKEN_GATEWAY`, `SESSION_IDLE_H=12`, `SESSION_ABS_D=7`, `PG_POOL=20`, `LOG_LEVEL=info`, `PORT=8080` | Thời hạn phiên theo OID-WEB-01 |
| CFG-WEB-02 | `ai-gateway` | `DATABASE_URL` (vai `gs_gateway`), `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` (từ `/etc/gamestudio/ai.env`, quyền 600), `JWT_KEYS_FILE` (kid `dlg`), `GS_GATEWAY_TOKEN_{API,WORKER,QA}` (nhận), `GS_API_TOKEN_GATEWAY` (gọi), `API_INTERNAL_URL=http://api:8080`, `HTTPS_PROXY` (egress-ai), `PORT=8081` | Khoá chỉ ở dịch vụ này |
| CFG-WEB-03 | `worker` | `DATABASE_URL` (vai `gs_worker`), `OBJECT_ROOT`, `WORK_DIR=/work`, `GATEWAY_URL`, `GS_GATEWAY_TOKEN_WORKER`, `HEAVY_SLOTS=1`, `LIGHT_SLOTS=1`, `HTTPS_PROXY` (egress-data), `BLENDER_BIN`, `ENGINE_BIN=/opt/gamestudio/bin/engine` | 3 bản × (1 nặng + 1 nhẹ) |
| CFG-WEB-04 | `caddy` + `app` | `Caddyfile`: site `{$PUBLIC_HOST}`; `encode zstd br`; `/assets/*` (SPA) `Cache-Control: public, max-age=31536000, immutable`; `/engine/*`, `/play/*` từ `public/`; `/objects/private/*` → `forward_auth api:8080 {uri /api/_authz/object}` rồi `file_server`; `/api/dialogue/*` → `ai-gateway:8081`; `/api/*`, `/p/*` → `api:8080` (`flush_interval -1` cho SSE); header bảo mật DDD-00 mục 9; app build-time `VITE_PUBLIC_ORIGIN` | — |
| CFG-WEB-05 | Hạn mức, tần suất | Mặc định `quotas['*']`: 5 USD/ngày, 2 job, 20 GB, 20 game (OID-WEB-03); tần suất PSC-WEB-12 | Quản trị đổi trên SCR-WEB-11 |
| CFG-WEB-06 | Lưu giữ | snapshot mỗi 20 phiên bản/256 KB (OID-WEB-02); build xem trước 5 bản/game; `events_outbox` 1 giờ; `notifications` 90 ngày; `audit_log` 1 năm; `idempotency_keys` 24 giờ; thùng rác 30 ngày | `web/api/src/config.ts` |
| CFG-WEB-07 | Sao lưu | `RESTIC_REPOSITORY` (ngoài máy, OID-WEB-04), `RESTIC_PASSWORD_FILE` (Huy giữ bản gốc), lịch 01:00 hằng ngày / CN 03:00 | `web/deploy/backup/*.env` |
| CFG-WEB-08 | `api` (CR-01) | Lịch pg-boss thêm `intake.expire` 02:15 hằng ngày (DDD-01 PSC-INT-12), `cleanup.imports` hằng giờ; `IMPORT_TOKEN_TTL_H=24`, `IMPORT_MAX_BYTES=2 GiB`, `STATUS_CACHE=on`, `PUBLICATION_REMIND_OVER=10`, ứng viên nâng cấp giữ 7 ngày (DDD đề xuất) | `web/api/src/config.ts`, `cron.ts` |

Thứ tự khởi động (FR-WEB-45): `postgres` healthy → `api migrate` (vai `gs_migrate`, Drizzle) → `api`, `ai-gateway` → `worker` (mỗi bản chạy `engine doctor --json`; `ready=false` thì không `boss.work`, vẫn nhịp `worker_status`). Ảnh `gs-worker` cài Blender 4.5 LTS và add-on theo `tools/versions.json` (DDD-09). Giám sát: `/healthz`, `/readyz` (CSDL, kho, hàng đợi); Uptime Kuma 60 s; histogram Fastify cho P95 (cửa sổ 1 giờ) hiển thị trên SCR-WEB-13.

---

## 11. Thiết kế kiểm thử

| Mã | Ca | Dữ liệu / bước | Kỳ vọng | TSD |
|---|---|---|---|---|
| TC-WEB-01 | Ma trận quyền | Sinh từ `MATRIX` × `ACTIONS_BY_ROUTE`: 3 vai trò × 4 quyền game × mọi route; Testcontainers PostgreSQL | Mã 2xx/403/404 đúng bảng; route không có ca → fail | TST-WEB-01 |
| TC-WEB-02 | Đăng nhập | OIDC giả: chưa mời, `email_verified=false`, bị khoá; khoá khi đang có SSE | ERR-WEB-01/01/02; API 401 ngay; SSE đóng ≤ 60 s | TST-WEB-02 |
| TC-WEB-03 | Hạn mức | Đồng hồ giả 23:59 → 00:01 giờ VN; chuỗi 4,1 → gọi 1,0 → 5,1 → chặn; 80 %; quản trị nâng | Đúng từng bước; ngày đổi theo VN | TST-WEB-03 |
| TC-WEB-04 | Phiên bản | PATCH `baseVersion` cũ; 3 PATCH trong 60 s; 45 phiên bản → dựng lại #33 | 409; gộp còn 1 mốc; `dataHash` khớp | TST-WEB-04 |
| TC-WEB-05 | Khoá sửa | A giữ, B mở; A im 15 phút; chủ game cướp khi A có `pending` | B chỉ xem; hết hạn; thay đổi của A được lưu, MSG-WEB-04 | TST-WEB-05 |
| TC-WEB-06 | Hàng đợi | `engine` giả với thời lượng định trước; job bake + 3 build; mã thoát 5 | Thứ tự ngắn trước, bake cuối; giới hạn 2/người; thử lại 2 lần; huỷ; chạy lại từ cache | TST-WEB-06 |
| TC-WEB-07 | Xuất bản, link | Asset thiếu provenance; QA Fail; link 7 ngày, đồng hồ +8 ngày; thu hồi | ERR-WEB-10; `not_met`; 410; 410; token 22 ký tự từ `randomBytes(16)` | TST-WEB-07 |
| TC-WEB-08 | Mô tả → bản chơi | 3 mô tả chuẩn, người thử mới | ≤ 30 phút không tính bake | TST-WEB-08 |
| TC-WEB-09 | Bảo mật | ZAP baseline + có xác thực; Origin lạ; SSRF 127.0.0.1/169.254.169.254/chuyển hướng; tải SVG; gitleaks bản build | Không lỗi mức cao | TST-WEB-09 |
| TC-WEB-10 | Tải | k6: 20 người ảo (đọc 70 %, PATCH 20 %, chat AI giả 10 %), 5 job đồng thời | P95 ≤ 500 ms, 0 lỗi 5xx | TST-WEB-10 |
| TC-WEB-11 | Giao diện | Lighthouse cache lạnh 50 Mbps; Performance API cho thao tác; áp nóng; xem trước; 1366 px và 412 px | ≤ 3 s; ≤ 100 ms; ≤ 2 s; ≤ 10 s; bố cục đúng | TST-WEB-11 |
| TC-WEB-12 | Diễn tập khôi phục | SEQ-WEB-06 | ≤ 4 giờ, kiểm khói đạt | TST-WEB-12 |
| TC-WEB-13 | Gói nhập độc | Zip có `../../etc/passwd`, 25.000 tệp, đuôi `.exe`, sha256 sai | Từ chối từng trường hợp, không ghi ra ngoài thư mục | ALG-WEB-10 |
| TC-WEB-14 | Cách ly dữ liệu | User X gọi `GET /api/games/{id của Y}` và danh sách | 404; danh sách không có game của Y | ALG-WEB-02 |
| TC-WEB-15 | SSE nối lại | Ngắt mạng 30 s trong khi job chạy, nối lại với `Last-Event-ID` | Không mất `job.progress`/`job.done` | IF-WEB-02 |
| TC-WEB-16 | Khoá dịch vụ | Grep env `api`, `worker`, ảnh Docker, phản hồi EP-WEB-37 | Không có `ANTHROPIC_API_KEY`/giá trị khoá ngoài `ai-gateway` | FR-WEB-43 |
| TC-WEB-17 | Bảo vệ quản trị | Quản trị tự khoá; khoá quản trị cuối; hai quản trị khoá nhau đồng thời | 409 ERR-WEB-13; luôn còn ≥ 1 quản trị hoạt động | QT-WEB-09 |
| TC-WEB-18 | Kiểm duyệt | Quản trị thu hồi link, gỡ bản xuất bản không lý do / có lý do; mở link và `/play/<id>/` | 422 khi thiếu lý do; 410 sau gỡ; chủ game có thông báo; `audit_log` có dòng | FR-WEB-55 |
| TC-WEB-19 | Chuyển chủ | Chuyển cho người bị khoá / vai Người xem / người hợp lệ | Từ chối 2 ca đầu; ca hợp lệ: đúng một `chu`, chủ cũ `sua` | FR-WEB-59 |
| TC-WEB-20 | Tổng quan | Dựng dữ liệu: worker `ready=false`, sao lưu 27 giờ, người dùng 85% | Đúng 3 cảnh báo, thứ tự error trước warn | FR-WEB-51 |
| TC-WEB-21 | Quyền admin mới | Người tạo game gọi EP-WEB-44…51 | 403 mọi route (thêm vào TC-WEB-01) | FR-WEB-05 |
| TC-WEB-22 | Tiến độ web = CLI | 8 game mẫu của TC-CLI-05 nạp vào CSDL + kho; EP-WEB-52 so với `engine status --json` cùng dữ liệu; lọc "Đang dở"; Làm tiếp | JSON trùng (bỏ `computedAt`); P95 ≤ 500 ms; SCR-WEB-19 có "Build zone z2" | TST-WEB-13 |
| TC-WEB-23 | Mở lại game | Đề xuất `ChoDuyet`, người khác lưu phiên bản mới; mở lại | Thẻ đề xuất `HetHan` + "Tạo lại đề xuất"; tin chat đầu là `summarizeVi` | TST-WEB-14 |
| TC-WEB-24 | Link sau bản mới | Bản 2; link `coDinh` và `moiNhat`; bản 2 `not_met`; retarget | `coDinh` → bản 1; `moiNhat` → bản 2 (hoặc bản 1 khi bản 2 chưa đạt); retarget → bản 2, mỗi link một dòng kiểm toán | TST-WEB-15 |
| TC-WEB-25 | Nhập | Zip thư mục game không brief; nhập vào game khác `gameId`; khớp; token 25 giờ | Game mới, brief `ChoXacNhan`, build 409 ERR-INT-06; ERR-WEB-14; khác biệt rồi `GameVersion` nguồn `import`; ERR-WEB-14 | TST-WEB-16 |
| TC-WEB-26 | Nâng cấp | Worker giả: lỗi; thành công + accept; dữ liệu đổi trước accept | ERR-WEB-15, `game_heads` không đổi; `GameVersion` nguồn `upgrade`, hash bản xuất bản cũ không đổi; 409 | TST-WEB-17 |

---

## 12. Open item

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| OID-WEB-01 | Thời hạn phiên | 12 giờ không hoạt động, tuyệt đối 7 ngày (OIT-WEB-01); cấu hình CFG-WEB-01 |
| OID-WEB-02 | Chu kỳ snapshot | 20 phiên bản hoặc 256 KB (OIT-WEB-02); xem lại sau 3 tháng |
| OID-WEB-03 | Hạn mức ngoài AI | 2 job, 20 GB, 20 game (OIT-WEB-03); quản trị chỉnh |
| OID-WEB-04 | Kho sao lưu ngoài máy | Dịch vụ đối tượng của nhà cung cấp khác (OIT-WEB-04); Huy chọn trước W2 |
| OID-WEB-05 | `ai-gateway` lấy hồ sơ hội thoại | Qua EP-WEB-43 thay vì mount kho đối tượng (giữ ranh giới TSD-08 mục 2.1); DDD-07 theo cách này |
| OID-WEB-06 | Chế độ link mặc định khi có bản mới (OI-WEB-10) | `coDinh` (Huy duyệt 23/11/2026 qua SRS-08 v1.2); chủ game chuyển bằng EP-WEB-55 |
| OID-WEB-07 | Số bản xuất bản giữ lại (OI-WEB-11) | Không giới hạn; nhắc gỡ bớt khi > 10 bản (CFG-WEB-08) |

---

## 13. Truy vết

| FR / NFR | Thành phần TSD | Thành phần DDD |
|---|---|---|
| FR-WEB-01…03 | ALG-WEB-01, SCH-WEB-01, TST-WEB-02 | TBL-WEB-01…03, EP-WEB-01…03, EP-WEB-33, EP-WEB-34, MOD-WEB-06, PSC-WEB-01, SEQ-WEB-01, STM-WEB-04, TC-WEB-02 |
| FR-WEB-04, 05 | ALG-WEB-02, SCH-WEB-10, TST-WEB-01 | MOD-WEB-03, MOD-WEB-07, PSC-WEB-02, TC-WEB-01, TC-WEB-14 |
| FR-WEB-06, 07 | ALG-WEB-05, SCH-WEB-06, TST-WEB-03 | TBL-WEB-19…22, TBL-WEB-29, MOD-WEB-09, MOD-WEB-28, PSC-WEB-05, CFG-WEB-05, TC-WEB-03 |
| FR-WEB-08, 09 | ALG-WEB-10, SCH-WEB-03 | TBL-WEB-04, EP-WEB-09, PSC-WEB-10, STM-WEB-03, MOD-WEB-33 |
| FR-WEB-10 | SCH-WEB-02 | TBL-WEB-12, EP-WEB-11 |
| FR-WEB-11 | ALG-WEB-08, IF-WEB-03 | PSC-WEB-08, EP-WEB-10, EP-WEB-40 |
| FR-WEB-12, 13 | ALG-WEB-08 | TBL-WEB-11, EP-WEB-12, PSC-WEB-08 |
| FR-WEB-14 | IF-WEB-02, IF-WEB-04, ALG-WEB-03 | DTO-WEB-05, DTO-WEB-06, EP-WEB-17, EP-WEB-38, PSC-WEB-15, SEQ-WEB-03 |
| FR-WEB-15 | ALG-WEB-11, IF-WEB-02 | PSC-WEB-11, TBL-WEB-27 |
| FR-WEB-16 | Mục 3.4, IF-WEB-05 | MOD-WEB-22, mục 3.4 (`createBridge`) |
| FR-WEB-17 | ALG-WEB-13 | PSC-WEB-13, SEQ-WEB-02 |
| FR-WEB-18 | IF-WEB-05 | MOD-WEB-22 (`setCamera`, `setTimeOfDay`) |
| FR-WEB-19, 20 | ALG-WEB-14 | PSC-WEB-14, EP-WEB-32, EP-WEB-39, DTO-WEB-12 |
| FR-WEB-21…23 | IF-WEB-05, mục 3.2 | MOD-WEB-22, MOD-WEB-23 (`pick`, `setGizmo`, kéo thả) |
| FR-WEB-24 | ALG-WEB-06, TST-WEB-05 | TBL-WEB-08, EP-WEB-15, PSC-WEB-06, STM-WEB-02, SEQ-WEB-05, TC-WEB-05 |
| FR-WEB-25 | Mục 3.1 (panel SCR-WLD-02) | MOD-WEB-23 (`panel-registry`) |
| FR-WEB-26, 27 | Mục 3.3, ALG-WEB-04 | MOD-WEB-21, DTO-WEB-08, PSC-WEB-04 (gộp mốc) |
| FR-WEB-28 | ALG-WEB-04 | PSC-WEB-04 (`validate`, `estimateBudget`), EP-WEB-14 |
| FR-WEB-29, 30 | Mục 3.1, 3.3 | MOD-WEB-23 (`json-raw.tsx`, `panel-registry.ts`) |
| FR-WEB-31…33 | SCH-WEB-03, ALG-WEB-07, TST-WEB-04 | TBL-WEB-05, TBL-WEB-06, EP-WEB-26, PSC-WEB-07, DTO-WEB-09, TC-WEB-04 |
| FR-WEB-34 | ALG-WEB-10 | EP-WEB-27, DTO-WEB-10, PSC-WEB-10, TC-WEB-13 |
| FR-WEB-35 | SCH-WEB-07, ALG-WEB-02 | TBL-WEB-07, EP-WEB-28 |
| FR-WEB-36…39 | ALG-WEB-09, SCH-WEB-05, TST-WEB-07 | TBL-WEB-17, TBL-WEB-18, EP-WEB-29…31, PSC-WEB-09, SEQ-WEB-04, STM-WEB-05, TC-WEB-07 |
| FR-WEB-40, 41 | ALG-WEB-03, SCH-WEB-04, IF-WEB-04, TST-WEB-06 | TBL-WEB-13…16, EP-WEB-16…20, MOD-WEB-29, MOD-WEB-30, PSC-WEB-03, STM-WEB-01, TC-WEB-06 |
| FR-WEB-42, 43 | IF-WEB-03, SCH-WEB-09, ALG-WEB-12, mục 6.3 | TBL-WEB-23…25, EP-WEB-37, EP-WEB-40…42, MOD-WEB-26…28, PSC-WEB-12, CFG-WEB-02, TC-WEB-16 |
| FR-WEB-44 | Mục 8.2, TST-WEB-12 | MOD-WEB-32, SEQ-WEB-06, CFG-WEB-07, TC-WEB-12 |
| FR-WEB-45 | Mục 8.1 | MOD-WEB-29 (`doctor.ts`), TBL-WEB-16, mục 10 |
| FR-WEB-46, 47 | Mục 6 | MOD-WEB-08, MOD-WEB-30, CFG-WEB-04, PSC-WEB-01, TC-WEB-09 |
| FR-WEB-48 | Mục 8.3 | EP-WEB-36, EP-WEB-45, DTO-WEB-15, MOD-WEB-24 (admin), mục 10 (giám sát) |
| FR-WEB-49 | SCH-WEB-07 | TBL-WEB-26 |
| FR-WEB-50 | ALG-WEB-11 | PSC-WEB-11, TBL-WEB-27 |
| FR-WEB-51 | Mục 8.3 | EP-WEB-44, DTO-WEB-13, PSC-WEB-17, TBL-WEB-33, MOD-WEB-34, TC-WEB-20 |
| FR-WEB-52 | ALG-WEB-03 | EP-WEB-45, EP-WEB-46, PSC-WEB-18, MOD-WEB-34 |
| FR-WEB-53 | SCH-WEB-07 | EP-WEB-47, TBL-WEB-26 |
| FR-WEB-54 | Mục 8.5 | EP-WEB-48, MOD-WEB-34 |
| FR-WEB-55 | ALG-WEB-09, SCH-WEB-05 | EP-WEB-49, TBL-WEB-17, TBL-WEB-18, STM-WEB-05, PSC-WEB-18, TC-WEB-18 |
| FR-WEB-56 | Mục 8.5 | EP-WEB-50 |
| FR-WEB-57 | ALG-WEB-02 | EP-WEB-21 (tham số quản trị) |
| FR-WEB-58 | Mục 8.5 | EP-WEB-51, TBL-WEB-32, DTO-WEB-14, PSC-WEB-15 (kênh `global`) |
| FR-WEB-59 | ALG-WEB-02, SCH-WEB-07 | EP-WEB-48, PSC-WEB-18, TC-WEB-19 |
| FR-WEB-60, 61 | Mục 3.7, ALG-WEB-15, TST-WEB-13 | MOD-WEB-35, MOD-WEB-37, EP-WEB-52, DTO-WEB-16, TBL-WEB-36, PSC-WEB-19, SEQ-WEB-07, TC-WEB-22 |
| FR-WEB-62 | Mục 3.7, TST-WEB-14; TSD-01 ALG-INT-10, ALG-INT-13 | EP-WEB-56, MOD-WEB-37, SEQ-WEB-07, TC-WEB-23; DDD-01 PSC-INT-12, PSC-INT-15 |
| FR-WEB-63 | ALG-WEB-16; TSD-04 ALG-CLI-05 | EP-WEB-16 (`dryRun`, `stale`), PSC-WEB-20, MOD-WEB-36 |
| FR-WEB-64, 65 | ALG-WEB-17, SCH-WEB-11, TST-WEB-15 | TBL-WEB-17, TBL-WEB-18, EP-WEB-55, PSC-WEB-21, STM-WEB-05, STM-WEB-07, OID-WEB-06, OID-WEB-07, TC-WEB-24 |
| FR-WEB-66, 67 | ALG-WEB-18, SCH-WEB-11, TST-WEB-16; TSD-01 ALG-INT-11 | EP-WEB-53, DTO-WEB-17, TBL-WEB-34, PSC-WEB-22, SEQ-WEB-08, STM-WEB-07, ERR-WEB-14, TC-WEB-25 |
| FR-WEB-68 | ALG-WEB-19, SCH-WEB-11, TST-WEB-17 | EP-WEB-54, DTO-WEB-18, TBL-WEB-35, MOD-WEB-36, PSC-WEB-23, SEQ-WEB-09, STM-WEB-06, ERR-WEB-15, TC-WEB-26 |
| FR-WEB-69 | ALG-WEB-18, TST-WEB-16 | EP-WEB-53 (vào game có sẵn), PSC-WEB-22, TC-WEB-25 |
| NFR-WEB-01…04, 07 | Mục 3, mục 7, TST-WEB-10, TST-WEB-11 | MOD-WEB-20, MOD-WEB-25, CFG-WEB-04, TC-WEB-10, TC-WEB-11 |
| NFR-WEB-05, 06 | Mục 8, TST-WEB-12 | SEQ-WEB-06, CFG-WEB-07, TC-WEB-12 |
| NFR-WEB-08 | ALG-WEB-03, TST-WEB-08 | PSC-WEB-03 (đường nhanh), EP-WEB-06, TC-WEB-08 |
| NFR-WEB-09 | Mục 6, TST-WEB-09 | TC-WEB-09 |
| — | IF-WEB-01, IF-WEB-06 | DTO-WEB-01, DTO-WEB-02, mục 5 (quy ước, cột Quyền), MOD-WEB-08 |
| — | SCH-WEB-08 | Mục 4.2 (bố trí kho đối tượng), MOD-WEB-17 (`ObjectStore`), EP-WEB-39 |
| — | SCH-WEB-01…11 | TBL-WEB-01…36, CFG-WEB-08 |
| — | OIT-WEB-01…04 | OID-WEB-01…04 |

---

## 14. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 22/11/2026 | Claude | Bản đầu từ TSD-08 v1.1 |
| 0.2 | 23/11/2026 | Claude | Theo SRS-08 v1.1 / TSD-08 v1.2 (change request quản trị Huy duyệt 23/11/2026): MOD-WEB-34, hành động `admin.*` mới, DTO-WEB-13…15, TBL-WEB-32, 33, cột gỡ/thu hồi ở TBL-WEB-17, 18, EP-WEB-44…51, STM-WEB-05 thêm `GoBo`, PSC-WEB-16…18, ERR-WEB-13, TC-WEB-17…21, truy vết FR-WEB-51…59; đóng OIU-GEN-02, 03 của UIUX |
| 0.3 | 23/11/2026 | Claude | CR-01 theo SRS-08 v1.2 / TSD-08 v1.3: MOD-WEB-35…37, hành động `game.status`, `game.build_stale`, `game.upgrade`, `game.import_into`, `link.retarget`, DTO-WEB-16…18, TBL-WEB-34…36, cột mới ở TBL-WEB-05, 13, 17, 18, EP-WEB-16 (`dryRun`, `stale`), EP-WEB-52…56, SEQ-WEB-07…09, STM-WEB-06, 07, PSC-WEB-19…23 (ALG-WEB-15…19), ERR-WEB-14, 15, CFG-WEB-08, TC-WEB-22…26, OID-WEB-06, 07 |
| 1.0 | 23/11/2026 | Huy | Duyệt bộ DDD (gồm phần CR-01 và EP-WEB-56); thay đổi sau đây theo change request |
| 1.1 | 26/11/2026 | Claude | CR-02 (ADR-036) và POC-U1: MOD-WEB-22 và `createBridge` nhúng Unity player (`createUnityInstance`, `SendMessage`, sự kiện `gs:*`), giữ player khi đổi game, màn chờ tải player; `pick`, `stats` thành bất đồng bộ; EP-WEB-42 trả `audio/mpeg`, chuyển AAC ở bước `audio` (ADR-037) |
