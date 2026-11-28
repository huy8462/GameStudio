# CR-04: Chốt `coreTextureMax` = 1024 sau đo A56

| Mục | Nội dung |
|---|---|
| Mã | CR-04 |
| Yêu cầu | T-0020 đo A56; Huy chốt 28/11/2026: "Chốt 1024" |
| Trạng thái | **Đã duyệt và đã áp** (28/11/2026) |
| Người soạn | Claude, 28/11/2026 |
| ADR kèm | Không (chỉ chốt giá trị ngân sách đã ghi là đề xuất) |

## 1. Lý do

SRS-04 v1.4 §6.3 ghi `coreTextureMax` = 1024 là "đề xuất", chờ số A56. T-0020 thay 8 texture KTX2 2048 UASTC của cảnh S1 (POC-U1) bằng bản lõi 1024 ETC1S: dung lượng texture 18,49 MB còn 0,65 MB, bản build S1 26,99 MB còn 10,01 MB. Trên Galaxy A56 (chuyển mã sang ASTC), tải + chuyển mã 8 KTX2 lần đầu đo được **689,8 ms** (POC 8,0 s; mục tiêu phiếu ≤ 2,0 s).

## 2. Thay đổi

| Tài liệu | Bản | Chỗ sửa |
|---|---|---|
| SRS-04 | 1.4 → 1.5 | Mục 6.3 dòng `coreTextureMax`: bỏ "(đề xuất)", ghi số đo A56 và ngày chốt; lịch sử thay đổi |

## 3. Tác động

- Mã: không đổi. `budgets/1` và `games/_template/data/budgets.json` đã ghi 1024 từ T-0020.
- Mã truy vết: không đổi.
- Phiếu: T-0020 đóng.
