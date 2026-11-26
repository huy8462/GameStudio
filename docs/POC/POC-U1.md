# POC-U1: đo Unity Web player trên Galaxy A56

| Mục | Nội dung |
|---|---|
| Mã | POC-U1 (CR-02, OI-GEN-05, OI-CR02-01…03) |
| Ngày đo | 26/11/2026, Huy đo trên A56 thật |
| Thiết bị | Samsung Internet 31 (lõi Chrome 148), GPU Xclipse 540 (ANGLE/Vulkan), viewport 384 × 832, DPR thiết bị 2,8125, DPR render 1,5 |
| Bản build | Unity 6000.3.29f1 (Personal); URP 17.3.0, glTFast 6.21.0, meshopt.decompress 0.3.0-exp.1, KTX for Unity 3.8.0, AI Navigation 2.0.17, Input System 1.20.1 (kéo theo Burst 1.8.31, Collections 2.7.1, Mathematics 1.3.3); IL2CPP, Brotli + decompression fallback, Disk Size LTO, WebGL2, không thread |
| Mã nguồn | `prototypes/unity-baseline-a56` (S0 rỗng, S1 nặng; `?perf=1` bay camera 20 s) |
| Trạng thái | Huy chốt ngân sách tải 26/11/2026 |

## 1. Số đo

### Lượt 1: lần đầu (chưa cache)

| Chỉ số | S0 (rỗng) | S1 (nặng) | Baseline Three.js E0 (lần 2) |
|---|---|---|---|
| Dung lượng tải | 9,18 MB | 26,99 MB (gồm KTX2 18,5 MB) | — |
| Khung đầu / điều khiển được | 9,1 s / 9,1 s | 7,2 s / 17,5 s | 0,19 s |
| fps tb / p5 / p1 | 54,4 / 55,6 / 55,6 | 57,3 / 55,6 / 55,6 | 60,1 / 55,6 / 53,2 |
| Khung p95 / max | 18 ms / 2.195 ms | — / 2.020 ms | 18,0 ms / 22,8 ms |
| Draw call p50 | 3 | 57 (max 60, SetPass 26) | 26 |
| Tri mỗi khung | — | ~0,96 triệu (gồm pass bóng) | 3.226 |
| Heap WASM / JS | 67 / 38 MB | 117 / 38 MB | — |
| Chunk địa hình glb | — | 16/16, 0,58 s | — |
| KTX2 2048 UASTC | — | 8/8, 8,0 s, chuyển ASTC 4×4 | — |
| NavMesh dựng lúc nạp | — | 1,8 s | — |
| Âm thanh | — | Ogg: không; M4A (AAC): có | — |

### Lượt 2: đã cache player

| Chỉ số | S0 | S1 |
|---|---|---|
| Khung đầu / điều khiển được | 3,8 s / 3,8 s | 4,0 s / 8,3 s |
| fps tb / p5 / p1 | 52,7 / 55,6 / 52,6 | 53,9 / 52,6 / 45,5 |
| Heap WASM / JS | 67 / 78 MB | 97 / 78 MB |
| Chunk / KTX2 / NavMesh | — | 0,60 s / 1,86 s / 1,82 s |

Ghi chú: không rõ loại mạng lúc đo; đo lại với 4G giả lập 9 Mbps ở G-E2. Cả hai lượt đo bằng Samsung Internet, không phải Chrome Android (GD-01).

## 2. Kết luận

| Câu hỏi | Kết luận |
|---|---|
| Q1 Thời gian tải | Lần đầu 17,5 s: **không đạt** ≤ 10 s cũ; đã cache 8,3 s: đạt |
| Q2 Dung lượng player | 9,18 MB Brotli (wasm 6,13 MB + data 3,30 MB + framework, loader) |
| Q3 fps | Đạt rộng (≥ 45 fps p1 so với mục tiêu 30 fps), trình duyệt chạm trần khoảng 60 fps |
| Q4 Bộ nhớ | Đạt (heap WASM ≤ 117 MB, giới hạn 1024 MB) |
| Q5 glTFast/KTX2 | Đạt; glb của `terrain.mesh` thiếu trường `scene` nên phải dựng cảnh 0 tường minh |
| Q6 NavMesh | 1,8 s chặn luồng chính: dựng theo ô bất đồng bộ + cache `NavMeshData` |
| Q7 Âm thanh | Ogg/Opus không dùng được trên Unity Web; AAC (M4A) dùng được |
| Q8 Phiên bản | Ghim theo bảng đầu trang (`packages-lock.json`) |

Thêm: khựng khoảng 2 s lúc bắt đầu (biên dịch shader) → làm ấm shader trước khi cho điều khiển.

## 3. Quyết định và việc tiếp

Ngân sách tải Huy chốt 26/11/2026: lần đầu (chưa cache player) ≤ 20 s tới điều khiển được trên 4G 9 Mbps tier Vừa; đã cache player ≤ 10 s; Unity player ≤ 10 MB Brotli; lõi zone xuất phát ≤ 8 MB. Giữ runtime Unity (ADR-036).

Đề xuất cho E2 (mỗi việc một phiếu):
- AAC thay Opus: ADR mới thay phần âm thanh của ADR-024.
- NavMesh theo ô, bất đồng bộ, cache sau lần đầu.
- Texture lõi 1024 hoặc ETC1S để giảm thời gian tải KTX2.
- Làm ấm shader (ShaderVariantCollection) trước khung điều khiển được.
- Packager ghi `scene` mặc định vào glb.
- Máy chủ http/https: bản Unity 6 chặn UnityWebRequest http ngoài localhost; poc đang bật `insecureHttpOption`.
