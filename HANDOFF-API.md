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
| ADR | `ADR-016…033` (+ README) | **Đã chốt** 22/11/2026. ADR-001…015 (QĐ-01…15) chưa viết, đến hạn ở E0 |
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
- Node 24 LTS, TypeScript 5.x strict, Python 3.12, Blender 4.5 LTS; phiên bản ghi ở `tools/versions.json` (017).
- Runtime đồ hoạ Three.js bản cố định tại E0 (018); kiến trúc runtime, va chạm/điều hướng, dữ liệu/schema, biểu thức an toàn, điều phối build, nén asset, địa hình, bake ánh sáng (019–026).
- Web Studio: React 19 + Vite + TS, TanStack Query, Zustand, Tailwind + Radix, @xyflow/react, Monaco; xem trước nhúng thẳng `@gamestudio/engine` (027).
- Backend: Fastify (Node 24) cho `web/api` và `web/ai-gateway`; PostgreSQL 17 + Drizzle; pg-boss; SSE qua LISTEN/NOTIFY (028).
- Kho đối tượng (029); xác thực Google OIDC, phiên opaque trong PostgreSQL, JWT chỉ cho token ngắn hạn (030).
- AI: `@anthropic-ai/sdk`; `claude-opus-5-5` cho tiếp nhận/đề xuất/nháp kịch bản, `claude-haiku-5-5` cho hội thoại NPC; đầu ra JSON bằng structured outputs; khoá chỉ ở `ai-gateway`; Gemini qua `@google/genai`, ElevenLabs qua REST; mô hình theo tác vụ cấu hình được ở SCR-WEB-13 (031).
- Triển khai Docker Compose trên Ubuntu 24.04 + Caddy + restic + Uptime Kuma (032); QA Playwright + ssim.js + pixelmatch (033).
- Giá trị đã định: công thức sát thương mặc định `max(1, atk + weapon - def)` (SRS-06 v1.1).

## 4. Mã nguồn: mới có bản fork bộ gốc (E0-01)
Một khung monorepo và dịch vụ `ai-gateway` đã được dựng thử rồi **gỡ bỏ hoàn toàn** ngày 23/11/2026 theo yêu cầu của Huy (dự án làm chủ yếu qua gói Max).

Từ 23/11/2026, `C:\GameStudio` là **repo git cục bộ** (Huy chọn không dùng remote; không có GitHub). Nhánh `main` gồm:
- `f771f5e` E0-01: fork `threejs-game-skills@8286774`. Skill nằm ở `.claude/skills/` (8 skill gốc), đã bỏ `threejs-3d-generator`/Tripo và phần Codex. Có thêm `UPSTREAM.md`, `.gitattributes` (LF) và `.gitignore` theo TSD-09 §6. `LICENSE` trùng vendor.
- `7977f93`: tài liệu dự án (`docs/`, brief, file này).
- Nhánh `vendor/upstream` = bản gốc nguyên vẹn. Remote `upstream` chỉ fetch (push bị vô hiệu).
- Kiểm thử helper của bộ gốc: `npm run test:helpers` (29 test Python + 48 test Node, đạt). **Chưa có mã engine/web nào**; scaffold Vite gốc nằm trong `.claude/skills/threejs-gameplay-systems/assets/threejs-vite-game/`.

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
| Blender | **4.2.9 LTS** và **5.2.4 LTS** ở `C:\Tools\blender-*`, không có trong PATH | **4.5 LTS** + Sapling, A.N.T. Landscape | **Lệch:** Huy báo đã cài 4.5 LTS nhưng trên máy chưa tìm thấy bản 4.5 (đã quét mọi ổ, registry, `%APPDATA%\Blender Foundation`). Cần Huy xác nhận đường dẫn, hoặc cài 4.5, hoặc đổi phiên bản bằng ADR mới thay ADR-017 |
| Docker | không có | (máy chủ W1) | Chỉ cần nếu chạy thử Compose trên máy dev |
| ktx, ffmpeg, gitleaks | **không có** | theo SCH-DEV-03 | Cần cho phiếu 3 (`engine doctor`) và phiếu 4 (pre-commit gitleaks) |

## 5. Việc còn mở
1. ~~Duyệt UIUX/DDD~~ **Đã đóng 23/11/2026**: UIUX v1.0 và DDD v1.0 đã duyệt. OIU-WEB-06 theo đề xuất: Tiến độ là tab đầu của bảng phải 400 px, mở bằng chip giai đoạn. OIU-WEB-07 theo đề xuất: tab mặc định của thư viện là "Đang dở" khi có ít nhất một mục, và nhớ tab người dùng chọn lần cuối.
2. **API hạn mức (tài liệu):** OIU-WEB-04 `GET /api/me/usage?from=&to=` cho SCR-WEB-03 chưa có trong DDD-08/TSD-08. Theo UIUX-00 §8, việc này **làm qua change request khi tới W2** (thêm endpoint vào DDD-08, không đổi SRS). Phần `ai-gateway` (hạn mức, ALG-WEB-12, `ai_config`) mới chỉ là thiết kế trong TSD-08, chưa có code.
3. **Số chờ đo trên A56:** OI-CHR-07 (LOD hành vi 30/80 m), OI-CBT-05 (ngân sách chiến đấu tier Vừa 3/20), OIT-GEN-01 (DPR 1,5), cùng baseline E0; các số "(đề xuất)" trong TSD chỉnh theo đo đạc.
4. **Kho usage:** thiết kế PostgreSQL `usage_records` + `llm_calls` (SCH-WEB-06) nằm trong TSD; chưa triển khai (không còn mã nào).
5. **Vị trí chat/Tiến độ trong TSD-08:** TSD-08 v1.2 đã sửa sơ đồ §3.2 cho chat ở cột trái, khớp SRS. Vị trí bảng Tiến độ đã chốt theo OIU-WEB-06 (mục 1). Còn lại: nếu TSD-08 §3.2 cần vẽ thêm tab Tiến độ thì làm change request nhỏ khi tới W2/W3. Không chặn E0.
6. Khác: `tools/versions.json`, `engine doctor`, `.claude/`, lint ranh giới gói, gitleaks, `uv`/`pyproject.toml` (theo thiết kế, chưa có); OIT-GEN-02 (cấu hình máy chủ), OIT-GEN-04 (nơi chạy CI); ADR-001…015.

## 6. Lộ trình (TSD-00 §11)
- **E0:** scaffold, `tools/versions.json`, `engine doctor`, `.claude/`, baseline A56, ADR-001…015. Song song được: **W1**.
- **W1:** Compose + Caddy, OIDC + mời, quyền, chat + intake qua `ai-gateway`, ghi sử dụng (cần kho PostgreSQL).
- **W2:** hàng đợi + worker, xem trước, phiên bản, hạn mức, sao lưu, trang quản trị.
- **W3:** editor (cảnh, NPC, động vật, hội thoại, bảng cân bằng), khoá sửa, đề xuất thay đổi.
- **W4:** kho asset, xuất/nhập gói, chia sẻ, xuất bản, link chơi thử, JSON thô, rà soát bảo mật.
- **Engine E1→E8:** schema/rng/expr/intake → materials/packager/runtime → water/vegetation/fx → asset/khung xương → bake ánh sáng → tương tác/NPC/hội thoại/chiến đấu → tối ưu/game thứ hai. W1–W4 chạy song song sau cổng G-E1.

### 6.1 Chuẩn bị E0 (bước tiếp theo)
Điều kiện qua G-E0 (SRS-00 §4.3; BRD-00 §9): ADR-001…015 đã viết; `engine doctor` đạt; scaffold gốc chạy trên A56 và baseline ghi vào `budgets.json`; hook, template, `project.yaml`, `CLAUDE.md` sẵn sàng. Phạm vi FR: SRS-09 toàn bộ FR-DEV trừ 06, 25; SRS-04 FR-RTM-12, 13, FR-QA-07.

Thứ tự phiếu đề xuất (mỗi phiếu một phiên Claude Code, `/clear` giữa các phiếu):
| # | Phiếu | Nguồn | Ghi chú |
|---|---|---|---|
| 1 | ✅ **Xong 23/11/2026** (`f771f5e`): `git init`, `.gitignore`, fork `majidmanzarpour/threejs-game-skills` (MIT): nhánh `vendor/upstream`, ghi `UPSTREAM.md`, giữ `LICENSE`; bỏ phần Codex và skill `threejs-3d-generator` | QĐ-01, 02, 07, 08; ALG-DEV-09; SCH-DEV-06 | Repo chỉ cục bộ (Huy chốt). Hệ quả: OIT-GEN-04, CI GitHub Actions (ALG-DEV-10) chưa có nơi chạy, tạm thay bằng pre-commit + script cục bộ |
| 2 | Khung monorepo theo TSD-00 §4.1: `pnpm-workspace.yaml`, `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`), `pyproject.toml` + `.python-version` 3.12 qua uv, ESLint/Prettier/Ruff | ADR-016, 017; TSD-00 §4.3 | Chỉ khung rỗng, chưa viết gói |
| 3 | `tools/versions.json` + `engine doctor` tối thiểu trong `engine/cli` | SCH-DEV-03, IF-DEV-03, ALG-DEV-06; TST-DEV-03 | Cần cài Blender 4.5 LTS + 2 add-on, ktx, ffmpeg (libopus), gitleaks; cố định bản Three.js |
| 4 | `.claude/` tối giản: 8 agent, hook H-01…H-05 (Node), `settings.json`, templates; `CLAUDE.md` < 150 dòng; `project.yaml`; `.githooks/pre-commit` + `gitleaks.toml` | TSD-09 §2.1, IF-DEV-01…05, ALG-DEV-03…05, 08; TST-DEV-01, 02, 05 | Lệnh slash (13 + 2) có thể để khung, hoàn thiện dần |
| 5 | ADR-001…015 từ QĐ-01…15 của brief | FR-DEV-11, SCH-DEV-07 | Việc tài liệu, làm song song được với 2–4 |
| 6 | Chạy scaffold gốc, đo baseline trên Galaxy A56 (`?perf=1`), ghi `budgets.json`; đo lại OIT-GEN-01 (DPR 1,5) | FR-RTM-12, 13, FR-QA-07 | **Cần Huy cầm máy A56** và nơi phục vụ bản build (máy chủ poc, CH-10) |
| 7 | `/gate-check` G-E0 → `docs/gates/G-E0.md`, Huy điền `huyConfirm` | ALG-DEV-07, SCH-DEV-05 | |

Huy đã xác nhận (23/11/2026): bắt đầu E0; repo chỉ cục bộ. Còn chặn phiếu 3: Blender 4.5 LTS chưa thấy trên máy (xem §4), thiếu ktx, ffmpeg, gitleaks. Phiếu 2, 4 (phần không cần gitleaks) và 5 làm được ngay.

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
