# BRD-04: Runtime, hiệu năng và QA

| Mục | Nội dung |
|---|---|
| Mã tài liệu | BRD-04 |
| Phiên bản | 1.1 |
| Trạng thái | **Đã duyệt** v1.1 (Huy, 23/11/2026) |
| Ngày | 22/11/2026 |
| Tài liệu cha | BRD-00 `BRD-TONG-QUAN.md` v1.1 |
| Yêu cầu tổng quan được chi tiết hoá | BR-06…09, BR-22…31, BR-40, BR-111 (phần bản build) |
| Quyết định liên quan | QĐ-01, QĐ-04 |
| Module | `core`, `camera-player` (phần chung), `ui-audio`, `interaction` (phần chung), `packager`, `qa`, `cli` |
| Pha | E0 (baseline), E1 (core, QA khung, CLI), E2 (tier, zone, điều khiển), E3 (visual regression), E6 (bot playtest, vòng chơi) |

Quy ước mã: xem BRD-01.

---

## 1. Mục đích

Đảm bảo mọi game tạo ra **chạy mượt trên Galaxy A56**, tải nhanh, và mọi thay đổi đều có **bằng chứng rẻ** (số đo, ảnh so sánh) thay vì phải người hoặc Claude xem thủ công.

## 2. Phạm vi

**Trong phạm vi:** vòng lặp runtime, nạp manifest, stream zone, tier, điều khiển chung, UI/HUD/menu, hệ thống tương tác dữ liệu, đóng gói, ngân sách, QA tự động, CLI.

**Ngoài phạm vi:** điều khiển và hành vi nhân vật chi tiết (BRD-05), chiến đấu (BRD-06), hội thoại (BRD-07).

## 3. Tác nhân

| Tác nhân | Vai trò |
|---|---|
| Người chơi | Chơi trên điện thoại hoặc máy tính |
| Người tạo game | Xem báo cáo, chạy QA, xuất bản |
| Agent `engine-dev`, `qa` | Viết runtime, chạy QA |
| Huy | Đo trên A56 thật, xác nhận cổng |

## 4. Yêu cầu chi tiết

### 4.1 Hướng dữ liệu và tất định (BR-06…09)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| BR-06.1 | Có schema cho mọi file dữ liệu game; runtime từ chối nạp dữ liệu sai schema và báo lỗi rõ chỗ sai | M |
| BR-06.2 | Schema có phiên bản; có bộ chuyển đổi dữ liệu cũ lên phiên bản mới | M |
| BR-07.1 | Engine là gói thư viện có phiên bản; game khai báo phiên bản engine dùng | M |
| BR-07.2 | Script gameplay riêng của game (nếu có) chỉ dùng API công khai của engine | M |
| BR-09.1 | RNG có seed cho runtime (spawn, hành vi) và build; chế độ test cố định thời gian khung hình | M |

### 4.2 Nạp, stream, tier (BR-22…24)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| BR-22.1 | Tự chọn tier khi khởi động theo thiết bị (GPU, bộ nhớ, màn hình) và đo nhanh vài giây đầu; người chơi đổi được trong menu | M |
| BR-22.2 | Hạ tier tự động khi fps dưới mục tiêu kéo dài (đề xuất 5 s) | S |
| BR-24.5 | Màn hình tải có tiến độ; tải zone đầu tiên trước, các zone khác tải nền | M |
| BR-24.6 | Giải phóng zone xa để giữ bộ nhớ trong ngân sách | M |
| BR-24.7 | Loader KTX2, Meshopt/Draco; fallback khi thiết bị không hỗ trợ định dạng nén | M |

### 4.3 Ngân sách (BR-23)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| BR-23.1 | `budgets.json` khai báo theo tier: tri tĩnh, tri tổng, draw call, vật liệu, texture tối đa, bộ nhớ, số nhân vật có skinning, số hạt, dung lượng tải zone, fps mục tiêu | M |
| BR-23.2 | Giá trị mặc định tier Vừa lấy theo số đã kiểm chứng trên A56: ≤ 120 draw call, ≤ 32 vật liệu, khoảng 450k tri tĩnh / 650k tổng (chờ CH-02 BRD-00) | M |
| BR-23.3 | Mỗi build so với ngân sách và trả Pass / Warn (trong 10% cuối) / Fail | M |

### 4.4 Điều khiển, UI, tương tác (BR-25, BR-26)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| BR-25.1 | Điều khiển cảm ứng: joystick ảo, vuốt xoay camera, chạm để tương tác; bố cục theo safe area | M |
| BR-25.2 | Bàn phím + chuột trên desktop; tay cầm là tuỳ chọn | S |
| BR-25.3 | Chế độ dev: flycam, orbit, hiển thị chỉ số | M |
| BR-26.1 | HUD, menu tạm dừng, cài đặt (âm lượng, tier, độ nhạy), màn hình credit | M |
| BR-26.2 | Điểm tương tác khai báo bằng dữ liệu: vị trí, bán kính, điều kiện, hành động (hiện thông tin, bật hội thoại, nhặt vật, chuyển zone, kích hoạt sự kiện) | M |
| BR-26.3 | Hệ sự kiện và biến trạng thái game (cờ, bộ đếm, nhiệm vụ đơn giản) khai báo bằng dữ liệu | M |
| BR-26.4 | Lưu tiến trình chơi cục bộ trên trình duyệt (không lưu trên server, GD-05) | S |
| BR-26.5 | Giao diện tiếng Việt mặc định, chữ đọc được trên màn hình 6,5 inch | M |

### 4.5 QA tự động (BR-27…31)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| BR-27.1 | Báo cáo JSON chung cho mọi bước build và QA: thời gian, đầu vào (hash), số đo, ngân sách, kết quả | M |
| BR-28.1 | QA mức nhẹ (mặc định, vài phút): smoke test, 3–5 góc chụp, đo nhanh, kiểm ngân sách | M |
| BR-28.2 | QA mức đầy đủ (trước cổng): toàn bộ góc chuẩn, visual regression, perf trên nhiều tier, bot playtest | M |
| BR-29.1 | Góc chụp chuẩn khai báo theo zone; ảnh chụp từ game đang chạy | M |
| BR-29.2 | Visual regression so với baseline; báo điểm khác biệt và chọn 2–4 ảnh khác nhất | M |
| BR-29.3 | Canvas inspector đo pixel và thống kê render (draw call, tri) trên desktop và giả lập mobile | M |
| BR-30.1 | Quy trình đo trên A56 thật: mở bản xuất bản, chạy đường bay/đi chuẩn, thu fps, bộ nhớ, nhiệt (nếu có), gửi số về báo cáo | M |
| BR-31.1 | Bot playtest đi theo kịch bản và đi ngẫu nhiên có seed; báo kẹt, rơi, xuyên, lỗi console | S |

### 4.6 CLI (BR-40)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| BR-40.1 | `engine new-game`, `engine build --zone <id> [--tier]`, `engine qa --level=nhe\|day-du`, `engine publish`, `engine doctor` | M |
| BR-40.2 | Build tăng dần theo hash đầu vào; `--force` để build lại | M |
| BR-40.3 | Lệnh trả mã thoát chuẩn và báo cáo JSON để Web Studio và Claude Code dùng chung | M |

### 4.7 Bản build và xuất bản (BR-111)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| BR-111.1 | Bản xuất bản là gói tĩnh (HTML, JS, asset) chạy được trên hosting tĩnh, không phụ thuộc Web Studio (trừ hội thoại AI nếu bật) | M |
| BR-111.2 | Mỗi bản xuất bản có số phiên bản, ngày, phiên bản engine, hash dữ liệu | M |

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc |
|---|---|
| QT-04-01 | Không cổng nào qua được khi báo cáo ngân sách có Fail ở tier Vừa |
| QT-04-02 | Đổi đồ hoạ bắt buộc kèm báo cáo hiệu năng |
| QT-04-03 | Thay đổi hiển thị với người chơi bắt buộc có ảnh chụp từ game đang chạy |
| QT-04-04 | Claude đọc số liệu trước; chỉ xem ảnh khi chỉ số báo khác biệt hoặc khi qua cổng (tối đa 4 ảnh) |
| QT-04-05 | Baseline visual regression chỉ được cập nhật khi người dùng xác nhận thay đổi là có chủ ý |
| QT-04-06 | Xuất bản không đồng nghĩa với duyệt |
| QT-04-07 | Runtime không cấp phát bộ nhớ trong vòng lặp nóng |

## 6. Kịch bản chấp nhận

| Mã | Cho | Khi | Thì |
|---|---|---|---|
| AC-04-01 | Zone đạt ngân sách | Chạy `engine qa --level=nhe` | Hoàn tất ≤ 5 phút, báo cáo Pass |
| AC-04-02 | Ai đó thêm 50 vật liệu mới | Build | Báo Fail vật liệu, chỉ rõ nguồn |
| AC-04-03 | Đổi màu nước | QA đầy đủ | Visual regression báo khác ở góc có nước; chọn ≤ 4 ảnh |
| AC-04-04 | A56 mở bản xuất bản | Chạy đường đi chuẩn | Fps đạt mục tiêu tier Vừa (CH-01 BRD-00) |
| AC-04-05 | Thiết bị không hỗ trợ một định dạng nén | Mở game | Dùng fallback, không màn hình đen |
| AC-04-06 | File dữ liệu sai schema | Nạp game | Báo lỗi có đường dẫn trường sai |
| AC-04-07 | Bot đi ngẫu nhiên 10 phút, seed cố định | Chạy hai lần | Cùng kết quả, không kẹt |

## 7. Yêu cầu phi chức năng

| Mã | Yêu cầu |
|---|---|
| NFR-04-01 | Thời gian tải tới khi điều khiển được ≤ 10 s trên 4G tier Vừa (đề xuất, CH-03 BRD-00) |
| NFR-04-02 | Fps mục tiêu ≥ 30 ổn định tier Vừa trên A56 (đề xuất, CH-01 BRD-00) |
| NFR-04-03 | Trình duyệt: Chrome Android, Chrome/Edge desktop (GD-01) |
| NFR-04-04 | QA mức nhẹ ≤ 5 phút, mức đầy đủ ≤ 30 phút mỗi zone (đề xuất) |

## 8. Câu hỏi mở

| Mã | Câu hỏi | Đề xuất |
|---|---|---|
| CH-04-01 | Có cần chế độ chơi ngang và dọc, hay chỉ ngang? | Chọn theo `game.json`, mặc định ngang |
| CH-04-02 | Có cần hỗ trợ tay cầm không? | Không ở bản đầu |
| CH-04-03 | Cách thu số đo trên A56 thật: thủ công hay tự động gửi về server? | Tự động gửi về Web Studio khi mở link có tham số đo |

## 9. Truy vết

| BR tổng quan | Yêu cầu chi tiết | Kịch bản |
|---|---|---|
| BR-06…09 | BR-06.1…2, BR-07.1…2, BR-09.1 | AC-04-06, 07 |
| BR-22, BR-24 | BR-22.1…2, BR-24.5…7 | AC-04-05 |
| BR-23 | BR-23.1…3 | AC-04-02 |
| BR-25, BR-26 | BR-25.1…3, BR-26.1…5 | — |
| BR-27…31 | BR-27.1, BR-28.1…2, BR-29.1…3, BR-30.1, BR-31.1 | AC-04-01, 03, 04, 07 |
| BR-40 | BR-40.1…3 | AC-04-01 |
| BR-111 | BR-111.1…2 | AC-04-04 |

## Bổ sung v1.1 (CR-01)

Luồng làm tiếp, cập nhật và nhập game đã có được mô tả ở **BRD-10** (BR-119…126). Phần liên quan đến tài liệu này: CLI thêm `engine status`, `engine build --stale`, `engine upgrade`, `engine import`; `engine publish` trên game đã có tạo bản số mới, không ghi đè (BR-119.4, BR-122.1, BR-123, BR-124, BR-125.1…2).
