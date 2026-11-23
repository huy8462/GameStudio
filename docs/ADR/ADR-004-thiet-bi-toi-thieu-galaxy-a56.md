# ADR-004: Thiết bị tối thiểu Samsung Galaxy A56

| Mục | Nội dung |
|---|---|
| Mã | ADR-004 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-04, CH-01, CH-02, TSD-00 §7 |
| Thay thế | Không |

## Bối cảnh và lý do
Thiền viện online đã kiểm chứng ngân sách trên Galaxy A56 (khoảng 450k tri tĩnh, 650k tổng, ≤ 120 draw call, ≤ 32 vật liệu). Cần một thiết bị đích cụ thể để mọi cổng đo cùng mốc.

## Quyết định
Galaxy A56 (Exynos 1580, Xclipse 540, 8 GB) là thiết bị tối thiểu; mục tiêu ≥ 30 fps ổn định ở tier Vừa. Ngân sách mặc định trong `budgets.json` lấy theo số đo trên A56; mọi cổng có đo hiệu năng đều đo trên A56.

## Hệ quả
- Tier Thấp / Vừa / Cao / Tối đa; DPR hiệu dụng tối đa 1,5 ở tier Vừa (OIT-GEN-01, đo lại ở E0).
- Baseline A56 bằng scaffold gốc là điều kiện G-E0 (FR-QA-07).
- QA giả lập viewport 412 × 915; số thật lấy từ máy A56 qua `?perf=1`.

## Phương án đã loại
Chỉ đo trên desktop; đặt ngân sách theo lý thuyết không đo.
