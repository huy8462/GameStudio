# CR-03: Đổi thư mục `Editor/` của MOD-RTM-16 thành `EditorMode/`

| Mục | Nội dung |
|---|---|
| Mã | CR-03 |
| Yêu cầu | Phát hiện ở T-0021, T-0022 (khung `engine/unity`); Huy duyệt 28/11/2026: "đổi thư mục `Editor/` của MOD-RTM-16 thành `EditorMode/` qua change request" |
| Trạng thái | **Đã duyệt và đã áp** (28/11/2026) |
| Người soạn | Claude, 28/11/2026 |
| ADR kèm | Không (không đổi quyết định kiến trúc; chỉ đổi tên thư mục) |

## 1. Lý do

Trong Unity, thư mục tên `Editor` là thư mục đặc biệt: mã trong đó chỉ dành cho Unity Editor và bị loại khỏi bản build, trừ khi nằm dưới một asmdef không giới hạn nền. DDD-04 MOD-RTM-16 và TSD-04 §2 lại đặt mã chạy trong player (chế độ editor khi `mode='preview'`: `EditorMode.cs`, `Gizmo.cs`, `Picking.cs`) ở `Assets/GameStudio/Editor/`. Khung T-0022 dùng asmdef runtime ở `Assets/GameStudio/` nên về lý thuyết vẫn build được (chưa kiểm bằng build thật), nhưng tên dễ gây nhầm với mã build-time thật sự (`Build/Editor/`, asmdef `GameStudio.Build.Editor`) và sẽ hỏng ngay nếu sau này tách asmdef.

## 2. Thay đổi

| Tài liệu | Bản | Chỗ sửa |
|---|---|---|
| DDD-04 | 1.2 → 1.3 | Mục 2.1 MOD-RTM-16: `Editor/EditorMode.cs`, `Editor/Gizmo.cs`, `Editor/Picking.cs` → `EditorMode/…` |
| TSD-04 | 1.3 → 1.4 | Mục 2 bảng cấu trúc project: `Editor/` → `EditorMode/` |

Quy ước kèm theo cho `engine/unity`: tên thư mục `Editor` chỉ dùng cho mã build-time có asmdef giới hạn nền Editor.

## 3. Tác động

- Mã: không có. Chưa tệp nào của MOD-RTM-16 được viết (thuộc phiếu xem trước Web Studio).
- Mã truy vết: không đổi (MOD-RTM-16 giữ số). Script truy vết TSD, DDD chạy lại sau khi sửa.
- Phiếu: ghi chú lệch tương ứng ở T-0021, T-0022 coi như đã xử lý.
