# prototypes/baseline-a56

Scaffold gốc `threejs-game-skills@8286774` (skill `threejs-gameplay-systems`) để đo baseline Galaxy A56 cho G-E0 (E0-06; FR-QA-07, FR-RTM-12, 13; ADR-004).

Thay đổi so với scaffold gốc (rule `prototypes`, nới lỏng):
- `src/perf.ts` + 4 dòng trong `src/game/Game.ts`: `?perf=1` đo thời gian khung, `?dpr=<n>` đặt trần DPR (OIT-GEN-01).
- `three` 0.187.0 (khớp `tools/versions.json`), bỏ test Playwright và `scripts/` (không cần cho đo), `vite.config.ts` dùng `base: './'`, tắt sourcemap.

## Build

```
pnpm --filter @gamestudio/prototype-baseline-a56 build   # ra prototypes/baseline-a56/dist/
```

## Xuất bản lên poc (23/11/2026)

Máy chủ poc là chính máy dev này (IP công khai `160.191.243.120`), chạy `C:\poc-public\bin\serve_poc.py` (tác vụ `poc-public`, cổng 18080, của Thiền viện online T-0082/83). Bản build chép vào `C:\poc-public\split\gamestudio-baseline-a56\` và phục vụ ở:

`http://160.191.243.120:18080/<mã>/split/gamestudio-baseline-a56/index.html`

- `<mã>`: trong `C:\poc-public\LIEN-KET.txt` (không ghi vào repo). Mã sai → 404. Giới hạn 400 yêu cầu/10 s mỗi IP.
- Chép lại sau khi build: `Copy-Item prototypes\baseline-a56\dist\* C:\poc-public\split\gamestudio-baseline-a56\ -Recurse -Force`.
- **Lưu ý:** `publish_poc.py --split` của Thiền viện online thay cả thư mục `split\` và sẽ xoá bản này; chạy lại lệnh chép ở trên sau đó.
- Kiểm URL chạy được (không đo): `$env:GS_CHECK_URL='<URL>'; node prototypes/baseline-a56/check-url.mjs`.
- Gỡ: `Remove-Item C:\poc-public\split\gamestudio-baseline-a56 -Recurse`.

## Đo trên A56 (Chrome Android)
1. Mở `<URL>/?perf=1` → để máy yên 65 giây (5 s khởi động + 60 s đo), màn hình sáng, pin > 50%, không sạc.
2. Mở `<URL>/?perf=1&dpr=1.5` → đo lần nữa (OIT-GEN-01).
3. Mỗi lần bấm "Sao chép JSON" và gửi lại. Kết quả ghi vào `docs/gates/G-E0-baseline.json`, sau đó `games/_template/data/budgets.json` (E1).
