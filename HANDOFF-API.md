# GameStudio: bàn giao ngữ cảnh để tiếp tục dự án

Cập nhật 23/11/2026 (lần 2: đối chiếu hiện trạng tài liệu và máy dev, thêm mục 6.1 chuẩn bị E0). File này là ngữ cảnh khởi động cho mọi phiên làm việc tiếp theo. Theo quyết định của Huy ngày 23/11/2026, dự án chủ yếu được làm qua gói Max của Huy (Claude Code/ứng dụng Claude) để build game, không qua API tính theo token. Không chứa khoá bí mật. Trả lời và viết tài liệu bằng tiếng Việt.

## 1. Dự án và mục tiêu
GameStudio là engine web game 3D dùng lại được cùng Web Studio để người dùng tạo, chỉnh và làm tiếp game từ mô tả. Thư mục gốc trên máy Huy: `C:\GameStudio` (brief gốc `GAME-ENGINE-WEB3D-BRIEF.md`, bản 6, 22/11/2026, quyết định QĐ-01…15). Thiết bị đích: Galaxy A56, mục tiêu 30 fps, tier "Vừa". Brief ưu tiên tài liệu gọn, độ chặt chẽ tối thiểu (`rigor: minimal`).

## 2. Bản đồ tài liệu (đọc từ `C:\GameStudio\docs`)
| Bộ | Tệp | Phiên bản / trạng thái |
|---|---|---|
| BRD | `BRD-TONG-QUAN` + `BRD-01…10` | v1.0–1.1, **đã duyệt** (Huy, 22–23/11/2026). BRD-10 = làm tiếp/cập nhật game (BR-119…126) |
| SRS | `SRS-00-TONG-QUAN` + `SRS-01…09`, phụ lục A truy vết | v1.0–1.2, **đã duyệt**; có CR-01 (làm tiếp/nhập game) và mở rộng quản trị (SRS-08 v1.2, SRS-00 v1.2). Tổng 358 FR |
| TSD | `TSD-00-TONG-QUAN` + `TSD-01…09` | v1.1–1.3, **đã duyệt** (TSD-08 v1.3). TD-01…18 chốt 22/11 |
| ADR | `ADR-001…034` (+ README) | **Đã chốt**. ADR-001…015 (QĐ-01…15) ghi 23/11/2026; ADR-016…033 (TD-01…18); ADR-034: Blender 5.2 LTS |
| DDD | `DDD-00-TONG-QUAN` + `DDD-01…09` | v1.0, **đã duyệt** (Huy, 23/11/2026) |
| UIUX | `UIUX-00-TONG-QUAN`, `01…04`, phụ lục, `prototype/*.html` | v1.0, **đã duyệt** (Huy, 23/11/2026); đề xuất trong mọi bảng Open item (OIU) được nhận làm giá trị nền; sửa tiếp phải qua change request |
| POC, TEST | thư mục rỗng | chưa có tệp nào |

Đối chiếu ngày 23/11/2026: tiêu đề mọi tệp DDD và UIUX ghi "Đã duyệt (Huy, 23/11/2026)", nên việc "duyệt DDD/UIUX" đã đóng.

Hệ mã truy vết: `BR/BO/QĐ` (BRD) → `FR/QT/NFR/UC/SCR/API/ERR/OI` (SRS) → `TD/ALG/SCH/IF/TST/OIT` (TSD) → `MOD/DTO/TBL/EP/SEQ/STM/PSC/CFG/TC/OID` (DDD) → `WF/UF/UXR/TXT/UT/CMP/TOK/OIU` (UIUX). Nhóm: INT, WLD, AST, RTM/QA/CLI, CHR, CBT, DLG, WEB, DEV, GEN. Trong SRS, "BR" luôn là mã BRD.
Script truy vết (chạy sau mỗi lần sửa tài liệu, exit 0 là đạt):
- `python docs/SRS/tools/srs-trace.py`
- `python docs/TSD/tools/tsd-trace.py docs/TSD docs/SRS`
- `python docs/DDD/tools/ddd-trace.py docs/DDD docs/TSD docs/SRS`
- `python docs/UIUX/tools/uiux-trace.py`

Trên Windows PowerShell phải bật UTF-8 trước, nếu không script sẽ dừng với `UnicodeEncodeError` (exit 1) vì console không in được tiếng Việt: `$env:PYTHONIOENCODING='utf-8'`. Kết quả ngày 23/11/2026: cả 4 script exit 0 (358 FR; 406 mã TSD; DDD không có tham chiếu hỏng; UIUX phủ 141/141 FR bắt buộc). Script tự ghi lại các tệp phụ lục `*-PL-A-MA-TRAN-TRUY-VET.md`.

## 3. Quyết định công nghệ đã chốt (ADR-016…033)
- Monorepo pnpm workspaces (TS) + uv (Python); chạy song song `pnpm -r`; không Turborepo/Nx bản đầu (016).
- Node 24 LTS, TypeScript 5.x strict, Python 3.12; phiên bản ghi ở `tools/versions.json` (017). **Blender 5.2 LTS** + Sapling Tree Gen 1.2.0 + A.N.T. Landscape 0.2.0 (**ADR-034**, 23/11/2026, thay phần Blender 4.5 của ADR-017; mọi chỗ "Blender 4.5" trong TSD/DDD hiểu là 5.2).
- Runtime đồ hoạ Three.js bản cố định tại E0 (018); kiến trúc runtime, va chạm/điều hướng, dữ liệu/schema, biểu thức an toàn, điều phối build, nén asset, địa hình, bake ánh sáng (019–026).
- Web Studio: React 19 + Vite + TS, TanStack Query, Zustand, Tailwind + Radix, @xyflow/react, Monaco; xem trước nhúng thẳng `@gamestudio/engine` (027).
- Backend: Fastify (Node 24) cho `web/api` và `web/ai-gateway`; PostgreSQL 17 + Drizzle; pg-boss; SSE qua LISTEN/NOTIFY (028).
- Kho đối tượng (029); xác thực Google OIDC, phiên opaque trong PostgreSQL, JWT chỉ cho token ngắn hạn (030).
- AI (031, **sửa bởi ADR-035, 23/11/2026**): việc soạn game của Web Studio (tiếp nhận, đề xuất, nháp kịch bản) chạy bằng **Claude Code CLI** (`claude -p --output-format json --json-schema …`), **mỗi người dùng tự đăng nhập** bằng tài khoản/khoá của họ; máy chủ không giữ thông tin đăng nhập Claude của ai; không dùng gói Max của Huy cho người khác. Claude Code chạy trên máy người dùng qua cầu nối cục bộ. Gemini (`@google/genai`), ElevenLabs (REST) vẫn qua `ai-gateway` giữ khoá. Hội thoại NPC khi chơi chỉ kịch bản tĩnh (không còn `claude-haiku-5-5`).
- Triển khai Docker Compose trên Ubuntu 24.04 + Caddy + restic + Uptime Kuma (032); QA Playwright + ssim.js + pixelmatch (033).
- Giá trị đã định: công thức sát thương mặc định `max(1, atk + weapon - def)` (SRS-06 v1.1).

## 4. Mã nguồn: mới có bản fork bộ gốc (E0-01)
Một khung monorepo và dịch vụ `ai-gateway` đã được dựng thử rồi **gỡ bỏ hoàn toàn** ngày 23/11/2026 theo yêu cầu của Huy (dự án làm chủ yếu qua gói Max).

Từ 23/11/2026, `C:\GameStudio` là **repo git cục bộ** (Huy chọn không dùng remote; không có GitHub). Nhánh `main` gồm:
- `f771f5e` E0-01: fork `threejs-game-skills@8286774`. Skill nằm ở `.claude/skills/` (8 skill gốc), đã bỏ `threejs-3d-generator`/Tripo và phần Codex. Có thêm `UPSTREAM.md`, `.gitattributes` (LF) và `.gitignore` theo TSD-09 §6. `LICENSE` trùng vendor.
- `7977f93`: tài liệu dự án (`docs/`, brief, file này).
- Nhánh `vendor/upstream` = bản gốc nguyên vẹn. Remote `upstream` chỉ fetch (push bị vô hiệu).
- Kiểm thử helper của bộ gốc: `pnpm test:helpers` (29 test Python + 48 test Node, đạt). Scaffold Vite gốc nằm trong `.claude/skills/threejs-gameplay-systems/assets/threejs-vite-game/`.
- E0-02: khung monorepo pnpm + uv (Python 3.12.16 do uv quản lý). Lệnh kiểm tra: `pnpm lint`, `pnpm exec tsc -p tsconfig.json`, `pnpm test`, `pnpm depcruise`, `pnpm format:check`, `uv run ruff check`. **Chưa có gói engine/web nào** (`engine/`, `web/` mới có README).
- E0-04/05: studio AI `.claude/` + `CLAUDE.md` + `project.yaml` + pre-commit gitleaks; ADR-001…015. `node tools/scripts/structure-check.mjs` kiểm cấu trúc và LICENSE trùng vendor. 53 test Vitest đạt.
- E0-03: gói đầu tiên `@gamestudio/cli`, lệnh `pnpm doctor` (build + chạy `engine doctor`). Chromium của Playwright (bản 1255) đã cài; `@gltf-transform/cli` 4.5.1 thêm vào devDependencies gốc.
- Bản devDependency cố định chính xác (không `^`): TypeScript 5.9.3, Vitest 5.1.1, ESLint 10.15.0, typescript-eslint 8.73.0, Prettier 3.10.1, dependency-cruiser 18.9.0, @types/node 24.19.2, @playwright/test 1.65.1; Python: ruff 0.17.6, mypy 2.4.1, pytest 9.2.0.

Tài liệu vẫn mô tả hai thành phần đó như **kiến trúc sản phẩm tương lai**, chưa có code:
- ADR-016 (monorepo pnpm + uv), ADR-028 (Fastify/PostgreSQL) và ADR-031 (dịch vụ AI, `ai-gateway` giữ khoá, ALG-WEB-05 hạn mức/chi phí) cùng TSD-00 §4 (cây thư mục `engine/`, `web/`), TSD-08, TSD-09, DDD-08/09.
- Đây là mô tả đích cho Web Studio; không phải cách làm việc hằng ngày. Khi bắt đầu viết mã, dựng lại khung theo TSD-00 §4.1 hoặc điều chỉnh bằng ADR mới (trường "Thay thế") nếu Huy muốn đổi hướng.
- Việc làm game qua gói Max (Claude Code) bám các tài liệu đã duyệt; ADR-031 chỉ áp dụng cho dịch vụ AI trong sản phẩm Web Studio (khoá do máy chủ giữ), không áp dụng cho phiên Claude Code của Huy.

Hiện trạng máy dev (kiểm ngày 23/11/2026):
| Công cụ | Có | ADR-017 cần | Ghi chú |
|---|---|---|---|
| Node | 24.21.0 | 24 LTS | Đạt |
| pnpm | 12.16.1 | ghi ở `versions.json` | Đạt |
| uv | 0.13.6 | có | Đạt |
| Python | 3.14.7 (hệ thống) | **3.12** | Lệch: dùng `uv python install 3.12` + `.python-version`, không đổi Python hệ thống |
| git | 2.55.0 | có | Repo cục bộ, đã có từ E0-01 |
| Blender | **5.2.4 LTS** `C:\Tools\blender-5.2.4-windows-x64` (Python nhúng 3.13); bản 4.2.9 vẫn còn ở `C:\Tools` nhưng không dùng | **5.2 LTS** (ADR-034) | Đạt. Add-on cài từ extensions.blender.org ngày 23/11/2026, đã bật: `bl_ext.blender_org.sapling_tree_gen` 1.2.0, `bl_ext.blender_org.antlandscape` 0.2.0 (ở `%APPDATA%\Blender Foundation\Blender\5.2\extensions\blender_org\`) |
| Docker | không có | (máy chủ W1) | Chỉ cần nếu chạy thử Compose trên máy dev |
| ktx | **4.4.2** `C:\Tools\ktx-4.4.2\bin` | có `ktx create` | Đạt (bộ cài KhronosGroup chính thức, SHA-256 khớp GitHub release) |
| ffmpeg | **n9.0.2** bản LGPL `C:\Tools\ffmpeg-n9.0-latest-win64-lgpl-9.0\bin` | LGPL + libopus (ADR-024) | Đạt: có encoder `libopus`, không bật `--enable-gpl`. Nguồn BtbN/FFmpeg-Builds; SHA-256 khớp release |
| gitleaks | **8.30.1** `C:\Tools\gitleaks-8.30.1` | có | Đạt. Quét toàn lịch sử repo: 1 báo động giả trong commit upstream `1d67249` (chuỗi so sánh trong test), đã ghi vào `.gitleaksignore` kèm lý do; còn lại không có |

Bốn thư mục Blender 5.2.4, ktx, ffmpeg, gitleaks đã được thêm vào **PATH của user** (cần mở terminal hoặc Claude Code mới để nhận).

## 5. Việc còn mở
1. ~~Duyệt UIUX/DDD~~ **Đã đóng 23/11/2026**: UIUX v1.0 và DDD v1.0 đã duyệt. OIU-WEB-06 theo đề xuất: Tiến độ là tab đầu của bảng phải 400 px, mở bằng chip giai đoạn. OIU-WEB-07 theo đề xuất: tab mặc định của thư viện là "Đang dở" khi có ít nhất một mục, và nhớ tab người dùng chọn lần cuối.
2. **API hạn mức (tài liệu):** OIU-WEB-04 `GET /api/me/usage?from=&to=` cho SCR-WEB-03 chưa có trong DDD-08/TSD-08. Theo UIUX-00 §8, việc này **làm qua change request khi tới W2** (thêm endpoint vào DDD-08, không đổi SRS). Phần `ai-gateway` (hạn mức, ALG-WEB-12, `ai_config`) mới chỉ là thiết kế trong TSD-08, chưa có code.
3. **Số chờ đo trên A56:** OI-CHR-07 (LOD hành vi 30/80 m), OI-CBT-05 (ngân sách chiến đấu tier Vừa 3/20); các số "(đề xuất)" trong TSD chỉnh theo đo đạc. Baseline E0 đã đo (23/11/2026). OIT-GEN-01: giữ DPR 1,5 làm giá trị nền vì cảnh scaffold không phân biệt được 1,5 với 2; đo lại ở G-E2 với cảnh nặng.
4. **Kho usage:** thiết kế PostgreSQL `usage_records` + `llm_calls` (SCH-WEB-06) nằm trong TSD; chưa triển khai (không còn mã nào).
5. **Vị trí chat/Tiến độ trong TSD-08:** TSD-08 v1.2 đã sửa sơ đồ §3.2 cho chat ở cột trái, khớp SRS. Vị trí bảng Tiến độ đã chốt theo OIU-WEB-06 (mục 1). Còn lại: nếu TSD-08 §3.2 cần vẽ thêm tab Tiến độ thì làm change request nhỏ khi tới W2/W3. Không chặn E0.
6. Khác: OIT-GEN-02 (cấu hình máy chủ), OIT-GEN-04 (nơi chạy CI; repo chỉ cục bộ nên tạm dùng pre-commit).
7. **ADR-035 (Huy chốt hết 23/11/2026):**
   - QĐ-02 áp dụng cho quy trình phát triển; QĐ-07 giữ nguyên.
   - Web Studio soạn game bằng Claude Code CLI **chạy trên máy người dùng qua chương trình cầu nối nhỏ**; người dùng tự đăng nhập; máy chủ không gọi Claude.
   - Hội thoại NPC khi chơi **chỉ kịch bản tĩnh**: không có `dialogue-ai`, không có dịch vụ hội thoại.
   - **Việc ở W1:** change request cho SRS/TSD/DDD/UIUX (danh sách trong ADR-035); thiết kế cầu nối (giao thức `127.0.0.1` + mã ghép đôi + kiểm Origin, cách cài, công cụ cho phép); Huy đồng ý Commercial Terms của Anthropic trước khi mời người khác.

## 6. Lộ trình (TSD-00 §11)
- **E0:** scaffold, `tools/versions.json`, `engine doctor`, `.claude/`, baseline A56, ADR-001…015. Song song được: **W1**.
- **W1:** Compose + Caddy, OIDC + mời, quyền, chat + intake qua `ai-gateway`, ghi sử dụng (cần kho PostgreSQL).
- **W2:** hàng đợi + worker, xem trước, phiên bản, hạn mức, sao lưu, trang quản trị.
- **W3:** editor (cảnh, NPC, động vật, hội thoại, bảng cân bằng), khoá sửa, đề xuất thay đổi.
- **W4:** kho asset, xuất/nhập gói, chia sẻ, xuất bản, link chơi thử, JSON thô, rà soát bảo mật.
- **Engine E1→E8:** schema/rng/expr/intake → materials/packager/runtime → water/vegetation/fx → asset/khung xương → bake ánh sáng → tương tác/NPC/hội thoại/chiến đấu → tối ưu/game thứ hai. W1–W4 chạy song song sau cổng G-E1.

### 6.1 E0 (đã qua G-E0 ngày 24/11/2026)
Điều kiện qua G-E0 (SRS-00 §4.3; BRD-00 §9): ADR-001…015 đã viết; `engine doctor` đạt; scaffold gốc chạy trên A56 và baseline ghi vào `budgets.json`; hook, template, `project.yaml`, `CLAUDE.md` sẵn sàng. Phạm vi FR: SRS-09 toàn bộ FR-DEV trừ 06, 25; SRS-04 FR-RTM-12, 13, FR-QA-07.

Thứ tự phiếu đề xuất (mỗi phiếu một phiên Claude Code, `/clear` giữa các phiếu):
| # | Phiếu | Nguồn | Ghi chú |
|---|---|---|---|
| 1 | ✅ **Xong 23/11/2026** (`f771f5e`): `git init`, `.gitignore`, fork `majidmanzarpour/threejs-game-skills` (MIT): nhánh `vendor/upstream`, ghi `UPSTREAM.md`, giữ `LICENSE`; bỏ phần Codex và skill `threejs-3d-generator` | QĐ-01, 02, 07, 08; ALG-DEV-09; SCH-DEV-06 | Repo chỉ cục bộ (Huy chốt). Hệ quả: OIT-GEN-04, CI GitHub Actions (ALG-DEV-10) chưa có nơi chạy, tạm thay bằng pre-commit + script cục bộ |
| 2 | ✅ **Xong 23/11/2026**: khung monorepo theo TSD-00 §4.1/DDD-00 §4: `pnpm-workspace.yaml`, `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint (luật tất định + chunk combat/dialogue-ai), Prettier, `.dependency-cruiser.cjs` (7 luật DDD-00 §4.2 + DDD-08), Vitest; `pyproject.toml` (workspace uv, Ruff, mypy strict, pytest) + `.python-version` 3.12; README cho `engine/`, `web/`, `games/`, `tools/` | ADR-016, 017; TSD-00 §4.2–4.3; DDD-00 §2.1, 2.4, 4 | Chưa có gói nào; mọi kiểm tra chạy trên cây rỗng đều đạt; luật ESLint/depcruise đã thử bằng tệp vi phạm tạm (bắt đủ 6 ca) rồi xoá |
| 3 | ✅ **Xong 23/11/2026**: gói `@gamestudio/cli` (`engine/cli`) với lệnh `engine doctor [--role] [--json]`; `tools/versions.json` + `tools/schema/versions.schema.json`; đầu dò `blender-probe.py` (phiên bản, add-on nạp được, SHA-256 thư mục add-on). Doctor trên máy dev: **đạt** (17 mục OK, 3 khoá tuỳ chọn thiếu), 3,7 s | SCH-DEV-03, IF-DEV-03, ALG-DEV-06, PSC-DEV-06; TST-DEV-03, TST-CLI-02; ADR-034 | Three.js cố định **0.187.0** (chỉ ghi nhận, chưa gói nào dùng). Lệch DDD-09: GEMINI/ELEVENLABS để tuỳ chọn ở vai trò `dev`; `DoctorCheck.optional`; versions.json thêm `probe/roles/optional/timeoutS/features` (xem `engine/cli/README.md`) |
| 4 | ✅ **Xong 23/11/2026**: `.claude/` gồm 8 agent, 5 hook (H-01/02/04 chặn, H-03/05 cảnh báo qua `additionalContext`) dạng exec `node <tệp>`, `settings.json` (deny đọc bí mật, allow lệnh kiểm), `settings.debug.json`, 5 rule theo `paths:`, 6 mẫu, 15 lệnh slash; `CLAUDE.md` (67 dòng), `project.yaml`, `.githooks/pre-commit` (gitleaks + CLAUDE.md < 150; đã bật `core.hooksPath`), `gitleaks.toml`, `LICENSES.md`, `tools/scripts/structure-check.mjs` | TSD-09 §2.1, IF-DEV-01…05, ALG-DEV-03…05, 08; TST-DEV-01, 02, 05 | 35 test hook + 1 test cấu trúc đạt; pre-commit đã chặn khoá giả. Chưa có: skill `engine-*` (từ E1), `ticket-new.mjs`, `token-meter.mjs`; 10 lệnh slash cần CLI E1+ ghi rõ "chưa có" |
| 5 | ✅ **Xong 23/11/2026**: ADR-001…015 từ QĐ-01…15 (mẫu giống ADR-016+), danh mục `docs/ADR/README.md` | FR-DEV-11, SCH-DEV-07 | Diễn giải QĐ-15 đã được Huy xác nhận → ADR-035; ADR-008 ghi "được nới bởi ADR-012" |
| 6 | ✅ **Xong 23/11/2026** (Huy đo A56: DPR 2 → fps tb 71,7 / p5 56,8; DPR 1,5 → 60,1 / 55,6; `docs/gates/G-E0/a56-baseline.*`). Chi tiết: `prototypes/baseline-a56` = scaffold gốc + `?perf=1` (60 s đo, hiện JSON + nút sao chép) + `?dpr=` (OIT-GEN-01); build xong (`dist/` 590 KB JS, 149 KB gzip; gitleaks sạch). Kiểm trên máy dev bằng `smoke-perf.mjs` (SwiftShader, chỉ kiểm chạy được, **không phải số A56**): 0 lỗi, 26 draw call, 3.226 tri. **Đã xuất bản 23/11/2026** lên poc (chính máy này, `160.191.243.120:18080`, máy chủ `serve_poc.py` của Thiền viện online) tại `/<mã>/split/gamestudio-baseline-a56/index.html`; kiểm qua IP công khai: tải đủ, 0 lỗi | FR-RTM-12, 13, FR-QA-07 | Mã truy cập ở `C:\poc-public\LIEN-KET.txt`, không ghi vào repo. `publish_poc.py --split` của Thiền viện online sẽ xoá bản này (xem README prototype) |
| 7 | ✅ **G-E0 ĐÃ QUA** (Huy xác nhận 24/11/2026 00:37): `docs/gates/G-E0.md`, 7/7 điều kiện tự kiểm đạt; m1 (Samsung Internet) và m2 (phần hoãn sang E1) được chấp nhận | ALG-DEV-07, SCH-DEV-05, QT-DEV-03 | Baseline A56: `docs/gates/G-E0/a56-baseline.md` (fps p5 55,6 ở DPR 1,5; chạm trần 60 fps của trình duyệt; cảnh quá nhẹ để chốt ngân sách cảnh lớn) |

**E0 hoàn tất; G-E0 đã qua ngày 24/11/2026.** Đang ở **E1**.

**Phiếu E1 đã xong:**
- **T-0001** (24/11/2026, `docs/tickets/T-0001.md`): `@gamestudio/rng` (PCG32 + `deriveSeed`, TS = Python theo `vectors.json`); lõi `@gamestudio/schema` (`canonicalize` RFC 8785, `sha256Hex`/`jsonHash`/`dataHash`, `evaluate`, `validate` Ajv, schema `budgets/1`); `games/_template/data/budgets.json` có baseline A56.
- **T-0002** (24/11/2026, `docs/tickets/T-0002.md`): schema `game/1`, `world/1`, `palette/1` (+ `common/1`) và mẫu `games/_template/data/*.json`; `pointer.ts` (RFC 6901), `patch.ts` (RFC 6902, `applyPatch`/`invertPatch`/`touchedFilesOf`, MOD-GEN-06); Ajv standalone `dist/validators.{js,cjs}` (MOD-RTM-04), hook H-03 dùng; lệnh `engine validate [--all|--staged|<tệp>] [--schema] [--json]`, thoát 0/4 (TC-GEN-01). 100 test đạt. Lệch tài liệu chờ change request: `schemaVersion` số nguyên (SRS-01 §6.2 ghi string), `world.bbox` dạng object theo DDD-02.

- **T-0003** (24/11/2026, `docs/tickets/T-0003.md`): `@gamestudio/expr` phần điều kiện (ADR-022; MOD-GEN-11, MOD-RTM-15, PSC-RTM-04): lexer, Pratt parser, kiểm tĩnh (slot, kiểu, số đối), gập hằng, closure ngắn mạch; không `eval`/`Function`; giới hạn 512 ký tự, lồng 32. Bảng 232 biểu thức (TST-RTM-03); toàn repo 359 test đạt. Lệch DDD-04 §3.2: `CompiledExpr` thêm `type`, `identSlots`, `fnSlots`.

- **T-0004** (24/11/2026, `docs/tickets/T-0004.md`): bộ chạy bước + cache (ADR-023; MOD-CLI-02, 03; IF-CLI-02, 03; PSC-CLI-01, PSC-GEN-02): schema `step/1`, `report/1`, `cache-index/1`; `engine/cli/src/orchestrator/` (graph tô-pô ổn định, inputHash/outputHash, cache theo nội dung + `meta.json`, `cache/index.json` ghi nguyên tử, scheduler song song có giới hạn, runner node trong tiến trình); 4 bước mẫu. Build lần 2 toàn cache, cắt sớm khi đầu ra không đổi. 390 test đạt. Lệch/làm rõ: xem mục "Quyết định nhỏ" trong phiếu (bố cục cache `out/`+`meta.json`, `params` vào `inputHash`, seed bước, runner node trong tiến trình).

- **T-0005** (24/11/2026, `docs/tickets/T-0005.md`): lệnh `engine build [--game] [--steps] [--zone] [--tier] [--step] [--force] [--skip-bake] [--json]`. Runner python (`uv run python -I`, `PROGRESS`, timeout diệt cả cây tiến trình). Guards: brief (`brief/v<n>/hash.txt`, thoát 3), schema (4), `engineVersion` caret (4). Báo cáo gộp `build/reports/build-<zone|all>.json`. Quy ước: bước python ghi tệp với `newline="\n"`. 407/408 test đạt; test thời gian hook "P95 < 1 s" trượt khi chạy cả bộ, chạy riêng thì đạt (xem phiếu).

- **T-0006** (24/11/2026, `docs/tickets/T-0006.md`, Sonnet low): tách test thời gian hook (TST-DEV-02, NFR-DEV-02) ra `pnpm test:timing` (`vitest.timing.config.ts`, tuần tự, một worker). Quy ước tên `*.timing.test.ts`, bị loại khỏi `pnpm test`. Test giờ đo P95 cho từng hook H-01…H-05. `pnpm test` 407/407 đạt, `pnpm test:timing` 5/5 đạt.

- **T-0007** (24/11/2026, `docs/tickets/T-0007.md`): hai bước python đầu tiên `world.fetch` + `world.heightfield` cho nguồn `procedural` (EP-WLD-01, 02; PSC-WLD-04; DTO-WLD-02). Thư viện `engine/build/py/{gsio.py, heightfield/{io,noise,procedural,png}.py}`: simplex 2D numpy (hoán vị từ `Pcg32`), 5 preset, `heightScale`, `smoothing`, mask PNG, preview tô bóng. numpy 2.5.5 ghim, chạy một luồng. Tất định: hai thư mục sạch cache cùng `outputHash` (TC-WLD-02). 409 test TS + 21 pytest đạt. Lệch: mã nhiễu/procedural ở `build/py/heightfield/`; thêm dataPointer `playArea`, `source`; `gsio` ép stdout UTF-8 (`python -I` trên Windows); `real`/`mixed`/`ant` → thoát 5.

- **T-0008** (24/11/2026, `docs/tickets/T-0008.md`; Huy chọn numba): bước `terrain.erode` (EP-WLD-03, PSC-WLD-06, CFG-WLD-04). Xói mòn hạt + nhiệt bằng numba 0.68.1 (llvmlite 0.50.0, chạy với numpy 2.5.5), `parallel=False, fastmath=False`; vị trí hạt từ `Pcg32(ctx.seed)`. Đầu ra `hf/` đầy đủ + `flow.r8`, `sediment.r8`. 251×251 mất 0,14 s (JIT nguội 4,3 s), 1001×1001 mất 3,8 s. `versions.json` + doctor có numpy, numba. 410 test TS + 28 pytest đạt. Lệch: tham số CFG ở `step.json params`; PCG chạy ở Python thay vì trong nhân; `erosion.mask` chưa hỗ trợ; doctor kiểm bằng `uv pip show` (lỗi nối đối số qua `cmd.exe` trong `doctor/exec.ts`, để phiếu nhỏ sau).

- **T-0009** (24/11/2026, `docs/tickets/T-0009.md`, Sonnet low): sửa `engine doctor` trên Windows (`doctor/win-spawn.ts`): tìm chương trình theo PATH + PATHEXT, `.exe` chạy trực tiếp, shim `.cmd` qua `cmd.exe` với trích dẫn CreateProcess + thoát `^`. Đối số có dấu cách hoặc nháy không còn bị cắt vụn. numpy/numba quay về kiểm bằng `python -c`. 421 test đạt, `pnpm doctor` thoát 0.

**Phiếu E1 kế tiếp (đề xuất):** (đánh số tuần tự: `terrain.mesh` thành **T-0010**, `terrain.splat` thành **T-0011**)
- **T-0010**: `terrain.mesh` (node, EP-WLD-04, PSC-WLD-07, MOD-WLD-07, DTO-WLD-10): đọc `hf/` của `terrain.erode`, chunk 64 m, LOD0–3, skirt, UV0/UV2, `collider/height-lod1.r32`, BVH; xuất `.glb`. Bước node đầu tiên trong `engine/build/steps/`, cần quyết cách ghi glTF (`@gltf-transform/core` đã có trong `versions.json` là CLI; đề xuất thư viện core ghim bản) và `meshoptimizer` cho LOD. Lưu ý: ESLint/Vitest/tsconfig gốc loại `**/build/**`, nên bước TS trong `engine/build/steps` cần cấu hình lint/test riêng (gói pnpm `engine/build/steps/*` hoặc mở ngoại lệ).
- **T-0011**: `terrain.splat` (python, EP-WLD-05, PSC-WLD-08, DTO-WLD-03, 06): trọng số lớp theo dốc/độ cao/mask, `splat-0.png`, `surface.png`, `layers.json`. Phụ thuộc bước `materials` (EP-WLD-05 `deps`) chưa có: đề xuất tạm bỏ dep `materials` hoặc làm bước giả.
- `intake` (`HandoffLlmClient`, DDD-01) vẫn làm song song được.

**Việc hoãn từ E0 (m2) đưa vào E1:**
- Tạo `games/_template/data/budgets.json` + `budgets.schema.json` và ghi baseline A56: `targetFps 30`, `maxRenderDpr 1.5`, `a56Baseline` theo `docs/gates/G-E0/a56-baseline.md`.
- `tools/scripts/token-meter.mjs`, `ticket-new.mjs`.
- Skill `engine-*` (10–15).
- QA giả lập thêm viewport 384 × 832.
- Cổng sau đo A56 bằng Chrome Android (m1).

**Phạm vi E1** (TSD-00 §11, SRS-00 §4.3): `@gamestudio/schema`, `rng`, `expr` (phần điều kiện), `intake` với `HandoffLlmClient`; bộ chạy bước + cache; `world.fetch/heightfield`, `terrain.erode/mesh/splat`; QA khung; CLI cơ bản. Đích G-E1: AC-01-01…07, AC-02-01, 02, AC-04-06, AC-CR01-01, 02, 06, 12.

## 7. Quy ước làm việc
- Tiếng Việt; tài liệu Markdown; file mã ≤ ~300 dòng, mỗi gói có README ≤ 60 dòng; ESM, `strict` + `noUncheckedIndexedAccess`; log JSON một dòng, không bao giờ ghi khoá hay nội dung hội thoại.
- Bám mã truy vết trong comment/commit; sửa tài liệu đã duyệt phải qua change request + phiên bản mới, rồi chạy lại script truy vết. Đổi ADR đã chốt: viết ADR mới có trường "Thay thế".
- Khoá API (nếu sau này cần cho sản phẩm) chỉ nằm trong `ai-gateway` qua biến môi trường theo ADR-031; không dán vào chat, file, log, repo hay client.
- Khi viết mã gọi API Claude cho sản phẩm: mô hình mặc định `claude-opus-5-5` (effort đặt tường minh), `claude-haiku-5-5` cho hội thoại NPC; không dùng `temperature/top_p/top_k`, prefill, `thinking: disabled`, `tool_choice` ép buộc; JSON dùng `output_config.format`.
- Việc không hoàn tác (production, xoá hàng loạt, gửi ra ngoài) phải hỏi Huy trước.

## 8. System prompt gợi ý
```
Bạn là kỹ sư phần mềm của dự án GameStudio (engine web game 3D + Web Studio). Trả lời bằng tiếng Việt, ngắn gọn.
Tài liệu đã duyệt nằm ở C:\GameStudio\docs (BRD, SRS, TSD, DDD, UIUX, ADR). Mọi mã nguồn và quyết định phải truy vết được về mã FR/QT/ALG/SCH/IF/MOD/EP...; không tự đổi tài liệu đã duyệt, hãy đề xuất change request.
Công nghệ đã chốt trong ADR-016…033 (kiến trúc đích, hiện chưa có mã): pnpm monorepo, TypeScript strict, Node 24, Fastify, PostgreSQL + Drizzle, React 19 + Vite. Khoá API chỉ ở ai-gateway qua biến môi trường; không bao giờ yêu cầu, in hay lưu khoá. Không ghi nội dung hội thoại vào log.
Trong sản phẩm: claude-opus-5-5 cho suy luận nặng, claude-haiku-5-5 cho hội thoại NPC; đầu ra JSON dùng structured outputs.
Trước khi làm việc không hoàn tác, hỏi người dùng. Khi xong, báo cấu trúc thay đổi, cách chạy và điểm lệch so với tài liệu.
```

## 9. Tệp nên nạp làm ngữ cảnh theo loại tác vụ
| Tác vụ | Nạp |
|---|---|
| Mọi tác vụ | file này; `docs/TSD/TSD-00-TONG-QUAN.md` (§2–4, 8, 11); `docs/ADR/README.md` |
| ai-gateway, hạn mức, chi phí (khi bắt đầu viết mã) | ADR-028/030/031; TSD-08 (IF-WEB-03, ALG-WEB-05, ALG-WEB-12, SCH-WEB-06/09); TSD-09 + DDD-09 (AI, bảo mật) |
| Backend `web/api`, worker | ADR-028/029/030/032; TSD-08; DDD-08 (TBL-WEB-01…36, EP-WEB-01…56); SRS-08 §8 (REST) |
| Web Studio (React) | ADR-027; SRS-08; TSD-08 §3; UIUX-00/01/02/03/04; DDD-08 |
| Intake/tạo game từ mô tả | SRS-01, TSD-01, DDD-01; BRD-01; BRD-10/SRS-01 mục CR-01 nếu làm tiếp game |
| Engine runtime, QA, CLI | ADR-018…020, 033; SRS-04, TSD-04, DDD-04 |
| Thế giới, asset, nhân vật, chiến đấu, hội thoại | cặp SRS/TSD/DDD-02, 03, 05, 06, 07 và BRD tương ứng |
| Triển khai, CI, công cụ dev | ADR-016/017/032; TSD-09, DDD-09; TSD-00 §9–10 |
| Viết/sửa tài liệu | bộ gốc cần sửa + script truy vết tương ứng (§2) |
