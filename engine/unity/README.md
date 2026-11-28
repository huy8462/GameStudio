# engine/unity

Unity player dùng chung cho mọi game (CR-02, ADR-036; DDD-04 §2.1 MOD-RTM-01…17). Game chỉ là dữ liệu: trang nạp gửi `manifestUrl`, player tải manifest rồi nạp zone. Unity 6000.3.29f1 (Unity Personal), URP, nền Web (chỉ WebGL2). Khung dựng ở T-0022.

## Bố cục (`Assets/GameStudio/`)

| Thư mục | Nội dung | Mã |
|---|---|---|
| `Core/` | `EngineRunner` (GameObject `GameStudio`, nhận `Boot(json)`, `Play()`), `Boot`, `Engine` (vòng đời, vòng hệ thống), `ISystem`/`Order`/`EngineContext`, `SystemRegistry`, `EventBus`, `Pool`, `GameClock` | MOD-RTM-01, 02 |
| `Loader/` | `Manifest` + `ManifestCheck`, `ZoneStreamer` (nạp core), `GltfLoader`, `Ktx2Loader` | MOD-RTM-04, 05 |
| `Tier/` | `Tier`, `Detect`, `ApplyTier`, `tier-table.json` | MOD-RTM-07 |
| `Render/` | `RenderSystem`, `UrpTierAssets/` và `Materials/` (do build sinh) | MOD-RTM-06 |
| `Input/` | `InputState` từ bàn phím/chuột/cảm ứng | MOD-RTM-08 |
| `CameraPlayer/` | `PlayerSystem`, `PlayerController` (CharacterController, STM-CHR-01), `ThirdPersonCamera` (SphereCast) | MOD-CHR-01, 02 |
| `World/Terrain/` | `HeightGrid`/`TerrainHeights` (heightAt, normalAt; `ctx.Terrain`), `TerrainColliderBuilder` (MeshCollider LOD1 theo ô 64 m) | MOD-WLD-13 |
| `Perf/` | `PerfMonitor` (`?perf=1`), `Histogram`, `RenderStats` | MOD-RTM-13 |
| `Bridge/`, `Plugins/WebGL/` | `GsBridge` + `gs-bridge.jslib`, `gs-device.jslib` | IF-RTM-01 |
| `Shared/Json/` | `MiniJson` (đọc JSON có bảng theo khoá) | |
| `Shared/Rng/` | `Pcg32` (PCG32 XSH-RR, `DeriveSeed`, `Fork`), khớp từng bit với `@gamestudio/rng` | MOD-GEN-01, 02 |
| `Shared/Expr/` | `ExprCompiler.TryCompile` (lexer, Pratt parser, kiểm tĩnh, gập hằng, closure ngắn mạch), namespace `GameStudio.Expr` | MOD-RTM-15 |
| `Build/Editor/` | `PlayerBuild`, `UrpTiers`, `BootScene` (chỉ chạy trong Editor) | |
| `Tests/` | test EditMode (Unity Test Framework) | |

Ba asmdef: `GameStudio.Runtime` (gốc `Assets/GameStudio`), `GameStudio.Build.Editor`, `GameStudio.Tests.EditMode`. Trang nạp: `Assets/WebGLTemplates/GameStudio/index.html`.

## Quy ước

- Hệ thống mới: kế thừa `SystemBase`, đặt `Id` và `Order` (`Order.*`), đăng ký trong `Boot.Run`. Lấy thời gian từ `ctx.Clock`, không đọc `Time.*`/`DateTime`/`UnityEngine.Random` (luật tất định).
- Không cấp phát trong `Tick` (FR-RTM-23): dùng `Pool<T>`, `EventBus` (struct), mảng dùng lại.
- Không có mã riêng của game trong player (FR-RTM-04); module tuỳ chọn bật bằng `manifest.modules`.
- Mã build-time đặt trong `Build/Editor/`. Số đo thêm cho `?perf=1`: ghi JSON thô vào `ctx.Perf.Extra["<khoá>"]`.
- Tệp ≤ ~300 dòng, comment đầu tệp ghi mã phiếu và mã truy vết. Cảnh, asset URP và bộ biến thể làm ấm (`Render/Warmup/Resources`, T-0021) sinh bằng mã (`PlayerBuild.Prepare`), không soạn tay. NavMesh dựng theo ô lúc nạp zone (`NpcAi/Nav`, T-0019).

## Lệnh (chạy trên máy có Unity, không chạy trên VM)

```
$u = "C:\Program Files\Unity\Hub\Editor\6000.3.29f1\Editor\Unity.exe"
# Test EditMode (không kèm -quit; -testResults tương đối tính từ projectPath)
& $u -batchmode -nographics -buildTarget WebGL -projectPath engine\unity -runTests -testPlatform EditMode -testResults logs\test-results.xml -logFile engine\unity\logs\test.log
# Build Web ra engine/unity/Build/player; kết quả ở dòng GS_BUILD trong log
& $u -batchmode -quit -nographics -buildTarget WebGL -projectPath engine\unity -executeMethod GameStudio.Build.PlayerBuild.Build -logFile engine\unity\logs\build.log
# Dữ liệu thử (16 chunk địa hình của POC-U1) rồi mở bằng Chromium headless, in một dòng JSON
node engine/unity/dev/make-dev-data.mjs
node engine/unity/dev/check-local.mjs
```

Tham số trang: `?manifest=<url>`, `?navslice=<m>` (lát dựng NavMesh, T-0019), `?tier=thap|vua|cao|toi_da`, `?perf=1`, `?autoplay=1`, `?dev=1`, `?dpr=<trần>`, `?mode=play|preview|test`. Máy dev không có GPU nên fps cục bộ chỉ để biết chạy được; số thật đo trên A56. Đưa bản build lên máy chủ poc là gửi ra ngoài: hỏi Huy trước. Xuất bản: `dev/publish-poc.ps1 -Src <build> -Name gamestudio-<tên>` chép vào `C:\poc-gamestudio\<tên>`, Caddy phục vụ riêng (`dev/caddy-gamestudio.txt`), không chung thư mục `split` của chuaonline.

## Chưa có (phiếu sau)

Prefetch/giải phóng zone, phần `full`, lightmap; `TierMonitor`; tìm đường, crowd, kẹt của NPC (E6); UI Toolkit, âm thanh, lưu, tương tác; `EditorBridge` và `ApplyRuntimeData`; `window.__gsTest`; vật liệu splat và HDRI lúc chạy; `Ngoi`/`Boi`, camera ngôi một, nút hành động trên màn hình. Dữ liệu thật: build game bằng `engine build` (bước `packager`, T-0026) rồi mở `?manifest=<đường dẫn>/manifest.json`.
