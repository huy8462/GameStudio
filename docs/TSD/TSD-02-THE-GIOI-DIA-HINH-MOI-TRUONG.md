# TSD-02: Thế giới, địa hình và môi trường

| Mục | Nội dung |
|---|---|
| Mã tài liệu | TSD-02 |
| Phiên bản | 1.2 |
| Ngày | 26/11/2026 |
| Tài liệu cha | TSD-00 `TSD-00-TONG-QUAN.md` |
| SRS nguồn | SRS-02 v0.1 (FR-WLD-01…40, NFR-WLD-01…05) |
| Gói | Bước build `world.fetch`, `world.heightfield`, `terrain.erode`, `terrain.mesh`, `terrain.splat`, `water`, `vegetation`, `placement`, `lighting.bake`; Python `engine/build/py/heightfield`; script Blender `engine/build/blender/{ant,sapling,bake}`; runtime `render/terrain`, `render/water`, `render/vegetation`, `fx/` |
| Pha | E1, E3, E4, E5; web W3–W4 |
| Trạng thái | Đã duyệt (Huy, 22/11/2026); **v1.2 theo CR-02 (Unity) sau POC-U1**, chờ Huy xem lại |

---

## 1. Giới thiệu
Thiết kế kỹ thuật dựng không gian chơi từ dữ liệu: hai bộ nạp địa hình cùng định dạng trung gian, xói mòn, mesh chunk/LOD, splat, nước, thực vật instancing + impostor, bố trí theo luật, bake ánh sáng Cycles CPU và hiệu ứng runtime; tất định theo seed (QT-WLD-01) và trong ngân sách A56.

---

## 2. Kiến trúc thành phần

| Bước | Runner | Mã | Đầu ra chính |
|---|---|---|---|
| `world.fetch` | python | `steps/world-fetch/main.py` | `cache/dem/*.tif` (COG cắt bbox), `cache/osm/*.osm.pbf` hoặc `.json` (Overpass) + `fetch.provenance.json` |
| `world.heightfield` | python (+ blender khi preset `ant`) | `steps/world-heightfield/main.py` | Heightfield bundle (SRS-02 mục 2.2) |
| `terrain.erode` | python (numba) | `steps/terrain-erode/main.py` | `height.r32` đã xói mòn, `flow.r8`, `sediment.r8` |
| `terrain.mesh` | node | `steps/terrain-mesh/index.ts` | `chunks/<cx>_<cz>/lod{0..3}.glb`, `collider.bin` |
| `terrain.splat` | python | `steps/terrain-splat/main.py` | `splat-<i>.png` (RGBA = 4 lớp), `surface.png`, `layers.json` |
| `water` | node | `steps/water/index.ts` | `water/<id>.glb`, `water-mask.png` |
| `vegetation` | node + blender (cây) | `steps/vegetation/index.ts` | `veg/instances-<layer>.bin`, `veg/impostors/<species>.ktx2` |
| `placement` | node | `steps/placement/index.ts` | `placement/instances.bin`, `placement/report.json` |
| `lighting.bake` | blender | `blender/bake/bake_zone.py` | `lightmaps/<tod>/<atlas>.ktx2` (RGBM), `ao/<atlas>.ktx2` |

Mọi bước tuân IF-CLI-02 (TSD-04); hash theo TSD-00 ALG-GEN-02; seed bước theo QT-WLD-01 (`deriveSeed(world.seed, stepId, zoneId, localSeed)`).

---

## 3. Dữ liệu

| Mã | Cấu trúc | Ghi chú |
|---|---|---|
| SCH-WLD-01 | `world.json` | Khoá theo SRS-02 mục 6.1; `$defs`: `polygon` (mảng `[x,z]` m, ≥ 3 đỉnh, không tự cắt — kiểm bằng `shapely.is_valid` ở build và thư viện `polygon-clipping` ở web), `zone`, `water`, `vegetationLayer`, `placementRule`, `placedObject`, `region`, `timeOfDay`, `atmosphere`, `postFx`, `spawn` (TSD-05), `ambience` (TSD-03) |
| SCH-WLD-02 | `height.meta.json` | `{width, height, cellM, originLocal:[x0,z0], minH, maxH, crs: "EPSG:326xx", origin:{lat,lon}}`; `height.r32` float32 little-endian hàng trước cột |
| SCH-WLD-03 | `layers.json` (splat) | `{layers[{id, materialRef, tiling}], rules[{layer, slope:[a,b], height:[a,b], mask?, noise?, weight}]}` |
| SCH-WLD-04 | Instance nhị phân `*.bin` | Header `{magic 'GSIN', ver, count, assetIdx}` + mảng `float32[8]` mỗi instance: `x,y,z, yaw, pitch, roll, scale, variant` (đã sắp theo chunk) |
| SCH-WLD-05 | Trường form SCR-WLD-01 | `editor/world-fields.json`: `{pointer, label, type, min, max, unit, default, impact: 'runtime'\|'build:<bước>'}`; cũng là nguồn cho FR-WLD-38 và ALG-GEN-04 |

Bảng bề mặt (SRS-02 mục 6.4) cố định trong `engine/schema/surface-types.json`; `surface.png` 8 bit chỉ số, độ phân giải 1 m/px.

---

## 4. Thuật toán

| Mã | Thuật toán | Mô tả |
|---|---|---|
| ALG-WLD-01 | Hệ toạ độ | Chọn UTM zone từ tâm bbox (`pyproj`, EPSG 326xx Bắc bán cầu); gốc cục bộ = tâm bbox; trục dữ liệu: x = Đông, z = −Bắc (tay phải, Y lên, như glTF), đơn vị mét (FR-WLD-01); Unity player đọc qua glTFast tự đổi sang hệ tay trái của Unity (lật trục z), dữ liệu và pipeline không đổi (CR-02). Hàm `geoToLocal`/`localToGeo` dùng chung Python và TS (proj4js với cùng chuỗi CRS) |
| ALG-WLD-02 | Nạp dữ liệu thật | DEM: liệt kê tile Copernicus GLO-30 (1°×1°) giao bbox + đệm 200 m, đọc COG theo cửa sổ bằng `rasterio`, ghép, chiếu lại sang UTM lưới `cellM` (mặc định 2 m cho bbox ≤ 4 km², nội suy bậc 3); OSM: truy vấn Overpass các tag `highway, waterway, natural=water, landuse=farmland\|forest, building`, timeout 300 s (ERR-WLD-01 khi quá 5 phút), dự phòng trích từ Geofabrik bằng `osmium extract --bbox`. Khoá cache = SHA-256(nguồn, bbox, ngày phiên bản dữ liệu); `--refresh` bỏ cache (FR-WLD-05, 06). Thiếu license/URL → dừng (QT-WLD-04, ERR-WLD-02). `heightScale`, `smoothing` (lọc Gauss 3×3 lặp n lần) áp sau chiếu (FR-WLD-07) |
| ALG-WLD-03 | Vector → mask | Đường: đệm theo bề rộng tra bảng `road-widths.json` (ví dụ `primary` 8 m, `track` 3 m), raster hoá chống răng cưa vào `mask-road.png`; nước/ruộng/rừng/công trình: đa giác raster hoá; sông dạng đường đệm theo `width` hoặc mặc định theo loại; xuất `vectors.geojson` toạ độ cục bộ (FR-WLD-08). Khắc đường/sông vào heightfield: hạ độ cao dọc tuyến về mức trung bình lân cận bằng hồ sơ mặt cắt (độ sâu sông 1,5 m mặc định), làm mượt mép bằng hàm smoothstep theo khoảng cách |
| ALG-WLD-04 | Địa hình thủ tục | fBm trên OpenSimplex2 (bản Python thuần `numpy` để tất định, cài chung giá trị với seed) + ridged noise cho `nui`; tham số preset: `dong_bang` (biên độ 0,05·maxH, 3 octave), `doi` (0,35, 5), `nui` (1,0, 7, ridged), `ven_bien` (gradient + mặt nạ biển), `thung_lung` (lòng chảo theo hàm khoảng cách tới trục); `roughness` điều khiển persistence 0,35–0,65; `features[]`: đường/sông khắc như ALG-WLD-03, đồi = cộng Gauss theo đa giác (FR-WLD-09, 10). Preset `ant`: gọi A.N.T. Landscape trong Blender với seed, xuất lưới → lấy mẫu lại thành heightfield (FR-WLD-13) |
| ALG-WLD-05 | Trộn `mixed` | `H = (1 − m)·H_real + m·(H_real + detail)`, `detail` = fBm biên độ `procedural.maxHeight × roughness`; `m` từ `blendMask` (0–255 → 0–1) (FR-WLD-11) |
| ALG-WLD-06 | Xói mòn | Thuỷ lực dạng hạt (droplet): mỗi vòng thả N hạt tại vị trí theo luồng RNG, mỗi hạt ≤ 64 bước, tham số quán tính 0,05, sức mang 4, lắng 0,3, bốc hơi 0,01, bán kính xói 3 ô; nhiệt: lặp chuyển vật chất khi dốc > góc nghỉ (talus 35°); mask vùng áp dụng; `numba` `@njit(parallel=False)` để tất định; `iterations` × `strength` điều khiển N (FR-WLD-12). Độ phức tạp O(iterations × N × 64) |
| ALG-WLD-07 | Mesh chunk + LOD | Chunk 64 × 64 m (FR-WLD-14); LOD0 lưới cách `cellM`, LOD1–3 giảm 2×/4×/8× (hoặc giản lược có sai số hình học ≤ 0,1/0,4/1,5 m bằng meshoptimizer `simplify` giữ biên); khâu mép bằng **skirt** dọc 2 m để không nứt giữa LOD khác nhau; khoảng cách đổi LOD theo tier (Vừa: 80/200/450 m, TSD đề xuất); UV0 = toạ độ thế giới / tiling, UV2 cho lightmap theo atlas chunk. Collider: heightfield LOD1 lưu mảng float cho truy vấn độ cao O(1); tia và va chạm dùng `MeshCollider` Unity Physics dựng từ LOD1 lúc nạp chunk (CR-02, bỏ BVH) |
| ALG-WLD-08 | Splat + bề mặt | Trọng số lớp = Σ luật (độ dốc, độ cao, mask, noise) → chuẩn hoá → giữ 4 lớp mạnh nhất mỗi texel (tier Thấp/Vừa 4 lớp, Cao/Tối đa 8 lớp qua 2 texture RGBA, TSD đề xuất); độ phân giải splat 0,5 m/px; `surface.png` = argmax lớp ánh xạ sang loại bề mặt + ghi đè nước nông/sâu theo `depth` (FR-WLD-15, 16). Shader địa hình: trộn theo splat, triplanar ở dốc > 45° chỉ tier ≥ Cao |
| ALG-WLD-09 | Nước | Đa giác nước (mask OSM hoặc khai báo) → mesh phẳng tại `level` (tam giác hoá `earcut`, chia lưới 4 m cho gợn sóng ở tier Cao); bờ: khoảng cách tới mép (SDF tính lúc build, lưu kênh texture) cho bọt; độ sâu = `level − terrainHeight` lưu cùng texture. Shader theo tier như FR-WLD-18; phản chiếu cảnh tier Cao bằng render-to-texture nửa độ phân giải, 1 lần/2 khung. Va chạm: `depth > 1,2 m` là nước sâu → vùng chặn hoặc bơi (FR-WLD-17…19, QT-WLD-08). Vật trên mặt nước: luật bố trí `onWater` lấy mẫu trong mask nước, y = `level` (FR-WLD-20) |
| ALG-WLD-10 | Rải thực vật | Poisson-disk có seed (Bridson) trong mask lớp với `minSpacing`, lọc theo `maxSlope`, mật độ đích `densityPerHa` (loại bớt theo xác suất có seed); chọn loài theo trọng số, xoay/co ngẫu nhiên; xuất SCH-WLD-04 sắp theo chunk (FR-WLD-22). Cỏ không lưu instance: sinh trên GPU tại runtime từ splat + seed theo ô 4 m trong bán kính tier (Thấp 20 m, Vừa 35 m, Cao 60 m, TSD đề xuất) |
| ALG-WLD-11 | Cây và impostor | Recipe `tree-*.json` → Blender + Sapling Tree Gen (seed, hình tán, chiều cao, mùa) → mesh thân + thẻ lá, LOD0/1; impostor octahedral 8×8 khung 256 px (albedo + normal) nướng bằng Blender, KTX2 ETC1S; runtime chuyển sang impostor quá `impostorDistance` với dither cross-fade 0,5 s; một lô GPU instancing Unity (`Graphics.RenderMeshInstanced`) mỗi (loài, LOD) mỗi chunk (FR-WLD-21, 23; CR-02). Gió: dịch đỉnh theo `sin` có pha theo vị trí instance, trọng số theo độ cao đỉnh/màu đỉnh, cường độ `weather.wind`, tắt tier Thấp (FR-WLD-24) |
| ALG-WLD-12 | Bố trí theo luật | Mỗi luật: lấy mẫu Poisson-disk trong mask, loại ô trong vùng `no_place`, trong đệm đường/nước, dốc vượt, trong bán kính chiếm chỗ (`footprintRadius`) của `placedObjects` (QT-WLD-05); bám đất bằng truy vấn độ cao, căn theo pháp tuyến nếu khai báo; seed luật = `deriveSeed(world.seed, 'placement', zone, rule.seed)` (FR-WLD-25…27). Va chạm giữa các luật: xử lý theo thứ tự luật, lưới chiếm chỗ dùng chung |
| ALG-WLD-13 | Bake ánh sáng | Theo zone × mốc `baked=true`: Blender nạp hình tĩnh zone (glTF đã gộp, UV2), đặt mặt trời theo độ cao/phương vị, HDRI mốc làm world; Cycles CPU, 128 mẫu + OIDN (TSD đề xuất); bake `COMBINED` gián tiếp (không trực tiếp từ nhân vật động) vào atlas lightmap 1024–2048 theo tier; AO riêng 1 lần cho mọi mốc; mã RGBM (M = 8) → KTX2 UASTC. Chỉ bake lại zone/mốc có hash đổi (FR-WLD-28…30). Bake > 4 giờ → huỷ, giữ lightmap cũ (ERR-WLD-06) |
| ALG-WLD-14 | Chuyển mốc thời điểm | Runtime nạp nền lightmap mốc kề; shader trộn hai lightmap theo `t` (0→1 trong 3 s); nội suy màu/cường độ mặt trời, màu trời, sương; chu kỳ ngày đêm (`dayNightCycle.enabled`) nội suy giữa hai mốc gần nhất; mốc `baked=false` (đêm) dùng ánh sáng động + đèn (FR-WLD-31) |
| ALG-WLD-15 | Đèn động | Danh sách đèn từ dữ liệu; mỗi 0,25 s chọn ≤ `dynamicLights` tier đèn gần camera nhất trong frustum, đèn còn lại tắt (cường độ về 0 trong 0,3 s) (FR-WLD-32) |
| ALG-WLD-16 | Bầu trời và khí quyển | HDRI CC0 → cubemap tiền lọc + SH tính sẵn ở build (TSD-03 ALG-AST-10) cho IBL của URP; bầu trời thủ tục: mô hình Preetham bằng Shader Graph khi không HDRI (FR-WLD-33). Sương: fog Exp2 của Unity + sương theo độ cao trong sub-graph dùng chung; mây: dome texture cuộn; mưa: hạt GPU instanced quanh camera; sương sớm: lớp sương thấp theo độ cao; mỗi hiệu ứng có cờ tier (FR-WLD-34). Hậu kỳ URP Volume (CR-02): tone mapping, bloom, LUT chỉnh màu theo style bible; tier Thấp chỉ tone mapping (FR-WLD-35) |

---

## 5. Web Studio
- SCR-WLD-01 sinh form từ SCH-WLD-05 (FR-WLD-36); mỗi trường hiện nhãn "Áp ngay" / "Cần build" theo `impact`; thay đổi `runtime` gửi `RuntimeDataDiff` vào khung xem trước (TSD-04 IF-RTM-04), ≤ 2 s (FR-WLD-38).
- SCR-WLD-02: canvas 2D vẽ ảnh nền = heightfield tô bóng + mask (ảnh PNG sinh ở bước `world.heightfield`, lưu `preview/top.png` 1 m/px); công cụ vẽ đa giác, bắt đỉnh, kiểm hợp lệ client (`polygon-clipping`) và server (cùng thư viện), lưu bằng PATCH `world.regions`/`zones`/`playArea` (FR-WLD-37). Diện tích vùng chơi > 4 km² → chặn lưu (QT-WLD-07, ERR-WLD-03).

## 6. Hiệu năng

| Mục | Thiết kế | NFR |
|---|---|---|
| Build zone 1 km² không bake ≤ 15 phút | Lưới 2 m = 500 × 500 ô/km²; xói mòn numba ≈ 1–3 phút; thực vật Poisson O(n); cây dùng recipe đã cache (không chạy Blender lại khi recipe không đổi) | NFR-WLD-01 |
| Bake một zone một mốc ≤ 2 giờ CPU | 128 mẫu + khử nhiễu; atlas theo tier; chạy song song zone khác nhau trên worker khác | NFR-WLD-02 |
| Zone tier Vừa ≤ 50 MB | Lightmap 2048² ETC1S/UASTC ≈ 2–4 MB mỗi mốc; splat PNG→KTX2; instance nhị phân nhỏ | NFR-WLD-03 |
| Đổi mật độ cỏ ≤ 20% thời gian build | Cỏ sinh ở runtime: chỉ `packager` chạy lại (thay đổi tham số trong runtimeData) | NFR-WLD-04 |
| 10.000 cây trong ngân sách draw call | Một draw call mỗi (loài, LOD, chunk) + impostor gộp; 6 loài × 3 mức × ~9 chunk nhìn thấy ≤ 60 draw call ở tier Vừa | NFR-WLD-05 |

## 7. Bảo mật và license
- Tải ngoài chỉ tới miền trong `data-sources.json` (Overpass, Geofabrik, `copernicus-dem-30m.s3.amazonaws.com`, Poly Haven API); không theo chuyển hướng ra ngoài danh sách.
- Provenance heightfield ghi chuỗi bắt buộc: "© OpenStreetMap contributors (ODbL)" và thông báo Copernicus DEM ("produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018 provided under COPERNICUS by the European Union and ESA"), đưa vào `manifest.credits` (FR-WLD-39); HDRI/vật liệu CC0 ghi nguồn (FR-WLD-40).

## 8. Kiểm thử

| Mã | Kiểm thử |
|---|---|
| TST-WLD-01 | bbox 2×2 km thật (dữ liệu cache cố định trong repo test) → đường/sông khớp vector OSM lệch ≤ 1 ô; báo cáo Pass tier Vừa (AC-02-01) |
| TST-WLD-02 | Preset `doi`, seed 42, build hai lần → `outputHash` mọi bước bằng nhau (AC-02-02) |
| TST-WLD-03 | Đổi mật độ cỏ → chỉ `packager` chạy lại; đổi `vegetation.densityPerHa` → chỉ `vegetation`, `placement`… theo đồ thị (AC-02-03) |
| TST-WLD-04 | 10.000 cây trên A56 tier Vừa → draw call/fps đạt, cây xa là impostor (AC-02-04) |
| TST-WLD-05 | Chuyển sáng → hoàng hôn: không khung > 50 ms, không lightmap lỗi (AC-02-05) |
| TST-WLD-06 | Credit có OSM + Copernicus (AC-02-06) |
| TST-WLD-07 | Đa giác tự cắt/ngoài thế giới → ERR-WLD-04 ở cả web và CLI |
| TST-WLD-08 | Blender/add-on lệch bản → bước từ chối, ERR-WLD-07 |

## 9. Open item kỹ thuật

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| OIT-WLD-01 | Bước lưới heightfield 2 m có đủ cho bờ ruộng, bậc thang | Giữ 2 m; cho phép 1 m cho zone ≤ 0,25 km²; đo ở E1 |
| OIT-WLD-02 | Số mẫu Cycles và kích thước atlas lightmap | 128 mẫu, 2048 tier Vừa; chốt sau E5 theo NFR-WLD-02 |
| OIT-WLD-03 | Overpass công khai có giới hạn tần suất | Cache mạnh; nếu bị chặn dùng Geofabrik làm nguồn chính |

## 10. Truy vết

| FR / NFR | Thành phần TSD |
|---|---|
| FR-WLD-01 | ALG-WLD-01 |
| FR-WLD-02…04 | SCH-WLD-01 (`playArea`, `zones`); TSD-01 ALG-INT-03 (lưới zone mặc định); TSD-05 ALG-CHR-08 (chặn ra vùng) |
| FR-WLD-05…08 | ALG-WLD-02, ALG-WLD-03 |
| FR-WLD-09…13 | ALG-WLD-04, ALG-WLD-05, ALG-WLD-06 |
| FR-WLD-14 | ALG-WLD-07 |
| FR-WLD-15, 16 | ALG-WLD-08, SCH-WLD-03 |
| FR-WLD-17…20 | ALG-WLD-09 |
| FR-WLD-21…24 | ALG-WLD-10, ALG-WLD-11 |
| FR-WLD-25…27 | ALG-WLD-12 |
| FR-WLD-28…30 | ALG-WLD-13; TSD-04 ALG-CLI-01 |
| FR-WLD-31 | ALG-WLD-14 |
| FR-WLD-32 | ALG-WLD-15 |
| FR-WLD-33…35 | ALG-WLD-16 |
| FR-WLD-36…38 | Mục 5, SCH-WLD-05 |
| FR-WLD-39, 40 | Mục 7 |
| NFR-WLD-01…05 | Mục 6, TST-WLD-03, TST-WLD-04 |

## 11. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 22/11/2026 | Claude | Bản đầu từ SRS-02 v0.1 |
| 1.0 | 22/11/2026 | Huy | Duyệt toàn bộ tài liệu |
| 1.1 | 22/11/2026 | Claude | Chốt các số "(đề xuất)" có nguồn từ SRS sau khi Huy duyệt SRS |
| 1.2 | 26/11/2026 | Claude | CR-02 (ADR-036) sau POC-U1: ALG-WLD-01 (đổi trục khi nạp Unity), 07 (collider Unity Physics), 11 (instancing Unity), 16 (IBL cubemap + SH, trời Shader Graph, URP Volume) |
