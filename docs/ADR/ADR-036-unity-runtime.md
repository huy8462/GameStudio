# ADR-036: Runtime game và xem trước dùng Unity thay Three.js

| Mục | Nội dung |
|---|---|
| Mã | ADR-036 |
| Trạng thái | Đã chốt (Huy, 25/11/2026: duyệt phân tích CR-02, chọn "Player chung + dữ liệu"); mục 6 (nhúng player Unity để xem trước) và mục 10 (license Unity Personal) Huy chốt 25/11/2026 |
| Ngày | 25/11/2026 |
| Người chốt | Huy |
| Nguồn | Huy yêu cầu 25/11/2026 ("chỉ dùng Unity engine thay cho three.js"); CR-02 |
| Thay thế | (1) **ADR-018** toàn bộ. (2) **ADR-001** phần runtime (Three.js + Vite + TS); giữ fork và ghi công MIT. (3) **ADR-017** dòng Three.js. (4) **ADR-019** phần cài đặt TS. (5) **ADR-020** toàn bộ. (6) **ADR-024** phần decoder runtime (giữ định dạng). (7) **ADR-026** phần hiển thị lightmap (giữ bake Blender). (8) **ADR-027** phần khung xem trước. (9) **ADR-033** phần thống kê render |

## Bối cảnh và lý do
Huy đổi phương án engine: chỉ dùng Unity, bỏ Three.js. Tại thời điểm đổi, E1 chỉ có pipeline build (TS/Python), chưa có mã runtime, nên chi phí đổi thấp nhất có thể. Unity cho sẵn renderer, vật lý, navmesh, công cụ hồ sơ hiệu năng; game web vẫn chạy trong trình duyệt qua nền Unity Web.

## Quyết định
1. **Unity 6 LTS** (bản cụ thể chốt ở POC-U1), render pipeline **URP**, nền **Web (WebGL2)**. Không dùng WebGPU ở bản đầu.
2. **Một player chung** cho mỗi `engineVersion` (project `engine/unity/`, C#). Game là gói dữ liệu (`game.json`, `world.json`, glb, KTX2, âm thanh, manifest) nạp lúc chạy bằng **glTFast** + Meshopt decompress + KTX for Unity. Không build Unity theo từng game.
3. Pipeline build hiện có (ADR-023, 025, 034, step runner, cache) **giữ nguyên**; máy chủ và worker không cài Unity. Chỉ máy dev build player.
4. Va chạm bằng Unity Physics; điều hướng bằng **AI Navigation** dựng NavMesh lúc nạp zone. Bỏ three-mesh-bvh và recast-navigation-js.
5. Lightmap vẫn bake bằng Blender (RGBM KTX2, UV2), hiển thị bằng shader URP riêng.
6. Web Studio (React) nhúng **cùng player** để xem trước và chỉnh trực quan; `EditorBridge` là lớp TS gọi `SendMessage` và nhận sự kiện qua `.jslib`. Gizmo, chọn, vẽ địa hình làm trong player.
7. Logic riêng của game đi qua dữ liệu, `expr`, đồ thị hành vi. Không nạp mã C# theo từng game; tính năng cần mã là module của player, thêm bằng phiếu.
8. `@gamestudio/rng` và `@gamestudio/expr` có thêm bản C# trong player, kiểm chéo bằng bộ vector chung với TS/Python.
9. QA: Playwright vẫn điều khiển trình duyệt; thống kê render lấy từ player (`ProfilerRecorder`, `FrameTimingManager`) qua `.jslib`; test C# bằng Unity Test Framework chạy batchmode trên máy dev.
10. License **Unity Personal** (Huy chốt 25/11/2026; dùng nội bộ, chỉ máy dev build player cần kích hoạt).

## Hệ quả
- Tải lần đầu nặng hơn Three.js; NFR-RTM-01 và ngân sách tải TSD-00 §7.4 phải đo lại ở **POC-U1** trên A56 trước khi chốt số mới.
- Baseline G-E0 (scaffold Three.js) không còn đại diện cho runtime; POC-U1 thay cho phần đo runtime, không mở lại G-E0.
- Skill `.claude` gốc gắn Three.js (6/8) được thay bằng skill `engine-unity-*`; giữ hai skill sinh ảnh và âm thanh.
- `tools/versions.json` bỏ `three`, thêm `unity` (vai trò dev) và các gói Unity cố định bản.
- Claude Code không chạy được Unity Editor trong VM; build/test Unity chạy qua Remote Control trên máy Huy.
- Tài liệu đã duyệt cập nhật theo CR-02 (danh sách ở `docs/CR/CR-02-UNITY-PHAN-TICH-TAC-DONG.md`).

## Phương án đã loại
- **Mỗi game một project Unity, build bằng Editor batchmode trên worker:** cần Unity và license trên máy chủ, build chậm, mất cập nhật nóng ≤ 2 s trong Web Studio, khó tất định.
- **Giữ Three.js cho khung xem trước Web Studio:** trái yêu cầu "chỉ Unity", hình xem trước lệch bản xuất bản (FR-WEB-16).
- **Unity AssetBundle làm định dạng asset:** cần Unity trong pipeline; glTF + KTX2 đủ và giữ được mã E1.
- **Lightmapper Unity:** cần Editor theo từng game.
