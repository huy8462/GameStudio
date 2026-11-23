# GameStudio: hướng dẫn cho Claude Code

Engine web game 3D dùng lại được + Web Studio. Thiết bị đích Galaxy A56, 30 fps, tier Vừa. Trả lời và viết tài liệu **tiếng Việt**. Dùng nội bộ (QĐ-07).

## Đọc trước

- `docs/handoff.md` (ghi chú gọn của phiếu gần nhất, nếu có), `HANDOFF-API.md` (bàn giao tổng).
- Phiếu đang làm ở `docs/tickets/`. Không đọc lại lịch sử chat; `/clear` giữa các phiếu.
- Tài liệu đã duyệt: `docs/{BRD,SRS,TSD,DDD,UIUX}`, quyết định: `docs/ADR/README.md`. Tệp lớn: đọc theo mục (hook H-01 chặn đọc nguyên `.md` > 40 KB và trả danh sách heading).

## Luật cứng

1. Mọi mã và quyết định truy vết được về mã tài liệu (FR/QT/ALG/SCH/IF/MOD/EP/TC…), ghi trong comment đầu tệp và commit.
2. Không tự sửa tài liệu đã duyệt: đề xuất change request. Đổi quyết định đã chốt: ADR mới có trường "Thay thế" (`/adr`).
3. Không đọc, in, lưu khoá API. Chỉ báo "có/không" (`pnpm doctor`). Không ghi khoá, nội dung hội thoại, email, đường dẫn tuyệt đối vào log/tài liệu.
4. Việc không hoàn tác (xoá hàng loạt, push, gửi ra ngoài, đẩy lên máy chủ) phải hỏi Huy trước.
5. Không dùng dịch vụ AI sinh 3D (Meshy, Tripo). Nguồn asset 3D: CC0 → generator code → chỉnh CC0 (QĐ-08, QĐ-12).
6. Bám đúng thể loại và phong cách người dùng mô tả (QĐ-11).
7. Tất định trong `engine/**`: không `Math.random()`/`Date.now()`; dùng `@gamestudio/rng`, `Clock` tiêm.
8. Tệp mã ≤ ~300 dòng; README gói ≤ 60 dòng; `src/index.ts` chỉ xuất API công khai; test `*.test.ts` cạnh mã.
9. Sửa tệp có nguồn từ bộ gốc threejs-game-skills: cập nhật `UPSTREAM.md` trong cùng commit.
10. Không đọc tệp nhị phân, ảnh lớn, log dài (hook H-02 chặn): đọc báo cáo JSON, `grep`, `tail`.

## Cấu trúc repo

```
engine/        gói engine (hiện có: cli/ với lệnh doctor) — xem engine/README.md
  cli/         @gamestudio/cli, lệnh `engine`
web/           Web Studio (từ W1) — xem web/README.md
games/<id>/    dữ liệu game (data/, assets/, scripts/, handoff.md)
tools/         versions.json (phiên bản cố định), schema/, scripts/
docs/          BRD SRS TSD DDD UIUX ADR tickets gates metrics handoff.md
.claude/       agents/ skills/ commands/ rules/ hooks/ templates/ settings.json
.githooks/     pre-commit (gitleaks, CLAUDE.md < 150 dòng)
```

## Lệnh

| Lệnh                                                               | Việc                                                                                                            |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `pnpm install`, `uv sync`                                          | Cài phụ thuộc (Node 24, pnpm 12, Python 3.12 qua uv)                                                            |
| `pnpm doctor`                                                      | Build CLI + `engine doctor` (thoát 5 khi thiếu/lệch)                                                            |
| `pnpm engine <lệnh> --json`                                        | Chạy CLI; đọc một dòng JSON, không đọc log                                                                      |
| `pnpm lint` / `pnpm test` / `pnpm depcruise` / `pnpm format:check` | Kiểm trước khi xong phiếu                                                                                       |
| `pnpm exec tsc -p tsconfig.json`                                   | Kiểm kiểu toàn repo                                                                                             |
| `uv run ruff check`                                                | Lint Python                                                                                                     |
| Truy vết tài liệu                                                  | `$env:PYTHONIOENCODING='utf-8'` rồi `python docs/{SRS,TSD,DDD,UIUX}/tools/*-trace.py …` (xem HANDOFF-API.md §2) |

Lệnh slash: `/start`, `/ticket`, `/handoff`, `/adr`, `/gate-check` dùng được từ E0. `/new-game`, `/build-zone`, `/qa-light`, `/qa-full`, `/perf-snapshot`, `/visual-diff`, `/asset-recipe`, `/publish-poc`, `/resume-game`, `/import-game` cần CLI từ E1 trở đi.

## Chọn mô hình (FR-DEV-08)

| Việc                                                    | Mô hình | Effort       |
| ------------------------------------------------------- | ------- | ------------ |
| Kiến trúc, thuật toán mới, generator họ asset mới, cổng | Opus    | high / xhigh |
| Chỉnh tham số, script lặp, sửa nhỏ, viết test           | Sonnet  | medium       |
| Đổi tên, tài liệu, việc cơ học                          | Haiku   | low          |

Mỗi phiếu ghi dòng "**Mô hình khuyến nghị:** <mô hình>, effort <mức>".

## Agent (`.claude/agents/`)

`director` (Opus): phiếu, cổng, ADR. `engine-dev`: mã engine. `tech-artist`: render, vật liệu, bake, ngân sách. `world-builder`: địa hình, nước, thực vật, bố trí. `gameplay-ui`: tương tác, NPC, hội thoại, UI, web/app. `asset-designer`: asset bằng code, CC0, provenance. `qa`: kiểm thử, đo, báo cáo. `docs` (Haiku): tài liệu.

## Quy trình một phiếu

1. `/ticket <mô tả>` → phiếu có `read[]`, `write[]`, `done[]`, rigor, mô hình.
2. Làm trong phạm vi `write[]`; ngoài danh sách thì ghi lý do.
3. Chạy kiểm tra (bảng Lệnh) + `/qa-light` nếu đổi hình.
4. Commit (pre-commit chạy gitleaks). Thông điệp commit có mã phiếu và mã truy vết.
5. `/handoff T-nnnn`, rồi `/clear`.

## Công nghệ đã chốt (ADR-016…034)

pnpm workspaces + uv; Node 24, TS 5.9 strict; Python 3.12; Blender 5.2 LTS (ADR-034); Three.js 0.187.0 WebGL2; JSON Schema 2020-12 + Ajv; Vitest, Playwright; Fastify + PostgreSQL 17 + Drizzle + pg-boss; React 19 + Vite. Web Studio soạn game bằng Claude Code CLI, mỗi người dùng tự đăng nhập, máy chủ không giữ thông tin đăng nhập Claude của ai (ADR-035; Gemini/ElevenLabs vẫn theo ADR-031). Phiên bản công cụ: `tools/versions.json`.
