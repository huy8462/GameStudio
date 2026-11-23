# ADR-022: Biểu thức an toàn

| Mục | Nội dung |
|---|---|
| Mã | ADR-022 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-07, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
FR-RTM-20, FR-CHR-16, FR-DLG-02, FR-CBT-07 dùng chung.

## Quyết định
Gói `@gamestudio/expr`: lexer + Pratt parser → AST → hàm đóng (closure); không `eval`/`Function`; một ngữ pháp cho điều kiện tương tác, graph hành vi, cây thoại, công thức sát thương.

## Hệ quả
Mọi điều kiện và công thức trong dữ liệu đi qua một ngữ pháp có giới hạn độ sâu và danh sách hàm trắng; không chạy mã tuỳ ý từ dữ liệu do AI hay người dùng sinh.

## Phương án đã loại
jsep + tự đánh giá (phụ thuộc ngoài, khó giới hạn hàm).
