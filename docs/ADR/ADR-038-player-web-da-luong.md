# ADR-038: Unity player Web bật đa luồng, trang chơi gửi COOP/COEP

| Mục | Nội dung |
|---|---|
| Mã | ADR-038 |
| Trạng thái | Đã chốt (Huy, 28/11/2026: "Chọn hướng 1" của CR-05) |
| Ngày | 28/11/2026 |
| Người chốt | Huy |
| Nguồn | T-0019 (đo A56), CR-05 (`docs/CR/CR-05-WEB-DA-LUONG-NAVMESH.md`), OIT-CHR-01, POC-U1 Q6 |
| Thay thế | Cài đặt build Web "không đa luồng" của POC-U1 / T-0022 (`threadsSupport = false`). Phần còn lại của ADR-036 giữ nguyên |

## Bối cảnh và lý do
NavMesh dựng lúc nạp zone theo ô 64 m (CR-02, PSC-CHR-07). Trên Web một luồng, `NavMeshBuilder.UpdateNavMeshDataAsync` chạy ngay trên luồng chính: đo A56 mỗi việc chiếm 40–93 ms, 64/64 việc làm một khung > 33 ms. Bản đa luồng đưa việc dựng sang luồng phụ: luồng chính 1,7 ms mỗi việc, 3/64 khung > 33 ms (max 50 ms), cả zone 1,4 s thay vì 2,6–3,0 s, 60 fps.

## Quyết định
1. Unity player Web build với `PlayerSettings.WebGL.threadsSupport = true` (`Build/Editor/PlayerBuild.cs`); trang nạp truyền `workerUrl`.
2. Mọi nơi phục vụ trang chơi (poc, xuất bản, link chơi thử, xem trước trong Web Studio) gửi `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: require-corp`; tài nguyên của trang cùng nguồn hoặc có `Cross-Origin-Resource-Policy`.
3. OIT-CHR-01 đổi thành: không khung nào > 100 ms vì NavMesh và ≤ 5 khung > 33 ms mỗi zone nạp.

## Hệ quả
- Heap WASM tăng khoảng 30 MB (A56: 68 → 96 MB); player vẫn ≤ 10 MB Brotli (9,10 MB).
- Trình duyệt không có `SharedArrayBuffer` (trang thiếu COOP/COEP) không chạy được player: trang nạp phải báo lỗi rõ như ERR-RTM-01.
- Web Studio: khung xem trước nhúng iframe phải cùng nguồn hoặc dùng `credentialless`; thêm hai tiêu đề vào CFG-WEB-04 và DDD-00 mục 9 khi làm W2/W4.
- Caddy poc `gamestudio.vinpride.com` đã gửi hai tiêu đề (`engine/unity/dev/apply-caddy-coi.ps1`).

## Phương án đã loại
- **Giữ một luồng, chấp nhận giật 2–3 s lúc nạp zone:** 64 khung 40–127 ms, trải nghiệm kém ngay lúc vào game.
- **Lát nhỏ hơn trên một luồng:** đo cục bộ lát 32 m vẫn 70–95 ms mỗi lời gọi và làm chậm cả zone.
- **Dựng `NavMeshData` lúc build:** đổi quyết định CR-02, cần đường đóng gói asset Unity cho từng game; để dành nếu đa luồng không đủ ở cảnh lớn.
