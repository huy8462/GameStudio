# TSD-08: Web Studio

| Mục | Nội dung |
|---|---|
| Mã tài liệu | TSD-08 |
| Phiên bản | 1.3 (đã duyệt) |
| Ngày | 22/11/2026 |
| Tài liệu cha | TSD-00 `TSD-00-TONG-QUAN.md` |
| SRS nguồn | SRS-08 v1.1 (FR-WEB-01…59, NFR-WEB-01…09) |
| Quyết định | QĐ-15: Web Studio tự xây, chỉ người được mời; TD-12 (frontend), TD-13 (backend), TD-14 (kho đối tượng), TD-15 (xác thực), TD-16 (dịch vụ AI), TD-17 (triển khai) ở TSD-00 mục 3 |
| Gói | `web/app` (SPA), `web/api` (Fastify), `web/worker` (nhận job, gọi `engine`), `web/ai-gateway` (giữ khoá), `web/shared` (DTO, mã lỗi, ma trận quyền), `web/deploy` |
| Pha | W1…W4 (song song engine từ sau G-E1, OI-WEB-09) |
| Trạng thái | Đã duyệt (Huy, 22/11/2026; bản 1.3 gồm CR-01 duyệt 23/11/2026) |

---

## 1. Giới thiệu
Tài liệu thiết kế kỹ thuật cho Web Studio: SPA cho người tạo game, API và CSDL, hàng đợi job chạy `engine` CLI trên worker, cổng AI giữ khoá, xuất bản và link chơi thử, sao lưu và vận hành trên một máy chủ Linux.

Nguyên tắc kế thừa từ TSD-00 mục 2.4: dữ liệu game là JSON có schema (QT-WEB-04), mọi ghi là JSON Patch qua `applyPatch` của `@gamestudio/schema`; việc nặng chỉ chạy bằng `engine` CLI trên worker, không có đường build thứ hai; khoá dịch vụ AI chỉ nằm trong env của `ai-gateway` (QT-WEB-05).

Số lấy từ SRS đã chốt (Huy duyệt SRS 22/11/2026); số có nhãn **(TSD đề xuất)** là giá trị kỹ thuật do tài liệu này đưa ra, hiệu chỉnh theo số đo thực.

---

## 2. Kiến trúc

### 2.1 Thành phần và ranh giới tin cậy

```mermaid
flowchart LR
    subgraph Browser[Trình duyệt]
        SPA[web/app SPA React]
        ENG[@gamestudio/engine nhúng trong khung xem trước]
        PLAY[Trang chơi /p/:token]
    end
    subgraph Server[Máy chủ Linux - Docker Compose]
        CAD[Caddy: TLS, HSTS, tĩnh, proxy]
        API[web/api Fastify]
        GW[web/ai-gateway Fastify]
        WK[web/worker x3]
        PG[(PostgreSQL 17 + pg-boss)]
        OBJ[(/srv/gs-objects)]
    end
    SPA -->|REST + SSE, cookie phiên| CAD --> API
    ENG -->|build, asset: GET tĩnh có kiểm token| CAD
    PLAY -->|bản xuất bản tĩnh| CAD
    PLAY -->|API-DLG token phiên chơi| CAD --> GW
    API --> PG
    API -->|ObjectStore| OBJ
    API -->|token dịch vụ| GW
    WK -->|pg-boss| PG
    WK --> OBJ
    WK -->|token dịch vụ: forge ảnh/âm thanh| GW
    GW --> PG
    GW -->|HTTPS ra ngoài| EXT[Claude API / Gemini / ElevenLabs]
```

| Thành phần | Trách nhiệm | Không được làm |
|---|---|---|
| `web/app` | Giao diện, trạng thái editor, nhúng engine xem trước | Giữ khoá, quyết định quyền (chỉ ẩn nút) |
| `web/api` | Xác thực, phân quyền, dữ liệu game, phiên bản, khoá sửa, tạo job, xuất bản, quản trị, SSE | Gọi trực tiếp dịch vụ AI ngoài; chạy Blender |
| `web/ai-gateway` | Gọi Claude/Gemini/ElevenLabs, chọn mô hình theo loại việc, giới hạn tần suất, ghi sử dụng và chi phí, API-DLG | Đọc kho đối tượng (không mount), ghi dữ liệu game |
| `web/worker` | Nhận job từ pg-boss, chạy `engine` trong thư mục làm việc tạm, đẩy kết quả lên kho đối tượng | Nhận lệnh shell tuỳ ý; chạy script do người dùng/AI sinh (FR-WEB-47) |
| `postgres` | Dữ liệu nghiệp vụ, hàng đợi, phiên, nhật ký | — |
| `caddy` | TLS, HSTS, phục vụ tĩnh `public/` và kiểm quyền tải build qua `forward_auth` | — |

### 2.2 Cấu trúc mã

```
web/
  shared/   src/dto/*.ts  src/errors.ts (ERR-WEB-*)  src/permissions.ts (SCH-WEB-10)  src/sse.ts
  api/      src/plugins/ (auth, csrf, permission, quota, requestId, errors)
            src/routes/ (auth, me, intake, games, chat, data, lock, jobs, assets, versions, members,
                         publish, links, perf, admin)
            src/services/ (versions, locks, jobs, quota, publish, notifications, audit, objectStore)
            src/db/ (schema Drizzle, migrations/*.sql)
  ai-gateway/ src/routes/internal (llm, image, audio, embed?)  src/routes/dlg (TSD-07)
            src/providers/ (anthropic, gemini, elevenlabs)  src/pricing.ts  src/ratelimit.ts
  worker/   src/main.ts (doctor → đăng ký hàng đợi)  src/handlers/<loại job>.ts  src/sandbox.ts
  app/      src/routes/ (TanStack Router)  src/features/<khu vực>/  src/preview/ (EditorBridge)
            src/editor/ (store Zustand, hoàn tác)  src/i18n/vi.json
  deploy/   compose.yaml  Caddyfile  Dockerfile.node  Dockerfile.worker  backup/
```

Luật phụ thuộc (TSD-00 mục 4.2): `web/app` chỉ import `web/shared`, `@gamestudio/engine`, `@gamestudio/schema` (bộ kiểm, `applyPatch`); không import `web/api`, `web/ai-gateway`.

---

## 3. Frontend (`web/app`) và giao diện tiếng Việt

### 3.1 Công nghệ và tổ chức
- React 19 + Vite + TypeScript strict; TanStack Router (định tuyến có kiểu) và TanStack Query (dữ liệu máy chủ, khoá truy vấn `['game', id, 'data', version]`); Zustand cho trạng thái editor; Tailwind + Radix UI; `@xyflow/react` cho sơ đồ hành vi và cây thoại; Monaco nạp lười cho JSON thô (FR-WEB-29).
- Màn hình theo SRS-08 mục 7.1: SCR-WEB-01…14; editor chuyên biệt SCR-WLD-01/02, SCR-CHR-01/02, SCR-DLG-01, SCR-CBT-02, SCR-AST-01/02, SCR-INT-01 là các "panel" đăng ký vào không gian làm việc SCR-WEB-05 (FR-WEB-30).
- Tách chunk theo route: thư viện game, không gian làm việc, quản trị, trang chơi; Monaco, `@xyflow/react`, engine là chunk riêng.

### 3.2 Không gian làm việc SCR-WEB-05

```
┌ Thanh trên: tên game · phiên bản · trạng thái khoá · Build(n) · QA · Xuất bản · Chia sẻ · job · chuông ┐
├ Trái 360 px: tab Chat / Cây đối tượng / Asset ┬ Khung xem trước (engine) ┬ Phải 400 px: thuộc tính/editor ┤
│ tin nhắn · thẻ đề xuất · thẻ job              │  thanh công cụ xem trước │  lỗi schema dưới trường          │
└───────────────────────────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

Theo SRS-08 mục 7.1 (v1.2 sửa sơ đồ cho khớp SRS; chi tiết UIUX-02 WF-WEB-05).

Bố cục tối ưu ≥ 1366 px (NFR-WEB-04); < 1024 px chuyển sang tab (xem trước, chat, thuộc tính) để xem trên điện thoại, editor gizmo tắt.

### 3.3 Trạng thái editor và hoàn tác
Store Zustand giữ `{gameId, baseVersion, doc (bản JSON đang sửa), pending: Op[], undo: Op[][], redo: Op[][], selection}`.

- Mỗi thao tác editor sinh một nhóm JSON Patch + nhóm nghịch đảo (`invertPatch` của `@gamestudio/schema`) đẩy vào `undo` (tối đa 100, ≥ 50 theo FR-WEB-26); áp vào `doc` cục bộ ngay (phản hồi ≤ 100 ms, NFR-WEB-02).
- Không giữ trạng thái riêng ngoài `doc` + ngăn hoàn tác (QT-WEB-04); các panel đọc bằng JSON Pointer từ `doc`.
- Lưu tự động: bộ đếm 2 s sau thao tác cuối gửi `pending` qua API-WEB-24 (FR-WEB-27); thành công → `baseVersion` mới; 409 → ALG-WEB-04 bước hợp nhất.

### 3.4 Khung xem trước và cầu nối engine (IF-WEB-05)
Khung xem trước là `<canvas>` do `@gamestudio/engine` cùng `engineVersion` với bản xuất bản quản lý (FR-WEB-16), nạp động từ `/engine/<semver>/` theo `publish.json`/`manifest.json` của bản build mới nhất. SPA chỉ nói chuyện với engine qua `EditorBridge` (mục 4.1).

### 3.5 Tiếng Việt và định dạng
- Chuỗi giao diện trong `src/i18n/vi.json` (khoá phẳng `scr.web05.build.tooltip`), hàm `t()` tự viết, không thư viện i18n nặng; chỉ một ngôn ngữ ở bản đầu nhưng không viết cứng chuỗi trong JSX (lint `no-literal-string` trên `src/features/**`) (NFR-GEN-13, NFR-WEB-04).
- Số, tiền, thời gian: `Intl.NumberFormat('vi-VN')`, `Intl.DateTimeFormat('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})`; chi phí USD 2 chữ số thập phân.
- Thông báo lỗi lấy từ `web/shared/errors.ts` theo mã ERR-WEB-* (SRS-08 mục 10), API trả mã và tham số, SPA ghép câu.
- Nội dung do AI sinh luôn hiển thị bằng nút văn bản (React escape mặc định), không `dangerouslySetInnerHTML`; Markdown trong chat chỉ qua bộ dựng giới hạn (đoạn, danh sách, đậm, mã) không cho HTML.

### 3.6 Trạng thái rỗng, lỗi, tải
Mỗi màn hình có ba trạng thái chuẩn (đang tải skeleton, rỗng có hành động chính, lỗi có mã + "Thử lại"); khung xem trước khi chưa có build hiện nút "Build zone đầu tiên" (SRS-08 mục 7.2).

### 3.7 Tiến độ, Làm tiếp, Nhập game (CR-01)
- Thẻ game ở SCR-WEB-02 hiện huy hiệu giai đoạn (`stage`) và số việc còn treo (tổng các cờ đếm); bộ lọc "Đang dở" = `stage ≠ DaXuatBan` hoặc `thayDoiChuaXuatBan > 0`, sắp theo lần sửa cuối; nút "Làm tiếp" mở SCR-WEB-05 với bảng Tiến độ mở sẵn (FR-WEB-60). Danh sách thư viện lấy `stage` từ bảng đệm `game_status_cache` (ALG-WEB-15), không tính lại cho từng thẻ.
- SCR-WEB-19 là panel "Tiến độ" của không gian làm việc: thanh 8 giai đoạn (xong/đang/chưa), nút chính theo `next` của báo cáo, danh sách việc còn treo có lối tắt (mở thẻ đề xuất, SCR-AST-01, Thử lại job, Build phần thay đổi, Xuất bản, Nâng cấp); tự mở lần đầu trong phiên khi `stage ≠ DaXuatBan`; làm mới khi nhận SSE `data.version`, `job.done`, `status.changed` (FR-WEB-61).
- Mở lại game: tin đầu chat là tóm tắt `summarizeVi` (TSD-01 ALG-INT-13); đề xuất `ChoDuyet` có `baseVersion` cũ hiện ở trạng thái `HetHan` kèm nút "Tạo lại đề xuất"; phiên tạo game dở hiện thẻ "Tiếp tục trả lời" (FR-WEB-62).
- "Build phần thay đổi" gọi API-WEB-30 với `dryRun=true` trước để hiện danh sách bước/zone/ước lượng, xác nhận rồi gọi lại với `stale=true`; không có bước cũ → nút mờ "Đã build đủ" (FR-WEB-63). MSG-WEB-06 hiện ở thanh trên khi `thayDoiChuaXuatBan > 0`.
- Màn nhập game: tải zip → API-WEB-84 `validate` → hiện báo cáo `import/1` (TSD-04 SCH-RTM-10) → Nhập; nhập vào game đã có hiện khác biệt theo đối tượng trước khi áp (FR-WEB-66, 69).

---

## 4. Giao diện và dữ liệu

### 4.1 Giao diện

| Mã | Giao diện | Đặc tả |
|---|---|---|
| IF-WEB-01 | Quy ước REST | JSON UTF-8; tiền tố `/api`; cookie phiên `gs_sid`; mọi phản hồi có header `x-request-id` (ULID); lỗi `{error: {code: 'ERR-…', message, params?, field?}}` theo SRS-08 mục 10; danh sách phân trang bằng con trỏ `?before=<ulid>&limit≤100`; yêu cầu ghi có thể kèm `Idempotency-Key` (lưu 24 giờ trong bảng `idempotency_keys`, trả lại phản hồi cũ); kiểm đầu vào bằng JSON Schema của route (Fastify + Ajv), sai → 422 ERR-WEB-08; kích thước thân ≤ 1 MB, riêng tải ảnh intake ≤ 5 × 10 MB, gói nhập ≤ 2 GB qua tải lên theo phần (ERR-WEB-12) |
| IF-WEB-02 | SSE | `GET /api/events?game=<id>` (một kết nối cho mỗi tab) và `GET /api/jobs/{id}/events` (API-WEB-31). Sự kiện: `job.progress {jobId, step, status, pct, etaS}`, `job.done {jobId, result, reportRefs}`, `data.version {gameId, version, author, impact}`, `lock.changed {gameId, holder}`, `proposal.created`, `asset.pending`, `notify {id, kind}`, `quota.warn {kind, pct}`. Nguồn: `LISTEN gs_events` của PostgreSQL; heartbeat 20 s; `Last-Event-ID` để nối lại (đọc bù từ bảng `events_outbox` 1 giờ) |
| IF-WEB-03 | API nội bộ `ai-gateway` | Mạng Docker nội bộ, xác thực bằng token dịch vụ (`Authorization: Bearer`, mỗi dịch vụ gọi một token, so sánh hằng thời gian). `POST /internal/llm {task, userId, gameId, messages, schema?, maxTokens?}` → `{output, stopReason, usage, costUsd, model}`; `POST /internal/image {task, prompt, refs[], size}`; `POST /internal/audio {task, text, voiceId \| prompt}`; trước khi gọi kiểm hạn mức (ALG-WEB-05), sau khi gọi ghi `usage_records` + `llm_calls`. API-DLG-01…03 cho game ở TSD-07 |
| IF-WEB-04 | Hợp đồng job (api ↔ worker) | pg-boss hàng `job.<loại>`; dữ liệu `{jobId, gameId, type, params, dataVersion, snapshotRef, requestedBy, attempt}`; worker báo tiến độ bằng `UPDATE jobs` + `NOTIFY gs_events`; kết quả: báo cáo JSON `report/1` (TSD-04 SCH-RTM-05) lưu `job_reports`, tệp đầu ra lên `builds/<gameId>/<buildId>/`. Mã kết quả `ok \| fail_data \| fail_env \| cancelled` (chỉ `fail_env` được thử lại) |
| IF-WEB-05 | `EditorBridge` (SPA ↔ engine) | `load(manifestUrl, {zone, tier, mode})`, `applyRuntimePatch(ops)` (chỉ nhóm "chỉ runtime", SRS-04 mục 6.2), `setCamera(mode \| viewId)`, `setTimeOfDay(h)`, `simulateTier(tier)`, `pick(x, y) → {objectId, pointer}`, `highlight(objectId)`, `setGizmo(kind, snap)`, sự kiện `gizmoChange(pointer, value)`, `stats() → {fps, drawCalls, tris, gpuMemMB}`; engine phơi các hàm này qua `@gamestudio/engine/editor` (chỉ có trong gói dev, không có trong bản xuất bản) |
| IF-WEB-06 | Ánh xạ API | Bảng mục 4.3: mỗi API-WEB-* → route, hành động quyền (SCH-WEB-10), kiểm hạn mức, sự kiện kiểm toán |

### 4.2 Dữ liệu
Kiểu dữ liệu chính (PostgreSQL 17, Drizzle). Khoá chính ULID (`text`, sắp theo thời gian); thời điểm `timestamptz`; tiền `numeric(12,6)` USD.

| Mã | Bảng / cấu trúc | Trường và ràng buộc |
|---|---|---|
| SCH-WEB-01 | `users`, `invitations`, `sessions` | `users {id, email citext unique, name, role: admin\|creator\|viewer, status: HoatDong\|BiKhoa, createdAt, lastLoginAt}`; `invitations {id, email citext, role, quotaInit jsonb, invitedBy, status: ChuaDung\|DaDung\|DaHuy, createdAt}` (unique một lời mời `ChuaDung` mỗi email); `sessions {idHash (SHA-256 của 256 bit ngẫu nhiên), userId, createdAt, lastSeenAt, expiresAt, ip, ua, revokedAt}` |
| SCH-WEB-02 | Tiếp nhận và chat | `intake_sessions` (TSD-01 SCH-INT-01…03 trong `jsonb`, `ownerId`, `status`), `brief_versions {gameId, n, brief jsonb, status, confirmedBy, confirmedAt}`, `change_proposals` (TSD-01 SCH-INT-06; trạng thái theo SRS-01 mục 6.4; thêm `baseVersion`, `appliedVersion?`), `chat_messages {id, gameId, authorId?, kind: user\|ai\|proposal\|job\|system, body text, refId?, createdAt, tsv tsvector}` (chỉ mục GIN cho tìm lịch sử, FR-WEB-10) |
| SCH-WEB-03 | `games`, `game_versions`, lưu snapshot | `games {id, name, ownerId, status: DangLam\|LuuTru\|DaXoa, deletedAt, currentVersion, thumbRef, features jsonb}`; `game_versions {gameId, n, authorId, at, source: chat\|editor\|json\|restore\|import\|upgrade (CR-01), summary, dataHash, name?, starred, prevN, kind: full\|patch, blobRef, patch jsonb?}`, unique `(gameId, n)`, bất biến (trigger chặn UPDATE trừ `name`, `starred`). Dữ liệu: snapshot đầy đủ dạng JCS nén zstd ở `objects/data/<sha256>.json.zst` (địa chỉ theo nội dung, trùng thì dùng lại) mỗi **20 phiên bản** hoặc khi patch tích luỹ > 256 KB **(TSD đề xuất)**; giữa hai snapshot lưu patch. Bản mới nhất luôn có snapshot nóng trong bảng `game_heads {gameId, version, data jsonb}` để đọc nhanh |
| SCH-WEB-04 | `jobs`, `job_reports`, `events_outbox` | `jobs {id, gameId, type: build\|qa\|bake\|asset\|publish\|export\|import\|upgrade (CR-01)\|purge, params jsonb, status: Cho\|DangChay\|Xong\|Loi\|DaHuy, result?, progress jsonb {steps[{id, status, pct}], etaS}, requestedBy, workerId?, attempt, estimateS, dataVersion, cacheHits, createdAt, startedAt, finishedAt, bossId}`; `job_reports {jobId, step, report jsonb}` (`report/1`); `events_outbox {id, channel, payload, at}` giữ 1 giờ |
| SCH-WEB-05 | `publications`, `share_links` | `publications {id, gameId, n, dataVersion, publishJson jsonb (TSD-04 SCH-RTM-06), notMet bool, url, createdBy, createdAt}`; `share_links {id, publicationId, tokenHash (SHA-256), tokenHint (4 ký tự cuối), expiresAt?, requireLogin bool, createdBy, createdAt, revokedAt?, lastUsedAt}` |
| SCH-WEB-06 | `quotas`, `usage_records`, `llm_calls` | `quotas {userId, aiUsdPerDay (mặc định 5), concurrentJobs (mặc định 2 **(TSD đề xuất)**), storageGb (mặc định 20 **(TSD đề xuất)**), maxGames (mặc định 20 **(TSD đề xuất)**), updatedBy}`; `game_quotas {gameId, dialogueUsdPerDay}` (TSD-07); `usage_records {id, at, userId?, gameId?, publicationId?, task, service, model, inTokens, outTokens, cacheReadTokens, cacheWriteTokens, units?, costUsd, day date (giờ Việt Nam)}` chỉ mục `(userId, day)`, `(gameId, day)`; `llm_calls {usageId, promptHash, promptExcerpt ≤ 500, stopReason, latencyMs}` (TSD-01 SCH-INT-07) |
| SCH-WEB-07 | `game_members`, `edit_locks`, `audit_log`, `notifications` | `game_members {gameId, userId, perm: chu\|sua\|xem}` (một `chu` mỗi game); `edit_locks {gameId PK, userId, sessionId, acquiredAt, heartbeatAt, lastActivityAt}`; `audit_log {id, at, userId?, action, objectType, objectId, before jsonb?, after jsonb?, ip}` chỉ chèn (quyền CSDL chặn UPDATE/DELETE), giữ 1 năm (FR-WEB-49); `notifications {id, userId, kind, payload, readAt?, createdAt}` |
| SCH-WEB-08 | Bố trí kho đối tượng | `/srv/gs-objects/` gồm `private/data/` (snapshot), `private/builds/<gameId>/<buildId>/` (bản build xem trước), `private/assets/<id>/<version>/` (TSD-03 SCH-AST-01), `private/exports/`, `private/cache/<gameId>/` (cache bước, IF-CLI-03), `public/engine/<semver>/` (bất biến), `public/play/<publicationId>/` (bản xuất bản). Caddy phục vụ `public/` trực tiếp; `private/builds` và `private/assets` qua `forward_auth` tới `GET /api/_authz/object` (kiểm cookie phiên + quyền Xem hoặc token xem trước) |
| SCH-WEB-09 | `ai_config`, `cc0_sources` | `ai_config {task: intake\|proposal\|chat_qa\|dialogue_draft\|dialogue_runtime\|image\|audio\|voice, provider, model, effort?, maxTokens, priceIn, priceOut, priceCacheRead, priceCacheWrite, priceUnit?, rpm, enabled}`; giá trị khởi tạo: tác vụ văn bản nặng → `claude-opus-5-5`, `dialogue_runtime` → `claude-haiku-5-5` (TD-16); đơn giá nhập tay bởi quản trị, không lấy tự động; khoá API không bao giờ ở bảng này, cột `configured` tính lúc chạy từ việc biến môi trường có mặt (FR-WEB-43). `cc0_sources` như TSD-03 SCH-AST-04 |
| SCH-WEB-10 | Ma trận quyền | `web/shared/src/permissions.ts`: liệt kê hành động (`game.view`, `game.play_preview`, `game.edit`, `game.brief_confirm`, `game.style_approve`, `asset.review`, `job.create`, `job.cancel`, `baseline.accept`, `game.publish`, `link.manage`, `game.share`, `game.duplicate`, `game.archive`, `game.delete`, `game.export`, `admin.*`) và bảng `(vai trò hệ thống, quyền theo game) → tập hành động` sinh đúng SRS-08 mục 3; cùng một tệp dùng cho backend (quyết định) và frontend (ẩn nút) |
| SCH-WEB-11 | Mở rộng CR-01 | `publications` thêm `previousId?`, `changes jsonb` (TSD-04 SCH-RTM-06), `taken_down_at?` (đã có từ v1.1); `share_links` thêm `mode: coDinh\|moiNhat` (mặc định `coDinh`, OI-WEB-10); bảng mới `import_checks {importToken (băm SHA-256), uploadedBy, tmpRef (`private/tmp/imports/<id>.zip`), report jsonb (`import/1`), gameIdInPackage, intoGameId?, expiresAt (+24 giờ)}` (`ImportCheck`); bảng `upgrade_candidates {jobId, gameId, baseVersion, fromVersions, toVersions, candidateRef (snapshot ứng viên), report jsonb, status: cho\|chap_nhan\|bo}`; `game_status_cache {gameId, dataVersion, cacheEtag, stage, flags jsonb, computedAt}` (chỉ là đệm, không phải nguồn sự thật, QT-WEB-11); `cache/<gameId>/index.json` theo TSD-04 SCH-RTM-09 trên kho đối tượng. Hành động quyền mới trong SCH-WEB-10: `game.status` (Xem), `game.build_stale`, `game.upgrade`, `game.import_into` (Sửa + khoá), `link.retarget` (chủ game) theo SRS-08 mục 3.2 |

Quy ước toàn vẹn: xoá game chỉ đánh dấu `DaXoa`; job `purge` sau 30 ngày (OI-WEB-03) xoá `game_versions`, `game_heads`, snapshot không còn tham chiếu, bản build, link, chat; asset có `asset_usages` từ game khác được giữ (QT-WEB-06).

### 4.3 Ánh xạ API (IF-WEB-06)

| API | Route xử lý | Hành động quyền | Hạn mức | Kiểm toán |
|---|---|---|---|---|
| API-WEB-01…03 | `routes/auth`, `routes/me` | Công khai / đã đăng nhập | — | Đăng nhập, từ chối |
| API-WEB-10…12 | `routes/intake` (gói `@gamestudio/intake` + `GatewayLlmClient`) | `creator` hoặc `admin`; chủ phiên | AI, số game (khi xác nhận) | Tạo game |
| API-WEB-13, 14 | `routes/games/brief`, `style` | `game.brief_confirm`, `game.style_approve` | AI (nếu sinh lại) | — |
| API-WEB-15 | `routes/games` | `game.view`, `game.archive`, `game.duplicate`, `game.delete` | số game (nhân bản) | Xoá game |
| API-WEB-20…22 | `routes/chat`, `routes/proposals` | `game.edit` (câu hỏi: `game.view`) | AI | — |
| API-WEB-23, 24 | `routes/data` | `game.view`; `game.edit` + giữ khoá | — | — |
| API-WEB-25 | `routes/lock` | `game.edit`; cướp khoá: chủ game | — | Cướp khoá |
| API-WEB-30…34 | `routes/jobs`, `routes/baseline` | `job.create`, `job.cancel`, `game.view`, `baseline.accept` | job đồng thời | — |
| API-WEB-40…44 | `routes/assets` (TSD-03 IF-AST-*) | đã đăng nhập; `game.edit` game đích; `asset.review` | AI, dung lượng | Ngừng dùng asset |
| API-WEB-45, 46 | `routes/versions`, `routes/packages` | `game.view` / `game.edit`; `game.export`; `creator` (nhập) | dung lượng, số game | — |
| API-WEB-50…53 | `routes/members`, `publish`, `links`, `play` | `game.share`, `game.publish`, `link.manage`; link | — | Đổi quyền, xuất bản, tạo/thu hồi link |
| API-WEB-60 | `routes/perf` | Token đo (JWT HS256, `aud=perf`, 24 giờ) | — | — |
| API-WEB-70…74 | `routes/admin` | `admin.*` | — | Mời, khoá, đổi vai trò, đổi hạn mức, đổi cấu hình |
| API-WEB-30 (`stale`, `dryRun`) | `routes/jobs` | `game.build_stale`; `dryRun` chỉ `game.status` | job đồng thời (không với `dryRun`) | — |
| API-WEB-83 | `routes/status` | `game.status` | — | — |
| API-WEB-84 | `routes/import` | `creator` (game mới); `game.import_into` + giữ khoá (vào game đã có) | dung lượng, số game | Nhập game |
| API-WEB-85 | `routes/upgrade` | `game.upgrade` + giữ khoá | job đồng thời | Chấp nhận nâng cấp |
| API-WEB-86 | `routes/links` | `link.retarget` | — | Chuyển link |

---

## 5. Thuật toán

| Mã | Tên | Mô tả |
|---|---|---|
| ALG-WEB-01 | Đăng nhập và phiên | OIDC Authorization Code + PKCE với Google (`openid-client`), `state` + `nonce` lưu cookie tạm 10 phút. Callback: kiểm `id_token` (iss, aud, exp, nonce), yêu cầu `email_verified=true`; tra `invitations`/`users` theo email chuẩn hoá chữ thường: không có → ERR-WEB-01, bị khoá → ERR-WEB-02; lần đầu chuyển lời mời `DaDung`, tạo `users` + `quotas` từ `quotaInit`. Tạo phiên: 32 byte ngẫu nhiên → cookie `gs_sid` (`HttpOnly; Secure; SameSite=Lax; Path=/`), CSDL lưu SHA-256. Hết hạn: không hoạt động 12 giờ hoặc tuyệt đối 7 ngày **(TSD đề xuất, OIT-WEB-01)** → ERR-WEB-03. Mỗi request tra phiên (bộ nhớ đệm LRU trong tiến trình 30 s); khoá tài khoản đặt `revokedAt` cho mọi phiên + xoá đệm qua `NOTIFY gs_auth` → mọi API chặn ngay, kết nối SSE đóng trong ≤ 30 s (đáp ứng ≤ 1 phút, FR-WEB-03) |
| ALG-WEB-02 | Kiểm quyền | Plugin Fastify `permission` chạy sau xác thực: route khai báo `{action, gameParam?}`; `can(user, gameId, action)` = vai trò hệ thống + `game_members.perm` → SCH-WEB-10; game `DaXoa` chỉ cho chủ khôi phục; quản trị không phải thành viên chỉ có hành động đọc. Thiếu quyền → 403 ERR-WEB-04 (trả 404 cho game không thuộc quyền xem để không lộ sự tồn tại). Truy vấn danh sách luôn nối `game_members` theo `userId` (cách ly dữ liệu). Route thiếu khai báo `action` làm khởi động thất bại (kiểm lúc đăng ký route) |
| ALG-WEB-03 | Lập lịch và chạy job | (1) Tạo job: kiểm quyền, hạn mức job đồng thời (đếm `jobs` `Cho`+`DangChay` của người dùng), ước lượng `estimateS` từ trung vị 20 job cùng loại/zone gần nhất (không có thì bảng mặc định); gửi pg-boss với `priority = 100 − min(99, estimateS/60)` và `bake` luôn ưu tiên 0 (FR-WEB-40), `singletonKey = gameId:type:zone:dataHash` để không chạy trùng. (2) Worker: mỗi bản 2 khe: 1 khe nặng (`build`, `bake`, `asset`) + 1 khe nhẹ (`qa`, `publish`, `export`, `import`, `purge`) **(TSD đề xuất)** → 3 worker = 3 job nặng + 3 job nhẹ ≥ 5 job đồng thời (NFR-WEB-03). (3) Chạy: tạo thư mục tạm `/work/<jobId>`, tải snapshot theo `dataVersion` về `games/<id>/data/`, gắn cache `private/cache/<gameId>/` (IF-CLI-03), gọi đúng một tiến trình con `engine <lệnh> --json` (danh sách lệnh cố định theo loại, tham số đã kiểm schema, không qua shell); đọc dòng JSON tiến độ ở stdout → cập nhật `jobs.progress` (gộp ≤ 1 lần/giây). (4) Kết thúc: mã thoát → `result`; `fail_env` (mã 5 doctor, hết bộ nhớ, mất kết nối kho) → thử lại ≤ 2 lần với độ trễ 30 s, 120 s; huỷ: `SIGTERM`, sau 20 s `SIGKILL`, trạng thái `DaHuy`. Job cùng đầu vào hoàn tất từ cache vì CLI tự bỏ qua bước trùng `inputHash` (FR-WEB-41). (5) Đường nhanh "bản chơi đầu tiên": sau khi xác nhận brief, API tự tạo job `build --zone <zone đầu> --tier vua --skip-bake` với ưu tiên cao nhất, bake xếp hàng sau (NFR-WEB-08) |
| ALG-WEB-04 | Ghi dữ liệu game | API-WEB-24 trong một giao dịch `SERIALIZABLE`: (1) kiểm khoá sửa thuộc phiên gọi (ERR-WEB-06); (2) `SELECT … FOR UPDATE` `game_heads`; `baseVersion ≠ version` → 409 ERR-WEB-07 kèm `latestVersion` (QT-WEB-07); (3) `applyPatch` lên bản sao, kiểm schema toàn bộ file bị chạm (SCH-RTM-01), lỗi → 422 ERR-WEB-08 với `instancePath`; (4) ước lượng ngân sách tier Vừa (đếm tri, draw call ước lượng từ `placedObjects` + asset `lod0Tris`) → cảnh báo không chặn (FR-WEB-28); (5) gộp mốc: nếu phiên bản đầu là của cùng tác giả, cùng nguồn `editor`, cách < 60 s và chưa có ai đọc qua job/xuất bản → ghi đè patch của mốc đó (giữ số), ngược lại tạo `n+1` (FR-WEB-27); (6) tính `dataHash` (JCS + SHA-256), ghi `game_versions`, `game_heads`; (7) `impact` = ALG-GEN-04 → `{runtimeOnly, buildSteps, zones}`; (8) `NOTIFY data.version`. Frontend khi gặp 409: tải bản mới, áp lại `pending` của mình bằng `applyPatch`; xung đột đường dẫn → hiện so sánh, người dùng chọn |
| ALG-WEB-05 | Hạn mức và chi phí | Chi phí một lần gọi theo QT-WEB-08: `in × priceIn + out × priceOut + cacheRead × priceCacheRead + cacheWrite × priceCacheWrite (+ units × priceUnit)` từ `usage` thực tế của dịch vụ và `ai_config` tại thời điểm gọi. Ngày tính theo `Asia/Ho_Chi_Minh` (`day` lưu sẵn). Trước mỗi lần gọi AI: `used = SUM(costUsd) WHERE userId, day=today` (đệm 5 s), cho gọi khi `used < quota` (không chặn giữa chừng, đúng ví dụ QT-WEB-08: 4,1 → cho gọi → 5,1 → chặn lượt sau); `≥ 80%` → sự kiện `quota.warn` + MSG-WEB-01; `≥ 100%` → 429 ERR-WEB-05, ghi `audit_log action=quota_block` cho quản trị (FR-WEB-07). Hội thoại game dùng thêm hạn mức theo game (`game_quotas`, TSD-07 ALG-DLG-04) và tính vào chủ game. Hạn mức khác: job đồng thời (ALG-WEB-03), dung lượng = tổng byte `private/**` thuộc game của người dùng (bảng `storage_usage` cập nhật sau mỗi job), số game `DangLam`+`LuuTru`. Quản trị đổi `quotas` → xoá đệm qua `NOTIFY`, có hiệu lực ngay |
| ALG-WEB-06 | Khoá sửa | `POST lock`: `INSERT … ON CONFLICT (gameId) DO UPDATE` chỉ khi khoá trống, cùng phiên, hoặc hết hạn; nhịp giữ mỗi 60 s cập nhật `heartbeatAt`; thao tác ghi cập nhật `lastActivityAt`. Hết hạn khi `now − heartbeatAt > 180 s` (mất kết nối) hoặc `now − lastActivityAt > 15 phút` (FR-WEB-24). Cướp khoá (chủ game): gửi sự kiện `lock.changed` tới người giữ → SPA người giữ đẩy ngay `pending` (được phép trong 10 s ân hạn với `force-save` của khoá cũ) rồi chuyển chế độ xem, hiện MSG-WEB-04; ghi kiểm toán |
| ALG-WEB-07 | Phiên bản: khác biệt và khôi phục | Đọc phiên bản `n`: lấy snapshot gần nhất `≤ n` rồi áp chuỗi patch (đệm LRU 64 bản trong `api`). Khác biệt hai phiên bản theo đối tượng: duyệt mọi mảng có phần tử mang `id` → so theo `id` (thêm, xoá, sửa với danh sách trường đổi); phần không có `id` so theo JSON Pointer; hiển thị nhóm theo file/zone (FR-WEB-32). Khôi phục: tạo `n+1` nguồn `restore` có dữ liệu = phiên bản cũ (lịch sử giữ nguyên). Đặt tên/gắn sao chỉ cập nhật `name`, `starred` (FR-WEB-33) |
| ALG-WEB-08 | Chat | Tin nhắn người dùng → lưu `chat_messages` → gọi `@gamestudio/intake` (TSD-01 ALG-INT-07) qua cổng với task `proposal`. Phân loại bằng structured outputs `{kind: question\|change\|other}`. `question` (FR-WEB-13): server dựng "bảng dữ kiện" từ `game_heads` (đếm NPC/động vật/công trình theo zone và loại, tên zone, giờ, cờ tính năng; ≤ 4 KB) + trích đoạn JSON theo đường dẫn mô hình yêu cầu qua công cụ chỉ đọc `read_game_data(pointer)` (≤ 3 lần, mỗi lần ≤ 8 KB); trả lời văn bản, không tạo đề xuất. `change`: sinh `ChangeProposal` (TSD-01 ALG-INT-07, 08), lưu, gửi thẻ SCR-INT-01; quyết định qua API-WEB-22 áp bằng ALG-WEB-04 với nguồn `chat` (QT-WEB-03: không bao giờ tự áp). Đề xuất có `baseVersion` cũ hơn phiên bản hiện tại → hết hạn, đề nghị tạo lại (TSD-01 ALG-INT-08, ERR-INT-07) |
| ALG-WEB-09 | Xuất bản và link | Job `publish` (chỉ chủ game, FR-WEB-38): (1) kiểm provenance mọi asset đang dùng → thiếu → ERR-WEB-10 kèm danh sách (FR-WEB-39); (2) `engine publish --target web` (TSD-04 ALG-CLI-03): build đủ tier của `dataVersion`, QA nhẹ, quét bí mật thư mục, sinh credit từ provenance, `publish.json`; QA Fail ngân sách → `notMet=true`, SPA hiện MSG-WEB-03 trước khi xác nhận (FR-WEB-37); (3) chép vào `public/play/<publicationId>/` (bất biến). Hồ sơ hội thoại AI ghi riêng vào `private/dialogue/<publicationId>.json` (TSD-07 SCH-DLG-03), không nằm trong `public/`. Link: token = 16 byte ngẫu nhiên (`crypto.randomBytes`) mã base64url (22 ký tự, 128 bit); CSDL chỉ lưu SHA-256; hạn 1/7/30 ngày hoặc không hạn; `GET /p/{token}`: băm → tra `share_links` → hết hạn/thu hồi → 410 SCR-WEB-14 (ERR-WEB-09); `requireLogin` → cần phiên hợp lệ; hợp lệ → trả trang chơi với `base href` trỏ `public/play/<publicationId>/` và cấp token phiên chơi (TSD-07 SCH-DLG-04) khi game có NPC AI |
| ALG-WEB-10 | Vòng đời game, nhân bản, gói | Nhân bản: sao `game_heads` thành game mới phiên bản 1 nguồn `import`, sao `asset_usages` (asset dùng chung chỉ tham chiếu), không sao chat/job/xuất bản (FR-WEB-08). Xoá: `DaXoa` + `deletedAt`; khôi phục trong 30 ngày; cron pg-boss hằng ngày 02:00 tạo job `purge` cho game quá hạn (FR-WEB-09, QT-WEB-06). Xuất gói: job `export` dựng `games/<id>/` từ snapshot + asset kèm provenance + `manifest-goi.json {formatVersion, gameId, dataVersion, dataHash, engineVersion, assets[{id, version, sha256}], createdAt}` → zip (FR-WEB-34); nhập gói: tải lên theo phần, job `import` kiểm zip (đường dẫn không thoát thư mục, ≤ 2 GB, ≤ 20.000 tệp, chỉ đuôi cho phép), kiểm schema + `engine migrate --dry-run`, tạo game mới; asset trùng `sha256` dùng lại |
| ALG-WEB-11 | Thông báo | Sự kiện nghiệp vụ (job xong/lỗi, được chia sẻ, asset chờ duyệt, hạn mức ≥ 80%) → chèn `notifications` + `NOTIFY` → chuông qua SSE (FR-WEB-50); gộp thông báo cùng loại cùng game trong 5 phút; giữ 90 ngày. Không gửi email ở bản đầu (OI-WEB-04) |
| ALG-WEB-12 | Giới hạn tần suất | Trong `api`: token bucket bộ nhớ theo người dùng (60 yêu cầu/phút ghi, 600 đọc) và theo IP cho route công khai (`/api/auth/*`, `/p/*`: 30/phút) **(TSD đề xuất)**; `ai-gateway`: token bucket trong PostgreSQL (bảng `rate_buckets`, cập nhật nguyên tử) theo người dùng và theo `ai_config.rpm` của từng task (FR-WEB-42); vượt → 429 kèm `Retry-After` |
| ALG-WEB-13 | Áp nóng xem trước | Sau ALG-WEB-04, SPA nhận `data.version` + `impact`. `runtimeOnly=true` → `EditorBridge.applyRuntimePatch(ops)` (engine nạp lại phần dữ liệu đó: môi trường, giờ, tham số NPC, hội thoại…) trong ≤ 2 s (NFR-WEB-02); ngược lại gắn nhãn "cần build" lên đối tượng (theo JSON Pointer) và tăng bộ đếm trên nút Build (MSG-WEB-02, FR-WEB-17); vị trí vật đặt thay đổi được hiển thị tạm bằng proxy trong khung xem trước tới khi build lại |
| ALG-WEB-14 | Xem trước trên điện thoại | QR (`qrcode` tạo phía client) mã hoá `https://<host>/preview/<gameId>?t=<token>`; token xem trước JWT HS256 `aud=preview`, `{gameId, buildId, exp: +24 giờ}` ký bằng khoá riêng của `api`; `forward_auth` chấp nhận token này cho đúng `private/builds/<gameId>/<buildId>/` (FR-WEB-19). Link đo hiệu năng thêm `perf=1&route=<id>&pt=<token đo>` (TSD-04 mục 6) gửi số đo về API-WEB-60. Giả lập tier và khung 412 × 915 + safe area là CSS + `EditorBridge.simulateTier` (FR-WEB-20) |

### 5.1 Làm tiếp, cập nhật, nhập, nâng cấp (CR-01)

| Mã | Tên | Mô tả |
|---|---|---|
| ALG-WEB-15 | Báo cáo tiến độ (API-WEB-83) | `api` dựng `StatusSources` từ CSDL (`game_heads`, `brief_versions`, style, `change_proposals`, `jobs`, `publications`, `intake_sessions`, `edit_locks`, `asset_usages`) và kho đối tượng (`cache/<gameId>/index.json`, báo cáo QA) rồi gọi `computeStatus` (TSD-00 ALG-GEN-05) — cùng mã với `engine status`. Đệm `game_status_cache` khoá `(dataVersion, cacheEtag, maxJobUpdatedAt, maxProposalUpdatedAt)`; mỗi sự kiện `data.version`, `job.done`, đổi đề xuất/asset xoá đệm và phát SSE `status.changed`. Không lưu `stage` làm nguồn sự thật (QT-WEB-11). Mục tiêu P95 ≤ 500 ms (đệm trúng ≤ 50 ms) |
| ALG-WEB-16 | Build phần thay đổi | API-WEB-30 `dryRun=true`: chạy `planStale` ngay trong `api` (không tạo job) → `{steps[{step, zone, tier}], estimateMinutes}`. `stale=true`: tạo job `build` với `params.stale=true`, worker gọi `engine build --stale --json` (TSD-04 ALG-CLI-05); `singletonKey` = `gameId:build:stale:dataHash` để không chạy trùng (FR-WEB-63) |
| ALG-WEB-17 | Xuất bản bản mới và link | Job `publish` khi game đã có bản: worker gọi `engine publish --target web`, nhận `publish.json` có `changes[]`; `api` tạo `Publication` số `n+1` với `previousId`, `changes`; bản cũ không đổi (QT-WEB-10). SCR-WEB-09 trước khi xác nhận hiện tóm tắt thay đổi tính bằng ALG-WEB-07 giữa `dataVersion` của bản trước và hiện tại (FR-WEB-64). Giải link (`GET /p/{token}`): `mode=coDinh` → `publicationId` đã gắn; `mode=moiNhat` → `Publication` mới nhất của game có `taken_down_at IS NULL AND notMet=false`, không có → SCR-WEB-14 (FR-WEB-65). Chuyển link: API-WEB-86 cập nhật `publicationId` một link hoặc mọi link `coDinh` của game trong một giao dịch, ghi `audit_log` từng link |
| ALG-WEB-18 | Nhập game | `validate`: nhận zip (tải theo phần, ≤ 2 GB) vào `private/tmp/imports/`, job nhẹ `import` chế độ kiểm gọi `engine import --json` trên bản tạm (TSD-04 ALG-CLI-07) → báo cáo `import/1`; lưu `import_checks`, trả `importToken` (16 byte ngẫu nhiên, CSDL lưu băm, hạn 24 giờ). `POST /api/games/import`: kiểm token còn hạn và đúng người tải → tạo game mới `DangLam`, `GameVersion` 1 nguồn `import`, asset thiếu provenance vào `ChoDuyet` (không vào build), thiếu brief → `reverseBrief` (TSD-01 ALG-INT-11) với brief `ChoXacNhan` (FR-WEB-66, 67). `POST /api/games/{id}/import`: `gameId` trong gói phải khớp và người gọi giữ khoá, `baseVersion` khớp; trả khác biệt (ALG-WEB-07) để xác nhận rồi ghi `GameVersion` mới nguồn `import`, lịch sử giữ nguyên (FR-WEB-69). Lỗi → 422 ERR-WEB-14. Dọn `import_checks` và tệp tạm hết hạn hằng giờ |
| ALG-WEB-19 | Nâng cấp engine/schema | Cờ `canNangCap` từ ALG-WEB-15. API-WEB-85 tạo job `upgrade` (khe nặng): worker chạy `engine upgrade --no-apply --json` trên snapshot `dataVersion` hiện tại (TSD-04 ALG-CLI-06) → lưu snapshot ứng viên, báo cáo QA, ảnh trước/sau vào `upgrade_candidates`. Lỗi → job `Loi`, ERR-WEB-15, dữ liệu game không đổi. `accept`: kiểm khoá và `baseVersion` chưa đổi (đổi → 409 ERR-WEB-07, phải nâng cấp lại) → ghi `GameVersion` mới nguồn `upgrade` bằng snapshot ứng viên (ALG-WEB-04 bước 6–8), gộp cache phụ; bản xuất bản cũ giữ nguyên (FR-WEB-68, QT-GEN-12) |

---

## 6. Bảo mật

### 6.1 Kiểm soát theo OWASP Top 10

| Hạng mục | Biện pháp | FR |
|---|---|---|
| A01 Kiểm soát truy cập | ALG-WEB-02 trên mọi route; khởi động thất bại nếu route thiếu `action`; TST-WEB-01 sinh ca từ SCH-WEB-10; tải build/asset qua `forward_auth` | FR-WEB-04, 05 |
| A02 Mật mã | TLS do Caddy, HSTS `max-age=31536000; includeSubDomains`; token phiên/link 128–256 bit, CSDL chỉ lưu băm; khoá ký JWT tách theo mục đích (`preview`, `perf`, `dlg`) và xoay được (header `kid`) | FR-WEB-46 |
| A03 Chèn mã | Drizzle truy vấn tham số hoá; không nối SQL; worker gọi `execFile` không qua shell với danh sách lệnh cố định; JSON Pointer từ người dùng kiểm cú pháp | FR-WEB-47 |
| A04 Thiết kế | Web chỉ sửa JSON; script gameplay và generator mới chỉ qua quy trình phiếu (SRS-09); AI không tự áp thay đổi (QT-WEB-03) | FR-WEB-47 |
| A05 Cấu hình | CSP như TSD-00 mục 8.2 (`frame-ancestors 'none'`, không `unsafe-inline` cho script); `X-Content-Type-Options: nosniff`; cookie `Secure`; container chạy người dùng không phải root, hệ tệp chỉ đọc trừ thư mục làm việc | FR-WEB-46 |
| A06 Thành phần | `pnpm audit`, `pip-audit`, Trivy quét ảnh Docker trong CI; phiên bản cố định (TSD-09 SCH-DEV-03) | NFR-WEB-09 |
| A07 Xác thực | ALG-WEB-01; chỉ Google + danh sách mời; giới hạn tần suất route đăng nhập | FR-WEB-02, 03 |
| A08 Toàn vẹn | Gói nhập kiểm `sha256` từng asset; bản xuất bản bất biến; ảnh Docker build từ CI có tag | FR-WEB-34 |
| A09 Nhật ký | `audit_log` chỉ chèn, giữ 1 năm; log ứng dụng JSON (pino) có `requestId`, không ghi thân yêu cầu chứa nội dung AI hay khoá; bộ lọc `redact` cho header `authorization`, `cookie` | FR-WEB-49 |
| A10 SSRF | Nhập CC0 qua URL: chỉ miền trong `cc0_sources` (so khớp tên miền đầy đủ), phân giải DNS rồi chặn IP riêng/loopback/link-local/metadata, kết nối tới đúng IP đã kiểm, không theo chuyển hướng sang miền khác, ≤ 500 MB, thời gian chờ 60 s; chạy trong worker (TSD-03 mục 7, TST-AST-10) | FR-WEB-46 |

### 6.2 CSRF và XSS
- CSRF: cookie `SameSite=Lax` + với mọi phương thức ghi kiểm `Origin` (hoặc `Referer`) khớp danh sách gốc cấu hình; thiếu/khác → 403. API không nhận `application/x-www-form-urlencoded` hay `multipart` trừ route tải lên đã kiểm `Origin`.
- XSS: React escape mặc định; cấm `dangerouslySetInnerHTML` bằng lint; tên game/đối tượng/văn bản AI là văn bản thuần; SVG tải lên không được chấp nhận làm ảnh đại diện.

### 6.3 Khoá và bí mật
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY` chỉ là biến môi trường của container `ai-gateway`, nạp từ tệp `/etc/gamestudio/ai.env` quyền 600 thuộc root trên máy chủ (không nằm trong repo, không nằm trong ảnh Docker) (FR-WEB-43, QT-WEB-05).
- `api` và `worker` không có khoá dịch vụ AI; chỉ có token dịch vụ để gọi `ai-gateway` và khoá ký JWT riêng.
- Trang quản trị chỉ hiện "đã cấu hình / chưa" (SCH-WEB-09); log và phản hồi lỗi của nhà cung cấp được lọc trước khi trả về (chỉ giữ mã, kiểu lỗi).
- Bản xuất bản được quét bí mật trước khi chép ra `public/` (TSD-09 TST-DEV-04).

### 6.4 Cách ly worker
Container worker không có quyền tới CSDL ngoài vai trò `gs_worker` (chỉ bảng `jobs`, `job_reports`, `events_outbox`, hàng đợi); mạng ra ngoài chỉ qua proxy egress cho miền CC0, Copernicus, Overpass, Geofabrik; Blender chạy với `--python-exit-code 1 --factory-startup --disable-autoexec`, chỉ script trong repo (FR-WEB-47).

---

## 7. Hiệu năng

| Chỉ tiêu | Mục tiêu | Thiết kế đáp ứng |
|---|---|---|
| Tải trang Studio (cache lạnh, 50 Mbps) | ≤ 3 s | JS khởi đầu (thư viện game) ≤ 300 KB gzip **(TSD đề xuất)**; tách chunk theo route; engine, Monaco, xyflow nạp lười; tệp tĩnh có hash, `Cache-Control: immutable`; Brotli tại Caddy |
| Thao tác editor | ≤ 100 ms | Áp patch cục bộ trước, lưu nền; gizmo cập nhật engine trực tiếp qua `EditorBridge`, không vòng qua React state mỗi khung |
| Áp nóng | ≤ 2 s | ALG-WEB-13: ghi ≤ 300 ms + SSE ≤ 100 ms + nạp lại phần dữ liệu ≤ 1 s |
| API P95 trừ AI | ≤ 500 ms | `game_heads` đọc một dòng; chỉ mục theo `(gameId, n)`, `(userId, day)`; đệm phiên 30 s; pool kết nối 20; đo bằng histogram Prometheus của Fastify |
| Xem trước zone đã build | ≤ 10 s | Phục vụ tĩnh từ Caddy cùng máy, phần lõi zone trước (TSD-04 ALG-RTM-02) |
| Người dùng, job | ≥ 20 người, 5 job đồng thời | Một tiến trình `api` đủ (Node xử lý I/O); worker 3 × 2 khe (ALG-WEB-03); TST-WEB-10 kiểm tải |
| Mô tả → bản chơi | ≤ 30 phút, không tính bake | ALG-WEB-03 bước 5 (đường nhanh, bỏ bake, một zone, tier Vừa); generator chạy song song theo bước độc lập; TST-WEB-08 đo |

Ngân sách thời gian đường nhanh **(TSD đề xuất)**: tiếp nhận + câu hỏi ≤ 8 phút (phụ thuộc người dùng trả lời), style bible ≤ 3 phút, địa hình + đặt vật + cây ≤ 10 phút, đóng gói ≤ 3 phút, mở xem trước ≤ 10 s; còn ~5 phút dự phòng.

---

## 8. Vận hành

### 8.1 Triển khai
Docker Compose theo TSD-00 mục 9.2 (`caddy`, `api`, `ai-gateway`, `worker` × 3, `postgres`, `backup`). Thứ tự khởi động: `postgres` khoẻ → job migration Drizzle (`api migrate`) → `api`, `ai-gateway` → `worker` (mỗi worker chạy `engine doctor --json`; không đạt thì không đăng ký nhận job, ghi trạng thái `worker_status` để trang quản trị hiển thị; job vẫn xếp hàng với thông báo ERR-WEB-11) (FR-WEB-45). Ảnh `gs-worker` cài Blender 4.5 LTS và add-on đúng bản trong `tools/versions.json` (TSD-09 SCH-DEV-03).

### 8.2 Sao lưu và khôi phục
| Đối tượng | Cách | Lịch | Giữ | Đích |
|---|---|---|---|---|
| CSDL | `pg_dump -Fc` + restic | Hằng ngày 01:00 | 30 bản | Kho restic ngoài máy (SFTP/đối tượng của nhà cung cấp khác) |
| Kho đối tượng `private/`, `public/` | restic (khử trùng theo khối) | Hằng tuần CN 03:00 | 8 bản | Như trên |
| Cấu hình | `compose.yaml`, `Caddyfile` trong repo; `ai.env` không sao lưu (khoá cấp lại từ nhà cung cấp) | — | — | — |

Mật khẩu kho restic giữ ngoài máy chủ (Huy giữ). Diễn tập khôi phục mỗi pha W: dựng compose profile `studio-test`, khôi phục CSDL + kho đối tượng bản gần nhất, chạy kiểm khói (đăng nhập, mở game, build một zone), ghi biên bản `docs/TEST/dien-tap-khoi-phuc-<ngày>.md` với thời gian thực tế (RTO ≤ 4 giờ) (FR-WEB-44, NFR-WEB-06).

### 8.3 Giám sát
- `/healthz` (sống) và `/readyz` (CSDL, kho đối tượng, hàng đợi) cho `api`, `ai-gateway`; worker báo nhịp vào `worker_status` mỗi 30 s.
- Uptime Kuma kiểm mỗi 60 s, cảnh báo cho Huy trong giờ làm việc; tỉ lệ sẵn sàng tính trong khung 8:00–20:00 thứ 2–7 (NFR-WEB-05).
- Trang quản trị SCR-WEB-12/13 đọc: số người dùng, job theo trạng thái, thời gian job trung bình theo loại, chi phí AI theo ngày/người/game/loại việc (từ `usage_records`), dung lượng (`storage_usage`), API P95 (histogram trong bộ nhớ, cửa sổ 1 giờ) (FR-WEB-48).
- Dọn dẹp: build xem trước giữ 5 bản gần nhất mỗi game **(TSD đề xuất)**; cache bước LRU theo dung lượng; `events_outbox` 1 giờ; `notifications` 90 ngày; `audit_log` 1 năm.

### 8.4 Phát hành và quay lui
Như TSD-00 mục 9.3; migration chỉ mở rộng trong một bản phát hành; bảo trì báo trước qua thông báo hệ thống trên Studio (FR-WEB-58).

### 8.5 Quản trị mở rộng (SRS-08 v1.1)
- Tổng quan và dữ liệu vận hành (FR-WEB-48, 51): `api` tính từ bảng có sẵn (`users`, `jobs`, `worker_status`, `storage_usage`, `usage_records`, `share_links`), histogram P95 trong bộ nhớ, thời điểm sao lưu do job `backup` ghi vào bảng nhịp; không thêm dịch vụ giám sát.
- Thao tác quản trị trên dữ liệu người khác (huỷ/thử lại job, thu hồi link, gỡ bản xuất bản, chuyển chủ: FR-WEB-52, 55, 59) đi qua cùng ma trận quyền ALG-WEB-02 với hành động `admin.*` riêng, bắt buộc lý do, ghi `audit_log` (SCH-WEB-07) và gửi thông báo ALG-WEB-11.
- Gỡ bản xuất bản: đánh dấu `taken_down_at`, Caddy chặn `/play/<publicationId>/` qua `forward_auth`; giữ tệp để khôi phục khi cần (ALG-WEB-09).
- Nhật ký kiểm toán (FR-WEB-53): đọc bằng vai `gs_api` (chỉ `SELECT`, `INSERT`), phân trang theo `(at desc, id)`; CSV sinh dạng luồng, ≤ 10.000 dòng.
- Thống kê hội thoại AI (FR-WEB-56) đọc `dialogue_turns` (TSD-07), không đọc nội dung.
- Thông báo hệ thống (FR-WEB-58): bảng riêng, SPA lấy khi tải trang và qua SSE kênh toàn cục.

---

## 9. Kiểm thử

| Mã | Nội dung | Công cụ | Đạt khi |
|---|---|---|---|
| TST-WEB-01 | Ma trận quyền: sinh mọi tổ hợp (vai trò hệ thống × quyền theo game × hành động) từ SCH-WEB-10, gọi route tương ứng | Vitest + Testcontainers | Kết quả 2xx/403/404 đúng bảng; route nào thiếu ca → test fail (AC-08-05) |
| TST-WEB-02 | Đăng nhập: email chưa mời, chưa xác minh, bị khoá; khoá khi đang có phiên → API chặn ngay, SSE đóng ≤ 60 s | Vitest (giả lập OIDC) | ERR-WEB-01/02/03 đúng (AC-08-01) |
| TST-WEB-03 | Hạn mức: kịch bản QT-WEB-08 (4,1 → cho gọi → 5,1 → chặn), mốc 80%, ngày đổi theo giờ Việt Nam, quản trị nâng hạn mức có hiệu lực ngay | Vitest, đồng hồ giả | Đúng từng bước (AC-08-07) |
| TST-WEB-04 | Phiên bản: PATCH với `baseVersion` cũ → 409; gộp mốc 60 s; khôi phục tạo mốc mới; khác biệt theo `id`; snapshot + patch dựng lại đúng `dataHash` | Vitest | Đúng (AC-08-08) |
| TST-WEB-05 | Khoá sửa: A giữ, B mở → chỉ xem; hết hạn 15 phút; cướp khoá lưu thay đổi của A | Vitest + Playwright hai trình duyệt | Đúng (AC-08-04) |
| TST-WEB-06 | Hàng đợi: ưu tiên ngắn trước, bake cuối; giới hạn đồng thời theo người; thử lại `fail_env` ≤ 2; huỷ đang chạy; chạy lại cùng đầu vào hoàn tất từ cache | Vitest + worker giả (`engine` giả lập) | Đúng thứ tự, số lần |
| TST-WEB-07 | Xuất bản và link: thiếu provenance → ERR-WEB-10; `notMet`; link 7 ngày mở ngày 8 → 410 SCR-WEB-14; thu hồi; token không đoán được (độ dài, nguồn ngẫu nhiên) | Vitest + Playwright | Đúng (AC-08-06) |
| TST-WEB-08 | Đầu-cuối "mô tả → bản chơi": người thử mới nhập mô tả game nhỏ chuẩn (3 mẫu), đo từ lúc gửi tới lúc khung xem trước điều khiển được | Playwright trên `studio`, bấm giờ theo sự kiện job | ≤ 30 phút, không tính bake (AC-08-02, NFR-WEB-08) |
| TST-WEB-09 | Bảo mật: OWASP ZAP baseline + quét có xác thực; kiểm CSP, cookie, CSRF (Origin lạ), SSRF (URL tới 127.0.0.1, 169.254.169.254, chuyển hướng), tải lên tệp sai loại; quét bí mật bản build | ZAP, Vitest, gitleaks | Không lỗi mức cao trước G-W4 (NFR-WEB-09) |
| TST-WEB-10 | Tải: 20 người dùng ảo (đọc, sửa, chat giả lập AI), 5 job build đồng thời | k6 | API P95 ≤ 500 ms, không lỗi 5xx (NFR-WEB-02, 03) |
| TST-WEB-11 | Giao diện: tải trang ≤ 3 s (Lighthouse, cache lạnh, băng thông giới hạn); thao tác editor ≤ 100 ms (Performance API); áp nóng ≤ 2 s; xem trước ≤ 10 s; bố cục 1366 px và điện thoại | Playwright + Lighthouse CI | Đạt các ngưỡng (NFR-WEB-01, 02, 04, 07) |
| TST-WEB-12 | Diễn tập khôi phục (mục 8.2) | Thủ công theo kịch bản | Khôi phục xong ≤ 4 giờ, kiểm khói đạt (NFR-WEB-06) |
| TST-WEB-13 | Tiến độ web: các game mẫu như TST-CLI-04 nạp vào CSDL → API-WEB-83 trả đúng `status/1` như `engine status` trên cùng dữ liệu (so JSON); lọc "Đang dở", Làm tiếp mở SCR-WEB-19 với "Build zone z2" (AC-CR01-07) | Vitest + Playwright | Trùng khớp; P95 ≤ 500 ms |
| TST-WEB-14 | Mở lại game: đề xuất chờ duyệt, người khác sửa dữ liệu → mở lại thấy `HetHan` + Tạo lại đề xuất; tóm tắt tiến độ là tin đầu chat (AC-CR01-08) | Playwright | Đúng |
| TST-WEB-15 | Xuất bản bản 2: link `coDinh` vẫn mở bản 1, `moiNhat` mở bản 2; bản 2 "chưa đạt" → `moiNhat` vẫn mở bản 1; chuyển mọi link → mở bản 2, có kiểm toán (AC-CR01-09) | Vitest + Playwright | Đúng |
| TST-WEB-16 | Nhập: zip thư mục game Claude Code không brief → game mới, brief `ChoXacNhan`, Build bị chặn; nhập vào game khác `gameId` → ERR-WEB-14; khớp → xem khác biệt, áp tạo `GameVersion` nguồn `import`; token quá 24 giờ → ERR-WEB-14 (AC-CR01-10, 11) | Vitest + Playwright | Đúng |
| TST-WEB-17 | Nâng cấp: job lỗi → ERR-WEB-15, `game_heads` không đổi; thành công + chấp nhận → `GameVersion` nguồn `upgrade`, bản xuất bản cũ không đổi hash; dữ liệu đổi giữa chừng → accept 409 | Vitest (worker giả) | Đúng |

---

## 10. Open item kỹ thuật

| Mã | Câu hỏi | Đề xuất | Liên quan |
|---|---|---|---|
| OIT-WEB-01 | Thời hạn phiên | Không hoạt động 12 giờ, tuyệt đối 7 ngày | FR-WEB-46 |
| OIT-WEB-02 | Chu kỳ snapshot phiên bản | Mỗi 20 phiên bản hoặc patch > 256 KB; xem lại sau 3 tháng dùng | FR-WEB-31 |
| OIT-WEB-03 | Mặc định hạn mức ngoài chi phí AI (job đồng thời, GB, số game) | 2 job, 20 GB, 20 game | FR-WEB-06, OI-WEB-08 |
| OIT-WEB-04 | Vị trí kho sao lưu ngoài máy | Dịch vụ lưu trữ đối tượng của nhà cung cấp khác máy chủ chính, mã hoá restic | FR-WEB-44 |

---

## 11. Truy vết

| Yêu cầu SRS | Thành phần TSD |
|---|---|
| FR-WEB-01…03 | ALG-WEB-01, SCH-WEB-01, TST-WEB-02 |
| FR-WEB-04, 05 | ALG-WEB-02, SCH-WEB-10, TST-WEB-01 |
| FR-WEB-06, 07 | ALG-WEB-05, SCH-WEB-06, TST-WEB-03 |
| FR-WEB-08, 09 | ALG-WEB-10, SCH-WEB-03 |
| FR-WEB-10 | SCH-WEB-02 |
| FR-WEB-11 | ALG-WEB-08, IF-WEB-03 |
| FR-WEB-12, 13 | ALG-WEB-08 |
| FR-WEB-14 | IF-WEB-02, IF-WEB-04, ALG-WEB-03 |
| FR-WEB-15 | ALG-WEB-11, IF-WEB-02 |
| FR-WEB-16 | Mục 3.4, IF-WEB-05 |
| FR-WEB-17 | ALG-WEB-13 |
| FR-WEB-18 | IF-WEB-05 |
| FR-WEB-19, 20 | ALG-WEB-14 |
| FR-WEB-21…23 | IF-WEB-05, mục 3.2 |
| FR-WEB-24 | ALG-WEB-06, TST-WEB-05 |
| FR-WEB-25 | Mục 3.1 (panel SCR-WLD-02) |
| FR-WEB-26, 27 | Mục 3.3, ALG-WEB-04 |
| FR-WEB-28 | ALG-WEB-04 |
| FR-WEB-29, 30 | Mục 3.1, 3.3 |
| FR-WEB-31…33 | SCH-WEB-03, ALG-WEB-07, TST-WEB-04 |
| FR-WEB-34 | ALG-WEB-10 |
| FR-WEB-35 | SCH-WEB-07, ALG-WEB-02 |
| FR-WEB-36…39 | ALG-WEB-09, SCH-WEB-05, TST-WEB-07 |
| FR-WEB-40, 41 | ALG-WEB-03, SCH-WEB-04, IF-WEB-04, TST-WEB-06 |
| FR-WEB-42, 43 | IF-WEB-03, SCH-WEB-09, ALG-WEB-12, mục 6.3 |
| FR-WEB-44 | Mục 8.2, TST-WEB-12 |
| FR-WEB-45 | Mục 8.1 |
| FR-WEB-46, 47 | Mục 6 |
| FR-WEB-48 | Mục 8.3 |
| FR-WEB-49 | SCH-WEB-07 |
| FR-WEB-50 | ALG-WEB-11 |
| FR-WEB-51, 54, 58 | Mục 8.3, mục 8.5 |
| FR-WEB-52 | ALG-WEB-03, mục 8.5 |
| FR-WEB-53 | SCH-WEB-07, mục 8.5 |
| FR-WEB-55 | ALG-WEB-09, SCH-WEB-05, mục 8.5 |
| FR-WEB-56 | Mục 8.5 (TSD-07 `dialogue_turns`) |
| FR-WEB-57 | Mục 8.5, ALG-WEB-02 |
| FR-WEB-59 | ALG-WEB-02, SCH-WEB-07, mục 8.5 |
| NFR-WEB-01…04, 07 | Mục 3, mục 7, TST-WEB-10, TST-WEB-11 |
| NFR-WEB-05, 06 | Mục 8, TST-WEB-12 |
| NFR-WEB-08 | ALG-WEB-03, TST-WEB-08 |
| NFR-WEB-09 | Mục 6, TST-WEB-09 |
| FR-WEB-60, 61 | Mục 3.7, ALG-WEB-15, TST-WEB-13 |
| FR-WEB-62 | Mục 3.7, TST-WEB-14; TSD-01 ALG-INT-10, ALG-INT-13 |
| FR-WEB-63 | ALG-WEB-16; TSD-04 ALG-CLI-05 |
| FR-WEB-64, 65 | ALG-WEB-17, SCH-WEB-11, TST-WEB-15 |
| FR-WEB-66, 67 | ALG-WEB-18, SCH-WEB-11, TST-WEB-16; TSD-01 ALG-INT-11 |
| FR-WEB-68 | ALG-WEB-19, SCH-WEB-11, TST-WEB-17 |
| FR-WEB-69 | ALG-WEB-18, TST-WEB-16 |

## 12. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 22/11/2026 | Claude | Bản đầu từ SRS-08 v0.1 |
| 1.0 | 22/11/2026 | Huy | Duyệt toàn bộ tài liệu |
| 1.1 | 22/11/2026 | Claude | Chốt các số "(đề xuất)" có nguồn từ SRS sau khi Huy duyệt SRS |
| 1.2 | 23/11/2026 | Claude | Theo SRS-08 v1.1: sửa sơ đồ mục 3.2 khớp SRS (chat cột trái), thêm mục 8.5 quản trị mở rộng, truy vết FR-WEB-51…59 |
| 1.3 | 23/11/2026 | Claude | CR-01 (SRS-08 v1.2): mục 3.7, SCH-WEB-11, ánh xạ API-WEB-83…86, mục 5.1 ALG-WEB-15…19, TST-WEB-13…17, nguồn `upgrade`, job `upgrade`, truy vết FR-WEB-60…69 |
| 1.3 | 23/11/2026 | Huy | Duyệt phần bổ sung CR-01 |
