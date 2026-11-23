# ADR-021: Dữ liệu và schema

| Mục | Nội dung |
|---|---|
| Mã | ADR-021 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-06, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Một bộ kiểm cho CLI, runtime, intake, editor (FR-RTM-01).

## Quyết định
JSON Schema **draft 2020-12**; **Ajv** (MIT) biên dịch sẵn (standalone) cho runtime; kiểu TS sinh từ schema (`json-schema-to-typescript`); Python nhận dữ liệu đã kiểm từ bộ điều phối, không kiểm lại.

## Hệ quả
Một bộ schema là nguồn sự thật cho CLI, runtime, intake, editor web; thay đổi schema cần migration (TSD-04 SCH-RTM-02). Validator runtime biên dịch sẵn, không biên dịch lúc chạy.

## Phương án đã loại
Zod làm nguồn (khó dùng từ Python, khó xuất JSON Schema chuẩn).
