---
name: engine-unity-perf
description: "Hồ sơ hiệu năng player Unity Web của GameStudio: bật ?perf=1, đọc JSON PerfMonitor (fps, khung, loadMs, extra navmesh/warmup), đo trên Galaxy A56 qua máy chủ poc, so ngân sách (playerMB, coreZoneMB, OIT-CHR-01). Dùng khi cần số đo, nghi ngờ khựng hoặc chậm tải, hay trước khi đóng phiếu đổi hình/hiệu năng (NFR-RTM-01, MOD-RTM-13, ADR-038)."
---

# engine-unity-perf: đo và đọc số

## Cách đo

- Trang chơi với `?perf=1`: sau khi `DangChay`, `PerfMonitor` bay camera theo `PerfRoute` 20 s (bỏ 0,5 s đầu, cửa sổ khởi động 10 s) rồi xuất JSON qua `GsBridge.PerfReport`; trạng thái hiện trên màn hình ("XONG. fps tb ... | p5 ... | khung max ...").
- Cục bộ: `node engine/unity/dev/check-local.mjs <build> "?perf=1"` in một dòng JSON. Máy dev **không có GPU**: chỉ biết chạy được hay lỗi, không dùng làm số hiệu năng.
- **Số thật = Galaxy A56** (Samsung Internet), tier Vừa. Đưa bản build lên poc (`engine-unity-build`, `publish-poc.ps1`) là gửi ra ngoài: hỏi Huy trước, rồi nhờ Huy mở `https://gamestudio.vinpride.com/<tên>/?perf=1` và dán JSON. Ghi lần tải đầu (chưa cache) và lần hai (đã cache) riêng.

## Trường JSON chính

`loadMs` {firstFrame, ready, ...}, `fps` {avg, p5}, `frameMs` {p50, p95, max, startupMax}, cộng `Extra` do hệ thống ghi: `navmesh` (T-0019: ô người chơi, cả zone, `callMsMax`, khung max khi dựng), `warmup` (T-0021), `s1.ktx2Ms` (cảnh S1). Thêm số đo mới: `ctx.Perf.Extra["<khoá>"] = "<JSON thô>"`.

## Ngưỡng hiện hành

| Chỉ số | Ngưỡng | Nguồn |
|---|---|---|
| fps tier Vừa A56 | 30 fps mục tiêu (đo được ~60) | TSD-00 §7 |
| `playerMB` | ≤ 10 | SRS-04 §6.3 |
| `coreTextureMax` / `coreZoneMB` | 1024 / ≤ 8 MB | CR-04, T-0020 |
| NavMesh (OIT-CHR-01) | 0 khung > 100 ms, ≤ 5 khung > 33 ms mỗi zone; ô người chơi ≤ 0,5 s | ADR-038, TSD-05 1.3 |
| `warmupMs` | tham chiếu A56 22–84 ms | T-0021 |

Mốc A56 bản đa luồng (T-0019): `callMsMax` 1,7 ms, 3/64 khung > 33 ms, ô người chơi 261 ms, cả zone 1.441 ms, heap WASM 96 MB, player 9,10 MB, `firstFrame` 7,4 s lần đầu.

## Chẩn đoán nhanh

- Khung dài: so `navmesh.callMsMax` (việc trên luồng chính?) với `frameMs.max`; một khung nhiều giây xuất hiện một lần thì đo lại trước khi kết luận.
- `firstFrame` lớn dù `sceneLoadMs` nhỏ: thường là nạp/chuyển mã texture hoặc làm ấm.
- Trang không chạy đa luồng: kiểm `crossOriginIsolated` (máy chủ phải gửi COOP/COEP).
- Báo cáo bằng bảng ngắn; không dán log dài (hook H-02).
