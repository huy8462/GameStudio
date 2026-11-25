# T-0017 phương án: `world.fetch` nguồn thật (AC-02-01)

Ngày 25/11/2026. Trạng thái: **chờ Huy chốt**, chưa viết mã. Mô hình khuyến nghị cho các phiếu mã: Opus, effort medium.

## 1. Đích và hiện trạng

- **AC-02-01** (SRS-02): bbox 2×2 km thật → đường, sông khớp OSM (lệch ≤ 1 bước lưới); báo cáo Pass tier Vừa. Liên quan FR-WLD-05…08, 14, 39; ALG-WLD-01…03 (TSD-02); PSC-WLD-01…03, EP-WLD-01, DTO-WLD-02, 07, 08, TC-WLD-01, 06, 09 (DDD-02); ADR-005, ADR-025.
- **Đã có**: `world.fetch` chỉ nhánh `procedural` (nguồn khác thoát 5); `world.heightfield` chỉ thủ tục; schema `world.json` đã có `source: real|mixed`, `bbox`, `origin`. Python mới có `numpy`, `numba` (chưa có `rasterio`, `pyproj`, `shapely`, `osmium` mà ADR-025 ghi).
- **Việc cần làm cho AC-02-01** (không chỉ `world.fetch`):
  - tải DEM + OSM và lưu cache;
  - chiếu UTM sang toạ độ cục bộ (PSC-WLD-01);
  - nhánh `real` của `world.heightfield`: lấy mẫu lại DEM ra lưới `cellM` 2 m, `heightScale`/`smoothing`, vector → mask + `vectors.geojson`, khắc đường/sông (PSC-WLD-03);
  - splat dùng mask đường/nước;
  - provenance và credit;
  - fixture cố định `fixtures/hue-2x2/` (TST-WLD-01).

## 2. Quyết định Huy cần chốt

### (a) Mạng và nguồn dữ liệu

**Khi nào tải**

| PA | Nội dung | Được | Mất |
|---|---|---|---|
| A1 | Tải lúc `engine build` (như DDD PSC-WLD-02: có cache thì dùng, `--refresh` tải lại) | Đúng tài liệu; một lệnh | Build cần mạng. OSM đổi theo ngày nên cùng `inputHash` có thể ra đầu ra khác, chỉ tất định khi đã có cache |
| **A2 (khuyến nghị)** | Lệnh riêng `engine fetch-sources --game <id> [--refresh]` (hoặc `world.fetch` chỉ tải khi có cờ `--online`) tải về **ảnh chụp dữ liệu có ngày**. `engine build` chỉ đọc ảnh chụp, không mạng. Thiếu ảnh chụp thì thoát 6 kèm hướng dẫn | Build offline, tất định; người dùng thấy rõ lúc nào ra mạng; test CI không cần mạng | Thêm một lệnh. Lệch DDD: cần ghi lệch, hoặc change request (CR) nhỏ cho EP-WLD-01 |
| A3 | Thủ công: người dùng tự tải tệp `.tif` và `.json` đặt vào thư mục | Không mạng trong engine | Dễ sai, khó dùng; trái FR-WLD-05 |

**Nguồn DEM**

| PA | Nguồn | Ghi chú |
|---|---|---|
| **D1 (khuyến nghị)** | Copernicus GLO-30 trên AWS Open Data (`copernicus-dem-30m.s3.amazonaws.com`, COG công khai, không khoá) | Đúng ADR-025 và `data-sources.json`. Mỗi ô 1°×1°; vùng 2×2 km thường chỉ chạm 1 ô (tối đa 4) |
| D2 | OpenTopography (GLO-30/SRTM qua API) | Cần khoá API, trái luật "không lưu khoá" nếu không có cơ chế riêng; thêm host |
| D3 | SRTM 1″ (NASA Earthdata) hoặc mirror tile Terrarium | Earthdata cần đăng nhập; Terrarium là dữ liệu trộn, giấy phép và ngày phiên bản kém rõ |

**Nguồn OSM**

| PA | Nguồn | Ghi chú |
|---|---|---|
| **O1 (khuyến nghị)** | Overpass API (`out geom` JSON), một truy vấn mỗi bbox, có cache | Nhỏ (vài trăm KB cho 2×2 km). Giới hạn tần suất nhưng đủ dùng khi có cache (OIT-WLD-03) |
| O2 | Tệp `.osm.pbf` Geofabrik (Việt Nam) + `osmium extract --bbox` | Ổn định, không giới hạn tần suất, nhưng tải vài trăm MB và cần `osmium` |
| O3 | O1 làm chính, O2 làm dự phòng (đúng DDD) | Đầy đủ nhất; đề xuất để **phiếu sau**, chỉ làm khi Overpass hay lỗi |

**Đề xuất kèm theo**: E1 chỉ nhận **bbox**. Tra theo tên địa danh (FR-WLD-05) cần dịch vụ geocoding (vd Nominatim), mà dịch vụ này không có trong `allowHosts`. Có thể để phiên Claude Code đề xuất bbox qua handoff rồi người dùng xác nhận; làm ở phiếu sau.

### (b) Thư viện Python

| PA | Bộ thư viện | Được | Mất |
|---|---|---|---|
| B1 | Theo ADR-025: `rasterio` (kèm GDAL), `pyproj`, `shapely`, `osmium` | Đúng ADR đã chốt; đọc COG theo cửa sổ qua HTTP (không tải cả ô); chiếu lại bằng GDAL | Bánh xe GDAL nặng (hàng chục MB). Phép chiếu lại của GDAL đổi theo phiên bản nên khó giữ `outputHash` giữa máy. `osmium` chỉ cần khi dùng O2 |
| **B2 (khuyến nghị)** | `tifffile` (đọc GeoTIFF; thêm `imagecodecs` nếu ô dùng nén có predictor số thực, **cần kiểm trên một ô thật**) + `pyproj` + numpy tự làm lấy mẫu bậc 3, raster hoá đa giác/đường, EDT; Overpass JSON đọc bằng thư viện chuẩn | Nhẹ; phép tính trong numpy nên tất định (cùng cách bước thủ tục); `pyproj` có sẵn bánh xe Windows | Tải cả ô DEM (cỡ vài chục MB, có cache) thay vì đọc cửa sổ. Tự viết raster hoá (~150 dòng + test). **Cần ADR mới "Thay thế" một phần ADR-025** |
| B3 | Không thêm gì: tự viết cả phép chiếu UTM (chuỗi Krüger, sai số mm) | Không phụ thuộc mới | Tự chịu đúng/sai toạ độ; vẫn phải đối chiếu với proj4 bên TS (TC-WLD-09) |

**Giấy phép** (đều dùng được nội bộ theo QĐ-07, ghi vào `LICENSES.md`):
- `tifffile`: BSD-3. `imagecodecs`: BSD-3, kèm codec bên thứ ba.
- `pyproj`: MIT. PROJ: MIT.
- `rasterio`: BSD-3. GDAL: MIT/X.
- `shapely`: BSD-3, bánh xe kèm GEOS (LGPL, liên kết động).
- `pyosmium`: BSD-2.

`shapely` (kiểm đa giác tự cắt, ERR-WLD-04) có thể thêm sau, khi làm phần vẽ vùng.

### (c) Cache dữ liệu tải về

| PA | Vị trí | Được | Mất |
|---|---|---|---|
| **C1 (khuyến nghị)** | Kho chung theo máy `<repo>/.cache/geo/` (đưa vào `.gitignore`), khoá nội dung `sha256(canonical({nguồn, bbox đệm 200 m, phiên bản DEM, ngày OSM}))`. Game ghim ảnh chụp đang dùng bằng tệp khoá nhỏ `games/<id>/sources.lock.json` `{dem: {key, sha256, version}, osm: {key, sha256, date}}` (có commit) | Nhiều game dùng chung một ô DEM; build tất định theo tệp khoá; thiếu kho thì `fetch-sources` tải lại đúng ảnh chụp (DEM bất biến; OSM theo ngày, xem dưới) | Tệp khoá là định dạng mới, cần thêm schema (SCH, ghi lệch hoặc CR) |
| C2 | Trong game `games/<id>/sources/` (không commit) | Đơn giản, xoá game là xoá dữ liệu | Trùng ô DEM giữa các game; vẫn cần cơ chế ghim |
| C3 | Trong cache build (`build/cache/world.fetch/…`) như TSD-02 | Không thêm khái niệm | Xoá cache build là mất dữ liệu tải, phải ra mạng lại; OSM tải lại khác ngày nên đầu ra khác |

- **Tất định khi offline**:
  - `world.fetch` băm nội dung tệp trong ảnh chụp (không băm thời điểm tải). `inputHash` gồm `bbox` + khoá ảnh chụp.
  - Overpass không trả lại được ảnh chụp cũ nên tệp OSM phải giữ nguyên. Đề xuất cho phép commit tệp OSM JSON nhỏ (≤ 2 MB) vào `games/<id>/sources/osm-<ngày>.json`. DEM thì không commit: nhận diện bằng sha256 và tải lại được.
- **Giới hạn dung lượng**: kho chung ≤ 2 GB (mặc định). Quá thì xoá các mục lâu không dùng (LRU), không xoá mục đang được tệp khoá của game nào ghim. Thêm vào `engine doctor` dòng "dung lượng kho geo".
- **Fixture test**:
  - `engine/build/steps/world-fetch/fixtures/hue-2x2/` chứa DEM đã cắt vùng 2,4×2,4 km (khoảng 80×80 ô 30 m, cỡ 30 KB) và OSM JSON (vài trăm KB), kèm provenance.
  - Test không bao giờ ra mạng.
  - Có thể thay Huế bằng vùng khác nếu Huy muốn.

### (d) Giấy phép, ghi công, provenance

- **OSM (ODbL 1.0)**:
  - Game, ảnh, mesh là "sản phẩm tạo ra" (produced work): chỉ cần ghi "© OpenStreetMap contributors" ở màn credit.
  - Phát hành lại **chính dữ liệu vector** (vd `vectors.geojson` nằm trong bản xuất bản) là cơ sở dữ liệu phái sinh, phải theo ODbL (chia sẻ tương tự).
  - Khuyến nghị: không đưa `vectors.geojson` vào gói runtime (chỉ dùng lúc build).
- **Copernicus DEM**: miễn phí kể cả thương mại, **bắt buộc** chuỗi thông báo nguyên văn trong TSD-02 §7 (FR-WLD-39).
- **Provenance**:
  - `fetch.provenance.json` theo DTO-WLD-07: tên nguồn, URL, ô, phiên bản/ngày, license, attribution, sha256 từng tệp, khoá cache.
  - Thiếu license hoặc URL → ERR-WLD-02, thoát 4.
  - Credit đi vào `manifest.credits` khi có packager (E2). E1 kiểm chuỗi trong provenance (một phần TC-WLD-06).
- **Mạng**: chỉ tới `allowHosts` (DTO-WLD-08), không theo chuyển hướng ra ngoài danh sách, timeout + 3 lần thử. Không cần khoá API nào.

### (e) Phần "báo cáo Pass tier Vừa" của AC-02-01

Ngân sách tier Vừa do packager/QA kiểm (QT-WLD-03), mà packager thuộc E2.

| PA | Nội dung |
|---|---|
| **E1 (khuyến nghị)** | G-E1 chấp nhận AC-02-01 khi: build `real` 2×2 km qua, đường/sông lệch ≤ 1 ô (TC-WLD-01), provenance đủ, kèm kiểm tạm ngân sách tam giác/kích thước từ `report.json` của `terrain.mesh`. "Pass tier Vừa" đầy đủ kiểm lại ở E2 |
| E2 | Hoãn cả AC-02-01 sang E2 như AC-01-05 |

## 3. Ước lượng phiếu (theo khuyến nghị A2, D1, O1, B2, C1, E1)

| Phiếu | Nội dung | Mô hình |
|---|---|---|
| T-0017 | ADR mới (thay một phần ADR-025); `geo.py` (UTM ↔ cục bộ, 20 điểm chuẩn); kho geo + `sources.lock.json` + `engine fetch-sources` (DEM, Overpass, allowHosts, thử lại); `world.fetch` nhánh `real` đọc ảnh chụp, provenance; fixture `hue-2x2` | Opus, medium |
| T-0018 | `world.heightfield` nhánh `real`: lấy mẫu lại DEM ra `cellM`, `heightScale`/`smoothing`, raster hoá đường/sông/ruộng/rừng/công trình, `vectors.geojson`, khắc đường/sông; test lệch ≤ 1 ô | Opus, medium |
| T-0019 | `terrain.splat` dùng mask (đường, nước); thử thật một bbox 2×2 km có mạng; kiểm tạm ngân sách; cập nhật HANDOFF/cổng | Opus hoặc Sonnet, medium |
| (sau) | Geofabrik/`osmium` dự phòng; tra địa danh; `mixed`; `shapely` kiểm đa giác | — |

Tổng 3 phiếu (khoảng 2–3 phiên). Theo B1 thì thêm khoảng nửa phiếu cho cài và ghim GDAL trên Windows, và cho việc kiểm `outputHash` giữa máy.
