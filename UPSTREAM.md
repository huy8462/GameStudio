# UPSTREAM

Ghi công và lịch sử thay đổi so với bộ gốc (QĐ-01, QĐ-07; BR-37, BR-44; FR-DEV-12, 13; TSD-09 SCH-DEV-06, ALG-DEV-09).

## Nguồn

| Mục | Giá trị |
|---|---|
| Repo | https://github.com/majidmanzarpour/threejs-game-skills |
| Nhánh gốc | `main` |
| Commit đã fork | `8286774b22a2566bf894dbc825825c16921866af` (27/09/2026, "Tune skills for Claude Opus 5.5, cut QA token cost, and add music generation") |
| Ngày fork | 23/11/2026 |
| Tác giả | Majid Manzarpour |
| License | MIT, giữ nguyên tệp `LICENSE` và thông báo bản quyền gốc |
| Nhánh vendor | `vendor/upstream` (bản gốc nguyên vẹn tại commit đã fork) |
| Remote | `upstream` (chỉ fetch; push bị vô hiệu bằng `no_push`) |

## Bảng thay đổi

`kind`: `them` | `sua` | `xoa`. Phiếu `E0-01` là phiếu fork ban đầu.

| File | kind | Lý do | Phiếu |
|---|---|---|---|
| `skills/threejs-3d-generator/**` | xoa | Không dùng AI sinh 3D (Tripo) (QĐ-08, BRD-09) | E0-01 |
| `skills/*/agents/openai.yaml` | xoa | Chỉ hỗ trợ Claude Code, bỏ phần Codex (QĐ-02) | E0-01 |
| `AGENTS.md` | xoa | Hướng dẫn chung Codex/Claude; thay bằng `CLAUDE.md` ở phiếu E0-04 (QĐ-02) | E0-01 |
| `install.sh` | xoa | Cài skill ra thư mục người dùng; GameStudio dùng skill trong repo `.claude/skills/` (QĐ-02) | E0-01 |
| `scripts/validate-skills.sh` | xoa | Phụ thuộc validator của Codex (QĐ-02) | E0-01 |
| `scripts/tests/test_tripo_jobs.py` | xoa | Test cho skill đã bỏ (QĐ-08) | E0-01 |
| `skills/` → `.claude/skills/` | sua | Claude Code nạp skill dự án từ `.claude/skills/` (TSD-09 §2.1) | E0-01 |
| `.claude/skills/threejs-game-director/SKILL.md` | sua | Bỏ đường dẫn Codex, dòng `threejs-3d-generator`; nguồn mô hình 3D là CC0 hoặc code (QĐ-08, QĐ-12) | E0-01 |
| `.claude/skills/threejs-game-director/scripts/probe_asset_credentials.sh` | sua | Bỏ `TRIPO_API_KEY` (QĐ-08) | E0-01 |
| `.claude/skills/threejs-game-director/references/asset-recovery.md` | sua | Bỏ quy trình Tripo; ví dụ đổi sang Gemini | E0-01 |
| `.claude/skills/threejs-game-director/references/workflow-evaluations.md` | sua | Bỏ câu so sánh với Codex (QĐ-02) | E0-01 |
| `.claude/skills/threejs-aaa-graphics-builder/SKILL.md` | sua | Nguồn mô hình 3D hero: CC0 hoặc code (QĐ-08) | E0-01 |
| `.claude/skills/threejs-image-generator/SKILL.md` | sua | "image-to-3D" → ảnh tham chiếu dựng mô hình bằng code; ghi provenance (QĐ-08, QĐ-09) | E0-01 |
| `.claude/skills/threejs-audio-generator/SKILL.md` | sua | Bỏ tham chiếu Tripo | E0-01 |
| `.claude/skills/threejs-game-ui-designer/SKILL.md`, `references/ui-patterns.md` | sua | Vật thể 3D trong UI dùng mô hình CC0/code | E0-01 |
| `.claude/skills/threejs-debug-profiler/references/debug-playbook.md` | sua | Thay mẹo Tripo bằng giảm LOD/glTF-Transform/Meshopt | E0-01 |
| `scripts/tests/test_packaging.py`, `test_evidence.py`, `inspect-canvas.test.mjs` | sua | Đường dẫn `.claude/skills/`; kiểm 8 skill gốc và không có `threejs-3d-generator` | E0-01 |
| `package.json` | sua | Tên `gamestudio`; bỏ script Codex/install; đường dẫn mới; `python` thay `python3` (Windows) | E0-01 |
| `.gitignore` | sua | Thêm mục theo TSD-09 §6 | E0-01 |
| `README.md` | sua | Thay hẳn bằng README GameStudio (bản gốc hướng dẫn `install.sh`, Codex, Tripo đã bỏ); bản gốc xem nhánh `vendor/upstream` | E0-01 |
| `.gitattributes`, `UPSTREAM.md` | them | Chuẩn hoá LF; ghi công | E0-01 |
| `package-lock.json` | xoa | Chuyển sang pnpm workspace, lockfile là `pnpm-lock.yaml` (ADR-016) | E0-02 |
| `package.json` | sua | Thành gốc monorepo: `packageManager` pnpm, `engines` Node 24, script lint/test/depcruise/format; devDependencies cố định bản (gồm `@playwright/test`, `pngjs` của bộ gốc) | E0-02 |
| `.gitignore` | sua | Thêm cache mypy/ruff/pytest | E0-02 |
| `README.md` | sua | Thêm mục "Bắt đầu" | E0-02 |
| `docs/**`, `GAME-ENGINE-WEB3D-BRIEF.md`, `HANDOFF-API.md` | them | Tài liệu dự án GameStudio | E0-01 |

## Quy trình lấy bản mới (ALG-DEV-09)

1. `git fetch upstream`
2. `git checkout vendor/upstream` rồi `git merge --ff-only upstream/main`
3. `git checkout main` rồi `git merge vendor/upstream` (hợp nhất ba chiều, giữ thay đổi riêng)
4. Giải xung đột theo bảng trên. Lưu ý: bộ gốc để skill ở `skills/`, ở đây là `.claude/skills/`; Git thường tự nhận đổi tên, nếu không thì áp tay.
5. Cập nhật "Commit đã fork" và bảng thay đổi trong **cùng commit** merge (QT-DEV-04).
6. Chạy `pnpm run test:helpers` và `/qa-light`.
7. Kiểm `git diff vendor/upstream -- LICENSE` rỗng (FR-DEV-13).
