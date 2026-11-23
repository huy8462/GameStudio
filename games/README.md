# games/

Dữ liệu từng game (SRS-04 §6.1). Không phải gói pnpm.

- `_template/`: dữ liệu mẫu cho `engine new-game` (tạo ở E1).
- `<id>/`: một game: `data/**` (JSON theo schema), `assets/`, `scripts/` (chỉ import `@gamestudio/engine/api`, FR-RTM-04), `handoff.md` (SCH-DEV-09).
- `build/` và `cache/` của mỗi game không commit (`.gitignore`).
