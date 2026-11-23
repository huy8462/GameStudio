# ADR-017: Phiên bản nền

| Mục | Nội dung |
|---|---|
| Mã | ADR-017 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-02, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
LTS đủ dài cho dự án; Blender 4.5 LTS hỗ trợ tới 2027.

## Quyết định
Node **24 LTS**, TypeScript 5.x (strict), Python **3.12**, **Blender 4.5 LTS** + Sapling Tree Gen + A.N.T. Landscape (extension cố định bản), Three.js bản cố định tại E0; tất cả ghi trong `tools/versions.json`.

## Hệ quả
Mọi phiên bản nằm trong `tools/versions.json` và được `engine doctor` kiểm (TSD-09 SCH-DEV-03, ALG-DEV-06). Nâng phiên bản là một phiếu riêng có chạy golden test. Three.js được cố định tại E0 và chỉ nâng theo phiếu.

## Phương án đã loại
Blender bản thường (đổi API nhanh).
