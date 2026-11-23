# ADR-019: Kiến trúc runtime

| Mục | Nội dung |
|---|---|
| Mã | ADR-019 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-04, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Không cấp phát trong vòng lặp nóng (FR-RTM-23); ít phụ thuộc.

## Quyết định
"Hệ thống" có `init/update(dt)/dispose` theo thứ tự cố định (SRS-04 mục 2.1) + kho thành phần dạng mảng kiểu (SoA, `Float32Array`) cho NPC/động vật/đạn; không dùng thư viện ECS ngoài.

## Hệ quả
Hệ thống runtime đăng ký theo thứ tự cố định; dữ liệu thực thể động ở mảng kiểu, cấp phát trước theo ngân sách tier. Script game chỉ dùng API công khai (TSD-04 mục 2.2).

## Phương án đã loại
bitecs/miniplex (thêm khái niệm, lợi ích nhỏ ở quy mô ≤ 300 thực thể động).
