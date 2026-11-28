---
name: engine-unity-build
description: "Dựng Unity Web player của GameStudio bằng batchmode (engine/unity): build WebGL, chạy test EditMode, đọc dòng GS_BUILD, kiểm cục bộ bằng Chromium headless, dữ liệu thử, xuất bản poc. Dùng khi sửa mã trong engine/unity, cần build/test player hoặc đưa bản build lên máy chủ poc (CR-02, ADR-036, ADR-038, FR-DEV-02)."
---

# engine-unity-build: dựng player bằng batchmode

Player Unity 6000.3.29f1 (URP, chỉ WebGL2) dùng chung cho mọi game; game chỉ là dữ liệu (ADR-036). Mã ở `engine/unity/`, bố cục xem `engine/unity/README.md`. Build/test chạy trên máy có Unity (Remote Control), **không chạy trên VM**.

## Lệnh thật

```powershell
$u = "C:\Program Files\Unity\Hub\Editor\6000.3.29f1\Editor\Unity.exe"
# Test EditMode (không kèm -quit; -testResults tính từ projectPath)
& $u -batchmode -nographics -buildTarget WebGL -projectPath engine\unity -runTests -testPlatform EditMode -testResults logs\test-results.xml -logFile engine\unity\logs\test.log
# Build Web ra engine/unity/Build/player
& $u -batchmode -quit -nographics -buildTarget WebGL -projectPath engine\unity -executeMethod GameStudio.Build.PlayerBuild.Build -logFile engine\unity\logs\build.log
```

- Build mất 4–23 phút (IL2CPP + LTO): chạy nền (`run_in_background`), không poll.
- Đầu ra máy đọc: `Select-String GS_BUILD engine\unity\logs\build.log`. Dòng cuối `GS_BUILD player result=Succeeded ... playerMB=<x> budgetMB=10 withinBudget=true|false`. Không đọc nguyên log (hook H-02). `GS_BUILD_MSG` là cảnh báo/lỗi của bước build. Thoát 3 khi build lỗi.
- `PlayerBuild.Prepare` chỉ sinh asset URP, cảnh Boot, bộ biến thể làm ấm (không build). Cảnh, asset URP, SVC **sinh bằng mã**, không soạn tay.
- Cài đặt Web ở `PlayerBuild.Settings()`: chỉ WebGL2, Brotli + `decompressionFallback`, `dataCaching`, **`threadsSupport = true`** (đa luồng mặc định, ADR-038; không còn biến `GS_WEB_THREADS`), heap tối đa 1024 MB, template `PROJECT:GameStudio`.
- Ngân sách: `playerMB` ≤ 10 (SRS-04 §6.3). Bản đa luồng đo được 9,10 MB.

## Kiểm cục bộ (không cần GPU)

```powershell
node engine/unity/dev/make-dev-data.mjs        # 16 chunk địa hình POC-U1 + manifest.json vào Build/player/data
node engine/unity/dev/check-local.mjs [thư mục build] ["?perf=1"]   # in MỘT dòng JSON {url,state,errors,failed,perf}
```

`check-local` phục vụ ở 127.0.0.1 kèm COOP/COEP (bản đa luồng cần `crossOriginIsolated`), mở Chromium headless, chờ player tới `DangChay`. `GS_CHECK_TIMEOUT_MS` đổi thời gian chờ (mặc định 180 s). fps cục bộ chỉ để biết chạy được; số thật đo ở A56 (xem `engine-unity-perf`).

## Sau khi build

- Build làm bẩn `ProjectSettings/ProjectSettings.asset` và `Assets/GameStudio/Scenes/Boot.unity`: `git checkout` hai tệp này trước khi commit nếu không chủ định đổi.
- Thư mục `Build/`, `Library/`, `logs/` bị git bỏ qua.

## Xuất bản poc (gửi ra ngoài: hỏi Huy trước)

```powershell
engine\unity\dev\publish-poc.ps1 -Src engine\unity\Build\player -Name gamestudio-<tên>
```

Chép vào `C:\poc-gamestudio\<tên>` (tên dạng `gamestudio-[a-z0-9-]+`), mở ở `https://gamestudio.vinpride.com/<tên>/?perf=1`. Caddy phải gửi `Content-Encoding br` cho `*.unityweb`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` (khối mẫu `dev/caddy-gamestudio.txt`; `dev/apply-caddy-coi.ps1` thêm COOP/COEP vào khối đã có).

## Luật

- Script `.ps1` lưu **UTF-8 có BOM** (Windows PowerShell 5.1 mới đọc đúng tiếng Việt).
- Claude **không tự push** và **không sửa `C:\caddy\Caddyfile`, không khởi động lại tác vụ `caddy-proxy`**: đưa lệnh cho Huy chạy (`apply-caddy-*.ps1` sao lưu `Caddyfile.truoc-*`, `caddy validate`, rồi khởi động lại).
- Tệp mã ≤ ~300 dòng, comment đầu tệp ghi mã phiếu và truy vết (FR/MOD/PSC).
