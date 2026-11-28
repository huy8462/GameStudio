# @gamestudio/packager

Packager theo zone × tier (MOD-CLI-04, PSC-CLI-02, ALG-CLI-02): texture (T-0020) và đóng gói game + `manifest/1` cho Unity player (T-0026). Cần `ktx` 4.4.2, `ffmpeg`, `ffprobe` trên PATH. Bước build `packager` (`engine/build/steps/packager`) gọi `packGame`.

## Bước texture (PSC-CLI-02 bước 5, 7, 9)

| Tệp | Kích thước | Mã hoá |
|---|---|---|
| `full/<id>.ktx2` | ≤ `maxTexture[tier]` | map `sharp` → UASTC (quality 2, zstd 18); còn lại ETC1S (basis-lz, qlevel 128) |
| `core/<id>.ktx2` | ≤ `coreTextureMax` | luôn ETC1S, kể cả map `sharp` |
| `fallback/<id>.png\|jpg` | ½ bản full | PNG khi ảnh nguồn có alpha, JPG khi không |

- Tất định: `ktx --threads 1`, ffmpeg bitexact; danh sách xếp theo `id`.
- `textureReport` so tổng texture lõi với `coreZoneMB`, cạnh dài nhất với `coreTextureMax`; vượt → `fail`, `source` là 5 tệp nặng nhất.
- Dòng lệnh: `node engine/build/packager/dist/main.js --out out --budgets <budgets.json> --tier vua [--sharp a,b] a.png b.png`.

## Đóng gói game (`packGame`, bước 1, 6, 7, 8, 10)

Đầu vào: đầu ra `materials`, `terrain.erode` (độ cao spawn), và theo zone `terrain.mesh`, `terrain.splat`, `navmesh`. Đầu ra (đường dẫn tương đối `manifest.json`):

| Phần | Tệp |
|---|---|
| core (mỗi tier) | `zones/<z>/terrain/<cx>_<cz>/lod2.glb`, `zones/<z>/collider/*`, `zones/<z>/nav/sources.json`, `zones/<z>/layers.json`, texture lõi của splat zone và mọi vật liệu |
| full | `lod0`, `lod1`, `lod3` glb, texture full |
| dùng chung | `tex/t<maxTexture>-<coreTextureMax>/{core,full,fallback}/` (tier cùng cặp ngân sách dùng chung), `materials/<id>.json` (material.json + `textures` trỏ id texture), `env/<hdri>/{env,sky}.ktx2, sh.json` |

- Mọi glb ghi `scene: 0` (`withDefaultScene`, sửa chunk JSON, BIN giữ nguyên).
- Spawn: trọng tâm vùng `kind: 'spawn'`, độ cao lấy từ heightfield; zone xuất phát là zone chứa spawn.
- `modules.combat` khi `features.combat` hoặc `hunting` bật.
- Kiểm: `coreTextureMax` mỗi nhóm texture, `coreZoneMB` (lõi zone xuất phát), `zoneDownloadMB` mỗi zone × tier.

## Giới hạn hiện tại

- Core chỉ lấy LOD2 (DDD ghi LOD2–3): player chưa có LODGroup, nạp cả hai sẽ chồng lưới.
- Trường `environment` (HDRI, vật liệu) nằm ngoài DTO-RTM-01, chờ CR; player hiện bỏ qua. Chưa có `surfaceMap`, `lightmaps`, `player`, `credits`.
- Chưa có: kiểm asset/provenance (bước 2), gộp mesh, atlas vật liệu (3, 4), nén Meshopt lại (glb của terrain.mesh đã nén), lõi theo bán kính 60 m quanh spawn.
- Fallback JPG dùng `-q:v 4` (xấp xỉ chất lượng 85); alpha xét theo định dạng điểm ảnh nguồn.
