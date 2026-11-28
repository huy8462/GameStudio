---
name: engine-unity-render
description: "Đồ hoạ URP theo tier cho player Unity của GameStudio: URP asset sinh bằng mã (UrpTiers), bảng tier và phát hiện thiết bị, vật liệu, làm ấm shader (WarmupBuild/ShaderVariantCollection), texture KTX2, ngân sách render Galaxy A56. Dùng khi đổi ánh sáng, bóng, vật liệu, shader, tier hoặc làm ấm (MOD-RTM-06, MOD-RTM-07, ADR-036)."
---

# engine-unity-render: URP theo tier

Mục tiêu 30 fps tier Vừa trên Galaxy A56 (Xclipse 540), chỉ WebGL2. Số liệu gốc: `docs/POC/POC-U1.md`.

## Tier

- Bảng `Assets/GameStudio/Tier/tier-table.json`: luật `gpuRegex` xét trước (`Xclipse 5xx` → vua; `SwiftShader|Basic Render|llvmpipe` → thap), rồi `defaults` theo bộ nhớ/màn hình; `dprMax` thap 1.0, vua 1.5, cao 2.0, toi_da 2.5. Ép bằng `?tier=thap|vua|cao|toi_da`.
- `Detect` (phát hiện), `ApplyTier` (áp), `Tier` (enum). Ngân sách theo `games/*/data/budgets.json`, không số cứng trong mã.

## URP asset sinh bằng mã

`Build/Editor/UrpTiers.cs` sinh `Render/UrpTierAssets/Urp<Tier>.asset`: Thấp không bóng; Vừa 1 cascade 1024; Cao/Tối đa 2 cascade 2048; không MSAA, không HDR. **Mỗi URP asset phải gắn vào một mức Quality** (`PlayerBuild.Prepare` làm việc này); thiếu thì bộ loại biến thể của URP bỏ biến thể "không bóng" của tier Thấp và địa hình không vẽ được (`GL_INVALID_OPERATION`).

## Vật liệu và làm ấm shader (T-0021)

- Vật liệu do build sinh vào `Render/Materials/`; `RenderSystem` (MOD-RTM-06) dùng chúng.
- `Build/Editor/WarmupBuild.EnsureAll` sinh một `ShaderVariantCollection` cho mỗi tier (vật liệu của cảnh × tập từ khoá toàn cục theo số cascade bóng) vào `Render/Warmup/Resources`; `Render/ShaderWarmup` làm ấm trước "Chơi" và ghi `Perf.Extra["warmup"]` = `{warmupDone, warmupMs, variants}`.
- Dòng log kiểm: `GS_BUILD warmup tier=<t> materials=<n> variants=<n>`; SVC rỗng thì build lỗi.
- A56: `warmupMs` 22–84 ms, `startupMax` 101 ms. Khựng ~2 s của POC là do NavMesh, **không phải shader**. Đo lại làm ấm khi có bước `materials`.

## Texture

KTX2 qua `Ktx2Loader`: lõi zone ≤ `coreTextureMax` 1024 ETC1S (CR-04), tổng lõi ≤ `coreZoneMB` 8, player ≤ `playerMB` 10. Packager (`engine/build/packager`) làm ba bản full/core/fallback. A56 chuyển mã 8 KTX2 lõi 689,8 ms (định dạng đích ASTC).

## Quy trình

Sửa → build + test (`engine-unity-build`) → đo (`engine-unity-perf`) → ảnh góc chuẩn (`engine-unity-qa`). Xem tối đa 2–4 ảnh khác biệt nhất; còn lại đọc JSON.

## Luật

Không dùng AI sinh 3D; nguồn 3D là CC0 hoặc generator (QĐ-08, QĐ-12). Bake ánh sáng Blender 5.2 Cycles CPU (ADR-026, ADR-034); lightmap trong player chưa có. Âm thanh xuất bản AAC (ADR-037).
