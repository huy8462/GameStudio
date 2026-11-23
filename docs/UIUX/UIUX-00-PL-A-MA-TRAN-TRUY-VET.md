# UIUX-00 Phụ lục A: Ma trận truy vết SRS → UIUX

| Mục | Nội dung |
|---|---|
| Mã tài liệu | UIUX-00-PL-A |
| Phiên bản | 1.0 |
| Trạng thái | Đã duyệt (Huy, 23/11/2026) |
| Cách sinh | Sinh tự động bằng `tools/uiux-trace.py` từ mục "Truy vết" của UIUX-00…04; không sửa tay |

## A.1 Yêu cầu và màn hình Web Studio bắt buộc phủ

Tập gồm mọi FR, NFR, UC, SCR, ERR, MSG của SRS-08 và mọi màn hình kênh Web ở SRS-00 mục 7.

| Mã SRS | Nội dung (rút gọn) | UIUX phủ |
|---|---|---|
| ERR-WEB-01 | Email chưa được mời | UIUX-02: UF-WEB-01, WF-WEB-01 |
| ERR-WEB-02 | Tài khoản bị khoá | UIUX-02: UF-WEB-01, WF-WEB-01 |
| ERR-WEB-03 | Phiên hết hạn | UIUX-01: —; UIUX-02: UF-WEB-01, WF-WEB-01 |
| ERR-WEB-04 | Thiếu quyền | UIUX-01: — |
| ERR-WEB-05 | Vượt hạn mức | UIUX-01: —; UIUX-02: UF-WEB-10 |
| ERR-WEB-06 | Không giữ khoá sửa | UIUX-02: TXT-WEB-12, TXT-WEB-13, TXT-WEB-17, UF-WEB-06, WF-WEB-05 |
| ERR-WEB-07 | `baseVersion` cũ | UIUX-01: CMP-GEN-27; UIUX-02: TXT-WEB-01, TXT-WEB-02, TXT-WEB-03, TXT-WEB-04, UXR-WEB-01, WF-WEB-05 |
| ERR-WEB-08 | Dữ liệu sai schema | UIUX-01: —; UIUX-02: WF-WEB-05, WF-WEB-06 |
| ERR-WEB-09 | Link hết hạn/thu hồi | UIUX-02: TXT-WEB-20, WF-WEB-14 |
| ERR-WEB-10 | Xuất bản khi thiếu provenance | UIUX-02: UF-WEB-08, WF-WEB-09 |
| ERR-WEB-11 | Worker không sẵn sàng (`doctor` lỗi) | UIUX-02: UF-WEB-05, UXR-WEB-08, WF-WEB-07; UIUX-04: WF-WEB-13 |
| ERR-WEB-12 | Tệp tải lên sai loại/quá lớn | UIUX-01: —; UIUX-02: WF-WEB-02 |
| ERR-WEB-13 | Khoá/hạ vai trò chính mình hoặc quản trị cuối cùng (v1.1) | UIUX-04: TXT-ADM-04, WF-WEB-10 |
| ERR-WEB-14 | Gói nhập không hợp lệ: không phải cấu trúc game, schema không migrate được, `gameId` kh… | UIUX-02: TXT-WEB-31, TXT-WEB-32, UF-WEB-13, UT-WEB-11, UXR-WEB-10, WF-WEB-02 |
| ERR-WEB-15 | Nâng cấp engine/schema thất bại (v1.2) | UIUX-02: TXT-WEB-29, TXT-WEB-30, TXT-WEB-34, UF-WEB-14, WF-WEB-19 |
| FR-WEB-01 | Quản trị thêm email vào danh sách mời kèm vai trò (Quản trị / Người tạo game / Người xe… | UIUX-04: TXT-ADM-03, UF-ADM-01, WF-WEB-10 |
| FR-WEB-02 | Đăng nhập Google; chỉ email đã xác minh và có trong danh sách mời được tạo phiên (QT-WE… | UIUX-02: UF-WEB-01, WF-WEB-01 |
| FR-WEB-03 | Quản trị khoá/mở khoá tài khoản; khoá thì huỷ mọi phiên đang mở trong ≤ 1 phút và chặn … | UIUX-04: TXT-ADM-01, TXT-ADM-02, UF-ADM-04, WF-WEB-10 |
| FR-WEB-04 | Vai trò hệ thống và quyền theo game theo mục 3 | UIUX-00: UXR-GEN-25; UIUX-02: WF-WEB-05, WF-WEB-09; UIUX-04: WF-WEB-10 |
| FR-WEB-05 | Backend kiểm quyền trên mọi endpoint theo (người dùng, game, hành động); trả 403 khi th… | UIUX-00: UXR-GEN-01; UIUX-01: UXR-GEN-01 |
| FR-WEB-06 | Hạn mức mỗi người: chi phí AI/ngày (USD), số job build đồng thời, dung lượng lưu trữ (G… | UIUX-02: WF-WEB-03; UIUX-04: TXT-ADM-07, UF-ADM-02, WF-WEB-11 |
| FR-WEB-07 | Dùng ≥ 80% hạn mức: cảnh báo trên giao diện; 100%: chặn hành động tương ứng, thông báo … | UIUX-01: CMP-GEN-10, UXR-GEN-11; UIUX-02: UF-WEB-10; UIUX-04: TXT-ADM-07, UF-ADM-02, WF-WEB-11 |
| FR-WEB-08 | SCR-WEB-02 liệt kê game người dùng sở hữu hoặc được chia sẻ: ảnh đại diện (ảnh góc chuẩ… | UIUX-02: WF-WEB-02 |
| FR-WEB-09 | Trạng thái game: `DangLam`, `LuuTru`, `DaXoa` (thùng rác 30 ngày, khôi phục được; hết h… | UIUX-02: WF-WEB-02 |
| FR-WEB-10 | Mỗi game có một luồng chat lưu lịch sử (tin nhắn, thẻ đề xuất, thẻ job), cuộn vô hạn, t… | UIUX-02: UF-WEB-03, WF-WEB-05 |
| FR-WEB-11 | Chat gọi `game-intake` dùng chung (SRS-01 FR-INT-29) qua cổng AI | UIUX-02: UF-WEB-03, WF-WEB-05 |
| FR-WEB-12 | Đề xuất thay đổi hiển thị bằng thẻ SCR-INT-01 với Duyệt / Duyệt một phần / Bỏ | UIUX-02: UF-WEB-03, WF-WEB-05; UIUX-03: UXR-INT-01, WF-INT-01 |
| FR-WEB-13 | Câu hỏi về game ("zone 2 có bao nhiêu NPC?") được trả lời từ dữ liệu phiên bản hiện tại… | UIUX-02: UF-WEB-03, WF-WEB-05 |
| FR-WEB-14 | Thẻ job trong chat và chỉ báo trên thanh trên hiển thị trạng thái từng bước (chờ, đang … | UIUX-02: TXT-WEB-05, TXT-WEB-06, TXT-WEB-07, WF-WEB-05, WF-WEB-07 |
| FR-WEB-15 | Thông báo "có asset chờ duyệt" trong chat mở SCR-AST-01 (SRS-03 FR-AST-34) | UIUX-02: UF-WEB-03, WF-WEB-05 |
| FR-WEB-16 | Khung xem trước dùng đúng phiên bản engine runtime của bản xuất bản; nạp bản build mới … | UIUX-02: WF-WEB-05 |
| FR-WEB-17 | Thay đổi dữ liệu thuộc nhóm "chỉ runtime" (SRS-04 mục 6.2) áp nóng không tải lại trang;… | UIUX-02: UXR-WEB-02, WF-WEB-05 |
| FR-WEB-18 | Chế độ xem: bay tự do, người chơi, góc chuẩn QA (chọn từ danh sách); chọn zone; tua giờ… | UIUX-02: WF-WEB-05 |
| FR-WEB-19 | Mã QR và link mở bản xem trước trên điện thoại (token xem trước hạn 24 giờ); link có th… | UIUX-02: UF-WEB-09, WF-WEB-07, WF-WEB-15 |
| FR-WEB-20 | Giả lập tier và khung điện thoại (412 × 915, safe area); lớp phủ fps, draw call, tri, b… | UIUX-02: WF-WEB-05 |
| FR-WEB-21 | Chọn đối tượng bằng nhấp/chạm trong khung xem trước hoặc cây đối tượng; đối tượng chọn … | UIUX-02: UXR-WEB-05, WF-WEB-06; UIUX-03: UXR-CHR-01 |
| FR-WEB-22 | Gizmo di chuyển, xoay, co giãn; bám mặt đất (mặc định bật); bám lưới tuỳ chọn (0,5 / 1 … | UIUX-02: UXR-WEB-05, WF-WEB-06 |
| FR-WEB-23 | Kéo thả asset `DaDuyet` từ thư viện asset (SCR-AST-02) vào cảnh, tạo `placedObjects` (S… | UIUX-02: UXR-WEB-05, WF-WEB-06; UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| FR-WEB-24 | Khoá sửa: một người sửa một game tại một thời điểm; khoá có nhịp giữ 60 s, hết hạn sau … | UIUX-01: CMP-GEN-16; UIUX-02: TXT-WEB-12, TXT-WEB-13, TXT-WEB-17, UF-WEB-06, WF-WEB-05 |
| FR-WEB-25 | Vẽ vùng đa giác trên bản đồ nhìn từ trên (SCR-WLD-02, SRS-02 FR-WLD-37) | UIUX-02: UXR-WEB-05, WF-WEB-06; UIUX-03: TXT-WLD-01, WF-WLD-02 |
| FR-WEB-26 | Hoàn tác/làm lại ≥ 50 bước trong phiên sửa | UIUX-02: UXR-WEB-05, WF-WEB-06; UIUX-03: UXR-CHR-01 |
| FR-WEB-27 | Lưu tự động sau 2 s không thao tác; thao tác liên tiếp trong 60 s gộp thành một mốc phi… | UIUX-01: CMP-GEN-17; UIUX-02: TXT-WEB-01, TXT-WEB-02, TXT-WEB-03, TXT-WEB-04, UXR-WEB-01, WF-WEB-05 |
| FR-WEB-28 | Kiểm schema khi lưu (bộ kiểm dùng chung SRS-04 FR-RTM-01); dữ liệu sai không lưu được v… | UIUX-01: CMP-GEN-02, CMP-GEN-22; UIUX-02: WF-WEB-05, WF-WEB-06 |
| FR-WEB-29 | Chế độ JSON thô cho người dùng nâng cao: trình soạn có kiểm schema trực tiếp, đồng bộ h… | UIUX-03: WF-WEB-17 |
| FR-WEB-30 | Không gian làm việc có các editor chuyên biệt: cảnh (FR-WEB-21…23), môi trường (SCR-WLD… | UIUX-02: UXR-WEB-03, WF-WEB-05; UIUX-03: UXR-CHR-01 |
| FR-WEB-31 | Mỗi thay đổi dữ liệu game tạo một `GameVersion` bất biến: số tăng dần, tác giả, thời đi… | UIUX-02: UF-WEB-07, WF-WEB-08 |
| FR-WEB-32 | SCR-WEB-08: dòng thời gian phiên bản, xem khác biệt giữa hai phiên bản theo đối tượng; … | UIUX-02: UF-WEB-07, WF-WEB-08 |
| FR-WEB-33 | Đặt tên/gắn sao cho phiên bản quan trọng | UIUX-02: UF-WEB-07, WF-WEB-08 |
| FR-WEB-34 | Xuất gói game (zip: `games/<id>/` theo SRS-04 mục 6.1, asset kèm provenance, `manifest-… | UIUX-02: WF-WEB-02 |
| FR-WEB-35 | Chủ game chia sẻ game cho người dùng trong hệ thống với quyền Sửa hoặc Xem; đổi, thu hồ… | UIUX-02: UF-WEB-08, WF-WEB-09 |
| FR-WEB-36 | Link chơi thử: chọn bản xuất bản, hạn dùng (1, 7, 30 ngày, không hạn), yêu cầu đăng nhậ… | UIUX-02: UF-WEB-08, WF-WEB-09 |
| FR-WEB-37 | Xuất bản chạy QA mức nhẹ; kết quả Fail ngân sách hiện cảnh báo, chủ game vẫn xuất bản đ… | UIUX-02: UF-WEB-08, WF-WEB-09 |
| FR-WEB-38 | Chỉ chủ game xuất bản và quản lý link (đề xuất, OI-WEB-01); ngoại lệ: Quản trị thu hồi … | UIUX-00: FRP-ADM-06; UIUX-02: UF-WEB-08, WF-WEB-09; UIUX-04: TXT-ADM-09, UF-ADM-05, WF-ADM-03 |
| FR-WEB-39 | Credit tự sinh từ provenance (SRS-03 FR-AST-30); thiếu provenance thì không xuất bản đư… | UIUX-02: UF-WEB-08, WF-WEB-09 |
| FR-WEB-40 | Hàng đợi job loại `build`, `qa`, `bake`, `asset`, `publish`, `export`, `import`, `upgra… | UIUX-02: UF-WEB-05, UXR-WEB-08, WF-WEB-07; UIUX-04: WF-WEB-13 |
| FR-WEB-41 | Job gọi `engine` CLI (SRS-04 FR-CLI-01) trên worker; dùng chung cache theo hash giữa cá… | UIUX-02: UF-WEB-05, UXR-WEB-08, WF-WEB-07 |
| FR-WEB-42 | Cổng AI dùng chung cho sinh/sửa game, ảnh, âm thanh, hội thoại NPC: giữ khoá ở server, … | UIUX-04: TXT-ADM-06, UXR-ADM-02, WF-WEB-13 |
| FR-WEB-43 | Quản trị cấu hình dịch vụ AI (mô hình mặc định theo loại việc, đơn giá), danh sách trắn… | UIUX-04: TXT-ADM-06, UXR-ADM-02, WF-WEB-13 |
| FR-WEB-44 | Sao lưu CSDL hằng ngày (giữ 30 bản), kho đối tượng hằng tuần (giữ 8 bản), lưu ở vị trí … | UIUX-04: TXT-ADM-08, WF-WEB-13 |
| FR-WEB-45 | Worker chạy Blender và add-on đúng phiên bản cố định; chạy `engine doctor` khi khởi độn… | UIUX-04: TXT-ADM-08, WF-WEB-13 |
| FR-WEB-46 | Bảo mật web: chỉ HTTPS (HSTS); phiên có hạn; chống CSRF (token hoặc SameSite + kiểm Ori… | UIUX-01: CMP-GEN-07, UXR-GEN-04 |
| FR-WEB-47 | Không chạy mã do người dùng hoặc AI sinh trên server ngoài sandbox; script gameplay và … | UIUX-00: UXR-GEN-21, UXR-GEN-23 |
| FR-WEB-48 | Trang quản trị: số người dùng, job (chờ, chạy, lỗi), thời gian job trung bình theo loại… | UIUX-00: FRP-ADM-01, FRP-ADM-02, OIU-GEN-02; UIUX-04: UXR-ADM-03, UXR-ADM-05, WF-WEB-12, WF-WEB-13 |
| FR-WEB-49 | Nhật ký kiểm toán: đăng nhập, mời/khoá, đổi quyền, đổi hạn mức, xuất bản, tạo/thu hồi l… | UIUX-00: FRP-ADM-04; UIUX-04: UXR-ADM-01, WF-ADM-02 |
| FR-WEB-50 | Thông báo trong web (biểu tượng chuông): job xong/lỗi, được chia sẻ game, asset chờ duy… | UIUX-01: CMP-GEN-15; UIUX-02: WF-WEB-16 |
| FR-WEB-51 | SCR-WEB-15 Tổng quan quản trị: người dùng hoạt động 7 ngày, job chờ/chạy/lỗi 24 giờ, ch… | UIUX-04: TXT-ADM-05, WF-ADM-01 |
| FR-WEB-52 | Quản trị huỷ hoặc thử lại job của mọi game trên SCR-WEB-13; ghi kiểm toán; người tạo jo… | UIUX-04: WF-WEB-13 |
| FR-WEB-53 | SCR-WEB-16 Nhật ký kiểm toán: lọc theo thời gian, người thực hiện, hành động, loại đối … | UIUX-04: WF-ADM-02 |
| FR-WEB-54 | Danh sách mọi game cho Quản trị (tên, chủ, trạng thái, dung lượng, lần sửa cuối, số bản… | UIUX-04: WF-ADM-03 |
| FR-WEB-55 | Quản trị thu hồi link chơi thử và gỡ bản xuất bản của mọi game (URL cố định và mọi link… | UIUX-00: FRP-ADM-06; UIUX-04: TXT-ADM-09, UF-ADM-05, WF-ADM-03 |
| FR-WEB-56 | Thống kê hội thoại AI theo game/NPC/ngày: số lượt, % chặn đầu vào, % đầu ra dùng dự phò… | UIUX-04: WF-ADM-03 |
| FR-WEB-57 | Danh sách asset toàn kho cho Quản trị: lọc thiếu provenance, license, `NgungDung`, số g… | UIUX-04: WF-ADM-03 |
| FR-WEB-58 | Thông báo hệ thống: Quản trị soạn nội dung văn bản thuần ≤ 200 ký tự, mức Thông tin/Cản… | UIUX-00: —; UIUX-04: WF-ADM-04 |
| FR-WEB-59 | Quản trị chuyển quyền chủ game sang người dùng `HoatDong` có vai Người tạo game hoặc Qu… | UIUX-04: WF-ADM-03 |
| FR-WEB-60 | SCR-WEB-02 hiện trên mỗi thẻ game giai đoạn tiến độ (SRS-00 mục 4.4) và số việc còn tre… | UIUX-00: —; UIUX-01: CMP-GEN-31, CMP-GEN-32; UIUX-02: UF-WEB-11, UT-WEB-09, WF-WEB-02, WF-WEB-05 |
| FR-WEB-61 | SCR-WEB-19 bảng Tiến độ trong SCR-WEB-05: các giai đoạn với dấu xong/đang/chưa, nút chí… | UIUX-01: CMP-GEN-31, CMP-GEN-32; UIUX-02: TXT-WEB-25, UXR-WEB-09, UXR-WEB-11, WF-WEB-19 |
| FR-WEB-62 | Mở lại game giữ ngữ cảnh: lịch sử chat, đề xuất `ChoDuyet` còn đúng `baseVersion` (đề x… | UIUX-02: UF-WEB-11, UT-WEB-09, WF-WEB-02, WF-WEB-05; UIUX-03: WF-INT-01 |
| FR-WEB-63 | Nút "Build phần thay đổi" tạo job `build` với `stale=true` cho mọi zone có bước cũ (SRS… | UIUX-00: —; UIUX-02: TXT-WEB-26, WF-WEB-05, WF-WEB-19 |
| FR-WEB-64 | Xuất bản game đã có bản xuất bản tạo `Publication` số mới (SRS-04 FR-CLI-12), không tha… | UIUX-02: TXT-WEB-33, UF-WEB-12, UT-WEB-10, WF-WEB-09 |
| FR-WEB-65 | Mỗi link chơi thử có chế độ `coDinh` (gắn một `Publication`) hoặc `moiNhat` (luôn mở bả… | UIUX-00: —; UIUX-01: —; UIUX-02: TXT-WEB-33, UF-WEB-12, UT-WEB-10, WF-WEB-09 |
| FR-WEB-66 | Nhập game có sẵn: nhận gói xuất (FR-WEB-34) hoặc zip của thư mục `games/<id>/` theo SRS… | UIUX-01: —; UIUX-02: TXT-WEB-31, TXT-WEB-32, UF-WEB-13, UT-WEB-11, UXR-WEB-10, WF-WEB-02 |
| FR-WEB-67 | Game nhập chưa có brief: hệ thống sinh brief nháp từ dữ liệu (SRS-01 FR-INT-32) ở `ChoX… | UIUX-02: TXT-WEB-31, TXT-WEB-32, UF-WEB-13, UT-WEB-11, UXR-WEB-10, WF-WEB-02 |
| FR-WEB-68 | Game có `schemaVersion` hoặc `engineVersion` cũ hơn bản hiện hành của Studio được gắn c… | UIUX-00: —; UIUX-02: TXT-WEB-29, TXT-WEB-30, TXT-WEB-34, UF-WEB-14, WF-WEB-19 |
| FR-WEB-69 | Nhập gói vào game đã có (cập nhật từ bản làm bằng Claude Code): yêu cầu `gameId` khớp, … | UIUX-00: —; UIUX-02: TXT-WEB-31, TXT-WEB-32, UF-WEB-13, UT-WEB-11, UXR-WEB-10, WF-WEB-02 |
| MSG-WEB-01 | "Bạn đã dùng <x>% hạn mức AI hôm nay." | UIUX-02: UF-WEB-10 |
| MSG-WEB-02 | "Có <n> thay đổi cần build." | UIUX-02: UXR-WEB-02, WF-WEB-05 |
| MSG-WEB-03 | "Bản xuất bản chưa đạt ngân sách hiệu năng. Vẫn xuất bản bản thử?" | UIUX-02: UF-WEB-08, WF-WEB-09 |
| MSG-WEB-04 | "<Tên> đã lấy quyền sửa. Thay đổi của bạn đã được lưu." | UIUX-02: TXT-WEB-12, TXT-WEB-13, TXT-WEB-17, UF-WEB-06, WF-WEB-05 |
| MSG-WEB-05 | "Quản trị đã thu hồi link …<4 ký tự> / gỡ bản xuất bản #<n> của game <tên>. Lý do: <lý … | UIUX-02: WF-WEB-16; UIUX-04: TXT-ADM-09, UF-ADM-05, WF-ADM-03 |
| MSG-WEB-06 | "Game có <n> thay đổi chưa xuất bản so với bản #<m>." (v1.2) | UIUX-02: UF-WEB-12, WF-WEB-05 |
| NFR-WEB-01 | Trang Web Studio tải ≤ 3 s trên máy văn phòng (cache lạnh, mạng 50 Mbps) (đề xuất, NFR-… | UIUX-01: TOK-GEN-02; UIUX-02: UT-WEB-07, UT-WEB-08, UXR-WEB-04 |
| NFR-WEB-02 | Phản hồi thao tác editor ≤ 100 ms; cập nhật nóng ≤ 2 s; API P95 ≤ 500 ms trừ endpoint g… | UIUX-01: CMP-GEN-01, UXR-GEN-06; UIUX-02: UT-WEB-07, UT-WEB-08, UXR-WEB-04; UIUX-04: WF-WEB-13 |
| NFR-WEB-03 | ≥ 20 người dùng, 5 job build đồng thời (đề xuất, NFR-08-03) | UIUX-04: — |
| NFR-WEB-04 | Giao diện tiếng Việt; editor tối ưu ≥ 1366 px; xem trước và trang chơi dùng được trên đ… | UIUX-00: UXR-GEN-26; UIUX-01: TOK-GEN-02, TOK-GEN-07, UXR-GEN-10; UIUX-02: UT-WEB-07, UT-WEB-08, UXR-WEB-04 |
| NFR-WEB-05 | Sẵn sàng giờ làm việc (8:00–20:00, thứ 2–7, giờ Việt Nam) ≥ 99% theo tháng; ngoài giờ k… | UIUX-04: FRP-ADM-09, WF-WEB-13 |
| NFR-WEB-06 | RPO ≤ 24 giờ (CSDL), ≤ 7 ngày (kho đối tượng); RTO ≤ 4 giờ (đề xuất) | UIUX-04: TXT-ADM-08, WF-WEB-13 |
| NFR-WEB-07 | Xem trước mở zone đã build ≤ 10 s (đề xuất, BR-97) | UIUX-02: UF-WEB-02, WF-WEB-05 |
| NFR-WEB-08 | Từ mô tả tới bản chơi được ≤ 30 phút cho game nhỏ, không tính bake (BO-09) | UIUX-00: UXR-GEN-24; UIUX-02: UF-WEB-02 |
| NFR-WEB-09 | Rà soát bảo mật (OWASP Top 10, quét phụ thuộc, quét bí mật) trước G-W4, không còn lỗi m… | UIUX-00: — |
| SCR-AST-01 | Duyệt asset | UIUX-03: UF-AST-01, WF-AST-01 |
| SCR-AST-02 | Kho asset | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| SCR-CBT-02 | Bảng cân bằng | UIUX-03: WF-CBT-02, WF-CHR-01 |
| SCR-CHR-01 | Editor NPC | UIUX-03: TXT-CHR-01, UF-CHR-01, UXR-CHR-01, WF-CHR-01 |
| SCR-CHR-02 | Editor động vật | UIUX-03: WF-CHR-02 |
| SCR-CHR-03 | Sơ đồ hành vi | UIUX-03: WF-CHR-03 |
| SCR-DLG-01 | Editor hội thoại | UIUX-03: TXT-DLG-01, UF-DLG-01, UXR-DLG-01, WF-DLG-01 |
| SCR-INT-01 | Thẻ đề xuất thay đổi | UIUX-03: UXR-INT-01, WF-INT-01 |
| SCR-INT-02 | Duyệt style bible | UIUX-03: TXT-INT-01, TXT-INT-02, UF-INT-01, WF-INT-02 |
| SCR-WEB-01 | Đăng nhập | UIUX-00: —; UIUX-02: WF-WEB-01 |
| SCR-WEB-02 | Thư viện game | UIUX-00: —; UIUX-02: WF-WEB-02 |
| SCR-WEB-03 | Tài khoản của tôi | UIUX-00: —; UIUX-02: WF-WEB-03 |
| SCR-WEB-04 | Tạo game mới | UIUX-00: —; UIUX-02: WF-WEB-04 |
| SCR-WEB-05 | Không gian làm việc game | UIUX-00: —; UIUX-02: UF-WEB-03, UF-WEB-04, WF-WEB-05 |
| SCR-WEB-06 | Editor cảnh | UIUX-00: —; UIUX-02: UXR-WEB-05, WF-WEB-06 |
| SCR-WEB-07 | Job và báo cáo | UIUX-00: —; UIUX-02: UF-WEB-05, UXR-WEB-08, WF-WEB-07 |
| SCR-WEB-08 | Phiên bản | UIUX-00: —; UIUX-02: UF-WEB-07, WF-WEB-08 |
| SCR-WEB-09 | Chia sẻ và xuất bản | UIUX-00: —; UIUX-02: UF-WEB-08, WF-WEB-09 |
| SCR-WEB-10 | Quản trị: người dùng | UIUX-00: —; UIUX-04: TXT-ADM-01, TXT-ADM-02, UF-ADM-04, WF-WEB-10 |
| SCR-WEB-11 | Quản trị: hạn mức | UIUX-00: —; UIUX-04: TXT-ADM-07, UF-ADM-02, WF-WEB-11 |
| SCR-WEB-12 | Quản trị: chi phí và sử dụng | UIUX-00: —; UIUX-04: UF-ADM-03, WF-WEB-12 |
| SCR-WEB-13 | Quản trị: hệ thống | UIUX-00: —; UIUX-04: TXT-ADM-08, WF-WEB-13 |
| SCR-WEB-14 | Trang link chơi thử | UIUX-00: —; UIUX-02: TXT-WEB-20, WF-WEB-14 |
| SCR-WEB-15 | Quản trị: tổng quan (v1.1) | UIUX-00: —; UIUX-04: TXT-ADM-05, WF-ADM-01 |
| SCR-WEB-16 | Quản trị: nhật ký kiểm toán (v1.1) | UIUX-00: —; UIUX-04: WF-ADM-02 |
| SCR-WEB-17 | Quản trị: kiểm duyệt (v1.1) | UIUX-00: —; UIUX-04: WF-ADM-03 |
| SCR-WEB-18 | Quản trị: thông báo hệ thống (v1.1) | UIUX-00: —; UIUX-04: WF-ADM-04 |
| SCR-WEB-19 | Tiến độ game (v1.2) | UIUX-00: —; UIUX-02: TXT-WEB-25, UXR-WEB-09, UXR-WEB-11, WF-WEB-19 |
| SCR-WLD-01 | Editor môi trường | UIUX-03: UXR-WLD-01, WF-WLD-01 |
| SCR-WLD-02 | Bản đồ vùng | UIUX-03: TXT-WLD-01, WF-WLD-02 |
| UC-WEB-01 | Mời người dùng | UIUX-04: TXT-ADM-03, UF-ADM-01, WF-WEB-10 |
| UC-WEB-02 | Đăng nhập | UIUX-02: UF-WEB-01, WF-WEB-01 |
| UC-WEB-03 | Tạo game và có bản xem trước đầu tiên | UIUX-02: UF-WEB-02 |
| UC-WEB-04 | Chỉnh game trong không gian làm việc | UIUX-02: UF-WEB-03, UF-WEB-04, WF-WEB-05 |
| UC-WEB-05 | Build và xem kết quả | UIUX-02: UF-WEB-05, UXR-WEB-08, WF-WEB-07 |
| UC-WEB-06 | Xem lịch sử và khôi phục phiên bản | UIUX-02: UF-WEB-07, WF-WEB-08 |
| UC-WEB-07 | Chia sẻ và xuất bản link chơi thử | UIUX-02: UF-WEB-08, WF-WEB-09 |
| UC-WEB-08 | Đặt hạn mức, xem chi phí | UIUX-04: UF-ADM-02 |
| UC-WEB-09 | Kiểm duyệt bản xuất bản và link chơi thử (v1.1) | UIUX-04: TXT-ADM-09, UF-ADM-05, WF-ADM-03 |
| UC-WEB-10 | Làm tiếp game đang làm dở (v1.2) | UIUX-02: UF-WEB-11, UT-WEB-09, WF-WEB-02, WF-WEB-05 |
| UC-WEB-11 | Cập nhật game đã xuất bản (v1.2) | UIUX-02: TXT-WEB-33, UF-WEB-12, UT-WEB-10, WF-WEB-09 |
| UC-WEB-12 | Nhập game có sẵn để làm tiếp (v1.2) | UIUX-02: TXT-WEB-31, TXT-WEB-32, UF-WEB-13, UT-WEB-11, UXR-WEB-10, WF-WEB-02 |

## A.2 Mã SRS khác được UIUX phủ (panel chuyên biệt, quy tắc, ràng buộc)

| Mã SRS | UIUX phủ |
|---|---|
| AC-08-07 | UIUX-04: UF-ADM-03 |
| AC-CR01-01 | UIUX-02: TXT-WEB-24, TXT-WEB-27, TXT-WEB-28, UF-WEB-11, WF-WEB-02, WF-WEB-05 |
| AC-CR01-02 | UIUX-02: UF-WEB-13, WF-WEB-19 |
| AC-CR01-03 | UIUX-02: UF-WEB-12 |
| AC-CR01-07 | UIUX-02: UF-WEB-11, UT-WEB-09, WF-WEB-02, WF-WEB-05 |
| AC-CR01-08 | UIUX-02: UF-WEB-11, UT-WEB-09, WF-WEB-02, WF-WEB-05 |
| AC-CR01-09 | UIUX-02: TXT-WEB-33, UF-WEB-12, UT-WEB-10, WF-WEB-09 |
| AC-CR01-10 | UIUX-02: TXT-WEB-31, TXT-WEB-32, UF-WEB-13, UT-WEB-11, UXR-WEB-10, WF-WEB-02 |
| AC-CR01-11 | UIUX-02: TXT-WEB-31, TXT-WEB-32, UF-WEB-13, UT-WEB-11, UXR-WEB-10, WF-WEB-02 |
| ERR-AST-01 | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| ERR-AST-02 | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| ERR-AST-07 | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| ERR-AST-08 | UIUX-03: UF-AST-01, WF-AST-01 |
| ERR-CHR-02 | UIUX-03: TXT-CHR-01, UF-CHR-01, UXR-CHR-01, WF-CHR-01 |
| ERR-CHR-03 | UIUX-03: WF-CHR-03 |
| ERR-CHR-04 | UIUX-03: WF-CHR-03 |
| ERR-CHR-05 | UIUX-03: WF-CHR-02 |
| ERR-CHR-06 | UIUX-03: WF-CHR-02 |
| ERR-DLG-08 | UIUX-03: TXT-DLG-01, UF-DLG-01, UXR-DLG-01, WF-DLG-01 |
| ERR-INT-01 | UIUX-02: TXT-WEB-09, WF-WEB-04, WF-WEB-05 |
| ERR-INT-02 | UIUX-02: TXT-WEB-09, WF-WEB-04, WF-WEB-05 |
| ERR-INT-03 | UIUX-02: TXT-WEB-09, WF-WEB-04, WF-WEB-05 |
| ERR-INT-04 | UIUX-02: TXT-WEB-09, WF-WEB-04, WF-WEB-05 |
| ERR-INT-06 | UIUX-02: TXT-WEB-09, WF-WEB-04, WF-WEB-05 |
| ERR-INT-07 | UIUX-03: UXR-INT-01, WF-INT-01 |
| ERR-INT-08 | UIUX-02: TXT-WEB-09, WF-WEB-04, WF-WEB-05 |
| FR-AST-01 | UIUX-04: WF-WEB-13 |
| FR-AST-31 | UIUX-03: UF-AST-01, WF-AST-01 |
| FR-AST-32 | UIUX-03: UF-AST-01, WF-AST-01 |
| FR-AST-33 | UIUX-03: UF-AST-01, WF-AST-01 |
| FR-AST-34 | UIUX-03: UF-AST-01, WF-AST-01 |
| FR-AST-35 | UIUX-03: UF-AST-01, WF-AST-01 |
| FR-AST-36 | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| FR-AST-37 | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| FR-AST-38 | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02; UIUX-04: WF-ADM-03 |
| FR-AST-39 | UIUX-03: TXT-AST-01, UXR-AST-01, WF-AST-02 |
| FR-CBT-28 | UIUX-03: WF-CBT-02, WF-CHR-01 |
| FR-CHR-42 | UIUX-03: TXT-CHR-01, UF-CHR-01, UXR-CHR-01, WF-CHR-01 |
| FR-CHR-43 | UIUX-03: WF-CHR-02 |
| FR-CHR-44 | UIUX-03: TXT-CHR-01, UF-CHR-01, UXR-CHR-01, WF-CHR-01 |
| FR-DEV-04 | UIUX-00: — |
| FR-DEV-06 | UIUX-00: — |
| FR-DEV-26 | UIUX-00: — |
| FR-DEV-27 | UIUX-00: — |
| FR-DLG-11 | UIUX-03: TXT-DLG-01, UF-DLG-01, UXR-DLG-01, WF-DLG-01 |
| FR-DLG-17 | UIUX-04: WF-WEB-11 |
| FR-DLG-22 | UIUX-04: WF-WEB-11 |
| FR-DLG-24 | UIUX-03: TXT-DLG-01, UF-DLG-01, UXR-DLG-01, WF-DLG-01; UIUX-04: TXT-ADM-06, UXR-ADM-02, WF-WEB-13 |
| FR-DLG-25 | UIUX-04: UF-ADM-03, WF-WEB-12 |
| FR-DLG-29 | UIUX-03: TXT-DLG-01, UF-DLG-01, UXR-DLG-01, WF-DLG-01 |
| FR-DLG-30 | UIUX-03: TXT-DLG-01, UF-DLG-01, UXR-DLG-01, WF-DLG-01 |
| FR-DLG-31 | UIUX-03: TXT-DLG-01, UF-DLG-01, UXR-DLG-01, WF-DLG-01 |
| FR-INT-01 | UIUX-02: WF-WEB-04 |
| FR-INT-02 | UIUX-02: WF-WEB-04 |
| FR-INT-03 | UIUX-02: WF-WEB-04 |
| FR-INT-04 | UIUX-02: WF-WEB-04 |
| FR-INT-05 | UIUX-02: WF-WEB-04 |
| FR-INT-06 | UIUX-02: WF-WEB-04 |
| FR-INT-07 | UIUX-02: WF-WEB-04 |
| FR-INT-08 | UIUX-02: WF-WEB-04 |
| FR-INT-13 | UIUX-02: WF-WEB-04 |
| FR-INT-14 | UIUX-02: WF-WEB-04 |
| FR-INT-15 | UIUX-02: WF-WEB-04 |
| FR-INT-20 | UIUX-03: TXT-INT-01, TXT-INT-02, UF-INT-01, WF-INT-02 |
| FR-INT-21 | UIUX-03: TXT-INT-01, TXT-INT-02, UF-INT-01, WF-INT-02 |
| FR-INT-22 | UIUX-03: TXT-INT-01, TXT-INT-02, UF-INT-01, WF-INT-02 |
| FR-INT-24 | UIUX-03: UXR-INT-01, WF-INT-01 |
| FR-INT-25 | UIUX-03: UXR-INT-01, WF-INT-01 |
| FR-INT-26 | UIUX-03: UXR-INT-01, WF-INT-01 |
| FR-INT-30 | UIUX-02: WF-WEB-04 |
| FR-INT-31 | UIUX-02: TXT-WEB-24, TXT-WEB-27, TXT-WEB-28, UF-WEB-11, WF-WEB-02, WF-WEB-05 |
| FR-INT-32 | UIUX-02: UF-WEB-13, WF-WEB-19 |
| FR-INT-33 | UIUX-02: UF-WEB-12; UIUX-03: WF-INT-01 |
| FR-INT-34 | UIUX-02: TXT-WEB-24, TXT-WEB-27, TXT-WEB-28, UF-WEB-11, WF-WEB-02, WF-WEB-05 |
| FR-QA-01 | UIUX-02: WF-WEB-05, WF-WEB-07 |
| FR-QA-02 | UIUX-02: WF-WEB-05, WF-WEB-07 |
| FR-QA-03 | UIUX-02: WF-WEB-05, WF-WEB-07 |
| FR-QA-04 | UIUX-02: WF-WEB-05, WF-WEB-07 |
| FR-QA-05 | UIUX-02: WF-WEB-05, WF-WEB-07 |
| FR-QA-09 | UIUX-02: WF-WEB-05, WF-WEB-07 |
| FR-WLD-36 | UIUX-03: UXR-WLD-01, WF-WLD-01 |
| FR-WLD-37 | UIUX-03: TXT-WLD-01, WF-WLD-02 |
| FR-WLD-38 | UIUX-03: UXR-WLD-01, WF-WLD-01 |
| NFR-GEN-13 | UIUX-01: UXR-GEN-10 |
| OI-WEB-10 | UIUX-02: TXT-WEB-33, UF-WEB-12, UT-WEB-10, WF-WEB-09 |
| OI-WEB-11 | UIUX-02: TXT-WEB-33, UF-WEB-12, UT-WEB-10, WF-WEB-09 |
| QT-INT-09 | UIUX-02: UF-WEB-13, WF-WEB-19 |
| QT-WEB-02 | UIUX-00: UXR-GEN-21, UXR-GEN-22 |
| QT-WEB-03 | UIUX-00: UXR-GEN-21, UXR-GEN-22 |
| QT-WEB-05 | UIUX-04: TXT-ADM-06, UXR-ADM-02, WF-WEB-13 |
| QT-WEB-07 | UIUX-00: UXR-GEN-21, UXR-GEN-22 |
| QT-WEB-08 | UIUX-04: TXT-ADM-07, UF-ADM-02, WF-WEB-11 |
| QT-WEB-09 | UIUX-04: TXT-ADM-04, WF-WEB-10 |
| QT-WEB-10 | UIUX-02: TXT-WEB-33, UF-WEB-12, UT-WEB-10, WF-WEB-09 |
| QT-WEB-11 | UIUX-02: TXT-WEB-25, UXR-WEB-09, UXR-WEB-11, WF-WEB-19 |
| UC-INT-01 | UIUX-02: UF-WEB-02, WF-WEB-04 |
| UC-INT-02 | UIUX-02: UF-WEB-02, WF-WEB-04 |
| UC-INT-03 | UIUX-02: UF-WEB-02, WF-WEB-04 |
| UC-INT-04 | UIUX-02: UF-WEB-02, WF-WEB-04 |
| UC-INT-05 | UIUX-03: TXT-INT-01, TXT-INT-02, UF-INT-01, WF-INT-02 |
| UC-INT-07 | UIUX-02: TXT-WEB-24, TXT-WEB-27, TXT-WEB-28, UF-WEB-11, WF-WEB-02, WF-WEB-05 |

## A.3 Đề xuất bổ sung của UIUX (SCR-ADM, FRP-ADM) và trạng thái

| Mã | Định nghĩa ở | Dòng định nghĩa (rút gọn) |
|---|---|---|
| FRP-ADM-01 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-51) Trang tổng quan quản trị: thẻ số người dùng hoạt động 7 ngày, job chờ/chạy/lỗi 24 giờ, chi phí AI hôm nay và 7 ngày, … |
| FRP-ADM-02 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → API-WEB-76 (FR-WEB-48)) Endpoint dữ liệu vận hành cho SCR-WEB-13: job toàn hệ thống (phân trang, lọc trạng thái/loại), `worker_s… |
| FRP-ADM-03 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-52) Quản trị huỷ hoặc thử lại job của mọi game; ghi kiểm toán `job_cancel_admin`, `job_retry_admin`; người tạo job nhận t… |
| FRP-ADM-04 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-53) Xem nhật ký kiểm toán: lọc theo thời gian, người thực hiện, hành động, loại đối tượng, đối tượng; xem giá trị trước/s… |
| FRP-ADM-05 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-54) Danh sách mọi game cho quản trị: tên, chủ, trạng thái, dung lượng, lần sửa cuối, số bản xuất bản, số link còn hạn; mở… |
| FRP-ADM-06 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-55) Quản trị thu hồi link chơi thử và gỡ bản xuất bản (ẩn khỏi URL cố định, trả 410) của mọi game; bắt buộc lý do; chủ ga… |
| FRP-ADM-07 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-56) Tổng hợp kết quả lọc hội thoại AI theo game/NPC/ngày: số lượt, % bị chặn đầu vào, % đầu ra dùng dự phòng, chi phí; kh… |
| FRP-ADM-08 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-57) Danh sách asset toàn kho cho quản trị: lọc thiếu provenance, license, `NgungDung`, số game dùng, game sở hữu; hành độ… |
| FRP-ADM-09 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-58) Thông báo hệ thống: quản trị soạn nội dung ≤ 200 ký tự, mức Thông tin/Cảnh báo, thời gian hiện từ–đến; hiện thành băn… |
| FRP-ADM-10 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → QT-WEB-09) Bảo vệ tài khoản quản trị: không tự khoá, không tự hạ vai trò; không khoá hoặc hạ vai trò quản trị cuối cùng đang hoạ… |
| FRP-ADM-11 | UIUX-04-WEB-QUAN-TRI.md | (đã duyệt → FR-WEB-59) Chuyển quyền chủ game: quản trị chọn chủ mới (người dùng hoạt động, vai Người tạo game hoặc Quản trị); chủ cũ thành "… |
| SCR-ADM-01 | UIUX-04-WEB-QUAN-TRI.md | Tổng quan quản trị (đã duyệt → SCR-WEB-15) · Thẻ chỉ số, danh sách cảnh báo cần xử lý, lối tắt |
| SCR-ADM-02 | UIUX-04-WEB-QUAN-TRI.md | Nhật ký kiểm toán (đã duyệt → SCR-WEB-16) · Bảng sự kiện, lọc, xem trước/sau, xuất CSV |
| SCR-ADM-03 | UIUX-04-WEB-QUAN-TRI.md | Kiểm duyệt nội dung (đã duyệt → SCR-WEB-17) · Tab Game, Xuất bản & link, Asset, Hội thoại AI |
| SCR-ADM-04 | UIUX-04-WEB-QUAN-TRI.md | Thông báo hệ thống (đã duyệt → SCR-WEB-18) · Soạn băng thông báo/bảo trì hiện trên mọi trang |

## A.4 Số mã UIUX theo loại và tài liệu

| Loại | UIUX-00 | UIUX-01 | UIUX-02 | UIUX-03 | UIUX-04 | Tổng |
|---|---|---|---|---|---|---|
| WF | 0 | 0 | 13 | 12 | 8 | 33 |
| UF | 0 | 0 | 14 | 4 | 5 | 23 |
| CMP | 0 | 32 | 0 | 0 | 0 | 32 |
| TOK | 0 | 8 | 0 | 0 | 0 | 8 |
| UXR | 7 | 13 | 11 | 5 | 5 | 41 |
| TXT | 0 | 8 | 34 | 6 | 9 | 57 |
| UT | 0 | 5 | 11 | 4 | 5 | 25 |
| OIU | 7 | 0 | 7 | 2 | 4 | 20 |
| SCR-ADM | 0 | 0 | 0 | 0 | 4 | 4 |
| FRP-ADM | 0 | 0 | 0 | 0 | 11 | 11 |

## A.5 Kết quả kiểm

- Mã bắt buộc: 141; đã phủ: 141; chưa phủ: 0
- Mã SRS khác được phủ: 101
- Mã UIUX định nghĩa: 254; trùng: 0
- Vấn đề: 0
