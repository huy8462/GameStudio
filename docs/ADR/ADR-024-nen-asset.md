# ADR-024: Nén asset

| Mục | Nội dung |
|---|---|
| Mã | ADR-024 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-09, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Chuẩn mở, chạy CLI được trên Windows/Linux.

## Quyết định
**glTF-Transform** (MIT) cho dedup, gộp, instancing (`EXT_mesh_gpu_instancing`), Meshopt (`EXT_meshopt_compression`), Draco tuỳ chọn; **KTX-Software** (`ktx create`, Apache-2.0) cho KTX2 UASTC/ETC1S; **ffmpeg** (bản LGPL) + libopus cho âm thanh.

## Hệ quả
Asset xuất bản dùng glTF + Meshopt + KTX2 + Opus/AAC; runtime cần decoder Meshopt và transcoder Basis (WASM). ffmpeg dùng bản LGPL để tránh ràng buộc GPL.

## Phương án đã loại
gltfpack đơn thuần (ít kiểm soát vật liệu), Basis CLI riêng.
