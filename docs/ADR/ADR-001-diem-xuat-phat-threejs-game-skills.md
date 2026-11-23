# ADR-001: Điểm xuất phát là threejs-game-skills

| Mục | Nội dung |
|---|---|
| Mã | ADR-001 |
| Trạng thái | Đã chốt |
| Ngày | 22/11/2026 (quyết định); ghi ADR 23/11/2026 |
| Người chốt | Huy |
| Nguồn | QĐ-01 (brief bản 6), BRD-00 §6 |
| Thay thế | Không |

## Bối cảnh và lý do
Cần một nền có sẵn để không tự viết renderer. Bộ `majidmanzarpour/threejs-game-skills` (MIT) có skill điều phối, khung Vite + TypeScript + Three.js, RNG có seed, Playwright smoke/visual/bot và canvas inspector, khớp hướng "studio AI gọn" của dự án.

## Quyết định
Fork threejs-game-skills làm điểm xuất phát; runtime là **Three.js + Vite + TypeScript**. Giữ `LICENSE`, ghi công tác giả; skill engine của dự án xây chồng lên bộ gốc.

## Hệ quả
- Fork tại commit `8286774` (23/11/2026), nhánh `vendor/upstream` giữ bản gốc; thay đổi ghi trong `UPSTREAM.md` (FR-DEV-12, QT-DEV-04).
- Pilot E0 không còn để chọn runtime mà để đo baseline trên A56.
- Phần bộ gốc chưa có (stream zone, LOD/impostor, instancing lớn, lightmap, KTX2/Meshopt, tier) engine phải tự bổ sung. Chi tiết kỹ thuật ở ADR-018 (Three.js WebGL2).

## Phương án đã loại
Babylon.js, PlayCanvas, Unity WebGL, Unreal; tự viết renderer; khung CCGS (quá lớn, chỉ tham khảo cấu trúc).
