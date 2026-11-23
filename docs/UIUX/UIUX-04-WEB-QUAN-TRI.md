# UIUX-04: Web quản trị

| Mục | Nội dung |
|---|---|
| Mã tài liệu | UIUX-04 |
| Phiên bản | 1.0 |
| Ngày | 23/11/2026 |
| Tài liệu cha | UIUX-00 `UIUX-00-TONG-QUAN.md` |
| SRS nguồn | SRS-08 v1.1: UC-WEB-01, UC-WEB-08, UC-WEB-09; FR-WEB-01, 03, 06, 07, 42…45, 48, 49, 51…59; QT-WEB-08, QT-WEB-09; SCR-WEB-10…18; NFR-WEB-03, 05, 06; SRS-03 FR-AST-01; SRS-07 FR-DLG-22, 24, 25 |
| DDD nguồn | DDD-08 v0.2: EP-WEB-33…37, EP-WEB-44…51; PSC-WEB-16…18; TBL-WEB-16, 19…21, 24…26, 29; CFG-WEB-05…07; PSC-WEB-01, 05; SEQ-WEB-06 |
| Mã nguồn | `web/app/src/features/admin/**` (chunk riêng), `web/api/src/routes/admin/*.ts` (MOD-WEB-16) |
| Pha | W1 (SCR-WEB-10), W2 (SCR-WEB-11…13, 15, 16, 18), W2–W4 (SCR-WEB-17) |
| Trạng thái | Đã duyệt (Huy, 23/11/2026) |

---

## 1. Giới thiệu
Trang quản trị là một khu riêng `/admin/*` trong cùng SPA, chỉ vai Quản trị thấy và vào được (backend kiểm `admin.*`, PSC-WEB-02). Bố cục chung: thanh ứng dụng (CMP-GEN-04) + thanh bên quản trị (CMP-GEN-28) + vùng nội dung toàn chiều rộng. Đầu mỗi màn hình có tiêu đề, khoảng thời gian (nếu có số liệu) và nút hành động chính. Quản trị dùng máy văn phòng; tối ưu ≥ 1366 px, dưới 1024 px chỉ đảm bảo đọc được.

```text
┌ AppHeader ·  ◆ GameStudio  Thư viện  [Quản trị]                         🔔  (Huy) ┐
├ AdminNav ─────────┬───────────────────────────────────────────────────────────────┤
│ ▣ Tổng quan       │  <Tiêu đề màn hình>                 [khoảng thời gian] [Hành động]│
│ 👤 Người dùng     │                                                               │
│ ⚖ Hạn mức         │  <nội dung>                                                   │
│ $ Chi phí & sử dụng│                                                              │
│ ⚙ Hệ thống        │                                                               │
│ 🛡 Kiểm duyệt      │                                                               │
│ 📜 Nhật ký kiểm toán  │                                                            │
│ 📢 Thông báo hệ thống  │                                                           │
└───────────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 2. Luồng người dùng

### UF-ADM-01 Mời người dùng (UC-WEB-01)
SCR-WEB-10 → "Mời người dùng" → nhập email (một hoặc nhiều, mỗi dòng một email), vai trò, hạn mức khởi tạo (mặc định hệ thống) → "Gửi lời mời" → lời mời hiện ở tab Lời mời trạng thái "Chưa dùng" → quản trị tự báo cho người được mời (không có email, OI-WEB-04): nút "Sao chép hướng dẫn" chép đoạn "Vào {PUBLIC_ORIGIN}, đăng nhập bằng Google với {email}" (TXT-ADM-03) → người đó đăng nhập lần đầu → lời mời "Đã dùng", người dùng xuất hiện ở tab Người dùng.

### UF-ADM-02 Đặt hạn mức và xem chi phí (UC-WEB-08)
SCR-WEB-12 xem chi phí 30 ngày, nhóm theo người → thấy Lan dùng 4,8 USD/ngày nhiều ngày liền → bấm tên → SCR-WEB-11 lọc sẵn Lan → sửa "Chi phí AI/ngày" 5 → 8 tại ô → Enter → có hiệu lực ngay (FR-WEB-07), ghi kiểm toán `quota_change`.

### UF-ADM-03 Xử lý sự kiện vượt hạn mức (AC-08-07)
Người dùng chạm 100% → quản trị nhận thông báo chuông "Lan đã hết hạn mức AI hôm nay" (nhóm theo ngày) → mở SCR-WEB-12 mục "Sự kiện vượt hạn mức" → quyết định nâng (UF-ADM-02) hoặc không.

### UF-ADM-04 Khoá tài khoản (FR-WEB-03)
SCR-WEB-10 → hàng người dùng → `⋯` → Khoá → hộp nguy hiểm "Khoá tài khoản Minh? Minh bị đăng xuất khỏi mọi thiết bị trong vòng 1 phút và không gọi được API." → Khoá → huy hiệu "Bị khoá"; game của Minh giữ nguyên (chuyển chủ: FRP-ADM-11, đề xuất).

### UF-ADM-05 Gỡ link chơi thử có nội dung không phù hợp (UC-WEB-09, FR-WEB-55)
SCR-ADM-03 tab Xuất bản & link → lọc "Không cần đăng nhập, còn hạn" → mở bản xuất bản xem → "Thu hồi link" → hộp rất nguy hiểm (gõ 4 ký tự cuối link) + lý do bắt buộc → link trả 410; chủ game nhận thông báo kèm lý do; ghi kiểm toán `link_revoke_admin`.

---

## 3. Wireframe

### 3.1 Màn hình có trong SRS-08

### WF-WEB-10 Quản trị: người dùng (SCR-WEB-10, W1)

```text
│ Người dùng                                             [+ Mời người dùng]       │
│ [Người dùng (14)] [Lời mời (3)]                                                 │
│ 🔎 tên, email…   Vai trò [Mọi ▾]  Trạng thái [Mọi ▾]                            │
│ Tên        │ Email      │ Vai trò          │ Trạng thái  │ Đăng nhập cuối │ AI hôm nay │   │
│ Huy (bạn)  │ huy@…      │ Quản trị         │ ● Hoạt động │ 08:01          │ 0,40/5,00  │ ⋯ │
│ Lan        │ lan@…      │ [Người tạo game▾]│ ● Hoạt động │ 08:12          │ 4,10/5,00⚠ │ ⋯ │
│ Minh       │ minh@…     │ Người xem        │ 🔒 Bị khoá  │ 18/11          │ —          │ ⋯ │
│ ── tab Lời mời ──                                                              │
│ Email      │ Vai trò         │ Hạn mức khởi tạo │ Người mời │ Tạo lúc │ Trạng thái │   │
│ an@…       │ Người tạo game  │ Mặc định         │ Huy       │ 22/11   │ ✉ Chưa dùng│ [Huỷ lời mời] │
```

Hộp "Mời người dùng":

```text
┌ Mời người dùng ──────────────────────────────────┐
│ Email (mỗi dòng một email)                        │
│ ┌──────────────────────────────────────────────┐ │
│ │ an@gmail.com                                  │ │
│ └──────────────────────────────────────────────┘ │
│ Vai trò  (•) Người tạo game ( ) Người xem ( ) Quản trị │
│ Hạn mức khởi tạo  (•) Mặc định hệ thống ( ) Tuỳ chỉnh │
│   AI/ngày [5] USD · Job [2] · Lưu trữ [20] GB · Game [20] │
│ ⓘ Không gửi email. Hãy tự báo cho người được mời. │
│                          [Huỷ] [Gửi lời mời]      │
└──────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Bảng người dùng | CMP-GEN-13; cột AI hôm nay dùng CMP-GEN-10 thu gọn; bấm tên mở ngăn chi tiết bên phải (thông tin, hạn mức, chi phí 30 ngày, game sở hữu, phiên đang mở: số lượng) | SCR-WEB-10 |
| Đổi vai trò | Ô chọn tại chỗ → hộp thường "Đổi vai trò của Lan thành Người xem? Lan sẽ không tạo được game mới; game hiện có giữ nguyên." → ghi `role_change` | API-WEB-71, FR-WEB-49 |
| Khoá / Mở khoá | Menu `⋯`; Khoá: hộp nguy hiểm theo UF-ADM-04; Mở khoá: hộp thường | FR-WEB-03, API-WEB-71 |
| Tự khoá, quản trị cuối | Hàng của chính mình không có Khoá, vai trò không sửa được; quản trị cuối cùng đang hoạt động: Khoá/hạ vai trò vô hiệu + tooltip TXT-ADM-04; backend trả ERR-WEB-13 | QT-WEB-09, ERR-WEB-13 |
| Mời | Kiểm định dạng email từng dòng, trùng người dùng có sẵn → báo dòng đó "đã có tài khoản"; lời mời trùng chưa dùng → "đã có lời mời" | FR-WEB-01, API-WEB-70 |
| Huỷ lời mời | Chỉ lời mời "Chưa dùng"; hộp thường | FR-WEB-01 |
| Sao chép hướng dẫn | Nút trên mỗi lời mời chưa dùng → TXT-ADM-03 | OI-WEB-04 |

### WF-WEB-11 Quản trị: hạn mức (SCR-WEB-11, W2)

```text
│ Hạn mức                                                                        │
│ ┌ Mặc định hệ thống ───────────────────────────────────────────── [Sửa] ┐      │
│ │ AI 5,00 USD/ngày · 2 job đồng thời · 20 GB · 20 game                  │      │
│ │ ⓘ Áp cho người dùng không có hạn mức riêng. Ngày tính theo giờ VN.    │      │
│ └───────────────────────────────────────────────────────────────────────┘      │
│ [Theo người dùng] [Hội thoại theo game]                                         │
│ 🔎 lọc   [ ] Chỉ người ≥ 80%                                                    │
│ Người │ AI/ngày (USD)   │ Đã dùng hôm nay │ Job │ Lưu trữ (GB) │ Game  │ Nguồn  │
│ Lan   │ [ 5,00 ]        │ 4,10  82% ⚠     │ [2] │ [20] 6,4     │ [20] 12│ Mặc định│
│ An    │ [ 8,00 ]        │ 1,20  15%       │ [3] │ [50] 31,0    │ [20] 4 │ Riêng ↺ │
│ ── tab Hội thoại theo game ──                                                  │
│ Game        │ Chủ │ Hạn mức hội thoại/ngày (USD) │ Hôm nay │ Gỡ lỗi lời thoại   │
│ Làng chài   │ Lan │ [ 1,00 ]                     │ 0,32    │ [ ] (giữ 7 ngày)   │
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Mặc định hệ thống | Hàng `quotas['*']`; Sửa mở hộp nhỏ; lưu có hiệu lực ngay với người không có hạn mức riêng | FR-WEB-06, CFG-WEB-05 |
| Bảng theo người | Sửa tại ô (CMP-GEN-13); giá trị khác mặc định đánh dấu "Riêng" + nút ↺ về mặc định; giảm dưới mức đang dùng (ví dụ lưu trữ 5 GB khi đang 6,4 GB) → cảnh báo "Người này sẽ không tải lên được tới khi dọn bớt" trước khi lưu | FR-WEB-06, FR-WEB-07 |
| Cột Đã dùng | CMP-GEN-10 thu gọn; ≥ 80% warn, 100% danger | FR-WEB-07, QT-WEB-08 |
| Hội thoại theo game | Hạn mức chi phí hội thoại/ngày mỗi game (mặc định 0 = tắt AI khi chạy); công tắc gỡ lỗi lời thoại (lưu nội dung 7 ngày) có hộp xác nhận nêu rõ sẽ lưu nội dung người chơi gõ | FR-DLG-22, FR-DLG-17, TBL-WEB-20 |
| Ghi kiểm toán | Mọi thay đổi `quota_change` (giá trị cũ/mới) | FR-WEB-49 |

### WF-WEB-12 Quản trị: chi phí và sử dụng (SCR-WEB-12, W2)

```text
│ Chi phí và sử dụng          Khoảng [30 ngày ▾ | 01/11–23/11]  Nhóm theo [Ngày ▾]   │
│ ┌ Tổng ─────────┐ ┌ Hôm nay ──────┐ ┌ Trung bình/ngày ┐ ┌ Lượt gọi AI ┐          │
│ │ 86,40 USD     │ │ 6,10 USD      │ │ 3,76 USD        │ │ 2.140       │          │
│ └───────────────┘ └───────────────┘ └─────────────────┘ └─────────────┘          │
│ [biểu đồ cột chồng theo ngày: Sinh game · Sửa · Ảnh · Âm thanh · Hội thoại NPC]  │
│ [Theo người] [Theo game] [Theo loại việc] [Hội thoại theo NPC]                   │
│ Người │ Chi phí │ Lượt gọi │ Token vào │ Token ra │ % tổng                       │
│ Lan   │ 38,20   │ 910      │ 4,1 tr    │ 0,6 tr   │ 44%                          │
│ ── Sự kiện vượt hạn mức (7) ──                                                  │
│ 22/11 15:40 · Lan · AI/ngày · 5,10/5,00 USD · [Nâng hạn mức]                    │
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Khoảng thời gian | 7 / 30 / 90 ngày / tuỳ chọn; ngày theo giờ VN | API-WEB-73, QT-WEB-08 |
| Thẻ số | Tổng, hôm nay, trung bình/ngày, lượt gọi | FR-WEB-48 |
| Biểu đồ | CMP-GEN-23 cột chồng theo loại việc (sinh game, sửa, ảnh, âm thanh, hội thoại NPC) + bảng số liệu | SCR-WEB-12 |
| Bảng nhóm | `groupBy=user|game|task`; tab "Hội thoại theo NPC" chọn game rồi xem theo NPC; bấm hàng người → SCR-WEB-11 lọc người đó | SCR-WEB-12, FR-DLG-25 |
| Sự kiện vượt hạn mức | Từ `blocks` của EP-WEB-36; nút "Nâng hạn mức" mở ô sửa của người đó | FR-WEB-07, AC-08-07 |
| Xuất CSV | Nút "Xuất CSV" cho bảng đang xem (tạo từ dữ liệu đã tải, phía client) | UXR-ADM-03 |

### WF-WEB-13 Quản trị: hệ thống (SCR-WEB-13, W2)
Ba tab: **Vận hành · Dịch vụ AI · Nguồn CC0**.

```text
│ Hệ thống   [Vận hành] [Dịch vụ AI] [Nguồn CC0]                                 │
│ ── Vận hành ──                                                                 │
│ ┌ API P95 (1 giờ) ┐ ┌ Job ───────────────┐ ┌ Lưu trữ ────────┐ ┌ Sao lưu ──────────┐ │
│ │ 182 ms ✓ ≤ 500  │ │ Chờ 2 · Chạy 3 · Lỗi│ │ 412/1.000 GB 41%│ │ CSDL 01:00 hôm nay ✓│ │
│ │                 │ │ 24h 1               │ │                 │ │ Đối tượng CN 03:00 ✓│ │
│ └─────────────────┘ └────────────────────┘ └─────────────────┘ │ Diễn tập: 15/11 ✓   │ │
│                                                                 └────────────────────┘ │
│ Worker                                                                          │
│ worker-1 │ ● Sẵn sàng      │ nặng 1/1 · nhẹ 0/1 │ nhịp 5 s trước │ engine 0.4.2  │
│ worker-2 │ ✕ Không đạt doctor: Blender 4.4 (cần 4.5)  │ nhịp 12 s  │ [Xem doctor]  │
│ Job toàn hệ thống   Lọc [Đang chạy ▾] [Mọi loại ▾]                              │
│ Build z1 · Làng chài · Lan · 45% · 3 phút   [Huỷ*] [Thử lại*]                   │
│ Thời gian job trung bình theo loại (7 ngày): build 6,2 ph · qa 2,1 ph · bake 48 ph │
│ ── Dịch vụ AI ──                                                               │
│ Loại việc   │ Nhà cung cấp │ Mô hình         │ Effort │ Max tok │ Giá vào/ra │ RPM │ Bật │ Khoá │
│ intake      │ anthropic    │ [claude-… ▾]    │ [high▾]│ [8000]  │ [..]/[..]  │ [20]│ [✓] │ ✓ Đã cấu hình │
│ image       │ gemini       │ [… ▾]           │  —     │  —      │ [..]/ảnh   │ [10]│ [✓] │ ✕ Chưa cấu hình │
│ ── Nguồn CC0 ──                                       [+ Thêm nguồn]          │
│ Miền          │ Tên        │ Ghi chú license │ Bật │ Thêm bởi · lúc        │   │
│ polyhaven.com │ Poly Haven │ CC0             │ [✓] │ Huy · 20/11           │ ⋯ │
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Thẻ vận hành | API P95 cửa sổ 1 giờ so 500 ms; job theo trạng thái; dung lượng; sao lưu gần nhất (CSDL hằng ngày, kho đối tượng hằng tuần) và lần diễn tập khôi phục gần nhất; quá hạn (CSDL > 26 giờ, đối tượng > 8 ngày) → thẻ đỏ | FR-WEB-48, FR-WEB-44, NFR-WEB-02, NFR-WEB-06 |
| Worker | Trạng thái từ `worker_status`: sẵn sàng / không đạt `doctor` (nêu thành phần lệch theo ERR-DEV-04) / mất nhịp > 90 s; "Xem doctor" mở JSON rút gọn | FR-WEB-45, ERR-WEB-11 |
| Job toàn hệ thống | Danh sách mọi game; Huỷ / Thử lại của quản trị (bắt buộc lý do, EP-WEB-46) | FR-WEB-40, FR-WEB-48, FR-WEB-52 |
| Thời gian job trung bình | Theo loại, 7 ngày | FR-WEB-48 |
| Nguồn dữ liệu tab Vận hành | API-WEB-76 (EP-WEB-45, DTO-WEB-15) | FR-WEB-48 |
| Dịch vụ AI | Bảng `ai_config` (EP-WEB-37): mô hình mặc định theo loại việc, effort, max token, đơn giá vào/ra/cache, RPM, bật/tắt; cột Khoá chỉ "Đã cấu hình / Chưa cấu hình", **không có ô nhập khoá**; mô hình lớn cho hội thoại AI: công tắc "Cho phép NPC dùng mô hình lớn" | FR-WEB-42, FR-WEB-43, FR-DLG-24, QT-WEB-05 |
| Đổi cấu hình AI | Lưu theo hàng, hộp thường nêu tác động: "Đổi đơn giá chỉ áp cho lượt gọi từ bây giờ." Ghi `config_change` | FR-WEB-43, FR-WEB-49 |
| Nguồn CC0 | Thêm: miền (FQDN, kiểm định dạng; không nhận IP), tên, ghi chú license; tắt thay vì xoá khi đã có asset từ nguồn đó | FR-AST-01, FR-WEB-43 |

### 3.2 Màn hình và yêu cầu bổ sung (đã duyệt 23/11/2026, SRS-08 v1.1)

Các màn hình và yêu cầu dưới đây do UIUX v0.1 đề xuất, Huy duyệt toàn bộ ngày 23/11/2026. Chúng đã vào SRS-08 v1.1 (cột "Mã SRS") và DDD-08 v0.2. Mã SCR-ADM/FRP-ADM giữ làm tham chiếu lịch sử.

| Mã | Màn hình (đã duyệt) | Nội dung chính | Yêu cầu |
|---|---|---|---|
| SCR-ADM-01 | Tổng quan quản trị (đã duyệt → SCR-WEB-15) | Thẻ chỉ số, danh sách cảnh báo cần xử lý, lối tắt | FRP-ADM-01 |
| SCR-ADM-02 | Nhật ký kiểm toán (đã duyệt → SCR-WEB-16) | Bảng sự kiện, lọc, xem trước/sau, xuất CSV | FRP-ADM-04 |
| SCR-ADM-03 | Kiểm duyệt nội dung (đã duyệt → SCR-WEB-17) | Tab Game, Xuất bản & link, Asset, Hội thoại AI | FRP-ADM-05, FRP-ADM-06, FRP-ADM-07, FRP-ADM-08, FRP-ADM-11 |
| SCR-ADM-04 | Thông báo hệ thống (đã duyệt → SCR-WEB-18) | Soạn băng thông báo/bảo trì hiện trên mọi trang | FRP-ADM-09 |

| Mã | Yêu cầu bổ sung | Lý do | API (SRS-08 v1.1) | Ưu tiên, pha | Mã SRS / DDD |
|---|---|---|---|---|---|
| FRP-ADM-01 | (đã duyệt → FR-WEB-51) Trang tổng quan quản trị: thẻ số người dùng hoạt động 7 ngày, job chờ/chạy/lỗi 24 giờ, chi phí AI hôm nay và 7 ngày, dung lượng, API P95; danh sách cảnh báo: worker không đạt doctor hoặc mất nhịp, job lỗi môi trường 24 giờ, người dùng ≥ 80% hạn mức, sao lưu quá hạn, dung lượng > 80%, link không cần đăng nhập còn hạn > 30 ngày | FR-WEB-48 liệt kê số liệu nhưng không có trang đích; quản trị cần một chỗ để thấy việc cần làm | API-WEB-75 | S, W2 | FR-WEB-51 · EP-WEB-44 |
| FRP-ADM-02 | (đã duyệt → API-WEB-76 (FR-WEB-48)) Endpoint dữ liệu vận hành cho SCR-WEB-13: job toàn hệ thống (phân trang, lọc trạng thái/loại), `worker_status`, tổng `storage_usage` theo người, lần sao lưu và diễn tập gần nhất, API P95 cửa sổ 1 giờ, thời gian job trung bình theo loại | DDD-08 mục 5 chưa có endpoint cho phần này (OIU-GEN-02) | API-WEB-76 | M, W2 | API-WEB-76 · EP-WEB-45 |
| FRP-ADM-03 | (đã duyệt → FR-WEB-52) Quản trị huỷ hoặc thử lại job của mọi game; ghi kiểm toán `job_cancel_admin`, `job_retry_admin`; người tạo job nhận thông báo | SRS-08 mục 3.2 chỉ người có quyền Sửa huỷ; quản trị cần gỡ job treo chiếm máy build | API-WEB-77 | S, W2 | FR-WEB-52 · EP-WEB-46 |
| FRP-ADM-04 | (đã duyệt → FR-WEB-53) Xem nhật ký kiểm toán: lọc theo thời gian, người thực hiện, hành động, loại đối tượng, đối tượng; xem giá trị trước/sau; xuất CSV ≤ 10.000 dòng; chỉ đọc | FR-WEB-49 ghi nhật ký 1 năm nhưng không có chỗ xem | API-WEB-78 | S, W2 | FR-WEB-53 · EP-WEB-47 |
| FRP-ADM-05 | (đã duyệt → FR-WEB-54) Danh sách mọi game cho quản trị: tên, chủ, trạng thái, dung lượng, lần sửa cuối, số bản xuất bản, số link còn hạn; mở game ở chế độ chỉ đọc | SRS-08 mục 3.1 cho quản trị xem mọi game nhưng danh sách hiện chỉ có game là thành viên (OIU-GEN-03) | API-WEB-79 | S, W2 | FR-WEB-54 · EP-WEB-48 |
| FRP-ADM-06 | (đã duyệt → FR-WEB-55) Quản trị thu hồi link chơi thử và gỡ bản xuất bản (ẩn khỏi URL cố định, trả 410) của mọi game; bắt buộc lý do; chủ game nhận thông báo kèm lý do; ghi kiểm toán `link_revoke_admin`, `publication_takedown` | Kiểm duyệt nội dung khi link lộ ra ngoài; hiện chỉ chủ game quản lý link | API-WEB-80 | S, W4 | FR-WEB-55 · EP-WEB-49, PSC-WEB-18 |
| FRP-ADM-07 | (đã duyệt → FR-WEB-56) Tổng hợp kết quả lọc hội thoại AI theo game/NPC/ngày: số lượt, % bị chặn đầu vào, % đầu ra dùng dự phòng, chi phí; không hiện nội dung lời thoại trừ khi game bật gỡ lỗi (FR-DLG-17) | Phát hiện game bị khai thác hoặc NPC trả lời không phù hợp | API-WEB-81 | C, W4 | FR-WEB-56 · EP-WEB-50 |
| FRP-ADM-08 | (đã duyệt → FR-WEB-57) Danh sách asset toàn kho cho quản trị: lọc thiếu provenance, license, `NgungDung`, số game dùng, game sở hữu; hành động Ngừng dùng (API-WEB-44 đã có) | Rà soát tuân thủ trước xuất bản (NFR-GEN-14) | API-WEB-40 (tham số quản trị) | S, W4 | FR-WEB-57 · EP-WEB-21 |
| FRP-ADM-09 | (đã duyệt → FR-WEB-58) Thông báo hệ thống: quản trị soạn nội dung ≤ 200 ký tự, mức Thông tin/Cảnh báo, thời gian hiện từ–đến; hiện thành băng đầu mọi trang Studio cho mọi người dùng, đóng được (hiện lại khi nội dung đổi) | TSD-08 mục 8.4 nhắc "bảo trì báo trước qua thông báo hệ thống trên Studio" nhưng SRS chưa có | API-WEB-82 | S, W2 | FR-WEB-58 · EP-WEB-51 |
| FRP-ADM-10 | (đã duyệt → QT-WEB-09) Bảo vệ tài khoản quản trị: không tự khoá, không tự hạ vai trò; không khoá hoặc hạ vai trò quản trị cuối cùng đang hoạt động (backend trả 409) | Tránh khoá chết hệ thống | API-WEB-71 | M, W1 | QT-WEB-09 · PSC-WEB-16 |
| FRP-ADM-11 | (đã duyệt → FR-WEB-59) Chuyển quyền chủ game: quản trị chọn chủ mới (người dùng hoạt động, vai Người tạo game hoặc Quản trị); chủ cũ thành "Được sửa" hoặc bị gỡ (lựa chọn); ghi kiểm toán `owner_transfer`; hai bên nhận thông báo | Người dùng nghỉ hoặc bị khoá thì game không còn ai xuất bản, quản lý link được | API-WEB-79 | S, W4 | FR-WEB-59 · EP-WEB-48, PSC-WEB-18 |

### WF-ADM-01 Tổng quan quản trị (SCR-WEB-15, trước là SCR-ADM-01)

```text
│ Tổng quan                                                   cập nhật 14:05 [↻]  │
│ ┌ Người dùng 7 ngày ┐ ┌ Job 24h ─────────┐ ┌ Chi phí AI ─────┐ ┌ Lưu trữ ┐ ┌ API P95 ┐ │
│ │ 11/14             │ │ ✓38 ✕2 ◐3 ○2     │ │ 6,10 hôm nay    │ │ 41%     │ │ 182 ms  │ │
│ └───────────────────┘ └──────────────────┘ │ 26,30 / 7 ngày  │ └─────────┘ └─────────┘ │
│                                            └─────────────────┘                    │
│ Cần xử lý (4)                                                                     │
│ ✕ worker-2 không đạt doctor: Blender 4.4 (cần 4.5)          [Xem hệ thống]        │
│ ⚠ Lan đã dùng 100% hạn mức AI hôm nay                        [Xem hạn mức]         │
│ ⚠ Sao lưu kho đối tượng quá hạn (9 ngày)                     [Xem hệ thống]        │
│ ⓘ 2 link không cần đăng nhập còn hạn > 30 ngày               [Xem kiểm duyệt]      │
│ Lối tắt: [+ Mời người dùng] [Soạn thông báo hệ thống]                             │
```

Không có cảnh báo: "Mọi thứ ổn." (TXT-ADM-05). Tự làm mới mỗi 60 s khi trang đang mở.

### WF-ADM-02 Nhật ký kiểm toán (SCR-WEB-16, trước là SCR-ADM-02)

```text
│ Nhật ký kiểm toán      Khoảng [7 ngày ▾]  Người [▾]  Hành động [▾]  Đối tượng [▾]  [Xuất CSV] │
│ Thời điểm   │ Người │ Hành động        │ Đối tượng           │ IP           │       │
│ 23/11 14:02 │ Huy   │ Đổi hạn mức      │ Người dùng: Lan     │ 113.x.x.x    │ [Xem] │
│ 23/11 13:40 │ Lan   │ Xuất bản         │ Game: Làng chài #3  │ 14.x.x.x     │ [Xem] │
│ 23/11 09:12 │ —     │ Đăng nhập bị từ chối (chưa mời) │ Email: x@…│ 1.x.x.x │ [Xem] │
│ [Tải thêm]                                                                      │
│ ── Ngăn chi tiết ── Trước: {aiUsdPerDay: 5}  →  Sau: {aiUsdPerDay: 8} · requestId … │
```

| Phần tử | Quy tắc |
|---|---|
| Hành động | Tên tiếng Việt cho mã `login`, `login_denied`, `invite`, `user_lock`, `role_change`, `quota_change`, `config_change`, `publish`, `link_create`, `link_revoke`, `game_delete`, `lock_takeover`, `member_change`, `asset_deprecate` (FR-WEB-49) |
| Trước/sau | Hiện khác biệt theo trường; JSON đầy đủ trong "Chi tiết" |
| Chỉ đọc | Không sửa/xoá được (bảng `audit_log` chỉ INSERT, TBL-WEB-26) |
| IP | Rút gọn hai khối cuối ở bảng; đầy đủ trong chi tiết |

### WF-ADM-03 Kiểm duyệt nội dung (SCR-WEB-17, trước là SCR-ADM-03)

```text
│ Kiểm duyệt   [Game] [Xuất bản & link] [Asset] [Hội thoại AI]                    │
│ ── Game ── 🔎  Chủ [▾] Trạng thái [▾]                                            │
│ Làng chài │ Lan │ ● Đang làm │ 6,4 GB │ sửa 14:05 │ 3 bản · 2 link │ [Mở chỉ đọc] [Chuyển chủ…] │
│ ── Xuất bản & link ── [ ] Không cần đăng nhập  [ ] Không hạn  Trạng thái [Còn hạn ▾] │
│ …k3Fz │ Làng chài #3 │ Lan │ Không cần đăng nhập │ đến 30/11 │ mở 10:02 │ [Xem] [Thu hồi…] │
│ Làng chài #3 │ ▲ Chưa đạt │ 22/11 │ [Gỡ bản xuất bản…]                             │
│ ── Asset ── [ ] Thiếu provenance  License [▾]  [ ] Ngừng dùng                       │
│ Tượng đá v2 │ CC0 polyhaven │ 2 game │ Rừng tràm │ ✓ provenance │ [Ngừng dùng…]        │
│ ── Hội thoại AI ── Game [Làng chài ▾] 7 ngày                                        │
│ NPC      │ Lượt │ Chặn đầu vào │ Dự phòng đầu ra │ Chi phí │                          │
│ Ông lão  │ 410  │ 3,2% ⚠       │ 1,0%            │ 0,82    │                          │
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Mở chỉ đọc | Mở WF-WEB-05 với băng "Bạn đang xem với quyền quản trị – chỉ đọc" | SRS-08 mục 3.1, FRP-ADM-05 |
| Chuyển chủ | Hộp rất nguy hiểm: chọn chủ mới (CMP-GEN-29), chủ cũ giữ "Được sửa" hay gỡ, gõ tên game để xác nhận | FRP-ADM-11 |
| Thu hồi link, gỡ bản xuất bản | Hộp rất nguy hiểm + lý do bắt buộc (≥ 10 ký tự) | FRP-ADM-06 |
| Asset | Lọc thiếu provenance; Ngừng dùng qua API-WEB-44 | FRP-ADM-08, FR-AST-38 |
| Hội thoại AI | Chỉ số; ô ≥ 3% chặn đầu vào tô vàng (UIUX đề xuất); không có nội dung lời thoại trừ khi game bật gỡ lỗi, khi đó có nút "Xem lượt gần đây" | FRP-ADM-07, FR-DLG-17 |

### WF-ADM-04 Thông báo hệ thống (SCR-WEB-18, trước là SCR-ADM-04)

```text
│ Thông báo hệ thống                                         [+ Thông báo mới]     │
│ ┌ Soạn ───────────────────────────────────────────────────────────────┐          │
│ │ Nội dung [Bảo trì máy build 20:00–21:00 thứ Sáu, job sẽ tạm dừng.] 62/200 │     │
│ │ Mức (•) Cảnh báo ( ) Thông tin    Hiện từ [24/11 08:00] đến [28/11 21:00] │     │
│ │ Xem trước: [⚠ Bảo trì máy build 20:00–21:00 thứ Sáu, job sẽ tạm dừng. ✕] │     │
│ │                                                   [Huỷ] [Đăng]          │     │
│ └─────────────────────────────────────────────────────────────────────┘          │
│ Đang hiện │ Đã lên lịch │ Đã hết                                                 │
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Nội dung | Văn bản thuần ≤ 200 ký tự, không HTML/liên kết | FRP-ADM-09, FR-WEB-46 |
| Hiển thị cho người dùng | Băng đầu trang (ưu tiên theo UIUX-00 mục 4.2), đóng được, hiện lại khi nội dung đổi | FRP-ADM-09 |

---

## 4. Quy tắc tương tác của trang quản trị

| Mã | Quy tắc | Chi tiết |
|---|---|---|
| UXR-ADM-01 | Mọi thay đổi để lại dấu | Sau mỗi thay đổi quản trị, toast "Đã lưu · ghi vào nhật ký kiểm toán"; khi SCR-ADM-02 được bật, toast có liên kết tới dòng nhật ký |
| UXR-ADM-02 | Không có bí mật trên giao diện | Không ô nhập khoá, token, mật khẩu; trạng thái khoá chỉ "Đã cấu hình / Chưa cấu hình"; giá trị `requestId`, IP chỉ trong ngăn chi tiết (QT-WEB-05) |
| UXR-ADM-03 | Số liệu đọc được và xuất được | Mọi biểu đồ có bảng số liệu; bảng có "Xuất CSV" phía client; tiền 2 chữ số thập phân USD; mốc ngày theo giờ VN, ghi rõ trên trang ("Ngày tính theo giờ Việt Nam") |
| UXR-ADM-04 | Hành động lên người khác cần nói hậu quả | Khoá, đổi vai trò, hạ hạn mức dưới mức đang dùng, thu hồi link, chuyển chủ: hộp xác nhận nêu ai bị ảnh hưởng và thế nào |
| UXR-ADM-05 | Làm mới | Trang số liệu tự làm mới 60 s khi tab đang hiển thị; hiện "cập nhật lúc …" và nút ↻ |

---

## 5. Câu chữ

| Mã | Ngữ cảnh | Câu |
|---|---|---|
| TXT-ADM-01 | Khoá tài khoản | "Khoá tài khoản {ten}? {ten} bị đăng xuất khỏi mọi thiết bị trong vòng 1 phút và không gọi được API." |
| TXT-ADM-02 | Mở khoá | "Mở khoá tài khoản {ten}? {ten} đăng nhập lại được ngay." |
| TXT-ADM-03 | Hướng dẫn cho người được mời | "Bạn đã được mời vào GameStudio. Vào {PUBLIC_ORIGIN}, bấm 'Đăng nhập bằng Google' với {email}." |
| TXT-ADM-04 | Quản trị cuối | "Không thể khoá hoặc hạ vai trò quản trị cuối cùng hay chính bạn." (ERR-WEB-13) |
| TXT-ADM-05 | Tổng quan không có cảnh báo | "Mọi thứ ổn." |
| TXT-ADM-06 | Khoá dịch vụ AI | "Đã cấu hình" / "Chưa cấu hình – đặt biến môi trường trên máy chủ" |
| TXT-ADM-07 | Hạ hạn mức dưới mức dùng | "{ten} đang dùng {x}, cao hơn hạn mức mới {y}. {ten} sẽ bị chặn {hanhDong} tới khi dưới hạn mức." |
| TXT-ADM-08 | Sao lưu quá hạn | "Sao lưu {loai} gần nhất cách đây {thoiGian}." |
| TXT-ADM-09 | Thu hồi link của người khác | "Thu hồi link …{hint} của game {game}? Người đang giữ link sẽ thấy 'Link không còn hiệu lực'. {chu} sẽ nhận thông báo kèm lý do." |

---

## 6. Trạng thái và lỗi

| Tình huống | Hiển thị |
|---|---|
| Người không phải quản trị vào `/admin/*` | Trang TXT-GEN-04 (backend 403 ERR-WEB-04) |
| Chưa có số liệu (hệ thống mới) | Thẻ hiện "—", biểu đồ rỗng "Chưa có dữ liệu trong khoảng này" |
| Worker đều không sẵn sàng | Thẻ đỏ ở đầu tab Vận hành + câu ERR-WEB-11 để quản trị biết người dùng đang thấy gì |
| Lưu cấu hình lỗi kiểm | Lỗi dưới ô (ERR-WEB-08) |

---

## 7. Kiểm thử khả dụng

| Mã | Kịch bản | Đạt khi |
|---|---|---|
| UT-ADM-01 | Mời 2 người (một Người tạo game, một Người xem), sao chép hướng dẫn | ≤ 1 phút |
| UT-ADM-02 | Tìm người tốn chi phí AI nhất 30 ngày và nâng hạn mức của họ | ≤ 1 phút, không mở quá 2 màn hình |
| UT-ADM-03 | Khoá một tài khoản và giải thích hậu quả | Người thử nói đúng: đăng xuất ≤ 1 phút, game giữ nguyên |
| UT-ADM-04 | Tìm vì sao job xếp hàng lâu (worker không đạt doctor) | Tìm ra từ SCR-WEB-13 ≤ 2 phút |
| UT-ADM-05 | Ma trận hiển thị: đăng nhập vai Người tạo game, Người xem | Không thấy mục Quản trị; gõ `/admin` → trang không có quyền |

---

## 8. Open item

| Mã | Câu hỏi | Đề xuất UIUX |
|---|---|---|
| OIU-ADM-01 | Có cho quản trị thu hồi link / gỡ bản xuất bản của người khác (FRP-ADM-06) không; điều này đổi SRS-08 mục 3.2 | Đã chốt 23/11/2026: có, kèm lý do bắt buộc và thông báo chủ game (FR-WEB-55, MSG-WEB-05) |
| OIU-ADM-02 | Nhóm FRP-ADM-01…11 làm ở pha nào | FRP-ADM-02, 10 vào W1–W2 cùng SCR-WEB-10/13 (thiếu thì SCR-WEB-13 không có dữ liệu); FRP-ADM-01, 03, 04, 05, 09 ở W2; FRP-ADM-06, 07, 08, 11 ở W4. Đã chốt 23/11/2026 theo pha ghi ở SRS-08 v1.1 mục 5.9 |
| OIU-ADM-03 | Ngưỡng tô vàng tỉ lệ chặn đầu vào hội thoại AI | 3% (UIUX đề xuất), chỉnh sau 2 tuần dữ liệu thật |
| OIU-ADM-04 | Nhiều email trong một lần mời | Có (mỗi dòng một email, cùng vai trò và hạn mức); API-WEB-70 hiện nhận một email: SPA gọi lặp, không đổi API |

---

## 9. Truy vết

| SRS | UIUX |
|---|---|
| UC-WEB-01, FR-WEB-01 | UF-ADM-01, WF-WEB-10, TXT-ADM-03 |
| SCR-WEB-10, FR-WEB-03 | WF-WEB-10, UF-ADM-04, TXT-ADM-01, TXT-ADM-02 |
| FR-WEB-04 | WF-WEB-10 (đổi vai trò) |
| UC-WEB-08 | UF-ADM-02 |
| SCR-WEB-11, FR-WEB-06, FR-WEB-07, QT-WEB-08 | WF-WEB-11, UF-ADM-02, TXT-ADM-07 |
| FR-DLG-22, FR-DLG-17 | WF-WEB-11 (tab Hội thoại theo game) |
| SCR-WEB-12, FR-DLG-25 | WF-WEB-12, UF-ADM-03 |
| FR-WEB-48 | WF-WEB-12, WF-WEB-13, UXR-ADM-03, UXR-ADM-05 |
| SCR-WEB-13, FR-WEB-44, FR-WEB-45, NFR-WEB-06 | WF-WEB-13, TXT-ADM-08 |
| FR-WEB-40 | WF-WEB-13 (job toàn hệ thống) |
| FR-WEB-42, FR-WEB-43, QT-WEB-05, FR-DLG-24 | WF-WEB-13 (Dịch vụ AI), UXR-ADM-02, TXT-ADM-06 |
| FR-AST-01 | WF-WEB-13 (Nguồn CC0) |
| FR-WEB-49 | UXR-ADM-01, WF-ADM-02 |
| FR-WEB-38, FR-WEB-55, UC-WEB-09, MSG-WEB-05 | WF-ADM-03, UF-ADM-05, TXT-ADM-09 |
| SCR-WEB-15, FR-WEB-51 | WF-ADM-01, TXT-ADM-05 |
| SCR-WEB-16, FR-WEB-53 | WF-ADM-02 |
| SCR-WEB-17, FR-WEB-54, FR-WEB-56, FR-WEB-57, FR-WEB-59 | WF-ADM-03 |
| SCR-WEB-18, FR-WEB-58 | WF-ADM-04 |
| FR-WEB-52 | WF-WEB-13 |
| QT-WEB-09, ERR-WEB-13 | WF-WEB-10, TXT-ADM-04 |
| FR-AST-38 | WF-ADM-03 (tab Asset) |
| ERR-WEB-11 | WF-WEB-13, mục 6 |
| NFR-WEB-03 | Mục 1 (quy mô ≤ 20 người: bảng không cần phân trang máy chủ trừ job, nhật ký) |
| NFR-WEB-05 | WF-WEB-13 thẻ vận hành (P95), FRP-ADM-09 (báo trước bảo trì) |
| NFR-WEB-02 | WF-WEB-13 (P95 ≤ 500 ms) |
| AC-08-07 | UF-ADM-03 |

---

## 10. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 23/11/2026 | Claude | Bản đầu; SCR-ADM-01…04 và FRP-ADM-01…11 là đề xuất bổ sung chờ Huy duyệt |
| 0.2 | 23/11/2026 | Claude | Huy duyệt FRP-ADM-01…11 (23/11/2026): bỏ nhãn đề xuất, ánh xạ sang SRS-08 v1.1 (FR-WEB-51…59, QT-WEB-09, SCR-WEB-15…18, UC-WEB-09, MSG-WEB-05, ERR-WEB-13, API-WEB-75…82) và DDD-08 v0.2 (EP-WEB-44…51) |
| 1.0 | 23/11/2026 | Huy | Duyệt bộ UIUX (gồm đề xuất trong các mục Open item, luồng làm tiếp/cập nhật game và prototype trong `prototype/`); thay đổi sau đây theo change request |
