# Giấy phép và ghi công (FR-DEV-24, SCH-DEV-06, DTO-DEV-06)

Dự án dùng nội bộ (QĐ-07). Mã bộ gốc: xem `LICENSE` (MIT, Majid Manzarpour) và `UPSTREAM.md`.

## Dữ liệu

| Nguồn                                 | License                                      | Dùng ở                           |
| ------------------------------------- | -------------------------------------------- | -------------------------------- |
| OpenStreetMap (Overpass, Geofabrik)   | ODbL 1.0, ghi "© OpenStreetMap contributors" | Địa hình thật, đường, nước (E1+) |
| Copernicus GLO-30 DEM (AWS Open Data) | Giấy phép Copernicus, ghi nguồn              | Độ cao (E1+)                     |

## Công cụ build (không đóng vào bản game)

| Công cụ                   | Bản       | License           |
| ------------------------- | --------- | ----------------- |
| Blender                   | 5.2.4 LTS | GPL-2.0-or-later  |
| Sapling Tree Gen (add-on) | 1.2.0     | GPL-3.0-or-later  |
| A.N.T. Landscape (add-on) | 0.2.0     | GPL-2.0-or-later  |
| KTX-Software              | 4.4.2     | Apache-2.0        |
| FFmpeg (bản LGPL, BtbN)   | 9.0.2     | LGPL-2.1-or-later |
| gitleaks                  | 8.30.1    | MIT               |

## Thư viện npm / Python

<!-- licenses:start -->

Sinh tự động bằng `tools/scripts/licenses.mjs` (`pnpm licenses list --json` + `pip-licenses`) — chưa có ở E0.
Phụ thuộc dev hiện tại (MIT/Apache-2.0): TypeScript, Vitest, ESLint, typescript-eslint, Prettier, dependency-cruiser, Playwright, pngjs, commander, @gltf-transform/cli; Python: ruff, mypy, pytest. Runtime game: Unity 6000.3.29f1 (giấy phép Unity Personal, không phải mã nguồn mở; ADR-036), không còn `three`.
<!-- licenses:end -->

## Dịch vụ

| Dịch vụ       | Dùng cho                                     | Ghi chú                              |
| ------------- | -------------------------------------------- | ------------------------------------ |
| Google Gemini | Ảnh concept, texture, ảnh tham chiếu (QĐ-09) | Ghi provenance (prompt, model, ngày) |
| ElevenLabs    | Âm thanh môi trường, hiệu ứng (QĐ-09)        | Ghi provenance                       |
| Claude API    | Dịch vụ AI trong Web Studio (ADR-031)        | Khoá chỉ ở `web/ai-gateway`          |

## Asset CC0

Theo nhóm, cập nhật khi nhập (Poly Haven và kho CC0 trong danh sách trắng, QĐ-10, QĐ-12). Hiện chưa có.
