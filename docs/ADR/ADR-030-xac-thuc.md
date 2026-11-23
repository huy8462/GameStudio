# ADR-030: Xác thực

| Mục | Nội dung |
|---|---|
| Mã | ADR-030 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-15, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Khoá tài khoản huỷ phiên ≤ 1 phút (FR-WEB-03).

## Quyết định
Google OIDC (`openid-client`), phiên **opaque** lưu trong PostgreSQL (cookie `HttpOnly; Secure; SameSite=Lax`), không JWT cho người dùng web; JWT HS256 chỉ cho token phiên chơi hội thoại và token đo.

## Hệ quả
Khoá tài khoản có hiệu lực ngay vì phiên được tra CSDL mỗi yêu cầu (đệm 30 s); JWT chỉ dùng cho token ngắn hạn có mục đích riêng (`preview`, `perf`, `dlg`) với khoá ký tách riêng (TSD-08 ALG-WEB-01).

## Phương án đã loại
JWT phiên người dùng (khó thu hồi).
