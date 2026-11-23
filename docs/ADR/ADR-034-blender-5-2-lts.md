# ADR-034: Blender 5.2 LTS thay Blender 4.5 LTS

| Mục | Nội dung |
|---|---|
| Mã | ADR-034 |
| Trạng thái | Đã chốt |
| Ngày | 23/11/2026 |
| Người chốt | Huy |
| Nguồn | Huy chốt khi chuẩn bị E0 phiếu 3 (23/11/2026); TD-02 |
| Thay thế | ADR-017, **chỉ phần Blender**: Blender 4.5 LTS → Blender 5.2 LTS. Các phần khác của ADR-017 (Node 24 LTS, TypeScript 5.x strict, Python 3.12, Three.js cố định tại E0, `tools/versions.json`) giữ nguyên |

## Bối cảnh và lý do
Máy dev đã có sẵn Blender 5.2.4 LTS (`C:\Tools\blender-5.2.4-windows-x64`) và không có bản 4.5. Blender 5.2 là bản LTS mới hơn, thời hạn hỗ trợ dài hơn 4.5, nên vẫn giữ đúng tinh thần của ADR-017 là dùng bản LTS và cố định phiên bản. Chuyển ngay ở E0, khi chưa có script Blender nào, gần như không tốn chi phí.

## Quyết định
- **Blender 5.2 LTS**, cố định bản vá trong `tools/versions.json` (lúc chốt: 5.2.4, `match: minor`; Python nhúng 3.13).
- Add-on lấy từ kho extensions.blender.org, cố định phiên bản: **Sapling Tree Gen** `sapling_tree_gen` 1.2.0 (GPL-3.0-or-later), **A.N.T. Landscape** `antlandscape` 0.2.0 (GPL-2.0-or-later). Mã module khi chạy: `bl_ext.blender_org.<id>`.
- Script Blender headless viết cho API của Blender 5.x.

## Hệ quả
- Mọi chỗ ghi "Blender 4.5" trong tài liệu đã duyệt hiểu là Blender 5.2 LTS theo ADR này: TSD-00 §2.1, §3 (TD-02), §9.2; TSD-08 §8.1; TSD-09 SCH-DEV-03 (`blender: "5.2.x"`); DDD-08 §8. Khi một tài liệu đó có phiên bản mới thì sửa chữ cho khớp; không mở change request riêng chỉ để đổi số phiên bản.
- `engine doctor` (ALG-DEV-06) kiểm Blender 5.2.x và hai add-on theo mã module `bl_ext.blender_org.*`, kèm phiên bản trong `blender_manifest.toml`.
- Python nhúng trong Blender là 3.13, khác Python 3.12 của bước build (ADR-017). Script Blender chỉ dùng thư viện chuẩn và `bpy`; không import gói trong `engine/build/py` cần `numpy`/`numba` của môi trường uv. Dữ liệu trao qua giao thức JSON của IF-CLI-02.
- Ảnh `gs-worker` (W2) cài Blender 5.2 LTS bản Linux cùng hai add-on đúng phiên bản.
- Add-on mang license GPL, nhưng chỉ chạy trong Blender ở bước build, không đóng vào bản game. Ghi vào `LICENSES.md` ở nhóm công cụ.

## Phương án đã loại
- Cài thêm Blender 4.5 LTS song song: thêm một bản phải bảo trì, trong khi thời hạn hỗ trợ ngắn hơn 5.2.
- Blender 4.2.9 LTS (cũng có trên máy): cũ hơn 4.5, gần hết hạn hỗ trợ.
