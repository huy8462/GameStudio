# ADR-018: Runtime đồ hoạ

| Mục | Nội dung |
|---|---|
| Mã | ADR-018 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 |
| Người chốt | Huy |
| Nguồn | TD-03, TSD-00 mục 3 |
| Thay thế | Không |

## Bối cảnh và lý do
GD-01; A56 chạy ổn WebGL2; scaffold gốc dùng WebGL.

## Quyết định
**Three.js WebGLRenderer (WebGL2)**; không dùng WebGPU ở bản đầu; GLSL riêng cho địa hình, nước, cỏ, impostor qua `onBeforeCompile` / `ShaderMaterial`.

## Hệ quả
Shader riêng viết bằng GLSL ES 3.0; ngân sách A56 tính theo WebGL2 (TSD-00 mục 7). Xem xét lại WebGPU sau G-E8 bằng ADR mới nếu cần.

## Phương án đã loại
WebGPURenderer (chưa đủ ổn định trên Chrome Android cho toàn bộ tính năng).
