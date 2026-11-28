---
name: engine-unity-gameplay
description: "Viết gameplay C# cho player Unity của GameStudio: hệ thống ISystem đăng ký trong Boot.Run, EventBus, Pool, GameClock, input, camera người chơi, NavMesh theo ô, nạp zone/glTF/KTX2, cầu nối JS. Dùng khi thêm hoặc sửa mã C# trong engine/unity/Assets/GameStudio (CR-02, ADR-036, FR-RTM-04, FR-RTM-23)."
---

# engine-unity-gameplay: mã C# của player

Đọc `engine/unity/README.md` (bảng thư mục, quy ước) trước. Game **không có mã riêng** trong player (FR-RTM-04): hành vi đến từ dữ liệu (`manifest`) và module tuỳ chọn bật bằng `manifest.modules`.

## Khung có sẵn (`Assets/GameStudio/`)

- `Core/`: `EngineRunner` (GameObject `GameStudio`, nhận `Boot(json)` và `Play()` từ trang), `Boot.Run` (nơi đăng ký hệ thống), `Engine` (vòng đời theo STM-RTM-01), `ISystem`/`SystemBase` + `Order.*`, `EngineContext` (`ctx.Clock`, `ctx.Perf`...), `SystemRegistry`, `EventBus`, `Pool<T>`, `GameClock`.
- `Loader/`: `Manifest` (+ `ManifestCheck`), `ZoneStreamer` (nạp phần core), `GltfLoader`, `Ktx2Loader`.
- `Input/` (`InputSystemGs`, `KeyboardMouse`, `TouchJoystick`), `CameraPlayer/` (người chơi + camera theo sau), `NpcAi/Nav/` (NavMesh dựng theo ô lúc nạp zone, T-0019; tìm đường/crowd là E6), `Bridge/GsBridge` + `Plugins/WebGL/*.jslib` (IF-RTM-01).
- Asmdef: `GameStudio.Runtime`, `GameStudio.Build.Editor`, `GameStudio.Tests.EditMode`.

## Cách thêm hệ thống

1. Kế thừa `SystemBase`, đặt `Id` và `Order` (`Order.*`), đăng ký trong `Boot.Run`.
2. Thời gian lấy từ `ctx.Clock`. **Không** `Time.*`, `DateTime`, `UnityEngine.Random` (tất định, luật cứng 7); ngẫu nhiên dùng bản C# của `rng` khi có (chưa có: phiếu sau).
3. **Không cấp phát trong `Tick`** (FR-RTM-23): `Pool<T>`, `EventBus` dùng struct, mảng dùng lại, không LINQ hay nối chuỗi trong vòng nóng.
4. Số đo riêng: `ctx.Perf.Extra["<khoá>"] = "<JSON thô>"` (ví dụ `navmesh` ở `NavService`).
5. Trang nạp (`Assets/WebGLTemplates/GameStudio/index.html`) gửi `manifestUrl`; tham số `?manifest= ?tier= ?perf=1 ?autoplay=1 ?dev=1 ?dpr= ?mode=play|preview|test ?navslice=<m>`.
6. Test EditMode cạnh mã trong `Tests/` (`CoreTests`, `LoaderTierTests`, `NavTests`); chạy bằng `engine-unity-build`.
7. Đa luồng (ADR-038): việc nặng (NavMesh) chạy luồng phụ; mã chạm API Unity phải ở luồng chính. Trang chơi **phải** có COOP/COEP, nếu không template báo lỗi rõ (`crossOriginIsolated`).

## Chưa có (đừng giả định)

Prefetch/giải phóng zone, phần `full`, lightmap, `TierMonitor`, tìm đường/crowd/kẹt NPC, UI Toolkit, âm thanh (AAC, ADR-037), lưu, tương tác, `EditorBridge`/`ApplyRuntimeData`, `window.__gsTest`, bản C# của `rng`/`expr`.

## Luật

Tệp ≤ ~300 dòng; comment đầu tệp ghi mã phiếu + truy vết. Hội thoại NPC chỉ kịch bản tĩnh (ADR-035).
