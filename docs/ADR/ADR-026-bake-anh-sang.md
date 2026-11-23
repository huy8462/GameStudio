# ADR-026: Bake ánh sáng

| Mục | Nội dung |
|---|---|
| Mã | ADR-026 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-11, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
Không có GPU (CH-07); RGBM chạy mọi thiết bị.

## Quyết định
**Blender Cycles CPU** bake lightmap + AO vào UV2, khử nhiễu OpenImageDenoise, mã hoá **RGBM 8 bit** rồi nén KTX2 UASTC.

## Hệ quả
Bake chạy trên worker CPU, là job dài nhất và luôn xếp cuối hàng đợi (TSD-08 ALG-WEB-03); bản xem trước nhanh dùng chế độ bỏ bake.

## Phương án đã loại
Lightmapper WebGL tự viết (chất lượng thấp), HDR KTX2 (hỗ trợ thiết bị không đều).
