# GameStudio

Engine web game 3D dùng lại được, kèm Web Studio, để tạo, chỉnh và làm tiếp game từ mô tả. Dùng nội bộ (QĐ-07). Thiết bị đích: Galaxy A56, 30 fps, tier Vừa.

- Brief gốc: `GAME-ENGINE-WEB3D-BRIEF.md`; ngữ cảnh khởi động phiên: `HANDOFF-API.md`.
- Tài liệu đã duyệt: `docs/` (BRD, SRS, TSD, DDD, UIUX, ADR).
- Fork từ [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, tác giả Majid Manzarpour). Thay đổi so với bản gốc: `UPSTREAM.md`. README gốc: nhánh `vendor/upstream`.
- Skill Claude Code: `.claude/skills/` (8 skill gốc; đã bỏ `threejs-3d-generator` theo QĐ-08).

Trạng thái: pha E0 (xem `HANDOFF-API.md` §6.1).

Kiểm thử helper của bộ gốc: `npm run test:helpers` (cần Python và Node 24).
