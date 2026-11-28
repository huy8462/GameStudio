# @gamestudio/packager

Packager theo zone × tier (MOD-CLI-04, PSC-CLI-02, ALG-CLI-02). **Hiện chỉ có bước texture** (`textures.ts`, `metrics.ts`; T-0020). Cần `ktx` 4.4.2, `ffmpeg`, `ffprobe` trên PATH.

## Bước texture (PSC-CLI-02 bước 5, 7, 9)

Mỗi ảnh nguồn (PNG/JPG) ra ba bản trong `outDir`:

| Tệp | Kích thước | Mã hoá |
|---|---|---|
| `full/<id>.ktx2` | ≤ `maxTexture[tier]` | map `sharp` → UASTC (quality 2, zstd 18); còn lại ETC1S (basis-lz, qlevel 128) |
| `core/<id>.ktx2` | ≤ `coreTextureMax` | luôn ETC1S, kể cả map `sharp` |
| `fallback/<id>.png\|jpg` | ½ bản full | PNG khi ảnh nguồn có kênh alpha, JPG khi không |

- Thu nhỏ bằng `ktx create --width/--height` (KTX2, kèm mipmap) và ffmpeg (fallback). Không dùng `sharp`: hai công cụ này đã ghim trong `tools/versions.json`, không thêm phụ thuộc gốc.
- Tất định: `ktx --threads 1`, ffmpeg bitexact; danh sách xếp theo `id`. Hai lần chạy cùng sha256.
- `textureReport` so tổng texture lõi với `coreZoneMB` và cạnh dài nhất với `coreTextureMax` (SRS-04 §6.3). Vượt → `fail`, `checks[].source` là tối đa 5 tệp nặng nhất. `coreTextureMax = 1024` còn là đề xuất, chờ đo A56.

```ts
import { packTextures, textureReport } from '@gamestudio/packager';
const packed = await packTextures([{ id: 'da', path: 'da.png' }], { outDir, maxTexture: 2048, coreTextureMax: 1024 });
const report = textureReport(packed, { coreTextureMax: 1024, coreZoneMB: 8 });
```

Chạy từ dòng lệnh (in một dòng JSON, ghi `textures-report.json`; thoát 0 đạt, 2 vượt ngân sách, 4 sai đầu vào, 5/6 công cụ):

```
node engine/build/packager/dist/main.js --out out --budgets games/_template/data/budgets.json --tier vua [--sharp id1,id2] a.png b.png
```

## Giới hạn hiện tại

- Có alpha hay không lấy theo định dạng điểm ảnh của tệp nguồn (PNG RGBA mà alpha toàn 255 vẫn tính là có alpha, fallback ra PNG).
- JPG fallback dùng `-q:v 4` của ffmpeg (xấp xỉ chất lượng 85).
- Chưa có: gom, kiểm asset, gộp mesh, atlas vật liệu, Meshopt, glb `scene: 0`, tách core/full đầy đủ, module, manifest, credits (các bước 1–4, 6–8, 10 của PSC-CLI-02).
