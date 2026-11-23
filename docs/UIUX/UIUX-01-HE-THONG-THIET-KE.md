# UIUX-01: Hệ thống thiết kế

| Mục | Nội dung |
|---|---|
| Mã tài liệu | UIUX-01 |
| Phiên bản | 1.0 |
| Ngày | 23/11/2026 |
| Tài liệu cha | UIUX-00 `UIUX-00-TONG-QUAN.md` |
| Nguồn | TSD-08 mục 3 (frontend, tiếng Việt, trạng thái rỗng/lỗi/tải), ADR-027 (Tailwind + Radix UI), DDD-08 MOD-WEB-20…25, 37, SRS-08 NFR-WEB-01, 02, 04, FR-WEB-46, 60, 61; SRS-00 mục 4.4 (giai đoạn tiến độ) |
| Mã nguồn | `web/app/src/ui/**` (thành phần), `web/app/tailwind.config.ts` (token), `web/app/src/i18n/vi.json` (câu chữ) |
| Trạng thái | Đã duyệt (Huy, 23/11/2026) |

---

## 1. Giới thiệu
Một bộ token và khoảng 30 thành phần dùng chung cho mọi màn hình UIUX-02…04. Thành phần dựng trên Radix UI (hành vi, ARIA, focus) và Tailwind (kiểu dáng qua biến CSS). Không thêm thư viện UI khác. Mỗi thành phần có tệp riêng `web/app/src/ui/<ten>.tsx` ≤ ~300 dòng (NFR-GEN-11).

---

## 2. Token thiết kế

Token khai báo bằng biến CSS `--gs-*` trên `:root[data-theme]`, ánh xạ vào `tailwind.config.ts` (`colors.bg = 'var(--gs-bg)'`…). Chủ đề mặc định Tối (OIU-GEN-04).

### TOK-GEN-01 Màu

| Token | Vai trò | Tối (mặc định) | Sáng |
|---|---|---|---|
| `--gs-bg` | Nền trang | `#0F1115` | `#F7F8FA` |
| `--gs-surface` | Thẻ, panel | `#171A21` | `#FFFFFF` |
| `--gs-surface-2` | Ô nhập, hàng chọn, thanh công cụ | `#1F232C` | `#EEF1F5` |
| `--gs-border` | Viền, đường chia | `#2A2F3A` | `#D8DCE3` |
| `--gs-text` | Chữ chính | `#E6E8EE` | `#1A1D23` |
| `--gs-text-muted` | Chữ phụ, nhãn | `#A0A7B4` | `#5B6270` |
| `--gs-accent` | Hành động chính, liên kết, chọn | `#4C8DFF` | `#2563EB` |
| `--gs-accent-fg` | Chữ trên nền accent | `#0B1220` | `#FFFFFF` |
| `--gs-focus` | Vòng focus 2 px | `#8AB4FF` | `#1D4ED8` |
| `--gs-success` | Pass, Xong, Đã duyệt | `#3FB950` | `#1A7F37` |
| `--gs-warn` | Warn, ≥ 80% hạn mức, Cần build | `#D29922` | `#9A6700` |
| `--gs-danger` | Fail, Lỗi, xoá, chưa đạt | `#F85149` | `#CF222E` |
| `--gs-info` | Đang chạy, thông tin | `#58A6FF` | `#0969DA` |
| `--gs-ai` | Đánh dấu nội dung do AI sinh | `#B392F0` | `#8250DF` |
| `--gs-select` | Viền đối tượng đang chọn trong xem trước | `#FFB224` | `#FFB224` |

Quy tắc: chữ trên nền đạt tương phản ≥ 4,5:1 (chữ thường) và ≥ 3:1 (chữ ≥ 18 px, biểu tượng, viền ô nhập) theo WCAG 2.2 AA. Màu trạng thái **không bao giờ đứng một mình**: luôn kèm biểu tượng và chữ (UXR-GEN-09). Bảng màu biểu đồ lấy theo skill dataviz (bảng phân loại 6 màu đã kiểm tương phản), khai báo `--gs-chart-1…6`.

### TOK-GEN-02 Kiểu chữ

| Token | Cỡ / dòng | Độ đậm | Dùng cho |
|---|---|---|---|
| `text-xs` | 12 / 16 px | 400 | Nhãn phụ, chú thích lớp phủ |
| `text-sm` | 13 / 20 px | 400, 500 | Bảng, thuộc tính, chat trong không gian làm việc (mật độ cao) |
| `text-base` | 14 / 22 px | 400, 500 | Chữ mặc định của Studio |
| `text-md` | 16 / 24 px | 400, 600 | Đăng nhập, trang chơi, brief một trang, điện thoại |
| `text-lg` | 20 / 28 px | 600 | Tiêu đề màn hình |
| `text-xl` | 24 / 32 px | 600 | Tiêu đề trang đăng nhập, số KPI |
| `text-2xl` | 32 / 40 px | 600 | Số lớn trên trang tổng quan quản trị |
| `font-mono` | 13 / 20 px | 400 | JSON, mã lỗi, `requestId`, id |

Phông: Be Vietnam Pro (giao diện), JetBrains Mono (mã) (OIU-GEN-05). Chiều cao dòng ≥ 1,4 lần cỡ chữ để dấu tiếng Việt không bị cắt. Không viết hoa toàn bộ chữ tiếng Việt (khó đọc dấu); tiêu đề viết hoa chữ đầu câu.

### TOK-GEN-03 Khoảng cách và lưới
Bậc 4 px: `1 = 4`, `2 = 8`, `3 = 12`, `4 = 16`, `6 = 24`, `8 = 32`, `12 = 48`. Lề trang 24 px (≥ 1024 px), 16 px (< 1024 px). Lưới trang thường 12 cột, rãnh 24 px, rộng tối đa 1280 px; không gian làm việc và quản trị dùng toàn chiều rộng.

### TOK-GEN-04 Bo góc, bóng, độ nổi

| Token | Giá trị | Dùng cho |
|---|---|---|
| `rounded-sm` | 4 px | Huy hiệu, ô chọn |
| `rounded` | 6 px | Nút, ô nhập, thẻ nhỏ |
| `rounded-lg` | 10 px | Thẻ game, hộp thoại, popover |
| `shadow-1` | `0 1px 2px rgb(0 0 0 / .3)` | Thẻ nổi trên nền |
| `shadow-2` | `0 8px 24px rgb(0 0 0 / .4)` | Popover, menu, hộp thoại |

### TOK-GEN-05 Lớp xếp chồng (z-index)
`0` nội dung · `10` thanh công cụ xem trước, lớp phủ chỉ số · `20` thanh trên, thanh bên · `30` băng hệ thống · `40` popover, menu, tooltip · `50` hộp thoại · `60` toast.

### TOK-GEN-06 Chuyển động
Thời lượng 120 ms (hover, nhấn), 200 ms (mở popover, panel), 300 ms (hộp thoại). Đường cong `cubic-bezier(.2,0,0,1)`. Khi `prefers-reduced-motion: reduce`: tắt trượt, chỉ đổi độ mờ; không tự xoay camera xem trước.

### TOK-GEN-07 Điểm ngắt

| Tên | Chiều rộng | Hành vi chính |
|---|---|---|
| `phone` | < 640 px (chuẩn 412 px) | Một cột; không gian làm việc dạng tab, tắt gizmo (UXR-WEB-04) |
| `tablet` | 640–1023 px | Như `phone`, bảng hai cột nơi có thể |
| `desktop` | 1024–1365 px | Không gian làm việc ba vùng, cột trái thu thành thanh 48 px mặc định |
| `wide` | ≥ 1366 px | Bố cục đầy đủ SCR-WEB-05: trái 360 px, phải 400 px (NFR-WEB-04) |

### TOK-GEN-08 Biểu tượng và vùng chạm
Biểu tượng `lucide-react` 16 px (trong bảng, nút nhỏ), 20 px (thanh công cụ), 24 px (trạng thái rỗng). Vùng bấm tối thiểu 32 × 32 px trên máy tính, 44 × 44 px trên điện thoại (và 48 px cho nút chính trang chơi, theo FR-DLG-04).

---

## 3. Thành phần dùng chung

Mỗi thành phần ghi: biến thể, trạng thái, quy tắc, nguồn yêu cầu. Thành phần nền của Radix (Dialog, Popover, DropdownMenu, Tooltip, Tabs, Select, Switch, Checkbox, RadioGroup, Slider, ScrollArea, Toast) được bọc lại để áp token, không dùng trực tiếp trong `features/**`.

| Mã | Thành phần | Biến thể / cấu trúc | Trạng thái và quy tắc | Nguồn |
|---|---|---|---|---|
| CMP-GEN-01 | Nút `Button` | `primary` (accent), `secondary` (viền), `ghost` (chỉ chữ/biểu tượng), `danger`; cỡ `sm` 28 px, `md` 32 px, `lg` 40 px; có thể kèm biểu tượng, số đếm (`Build (3)`) | `hover`, `active`, `focus` (vòng `--gs-focus`), `loading` (spinner thay biểu tượng, giữ chiều rộng, chặn bấm lặp), `disabled` (độ mờ 50% + tooltip lý do bắt buộc, UXR-GEN-01). Mỗi vùng có tối đa một nút `primary` | NFR-WEB-02 |
| CMP-GEN-02 | Trường form `FormField` | Nhãn, ô nhập (văn bản, số có đơn vị, chọn, thanh trượt có ô số, màu, công tắc), chú thích, giới hạn "0–2.000 m", huy hiệu ảnh hưởng **Áp ngay** / **Cần build** (CMP-GEN-03) | Lỗi hiện ngay dưới ô (chữ `--gs-danger` + biểu tượng), ô viền đỏ, `aria-describedby` trỏ tới lỗi; lỗi schema từ ERR-WEB-08 gắn theo `field` (`instancePath`); giá trị ngoài khoảng bị chặn khi nhập, không đợi lưu | FR-WEB-28, FR-WLD-36, FR-WLD-38 |
| CMP-GEN-03 | Huy hiệu `StatusBadge` | Bộ trạng thái cố định (bảng 3.1) | Luôn có biểu tượng + chữ; không dùng màu làm tín hiệu duy nhất | FR-WEB-09, FR-WEB-14, FR-WEB-37 |
| CMP-GEN-04 | Thanh ứng dụng `AppHeader` | Cao 48 px; trái: logo, Thư viện, Quản trị (vai Quản trị); giữa: ô tìm game (`/` để focus); phải: chuông (CMP-GEN-15), ảnh đại diện → menu (Tài khoản, Chủ đề Tối/Sáng, Đăng xuất) | Mục đang mở gạch chân accent; ẩn trong không gian làm việc và trang chơi | SRS-08 mục 7.1 |
| CMP-GEN-05 | Thanh trên không gian làm việc `WorkspaceTopBar` | Cao 48 px: `←` thư viện · tên game (bấm để đổi tên khi là chủ) · huy hiệu vai trò của tôi · chỉ báo lưu (CMP-GEN-17) · phiên bản `#42` (mở SCR-WEB-08) · trạng thái khoá (CMP-GEN-16) · nhóm nút: `Build (n) ▾`, `QA ▾`, `Xuất bản`, `Chia sẻ` · chỉ báo job (CMP-GEN-09) · chuông | Nút ẩn/vô hiệu theo mục 4.3 UIUX-00 và SRS-08 mục 7.2; dưới 1366 px gộp Xuất bản, Chia sẻ, Phiên bản vào menu `⋯` | SRS-08 mục 7.2, FR-WEB-17 |
| CMP-GEN-06 | Thẻ game `GameCard` | Ảnh đại diện 16:9 (ảnh góc chuẩn đầu tiên; chưa có thì hình nền theo bảng màu game + chữ cái đầu), tên (2 dòng, cắt `…`), huy hiệu trạng thái, huy hiệu vai trò ("Chủ", "Được sửa", "Chỉ xem"), "Sửa 5 phút trước bởi Lan", menu `⋯` | Cả thẻ là liên kết mở game; menu `⋯` mở bằng bàn phím; đang sửa bởi người khác thì góc ảnh có chấm và tên người | FR-WEB-08 |
| CMP-GEN-07 | Tin nhắn chat `ChatMessage` và ô soạn `Composer` | Loại: của tôi (căn phải, nền `surface-2`), AI (căn trái, nhãn **AI** màu `--gs-ai`), hệ thống (giữa, chữ nhỏ), thẻ đề xuất (CMP-GEN-08), thẻ job (CMP-GEN-09). Ô soạn: nhiều dòng tự giãn tới 8 dòng, đếm ký tự khi > 80% giới hạn, nút Gửi, đính ảnh (chỉ ở SCR-WEB-04) | `Enter` gửi, `Shift+Enter` xuống dòng; đang chờ AI: bong bóng "Đang suy nghĩ…" ba chấm, nút Dừng; vô hiệu khi hết hạn mức (kèm câu ERR-WEB-05) hoặc chỉ xem (chỉ gửi câu hỏi). Nội dung AI hiển thị dạng văn bản, Markdown giới hạn (đoạn, danh sách, đậm, mã), không HTML | FR-WEB-10, FR-WEB-11, FR-WEB-13, FR-WEB-46 |
| CMP-GEN-08 | Thẻ đề xuất `ProposalCard` | Chi tiết ở UIUX-03 WF-INT-01 | — | SCR-INT-01 |
| CMP-GEN-09 | Thẻ job `JobCard` và chỉ báo job `JobIndicator` | Thẻ: loại job, zone/tier, danh sách bước (chờ ○, chạy ◐ + %, xong ✓, lỗi ✕, bỏ qua nhờ cache ↺), thanh tiến độ tổng, "Còn khoảng 4 phút", nút Huỷ, liên kết "Xem báo cáo". Chỉ báo trên thanh trên: biểu tượng + số job đang chạy, bấm mở popover danh sách job của game | Cập nhật theo SSE `job.progress` (DTO-WEB-06), không nhấp nháy dưới 1 lần/giây; `etaS` chưa có → "Đang ước lượng thời gian" (TXT-WEB-07); xếp hàng chờ máy build → huy hiệu "Chờ máy build" (ERR-WEB-11); lỗi `fail_data` → câu lỗi + liên kết tới trường/đối tượng; `fail_env` đang thử lại → "Thử lại lần 1/2" | FR-WEB-14, FR-WEB-40, FR-WEB-41 |
| CMP-GEN-10 | Thanh hạn mức `QuotaMeter` | Nhãn, "4,10 / 5,00 USD hôm nay", thanh %, chữ phụ "Đặt lại lúc 0:00" | < 80% accent; 80–99% `warn` + biểu tượng ⚠; 100% `danger` + "Đã hết" | FR-WEB-06, FR-WEB-07 |
| CMP-GEN-11 | Hộp thoại xác nhận `ConfirmDialog` | Tiêu đề động từ ("Thu hồi link?"), một câu hệ quả, nút chính mô tả việc ("Thu hồi") + Huỷ | Mức `thường` (Enter = xác nhận); mức `nguy hiểm` (nút `danger`, focus mặc định ở Huỷ); mức `rất nguy hiểm` (gõ tên đối tượng để bật nút: chỉ dùng cho FRP-ADM-06, FRP-ADM-11). Không hỏi lại cho hành động hoàn tác được: dùng toast có "Hoàn tác" | UXR-GEN-02 |
| CMP-GEN-12 | Toast và băng `Toast`, `Banner` | Toast góc dưới phải, tự tắt 5 s (lỗi: không tự tắt), có hành động tuỳ chọn ("Hoàn tác", "Xem"); băng ngang đầu nội dung: thông tin, cảnh báo, lỗi | Tối đa 3 toast; toast lỗi có `requestId` trong "Chi tiết"; đọc bằng `aria-live="polite"` (lỗi: `assertive`) | UXR-GEN-03 |
| CMP-GEN-13 | Bảng dữ liệu `DataTable` | Tiêu đề cột sắp xếp được, bộ lọc trên bảng, hàng có menu `⋯`, chọn nhiều, sửa tại ô (số, chọn), phân trang con trỏ "Tải thêm" (DTO-WEB-02), cột số căn phải | Đang tải: 5 hàng skeleton; rỗng: CMP-GEN-14; sửa tại ô: Enter lưu, Esc huỷ, lỗi dưới ô; giữ cột đầu khi cuộn ngang | DTO-WEB-02 |
| CMP-GEN-14 | Trạng thái màn hình `ScreenState` | `loading` (skeleton đúng hình bố cục), `empty` (minh hoạ biểu tượng 24 px + một câu + hành động chính), `error` (câu lỗi theo mã + mã ERR + `requestId` + nút "Thử lại") | Skeleton chỉ hiện sau 300 ms để tránh nháy; lỗi 403/404 dùng trang riêng "Không tìm thấy hoặc bạn không có quyền" (không lộ game tồn tại, PSC-WEB-02) | TSD-08 mục 3.6 |
| CMP-GEN-15 | Chuông thông báo `NotificationBell` | Biểu tượng + chấm số chưa đọc (tối đa "9+"); popover danh sách (WF-WEB-16) | Nhận SSE `notify`; gộp theo `group_key` ("3 job đã xong trong Làng chài") | FR-WEB-50 |
| CMP-GEN-16 | Trạng thái khoá `LockStatus` | Huy hiệu ở thanh trên: "Bạn đang sửa" (accent), "Đang được sửa bởi Lan – chỉ xem" (warn), "Chỉ xem" (muted); nút "Lấy quyền sửa" (chủ game) hoặc "Thử lấy quyền sửa" khi khoá đã nhả | Đổi ngay theo SSE `lock.changed`; khi mất khoá do bị lấy: hộp thông báo MSG-WEB-04 | FR-WEB-24, AC-08-04 |
| CMP-GEN-17 | Chỉ báo lưu `SaveIndicator` | "Có thay đổi chưa lưu" · "Đang lưu…" · "Đã lưu · #42" · "Lưu lỗi – Thử lại" | Hiện liên tục trong không gian làm việc; bấm "Đã lưu · #42" mở SCR-WEB-08 tại mốc đó; rời trang khi còn `pending` → `store.flush(true)`, trình duyệt hỏi "Rời trang?" chỉ khi flush lỗi | FR-WEB-27, TXT-WEB-01…04 |
| CMP-GEN-18 | Thanh công cụ xem trước `PreviewToolbar` | Nổi ở cạnh trên khung xem trước: chế độ (Bay tự do / Người chơi / Góc chuẩn ▾) · zone ▾ · giờ (thanh trượt 0–24 + mốc đã bake) · tier giả lập ▾ (Thấp, Vừa, Cao, Tối đa) · khung điện thoại (công tắc) · chỉ số (công tắc) · QR · toàn màn hình | Mỗi nút có tooltip + phím tắt (UXR-WEB-05); trạng thái lưu theo game trong `localStorage` | FR-WEB-18, FR-WEB-19, FR-WEB-20 |
| CMP-GEN-19 | Lớp phủ chỉ số `StatsOverlay` | Góc trên trái khung xem trước, chữ mono 12 px: fps · draw call · tri · bộ nhớ GPU, mỗi dòng "giá trị / ngân sách tier" | Cập nhật 500 ms (PSC-WEB-14); vượt ngân sách: chữ `danger` + biểu tượng ⚠; nền mờ 70% để đọc được trên cảnh | FR-WEB-20 |
| CMP-GEN-20 | Thẻ QR và link `QrLinkCard` | Mã QR 192 px, URL rút gọn có nút Sao chép, hạn dùng, tuỳ chọn "Gửi số đo hiệu năng" (link đo) | Sao chép → toast "Đã sao chép"; link chỉ trả một lần (link chơi thử) → thẻ ghi "Lưu link này, sau khi đóng sẽ không xem lại được" | FR-WEB-19, FR-WEB-36 |
| CMP-GEN-21 | Cây đối tượng `ObjectTree` | Nhóm theo zone → loại (Công trình, Đối tượng đặt tay, NPC, Đàn động vật, Vùng, Đèn); mỗi nút: biểu tượng loại, tên đọc được, huy hiệu "Cần build"; ô lọc tên | Chọn trên cây ↔ chọn trong xem trước đồng bộ; mũi tên lên/xuống/trái/phải điều hướng; `Delete` xoá (hoàn tác được); kéo thả để đổi nhóm không hỗ trợ ở bản đầu | FR-WEB-21 |
| CMP-GEN-22 | Bảng thuộc tính `PropertyPanel` | Sinh từ JSON Schema của loại đối tượng: nhóm trường gập được (Vị trí, Hình thức, Hành vi…), mỗi trường là CMP-GEN-02; đầu bảng: tên, loại, nút "Xem trong JSON" | Sửa trường → một `OpGroup` (DDD-08 DTO-WEB-08) → hoàn tác được; trường có `x-impact` hiện huy hiệu ảnh hưởng | FR-WEB-21, FR-WEB-28, QT-WEB-04 |
| CMP-GEN-23 | Biểu đồ `Chart` | Đường (chi phí theo ngày), cột chồng (chi phí theo loại việc), thanh ngang (top người/game) | Trục, chú giải, tooltip theo skill dataviz; số tiền định dạng `vi-VN` 2 chữ số thập phân; luôn có bảng số liệu tương ứng bên dưới cho trình đọc màn hình | FR-WEB-48 |
| CMP-GEN-24 | So sánh ảnh trượt `ImageCompare` | Hai ảnh chồng, tay kéo dọc; nhãn "Baseline" / "Bản mới"; điểm SSIM, % pixel khác | Phím trái/phải dịch tay kéo 5%; bấm đúp để đặt giữa | FR-QA-05, SCR-WEB-07 |
| CMP-GEN-25 | Dòng thời gian `VersionTimeline` | Mốc nhóm theo ngày: `#42` · tóm tắt · tác giả · nguồn (Chat / Editor / JSON / Khôi phục / Nhập) · giờ · ★ · tên | Chọn hai mốc để so sánh; mốc hiện tại có nhãn "Hiện tại"; mốc có bản xuất bản có huy hiệu | FR-WEB-31, FR-WEB-32, FR-WEB-33 |
| CMP-GEN-26 | Tab, menu, popover, tooltip | Bọc Radix; tooltip hiện sau 500 ms, chứa cả phím tắt | Tooltip không chứa thông tin duy nhất (nút vô hiệu: lý do cũng đọc được bằng `aria-describedby`) | UXR-GEN-09 |
| CMP-GEN-27 | Hộp xung đột `ConflictDialog` | Khi 409 không hợp nhất tự động được: danh sách đối tượng bị đụng, mỗi dòng "Của bạn" / "Phiên bản mới (#43, Lan)" và lựa chọn giữ bên nào | Mặc định giữ của bạn cho trường bạn vừa sửa; xác nhận → PATCH với `baseVersion` mới | ERR-WEB-07, DDD-08 mục 9 |
| CMP-GEN-28 | Thanh bên quản trị `AdminNav` | Rộng 220 px (thu thành 56 px dưới 1366 px): Tổng quan, Người dùng, Hạn mức, Chi phí & sử dụng, Hệ thống, Kiểm duyệt, Nhật ký kiểm toán, Thông báo hệ thống | Mục hiện theo pha của SCR-WEB-10…18 (SRS-08 v1.1) | UIUX-04 |
| CMP-GEN-29 | Ô tìm và chọn người dùng `UserPicker` | Ô gõ tên/email, gợi ý từ người dùng trong hệ thống (ảnh, tên, email, vai trò) | Không mời được người ngoài hệ thống từ đây (chia sẻ chỉ cho người đã có tài khoản, FR-WEB-35); gợi ý câu "Người này chưa có tài khoản, nhờ quản trị mời" | FR-WEB-35 |
| CMP-GEN-30 | Vùng thả tệp `DropZone` | Khung viền đứt, biểu tượng, "Kéo ảnh vào đây hoặc chọn tệp", giới hạn | Kiểm loại/kích thước ở client trước khi tải (vẫn kiểm ở server); lỗi từng tệp theo ERR-INT-02 / ERR-WEB-12; tải theo phần có thanh tiến độ cho gói game | FR-INT-02, FR-WEB-34 |
| CMP-GEN-31 | Thanh giai đoạn `StageBar` (v0.3) | Dạng dọc (bảng Tiến độ): 8 dòng cao 28 px, biểu tượng ✓/◐/○ + tên giai đoạn + chữ phụ phải; dạng chip (thanh trên, thẻ game): một huy hiệu giai đoạn (CMP-GEN-03 nhóm Giai đoạn) | Bước hiện tại nhấn `--gs-accent` và đậm; bước đã qua màu `--gs-success`; chưa tới `--gs-text-muted`; có `aria-current="step"`; chip bấm được mở tab Tiến độ | FR-WEB-60, FR-WEB-61 |
| CMP-GEN-32 | Danh sách việc còn treo `PendingList` (v0.3) | Dòng: biểu tượng mức (chặn ▲ danger, lỗi ✕ danger, nhắc ● info), câu ngắn có số, nút lối tắt `ghost` `sm` bên phải; tiêu đề "Việc còn treo (n)" | Sắp: chặn → lỗi → nhắc; rỗng thì ẩn cả khối; mỗi dòng là một nút đơn cho trình đọc màn hình ("1 đề xuất chờ duyệt, Mở") | FR-WEB-61 |

### 3.1 Bộ trạng thái của `StatusBadge` (CMP-GEN-03)

| Nhóm | Giá trị dữ liệu → nhãn hiển thị (biểu tượng, màu) |
|---|---|
| Game | `DangLam` → Đang làm (●, info) · `LuuTru` → Lưu trữ (▣, muted) · `DaXoa` → Trong thùng rác (🗑, danger) |
| Giai đoạn tiến độ (v0.3) | `TaoMoi` → Đang mô tả (✎, info) · `ChoXacNhanBrief` → Chờ xác nhận brief (⚠, warn) · `ChoDuyetStyle` → Chờ duyệt style (⚠, warn) · `ChuaBuild` → Chưa build (○, info) · `CanBuild` → Cần build lại (⟳, warn) · `ChuaQA` → Chưa QA (◐, info) · `SanSangXuatBan` → Sẵn sàng xuất bản (➤, accent) · `DaXuatBan` → Đã xuất bản #n (✓, success). Cờ đè lên chip: Cần nâng cấp (▲, warn) |
| Job | `Cho` → Chờ (○, muted) · `DangChay` → Đang chạy 45% (◐, info) · `Xong` → Xong (✓, success) · `Loi` → Lỗi (✕, danger) · `DaHuy` → Đã huỷ (⊘, muted) |
| Kết quả kiểm | Pass (✓, success) · Warn (⚠, warn) · Fail (✕, danger) |
| Brief | `ChoXacNhan` → Chờ xác nhận (⚠, warn) · `DaXacNhan` → Đã xác nhận (✓, success) |
| Asset | Chờ duyệt (○, warn) · Đã duyệt (✓, success) · Bị từ chối (✕, danger) · Ngừng dùng (⊘, muted) · Rủi ro cao (▲, warn) |
| Ảnh hưởng thay đổi | Áp ngay (⚡, success) · Cần build (⟳, warn) · Thay đổi lớn (▲, danger) |
| Xuất bản / link | Chưa đạt (▲, danger) · Còn hạn đến 30/11 (●, success) · Hết hạn (○, muted) · Đã thu hồi (⊘, muted) · Cố định #2 (📌, muted) · Mới nhất (↻, info) (v0.3) |
| Nhập game (v0.3) | `ok` → Hợp lệ (✓, success) · `canNangCap` → Cần nâng cấp (▲, warn) · `chan` → Không nhập được (✕, danger) |
| Người dùng | Hoạt động (●, success) · Bị khoá (🔒, danger) · Lời mời chưa dùng (✉, warn) |
| Worker | Sẵn sàng (●, success) · Không đạt doctor (✕, danger) · Mất nhịp (○, muted) |

Biểu tượng trong bảng là ký hiệu minh hoạ; khi dựng dùng biểu tượng `lucide` tương ứng.

---

## 4. Quy tắc tương tác chung

| Mã | Quy tắc | Chi tiết |
|---|---|---|
| UXR-GEN-01 | Ẩn hay vô hiệu | Thiếu **quyền** theo vai trò/quyền game → **ẩn** nút. Có quyền nhưng **tạm thời** không làm được (brief chưa xác nhận ERR-INT-06, hết hạn mức ERR-WEB-05, không giữ khoá ERR-WEB-06, đang có job cùng loại) → **hiện vô hiệu** + tooltip nêu lý do và cách gỡ. Giao diện không thay kiểm quyền backend (FR-WEB-05); khi backend trả 403 vẫn hiện thông báo ERR-WEB-04 |
| UXR-GEN-02 | Xác nhận theo mức hậu quả | Hoàn tác được trong phiên (sửa, xoá đối tượng trong editor, chuyển game vào thùng rác, lưu trữ) → làm ngay + toast "Hoàn tác". Không hoàn tác được hoặc ảnh hưởng người khác (thu hồi link, khoá người dùng, đổi vai trò, lấy quyền sửa, xuất bản khi chưa đạt, khôi phục phiên bản) → CMP-GEN-11 mức thường/nguy hiểm. Xoá vĩnh viễn không có nút thủ công (job sau 30 ngày, FR-WEB-09) |
| UXR-GEN-03 | Hiển thị lỗi | Dùng câu tiếng Việt của mã ERR (`web/shared/errors.ts`, MOD-WEB-02), ghép tham số; lỗi trường → dưới trường; lỗi thao tác → toast; lỗi màn hình → CMP-GEN-14. Luôn kèm `requestId` trong phần "Chi tiết" để báo lỗi. Lỗi 5xx: "Có lỗi phía máy chủ, đã ghi lại. Mã: ERR-SYS · <requestId>" (TXT-GEN-01); không hiện chi tiết nhà cung cấp AI |
| UXR-GEN-04 | Nội dung do AI sinh | Gắn nhãn **AI** (màu `--gs-ai`) trên tin nhắn, thẻ đề xuất, bản nháp brief, style bible, nháp cây thoại; hiển thị dạng văn bản, không HTML (FR-WEB-46); có nút "Sao chép" |
| UXR-GEN-05 | Định dạng | `Intl` `vi-VN`, múi giờ Asia/Ho_Chi_Minh; số `1.234,5`; tiền `4,10 USD`; ngày `23/11/2026`; giờ `14:05`; thời gian tương đối ("5 phút trước", "hôm qua 16:20") kèm tooltip giờ tuyệt đối; dung lượng `1,2 GB` |
| UXR-GEN-06 | Tải và phản hồi | Thao tác editor áp cục bộ ≤ 100 ms (lạc quan); gọi API > 300 ms: nút `loading`; tải màn hình > 300 ms: skeleton; gọi AI: bong bóng "Đang suy nghĩ…" có nút Dừng |
| UXR-GEN-07 | Kết nối thời gian thực | Mất SSE: băng vàng "Đang kết nối lại…" (TXT-GEN-02), tự nối lại với `Last-Event-ID`; > 60 s: băng đỏ "Mất kết nối. Thay đổi của bạn vẫn được giữ trong trang và sẽ lưu khi có mạng" (TXT-GEN-03); có mạng lại → flush `pending` |
| UXR-GEN-08 | Phiên hết hạn | ERR-WEB-03 → hộp thoại "Phiên đăng nhập đã hết hạn" + nút "Đăng nhập lại" (mở cửa sổ đăng nhập, quay về đúng trang); `pending` của editor giữ trong `sessionStorage` và gửi lại sau khi đăng nhập (DDD-08 mục 9) |
| UXR-GEN-09 | Khả năng tiếp cận | WCAG 2.2 AA: tương phản TOK-GEN-01; mọi chức năng dùng được bằng bàn phím (trừ thao tác gizmo trong 3D: có ô số tương đương trong bảng thuộc tính); thứ tự Tab theo thứ tự đọc; focus luôn nhìn thấy; nhãn cho mọi ô nhập; thông báo động qua `aria-live`; không chỉ dựa vào màu; vùng chạm TOK-GEN-08 |
| UXR-GEN-10 | Câu chữ qua i18n | Mọi chuỗi trong `src/i18n/vi.json` với khoá phẳng `scr.web05.build.tooltip` (TSD-08 mục 3.5); lint `no-literal-string` trên `src/features/**`; chuỗi có tham số dùng `{ten}` |
| UXR-GEN-11 | Hạn mức trên giao diện | ≥ 80%: băng vàng MSG-WEB-01 một lần mỗi ngày mỗi loại (đóng được) + chấm vàng trên ảnh đại diện; 100%: nút gọi AI/tạo job/tải lên/tạo game của loại đó vô hiệu với lý do ERR-WEB-05 và nút "Xem hạn mức" (SCR-WEB-03) |
| UXR-GEN-12 | Tên hiển thị | Luôn hiện tên đọc được (tên NPC, tên vùng, tên asset), không hiện id ở chế độ thường; id, JSON Pointer chỉ ở "Chi tiết", JSON thô, trang quản trị |
| UXR-GEN-13 | Không chặn người dùng vô ích | Không mở hộp thoại khi có thể sửa tại chỗ; không bắt chờ job để tiếp tục sửa; mọi danh sách dài có ô lọc |

---

## 5. Câu chữ chung

Giọng: thân thiện, ngắn, nói việc người dùng làm được; xưng "bạn"; không dùng thuật ngữ kỹ thuật ở chế độ thường; động từ đứng đầu trên nút ("Tạo game", "Thu hồi link", không "OK"). Số kèm đơn vị. Không dùng dấu chấm than trừ lời chào.

| Mã | Ngữ cảnh | Câu |
|---|---|---|
| TXT-GEN-01 | Lỗi máy chủ chung | "Có lỗi phía máy chủ, đã ghi lại. Mã: {code} · {requestId}" |
| TXT-GEN-02 | Mất SSE ngắn | "Đang kết nối lại…" |
| TXT-GEN-03 | Mất kết nối > 60 s | "Mất kết nối. Thay đổi của bạn vẫn được giữ trong trang và sẽ lưu khi có mạng." |
| TXT-GEN-04 | Không tìm thấy / không có quyền | "Không tìm thấy trang này hoặc bạn không có quyền xem." |
| TXT-GEN-05 | Nút thử lại | "Thử lại" |
| TXT-GEN-06 | Hoàn tác trên toast | "Hoàn tác" |
| TXT-GEN-07 | Đã sao chép | "Đã sao chép" |
| TXT-GEN-08 | Nhãn nội dung AI | "AI" (tooltip: "Nội dung do AI tạo, hãy kiểm tra trước khi dùng") |

---

## 6. Trạng thái và lỗi
Mỗi màn hình khai trong UIUX-02…04 ba trạng thái chuẩn của CMP-GEN-14 (đang tải, rỗng, lỗi) và các trạng thái riêng. Bảng ánh xạ mã lỗi chung sang cách hiển thị:

| Mã | Hiển thị |
|---|---|
| ERR-WEB-03 | UXR-GEN-08 |
| ERR-WEB-04 | Toast lỗi; nếu cả màn hình: trang TXT-GEN-04 |
| ERR-WEB-05 | UXR-GEN-11; toast có nút "Xem hạn mức" |
| ERR-WEB-08 | Dưới trường theo `field` (CMP-GEN-02); nếu trường không hiện trên panel: toast "Dữ liệu chưa hợp lệ: {field}" + nút "Mở trong JSON" |
| ERR-WEB-12 | Dưới vùng thả tệp (CMP-GEN-30) |

---

## 7. Kiểm thử khả dụng và tiếp cận

| Mã | Kiểm | Cách | Đạt khi |
|---|---|---|---|
| UT-GEN-01 | Tương phản | Công cụ kiểm tương phản trên token cả hai chủ đề | 100% cặp chữ/nền đạt TOK-GEN-01 |
| UT-GEN-02 | Bàn phím | Đi hết SCR-WEB-02, 04, 09, 10 chỉ bằng bàn phím | Làm xong việc chính, focus luôn thấy, không bẫy focus |
| UT-GEN-03 | Trình đọc màn hình | NVDA + Chrome trên SCR-WEB-01, 02, 10 | Đọc đúng nhãn, trạng thái, thông báo động |
| UT-GEN-04 | Tự động | `axe-core` trong Playwright cho mọi tuyến (TC-WEB-11) | 0 lỗi mức nghiêm trọng/cao |
| UT-GEN-05 | Dấu tiếng Việt | Ảnh chụp các cỡ chữ TOK-GEN-02 với chuỗi "Ỷ Ẫ Ợ ữ ặ" | Không cắt dấu ở mọi cỡ |

---

## 8. Open item
Xem UIUX-00 OIU-GEN-04 (chủ đề), OIU-GEN-05 (phông), OIU-GEN-06 (biểu tượng).

---

## 9. Truy vết

| SRS | UIUX |
|---|---|
| NFR-WEB-04 | TOK-GEN-02, TOK-GEN-07, UXR-GEN-10 |
| NFR-GEN-13 | UXR-GEN-10, mục 5 |
| NFR-WEB-01 | Mục 1 (không thêm thư viện UI), TOK-GEN-02 (phông tự host, nạp `swap`) |
| NFR-WEB-02 | CMP-GEN-01, UXR-GEN-06 |
| FR-WEB-46 | CMP-GEN-07, UXR-GEN-04 |
| FR-WEB-05 | UXR-GEN-01 |
| FR-WEB-07 | CMP-GEN-10, UXR-GEN-11 |
| FR-WEB-50 | CMP-GEN-15 |
| FR-WEB-24 | CMP-GEN-16 |
| FR-WEB-27 | CMP-GEN-17 |
| FR-WEB-28 | CMP-GEN-02, CMP-GEN-22 |
| ERR-WEB-03, ERR-WEB-04, ERR-WEB-05, ERR-WEB-08, ERR-WEB-12 | Mục 6 |
| ERR-WEB-07 | CMP-GEN-27 |
| FR-WEB-60, FR-WEB-61 | CMP-GEN-31, CMP-GEN-32, mục 3.1 (nhóm Giai đoạn tiến độ) |
| FR-WEB-65, FR-WEB-66 | Mục 3.1 (chế độ link, kết quả kiểm nhập) |

---

## 10. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 23/11/2026 | Claude | Bản đầu |
| 0.2 | 23/11/2026 | Claude | Cập nhật CMP-GEN-28 theo SRS-08 v1.1 (SCR-WEB-15…18) |
| 0.3 | 23/11/2026 | Claude | Luồng làm tiếp/cập nhật game (SRS-08 v1.2): CMP-GEN-31 `StageBar`, CMP-GEN-32 `PendingList`; trạng thái giai đoạn tiến độ, chế độ link, kết quả kiểm nhập trong mục 3.1 |
| 1.0 | 23/11/2026 | Huy | Duyệt bộ UIUX (gồm đề xuất trong các mục Open item, luồng làm tiếp/cập nhật game và prototype trong `prototype/`); thay đổi sau đây theo change request |
