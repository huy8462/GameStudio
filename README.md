# GameStudio

Engine web game 3D dùng lại được, kèm Web Studio, để tạo, chỉnh và làm tiếp game từ mô tả. Dùng nội bộ (QĐ-07). Thiết bị đích: Galaxy A56, 30 fps, tier Vừa.

- Brief gốc: `GAME-ENGINE-WEB3D-BRIEF.md`; ngữ cảnh khởi động phiên: `HANDOFF-API.md`.
- Tài liệu đã duyệt: `docs/` (BRD, SRS, TSD, DDD, UIUX, ADR).
- Fork từ [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, tác giả Majid Manzarpour). Thay đổi so với bản gốc: `UPSTREAM.md`. README gốc: nhánh `vendor/upstream`.
- Skill Claude Code: `.claude/skills/` (8 skill gốc; đã bỏ `threejs-3d-generator` theo QĐ-08).

Runtime: Unity player Web dùng chung, game là gói dữ liệu (ADR-036, CR-02). Trạng thái: E1, chuẩn bị E2 (xem `HANDOFF-API.md` §6).

## Bắt đầu

Cần Node 24, pnpm 12, uv (Python 3.12 do uv quản lý theo `.python-version`).

```
pnpm install
uv sync
```

| Lệnh | Việc |
|---|---|
| `pnpm lint` | ESLint (gồm luật tất định: cấm `Math.random`/`Date.now` trong `engine/**`) |
| `pnpm exec tsc -p tsconfig.json` | Kiểm kiểu toàn repo |
| `pnpm test` | Vitest |
| `pnpm depcruise` | Luật phụ thuộc giữa gói (TSD-00 §4.2) |
| `pnpm format:check` | Prettier |
| `uv run ruff check`, `uv run ruff format --check` | Ruff cho Python |
| `pnpm test:helpers` | Kiểm thử helper của bộ gốc |
| `pnpm doctor` | Build `engine/cli` rồi chạy `engine doctor`: kiểm công cụ theo `tools/versions.json` (thoát 5 khi thiếu/lệch) |
