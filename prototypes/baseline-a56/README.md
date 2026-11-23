# prototypes/baseline-a56

Scaffold gốc `threejs-game-skills@8286774` (skill `threejs-gameplay-systems`) để đo baseline Galaxy A56 cho G-E0 (E0-06; FR-QA-07, FR-RTM-12, 13; ADR-004).

Thay đổi so với scaffold gốc (rule `prototypes`, nới lỏng):
- `src/perf.ts` + 4 dòng trong `src/game/Game.ts`: `?perf=1` đo thời gian khung, `?dpr=<n>` đặt trần DPR (OIT-GEN-01).
- `three` 0.187.0 (khớp `tools/versions.json`), bỏ test Playwright và `scripts/` (không cần cho đo), `vite.config.ts` dùng `base: './'`, tắt sourcemap.

## Build

```
pnpm --filter @gamestudio/prototype-baseline-a56 build   # ra prototypes/baseline-a56/dist/
```

## Đo trên A56 (Chrome Android)
1. Mở `<URL>/?perf=1` → để máy yên 65 giây (5 s khởi động + 60 s đo), màn hình sáng, pin > 50%, không sạc.
2. Mở `<URL>/?perf=1&dpr=1.5` → đo lần nữa (OIT-GEN-01).
3. Mỗi lần bấm "Sao chép JSON" và gửi lại. Kết quả ghi vào `docs/gates/G-E0-baseline.json`, sau đó `games/_template/data/budgets.json` (E1).
