# CR-05: Player Web đa luồng để dựng NavMesh ngoài luồng chính (đề xuất)

| Mục | Nội dung |
|---|---|
| Mã | CR-05 |
| Yêu cầu | Phát hiện ở T-0019 (đo A56 28/11/2026) |
| Trạng thái | **Đề xuất, chờ Huy chọn** (hướng 1/2/3 trong luồng) |
| Người soạn | Claude, 28/11/2026 |
| ADR kèm | ADR-038 (mới, chưa viết): player Web bật `threadsSupport`; nơi phục vụ gửi COOP/COEP |

## 1. Lý do

Bản Web một luồng chạy `NavMeshBuilder.UpdateNavMeshDataAsync` ngay trong lời gọi: mỗi ô 64 m × họ tác nhân chiếm luồng chính 40–93 ms trên A56, 64/64 việc làm một khung > 33 ms (OIT-CHR-01 chưa đạt). Bản đa luồng (`PlayerSettings.WebGL.threadsSupport = true`, trang có COOP/COEP) chuyển việc dựng sang luồng phụ.

| Số A56 (tier Vừa, 16 ô × 4 họ) | Một luồng | Đa luồng |
|---|---|---|
| Luồng chính mỗi việc (`callMsMax`) | 40–93 ms | 1,7 ms |
| Khung > 33 ms / > 100 ms khi dựng | 64 / 1 | 3 / 0 |
| Khung max khi dựng | 111–127 ms | 50 ms |
| Ô người chơi / cả zone | 0,20–0,39 s / 2,6–3,0 s | 0,26 s / 1,44 s |
| Heap WASM | 68 MB | 96 MB |
| Player (Brotli) | 9,18 MB | 9,10 MB |

## 2. Thay đổi đề xuất (hướng 1)

| Tài liệu | Chỗ sửa |
|---|---|
| ADR-038 (mới) | Player Web đa luồng; điều kiện: host gửi `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`; mọi tài nguyên cùng nguồn hoặc có CORP |
| TSD-05 OIT-CHR-01 | "không khung nào > 33 ms" → "không khung nào > 100 ms; ≤ 5 khung > 33 ms mỗi zone" (hướng 1) |
| SRS-04 / TSD-04 (cài đặt build Web, NFR bộ nhớ) | Ghi `threadsSupport`, heap tăng ~30 MB; yêu cầu tiêu đề COOP/COEP cho poc và xuất bản (W4) |
| DDD-04 `PlayerBuild` | Bỏ biến môi trường thử `GS_WEB_THREADS`, bật mặc định |

## 3. Tác động

- Mã: `Build/Editor/PlayerBuild.cs` (bật mặc định), template đã có `workerUrl`; Caddy gamestudio đã gửi COOP/COEP (`dev/apply-caddy-coi.ps1`).
- Web Studio (W4) xuất bản và link chơi thử phải gửi hai tiêu đề; nhúng iframe khác nguồn cần `credentialless` hoặc CORP.
- Phiếu: T-0019 đóng theo tiêu chí mới.
