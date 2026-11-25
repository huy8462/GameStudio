# CR-02: Đổi runtime sang Unity — phân tích tác động

| Mục | Nội dung |
|---|---|
| Mã | CR-02 |
| Yêu cầu | Huy, 25/11/2026: "Sửa lại phương án dùng engine là chỉ dùng Unity engine thay cho three.js" |
| Trạng thái | **Huy duyệt phân tích 25/11/2026**, chọn phương án A (player chung + dữ liệu). Tầng kiến trúc đã cập nhật (mục 9); Huy chốt thêm: nhúng player Unity để xem trước, license Unity Personal |
| Người soạn | Claude, 25/11/2026 |
| ADR kèm | ADR-036 (đề xuất), thay ADR-018 và một phần ADR-001, 017, 019, 020, 024, 026, 027, 033 |

## 1. Tóm tắt

- Thay đổi này lật **QĐ-01** (fork threejs-game-skills, runtime Three.js + Vite + TS). ADR-001 từng loại Unity WebGL; nay cần ADR mới.
- **Mã E0/E1 đã làm gần như không phải bỏ.** Toàn bộ E1 là pipeline build (schema, rng, expr, step runner, cache, địa hình, intake, new-game, status, import). Chưa có dòng runtime Three.js nào (`engine/runtime` chưa tạo, E2 chưa bắt đầu). Đầu ra hiện có (glb Meshopt + lượng tử, heightfield, splat PNG, JSON) Unity đọc được qua glTFast.
- Phần đổi nhiều nhất là **tài liệu runtime và Web Studio xem trước**: TSD-04, DDD-04, TSD/DDD-02 (render địa hình, thực vật), 03 (turntable, texture GLSL), 05 (BVH, recast), 08 (EditorBridge), 09 (skill `.claude`).
- Rủi ro lớn nhất là **thời gian tải trên A56**: Unity Web có phần runtime tải lần đầu cỡ vài MB nén, trong khi NFR-RTM-01 đặt ≤ 10 s trên 4G và TSD-00 §7.4 đặt JS khởi động ≤ 1,2 MB gzip. Cần đo lại ở POC trước khi chốt số.
- Đề xuất: **một Unity player chung đọc dữ liệu game** (mục 3). Pipeline Python/Node giữ nguyên; máy chủ/worker không cần Unity; chỉ máy Huy cài Unity Editor để build player.

## 2. Phạm vi "chỉ dùng Unity"

Cách hiểu đã dùng: Unity thay Three.js ở **mọi nơi vẽ 3D** — game xuất bản, khung xem trước và editor trực quan trong Web Studio, trang turntable QA. Không còn gói `three` trong repo.

Không đổi (không phải phần "engine đồ hoạ"):
- Web Studio vẫn là SPA React (ADR-027 phần UI), backend, kho đối tượng, xác thực, triển khai (ADR-028…032).
- Pipeline build TS/Python/Blender (ADR-023, 025, 034), Claude Code CLI (ADR-035), Gemini/ElevenLabs.

## 3. Phương án kiến trúc

| | A. Player chung + dữ liệu (đề xuất) | B. Mỗi game một project Unity |
|---|---|---|
| Cách chạy | Một bản Unity Web build theo `engineVersion`; game là gói dữ liệu (`game.json`, glb, KTX2, âm thanh) tải lúc chạy bằng glTFast | Pipeline sinh project Unity cho từng game rồi chạy Unity Editor batchmode để build |
| Unity ở đâu | Chỉ máy dev (Huy) build player; worker không cần | Worker Linux phải có Unity Editor (~10 GB) + license kích hoạt trên máy chủ |
| Pipeline hiện có | Giữ nguyên; bước mới chỉ là packager ra manifest cho player | Phần lớn chuyển vào Unity (import, nén texture, navmesh, lightmap) |
| Build lại game | Như hiện tại (cache, ≤ 30 s khi không đổi) | Mỗi lần vài phút tới hàng chục phút; NFR-GEN-05, NFR-GEN-04 khó đạt |
| Xem trước Web Studio | Nhúng đúng player đó, áp patch nóng qua cầu nối JS↔C# (FR-WEB-16, cập nhật nóng ≤ 2 s giữ được) | Phải build lại mới thấy thay đổi; cập nhật nóng ≤ 2 s không đạt |
| Script riêng từng game | Không nạp C# mới lúc chạy được (IL2CPP). Logic game đi qua dữ liệu + `expr` + đồ thị hành vi; tính năng cần mã thì thêm thành module của player qua phiếu | Viết C# riêng từng game được |
| Tất định | Giữ hash đầu ra build như cũ | Build Unity khó tất định theo byte |

Phương án B chỉ đáng chọn nếu cần script C# riêng cho từng game. FR-RTM-04 (script riêng, M, E1) là điểm duy nhất A làm yếu đi.

## 4. Thay thế kỹ thuật (theo phương án A)

| Chỗ cũ (ADR) | Thay bằng | Ghi chú |
|---|---|---|
| Three.js WebGLRenderer, GLSL (ADR-018) | Unity 6 LTS, URP, nền Web (WebGL2); shader Shader Graph/HLSL cho địa hình splat, nước, cỏ, impostor | WebGPU của Unity còn thử nghiệm: không dùng ở bản đầu |
| `@gamestudio/engine` TS + Vite (ADR-001, FR-RTM-03) | Project Unity `engine/unity/` (C#), assembly `GameStudio.Runtime`, `GameStudio.Editor` (chế độ editor trong player) | Phiên bản player = `engineVersion` |
| Hệ thống `init/update/dispose` + SoA `Float32Array` (ADR-019) | Giữ ý tưởng: vòng lặp hệ thống thứ tự cố định trong một `MonoBehaviour` điều phối; dữ liệu động ở mảng struct / `NativeArray`; không dùng DOTS/ECS | Không cấp phát trong vòng lặp nóng giữ nguyên (FR-RTM-23) |
| three-mesh-bvh, viên nang tự viết (ADR-020) | Unity Physics (PhysX tích hợp): `MeshCollider` tĩnh, `CharacterController` hoặc `CapsuleCast` | Không cần thư viện ngoài |
| recast-navigation-js (ADR-020) | Unity AI Navigation: dựng `NavMeshData` lúc nạp zone (`NavMeshBuilder` bất đồng bộ) từ collider; `NavMeshAgent` thay DetourCrowd | Bỏ bước build `navmesh` riêng; cần đo thời gian dựng trên A56 (OI) |
| glTF + Meshopt + KTX2 (ADR-024) | **Giữ định dạng**; runtime dùng glTFast + gói Meshopt decompress + KTX for Unity | Âm thanh: AAC/m4a làm đường chính nếu Opus giải mã không đều trên Web (kiểm ở POC) |
| Lightmap Blender RGBM (ADR-026) | **Giữ bake Blender**; shader URP riêng đọc lightmap RGBM KTX2 ở UV2 | Không dùng lightmapper Unity (cần Editor theo từng game) |
| Khung xem trước nhúng `@gamestudio/engine`, EditorBridge TS (ADR-027) | Nhúng Unity player (`createUnityInstance`) trong SPA; EditorBridge = lớp TS gọi `SendMessage` + `.jslib` trả sự kiện | Gizmo, chọn đối tượng, vẽ địa hình làm trong player (C#), không trong React |
| Playwright + `renderer.info` + bọc WebGL2 (ADR-033) | Giữ Playwright cho QA trình duyệt; thống kê lấy từ player (`ProfilerRecorder`, `FrameTimingManager`) qua `.jslib`; test C# bằng Unity Test Framework (EditMode/PlayMode) | Bọc `WebGL2RenderingContext` vẫn dùng được để đếm lệnh vẽ |
| Turntable Three.js headless (TSD-03 ALG-AST-06), texture GLSL trong Playwright | Turntable bằng chính player ở chế độ `?turntable=` chạy trong Playwright; texture thủ tục chuyển sang Python/numpy hoặc Blender | Worker vẫn không cần Unity |
| PMREM tính sẵn bằng Three.js | Bầu trời/HDRI: cubemap KTX2 + SH tính sẵn bằng Python | |
| Three.js 0.187.0 trong `tools/versions.json` (ADR-017) | `unity` (Editor, chỉ vai trò dev), `glTFast`, `ktxUnity`, `meshoptDecompress` cố định bản | `engine doctor` thêm kiểm Unity Editor |
| `@gamestudio/rng`, `@gamestudio/expr` (TS, Python) | Thêm bản C# chạy trong player, kiểm chéo bằng bộ vector chung (đã có `gen_rng_vectors.py`) | Bản TS vẫn dùng ở build và Web Studio để kiểm tính |

License (cần Huy chọn): Unity Personal miễn phí khi doanh thu/vốn dưới ngưỡng của Unity; dự án dùng nội bộ (QĐ-07) nên Personal đủ, trừ khi Huy muốn tính năng Pro. Chỉ máy build player cần kích hoạt.

## 5. Tác động tài liệu

Quy trình: ADR-036 mới (không sửa ADR cũ), cập nhật README ADR; mỗi tài liệu đã duyệt tăng phiên bản phụ + dòng lịch sử "CR-02"; chạy lại `srs-trace.py`, `tsd-trace.py`, `ddd-trace.py`, `uiux-trace.py`.

| Tài liệu | Mục chịu tác động | Mức |
|---|---|---|
| Brief | QĐ-01, §4.3 runtime web, bảng skill §4.4, E0 | Thêm ghi chú bản 7 (QĐ-16 thay QĐ-01 phần runtime) |
| ADR | Mới ADR-036; README ghi "bị ADR-036 thay" cho 018, và "một phần" cho 001, 017, 019, 020, 024, 026, 027, 033 | Mới |
| BRD-00 | §2 (nền Three.js), §6 QĐ-01, RB-01, GD-02, RR-05, PT-01/02, §… runtime | Vừa |
| BRD-04, 09 (+ 03 tên skill) | Runtime/QA; danh sách skill `threejs-*` (BR-42.1 MCP Three.js) | Nhỏ–vừa |
| SRS-00 | Bối cảnh "Engine runtime web", sơ đồ ngữ cảnh, bảng bên thứ ba, NFR-GEN-02 (tải), NFR-GEN-10 (tương thích), bảng pha 4.3 (G-E0 baseline, E2) | Vừa |
| SRS-04 | FR-RTM-03 (gói npm → player Unity), FR-RTM-04 (script riêng game), luồng khởi động §… (kiểm WebGL2), ERR-RTM-01, NFR-RTM-01/03, §6.3 ngân sách | **Lớn** |
| SRS-08 | FR-WEB-16 (xem trước nhúng engine) | Nhỏ |
| SRS-09 | FR-DEV-02 (skill gốc), FR-DEV-17 (MCP Three.js) | Vừa |
| SRS-01, 03 | Tên skill `threejs-image/audio-generator` | Nhỏ (chỉ tên) |
| TSD-00 | §2–3 (TD-02, 03, 04, 05, 09, 11, 12, 18), §4 cây thư mục `engine/runtime`, đồ thị gói, §7.2–7.4 ngân sách khung/tải | **Lớn** |
| TSD-04 | §2 runtime toàn bộ, ALG-RTM-01 (tier), ALG-QA-05 (canvas inspector), NFR-RTM-03, OIT-RTM-02 (BatchedMesh) | **Lớn** |
| TSD-02, 03, 05 | Render địa hình/thực vật (InstancedMesh, GLSL), turntable + texture GLSL + PMREM, BVH + recast + VAT | Vừa–lớn |
| TSD-08 | IF-WEB-05 EditorBridge, khung xem trước, áp patch nóng, giả lập tier | Vừa |
| TSD-01, 07, 09 | Tên skill, MCP Three.js, `.claude` | Nhỏ |
| DDD-04 | MOD runtime (`render/*.ts`, `perf/`, `editor/`), PSC khởi động (WebGL2), STM nạp game, inspector, TC lint import | **Lớn** (viết lại phần runtime sang C#) |
| DDD-02, 03, 05 | Module runtime địa hình/thực vật, turntable, NavService/recast, controller BVH, CFG-CHR-06 Recast | Vừa–lớn |
| DDD-06, 07 | Đường áp patch nóng qua EditorBridge (đổi tên lời gọi) | Nhỏ |
| DDD-08 | `EditorBridge` interface, `preview-frame` | Vừa |
| DDD-00, 09 | MOD-GEN-14, NFR-GEN-10, settings.debug MCP | Nhỏ |
| UIUX-01…03 | Khung xem trước, trạng thái tải player (màn tải lần đầu lâu hơn), lỗi trình duyệt không hỗ trợ | Nhỏ |
| G-E0 | Baseline A56 đo bằng scaffold Three.js không còn đại diện | Thêm cổng POC-U1 đo lại, không mở lại G-E0 |

Các phần không đổi: BRD-01, 02, 05, 06, 07, 10 (nghiệp vụ), SRS-02, 05, 06, 07 ở mức chức năng (chỉ chạm nếu có câu nhắc Three.js), toàn bộ phần web backend, intake, build, địa hình Python.

## 6. Tác động mã (repo `C:\GameStudio`, E0 + E1, commit tới `79a9400`)

| Phần | Tác động | Việc cần làm |
|---|---|---|
| `engine/schema`, `shared/rng`, `shared/expr`, `intake`, `status`, `cli` (build, new-game, import, status, brief) | Không đổi | — |
| `engine/build/steps/*` (world.fetch, heightfield, erode, mesh, splat) | Không đổi; glb Meshopt + `KHR_mesh_quantization` glTFast đọc được | Kiểm ở POC-U1 |
| `engine/cli/src/doctor` + `tools/versions.json` | Bỏ `three`, thêm `unity` (role dev), gói Unity cố định | Phiếu nhỏ |
| `engine/cli/src/import/checks.ts` | Danh sách đuôi tệp vẫn hợp | — |
| `prototypes/baseline-a56` (scaffold Three.js) | Giữ làm lịch sử; thêm `prototypes/unity-baseline-a56` | POC-U1 |
| `.claude/skills/threejs-*` (8 skill gốc), agent `asset-designer`, `tech-artist`, `qa`, `gameplay-ui`, lệnh `perf-snapshot`, `qa-light`, `structure-check.mjs`, `check:scripts` trong `package.json` | Nội dung Three.js không còn đúng | Giữ `threejs-image-generator`, `threejs-audio-generator` (không phụ thuộc Three.js, có thể đổi tên); thay 6 skill còn lại bằng `engine-unity-*` gọn; sửa structure-check |
| `LICENSE`, `UPSTREAM.md` | Vẫn giữ ghi công MIT (còn dùng một phần skill và script) | Ghi chú CR-02 |
| Mới | `engine/unity/` (project Unity), bản C# của rng và expr + test vector chung, packager ra manifest cho player | Từ E2 |

Kết luận cho cổng G-E1 (luồng "Tiếp tục dự án sau phần làm trên Cline"): theo phương án A, các điều kiện G-E1 còn lại (AC-02-01 dữ liệu DEM/OSM thật) là pipeline thuần, **không bị CR-02 chặn**. AC-01-05, AC-CR01-06 đã hoãn sang E2 nên sẽ đo trên player Unity. Theo phương án B thì nên tạm dừng G-E1 vì đầu ra build sẽ đổi.

## 7. Rủi ro và mục mở

| Mã | Nội dung | Cách xử lý |
|---|---|---|
| RR-CR02-01 | Tải lần đầu: runtime Unity Web nén cỡ vài MB, có thể vượt NFR-RTM-01 (≤ 10 s 4G) và ngân sách JS 1,2 MB | POC-U1 đo; nếu vượt thì đề xuất số mới (vd. ≤ 15 s lần đầu, ≤ 10 s khi đã cache) cho Huy duyệt |
| RR-CR02-02 | Bộ nhớ heap WASM trên Chrome Android | Đặt `maximumMemorySize`, đo ở POC-U1 |
| RR-CR02-03 | Bỏ script C# riêng từng game (phương án A) | Logic qua dữ liệu + expr; module mới vào player qua phiếu |
| RR-CR02-04 | Hai bản rng/expr (TS + C#) lệch nhau | Vector kiểm chéo chung, test cả hai phía |
| RR-CR02-05 | Claude Code làm C# Unity chậm hơn TS vì không chạy được Unity trong VM | Build/test Unity qua Remote Control trên máy Huy; skill `engine-unity-*` mô tả lệnh batchmode |
| OI-CR02-01 | Thời gian dựng NavMesh lúc nạp zone trên A56 | Đo ở POC-U1; nếu chậm thì cache `NavMeshData` sau lần đầu |
| OI-CR02-02 | Opus trong Unity Web | Kiểm ở POC-U1; dự phòng AAC |
| OI-CR02-03 | Bản Unity 6 LTS cụ thể và bản glTFast/KTX | Chốt ở POC-U1, ghi `tools/versions.json` |

## 8. Kế hoạch đề xuất

1. Huy duyệt phân tích này và trả lời các câu hỏi (kiến trúc, xem trước Web Studio, license).
2. Chốt ADR-036, cập nhật brief (bản 7, QĐ-16), README ADR.
3. Cập nhật tài liệu tầng kiến trúc: BRD-00, SRS-00, SRS-04, SRS-09, TSD-00, TSD-04, DDD-00, DDD-04; chạy lại các script truy vết.
4. POC-U1 (đầu E2): player Unity rỗng + một chunk địa hình glb + 300 instance + KTX2 trên A56; đo tải, fps, bộ nhớ, NavMesh. Có số rồi mới cập nhật ngân sách §6.3 và các TSD/DDD chi tiết còn lại (02, 03, 05, 08) cùng UIUX.
5. Phiếu mã nhỏ: doctor/versions bỏ `three` thêm `unity`; thay skill `.claude`.

## 9. Tiến độ cập nhật (25/11/2026)

| Tài liệu | Phiên bản mới | Nội dung |
|---|---|---|
| ADR-036, ADR README | — | Chốt ADR-036; README ghi các ADR bị thay toàn bộ/một phần |
| Brief | bản 7 | QĐ-16; ghi chú §4.3 |
| BRD-00 | 1.2 | QĐ-16, mục 2, ngoài phạm vi, RB-01, GD-02, PT-02 |
| BRD-09 | 1.2 | Bảng skill gốc, BR-42.1 (BRD-04 không nhắc Three.js, không đổi) |
| SRS-00 | 1.3 | 1.2, 2.1–2.3, 4.3 (POC-U1), 6.1, NFR-GEN-02, 10, GĐ-GEN-02, OI-GEN-05 |
| SRS-04 | 1.2 | FR-RTM-03, 04, luồng khởi động, bước `navmesh`, NFR-RTM-01, 03 |
| SRS-08 | 1.3 | Khung xem trước nhúng Unity player |
| SRS-09 | 1.2 | FR-DEV-02, 17 |
| TSD-00 | 1.3 | Tầng runtime, TD-02…18 phần thay, cây thư mục, đồ thị gói, ngân sách 7.2–7.4 |
| TSD-04 | 1.3 | Viết lại mục 2 (Unity player), ALG-RTM-01, 04, UI Toolkit, SCH-RTM-01, 04, ALG-QA-01, 05, TST-RTM-04, OIT-RTM-02 |
| DDD-00 | 1.1 | MOD-GEN-14, luật phụ thuộc, NFR-GEN-10 |
| DDD-04 | 1.1 | Mục 2.1, 3.1 sang C#, SEQ-RTM-01, 02, PSC-RTM-01, PSC-CLI-02, TC-RTM-04 |

Script truy vết: `srs-trace.py`, `tsd-trace.py`, `ddd-trace.py` đều exit 0 sau khi sửa.

Còn lại (sau POC-U1, theo mục 8): TSD/DDD-02, 03, 05, 08 (render địa hình/thực vật, turntable, BVH/recast → Unity Physics/AI Navigation, EditorBridge), TSD/DDD-01, 07, 09 (tên skill, MCP), UIUX-01…03, ngân sách SRS-04 §6.3; phiếu mã doctor/versions và skill `.claude`.
