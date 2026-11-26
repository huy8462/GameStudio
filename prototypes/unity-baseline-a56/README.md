# prototypes/unity-baseline-a56 (POC-U1)

Đo thử player Unity Web trên Galaxy A56 trước khi chốt runtime Unity (CR-02, ADR-036, QĐ-16; FR-QA-07, OIT-GEN-01). Rule `prototypes` (nới lỏng). Unity 6000.3.29f1, Unity Personal.

## Nội dung
- `UnityProject/`: dự án Unity; cảnh dựng bằng mã nên không có cảnh soạn tay.
  - `Assets/Editor/PocBuild.cs`: cài đặt Web (IL2CPP, Brotli + decompression fallback, strip engine code, managed stripping High, Disk Size LTO, data caching, chỉ WebGL2, không thread, heap tối đa 1024 MB, Linear), URP (không MSAA, không HDR, bóng 1 cascade 1024, FXAA), dựng `S0`/`S1` rồi build ra `Build/S0`, `Build/S1`.
  - `Assets/Poc/PocPerf.cs` + `Assets/Plugins/WebGL/PocWeb.jslib`: `?perf=1` bay camera cố định 20 s, rồi hiện JSON (khung chữ + nút "Sao chép JSON", console `POC_PERF`).
  - `Assets/Poc/HeavyScene.cs`: S1 tải 16 chunk glb LOD0 thật của bước `terrain.mesh` (game thủ tục từ `games/_template`, preset `doi`) bằng glTFast + meshopt, 8 KTX2 UASTC 2048 (`ktx create` từ `splat-0.png` của `terrain.splat`, đổi màu bằng ffmpeg), 300 cầu ~1,5 nghìn tri vẽ `Graphics.RenderMeshInstanced`, 20 vật liệu, dựng NavMesh lúc chạy và đo ms, phát thử `.ogg` và `.m4a`.
  - `Assets/WebGLTemplates/Poc/index.html`: trần DPR (`?dpr=`, mặc định 1,5 như baseline Three.js).
- `serve.mjs`: máy chủ tĩnh 127.0.0.1 (không gửi Content-Encoding). `check-local.mjs`: Chromium headless mở URL, gom lỗi console, lấy JSON `?perf=1`.
- Gói (khoá trong `Packages/packages-lock.json`): URP 17.3.0, glTFast 6.21.0, meshopt.decompress 0.3.0-exp.1, KTX 3.8.0, AI Navigation 2.0.17, Input System 1.20.1.

## Build
```
$u = "C:\Program Files\Unity\Hub\Editor\6000.3.29f1\Editor\Unity.exe"
& $u -batchmode -quit -nographics -buildTarget WebGL -projectPath prototypes\unity-baseline-a56\UnityProject -executeMethod PocBuild.All -logFile prototypes\unity-baseline-a56\logs\build.log
```
- `PocBuild.OnlyS0`, `PocBuild.OnlyS1`: build lại một cảnh. Kết quả: dòng `POC_BUILD` trong log.
- Nếu log báo `Could not connect to IPC stream "Upm-..."` (máy bận, Package Manager khởi động > 30 s): chạy trước `Data\Resources\PackageManager\Server\UnityPackageManager.exe server -s <PID shell> --ipc-path Unity-Upm-poc -l 2`, chờ `IPC server started` trong `%LOCALAPPDATA%\Unity\Editor\upm.log`, rồi thêm `-upmIpcPath Upm-poc` vào lệnh Unity.
- Tài nguyên S1 nằm ở `Assets/StreamingAssets/` (glb, ktx2, âm thanh); sinh lại theo mục Nội dung.

## Chạy cục bộ
```
node prototypes/unity-baseline-a56/serve.mjs prototypes/unity-baseline-a56/UnityProject/Build/S1 18090
$env:GS_CHECK_URL='http://127.0.0.1:18090/?perf=1'; node prototypes/unity-baseline-a56/check-local.mjs
```

## Đo trên A56
Chưa xuất bản. Chép `Build/S0`, `Build/S1` lên máy chủ poc là gửi ra ngoài: **hỏi Huy trước**. Khi đã có URL:
1. Mở `<URL S0>/?perf=1`, để máy yên ~30 s (tải + 20 s bay), màn hình sáng, pin > 50 %, không sạc; bấm "Sao chép JSON".
2. Như trên với `<URL S1>/?perf=1`; thêm `&dpr=2` nếu cần so DPR.
3. Đo bằng Chrome Android (GD-01) và, nếu muốn so baseline E0, cả Samsung Internet.

## Lưu ý
- Máy dev không có GPU (ANGLE/Microsoft Basic Render Driver): fps desktop chỉ để kiểm chạy được, không phải số hiệu năng.
- `.ogg` qua `UnityWebRequestMultimedia` không chạy trên Unity Web ("Streaming of 'ogg' on this platform is not supported"); `.m4a` (AAC) chạy.
- Bộ đếm draw call/tri qua `ProfilerRecorder` có giá trị trong bản release (`countersValid`).
