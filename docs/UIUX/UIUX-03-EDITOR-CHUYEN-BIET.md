# UIUX-03: Editor chuyên biệt trong không gian làm việc

| Mục | Nội dung |
|---|---|
| Mã tài liệu | UIUX-03 |
| Phiên bản | 1.1 |
| Ngày | 26/11/2026 |
| Tài liệu cha | UIUX-00 `UIUX-00-TONG-QUAN.md` |
| SRS nguồn | SRS-08 FR-WEB-21…30, 62 (v1.2); SRS-01 v1.1 mục 7 (SCR-INT-01, 02), FR-INT-33; SRS-02 mục 7 (SCR-WLD-01, 02); SRS-03 mục 7 (SCR-AST-01, 02); SRS-05 mục 7 (SCR-CHR-01…03); SRS-06 v1.1 mục 7 (SCR-CBT-02); SRS-07 mục 7 (SCR-DLG-01) |
| DDD nguồn | DDD-08 v1.1 mục 3.4 (`panel-registry`, `EditorBridge` gọi Unity player, CR-02), DDD-01/02/03/05/06/07 (DTO của dữ liệu tương ứng) |
| Mã nguồn | `web/app/src/features/workspace/**` và thư mục panel của từng nhóm, đăng ký qua `panel-registry.ts` (MOD-WEB-23) |
| Pha | W1 (SCR-INT-02), W3 (đa số), W4 (SCR-WLD-01, SCR-AST-02, JSON thô) |
| Trạng thái | Đã duyệt (Huy, 23/11/2026); **v1.1 khung xem trước nhúng Unity player theo CR-02 và POC-U1**, chờ Huy xem lại |

---

## 1. Giới thiệu
Mỗi editor chuyên biệt là một **panel** đăng ký vào không gian làm việc (FR-WEB-30): panel thường nằm ở bảng phải 400 px; panel `wide` mở ở chế độ mở rộng thay khung xem trước (UXR-WEB-03). Mọi panel chỉ đọc/ghi JSON dữ liệu game qua store (QT-WEB-04): sửa → `OpGroup` → hoàn tác được → lưu tự động → áp nóng hoặc "Cần build". Không panel nào có nút Lưu riêng.

| Panel | SCR | Vị trí | Hiện khi | Pha |
|---|---|---|---|---|
| Thẻ đề xuất | SCR-INT-01 | Trong chat | Có đề xuất | W3 |
| Duyệt style bible | SCR-INT-02 | Hộp thoại lớn | Style bible `ChoDuyet` | W1 |
| Môi trường | SCR-WLD-01 | Bảng phải | Luôn | W4 |
| Bản đồ vùng | SCR-WLD-02 | Mở rộng | Luôn | W3 |
| Duyệt asset | SCR-AST-01 | Mở rộng | Có asset của game | W3 |
| Kho asset | SCR-AST-02 | Tab trái (gọn) / mở rộng (đầy đủ) | Luôn | W4 (bản gọn W3) |
| NPC | SCR-CHR-01 | Bảng phải | Luôn | W3 |
| Động vật | SCR-CHR-02 | Bảng phải | Luôn | W3 |
| Sơ đồ hành vi | SCR-CHR-03 | Mở rộng | Mở từ NPC/động vật | W3 |
| Bảng cân bằng | SCR-CBT-02 | Mở rộng | `combat.enabled` hoặc `hunting.enabled` | W3 |
| Hội thoại | SCR-DLG-01 | Mở rộng | Luôn (tab Hồ sơ AI, Thử nói chuyện chỉ khi `dialogueMode ≠ static`) | W3 |
| JSON thô | — | Mở rộng | Luôn (chế độ nâng cao) | W4 |

---

## 2. Luồng người dùng

### UF-INT-01 Duyệt style bible (UC-INT-05)
Sau khi brief v1 xác nhận và style bible sinh xong: tin hệ thống trong chat "Style bible đã sẵn sàng để duyệt" + nút "Mở" → WF-INT-02 → Duyệt hoặc Yêu cầu sửa (ô lý do bắt buộc) → sinh lại sN+1 → thông báo lại. Trước khi duyệt, nút "Sinh asset hàng loạt" vô hiệu với lý do "Cần duyệt style bible trước" (FR-INT-22).

### UF-CHR-01 Thêm NPC có đường tuần tra và lịch trình
Tab NPC → "Thêm NPC" → điền tên, vai trò, ngoại hình, mẫu hành vi → "Vẽ trên cảnh" (đường tuần tra) → chạm các điểm trong khung xem trước, `Enter` kết thúc → bảng lịch trình thêm dòng 6:00 → Ra chợ → vị trí (chọn trên cảnh) → xem thử bằng "Tua giờ" (FR-CHR-44).

### UF-AST-01 Duyệt asset hàng loạt
Thông báo "5 asset chờ duyệt" → WF-AST-01 lọc Chờ duyệt → xem turntable, thông số → Duyệt từng thẻ hoặc "Duyệt cả lưới" cho biến thể nhỏ (FR-AST-35) → asset được duyệt kéo thả được vào cảnh.

### UF-DLG-01 Viết hội thoại và thử nói chuyện
Tab Hội thoại → chọn NPC → tab Kịch bản: thêm nút bằng form, hoặc "Nhờ AI viết nháp" → thẻ đề xuất (chỉ lưu khi duyệt, FR-DLG-31) → tab Hồ sơ AI (khi hội thoại AI bật) → tab Thử nói chuyện → tab Kiểm thử chạy bộ câu.

---

## 3. Wireframe

### WF-INT-01 Thẻ đề xuất thay đổi (SCR-INT-01)

```text
┌ Đề xuất · AI ───────────────────────────────── 14:02 ┐
│ Thêm đàn gà ở sân trước và dời giếng sang trái.      │
│ [✓] Thêm đàn gà: 5 con, vùng Sân trước     ⚡ Áp ngay │
│ [✓] Sửa Giếng nước: dời sang trái 3 m      ⟳ Cần build│
│ [✓]   └ Sửa Lối đi: nối lại tới giếng (phụ thuộc)    │
│ Ảnh hưởng: Cần build placement, lighting zone z1,    │
│ khoảng 6 phút                                        │
│ [Duyệt]  [Duyệt phần đã chọn]  [Bỏ]                  │
└──────────────────────────────────────────────────────┘
Mở rộng phạm vi (v0.3):
┌ Đề xuất · AI ───────────────────────────────── 09:15 ┐
│ Thêm zone Chợ quê nối với cổng làng.                 │
│ [✓] Thêm zone "Chợ quê" (z3), 120 × 80 m   ⟳ Cần build│
│ [✓] Thêm 4 NPC bán hàng ở z3               ⟳ Cần build│
│ ▾ Cập nhật brief v3 → v4                             │
│   Số zone: 2 → 3 · Địa điểm: + Chợ quê               │
│ Ảnh hưởng: chỉ build z3, khoảng 11 phút              │
│ [Duyệt và cập nhật brief]  [Bỏ]                      │
└──────────────────────────────────────────────────────┘
Thay đổi lớn:  ▲ Thay đổi lớn · Brief sẽ cần xác nhận lại
Hết hạn:       ⊘ Game đã đổi sau khi đề xuất được tạo. [Tạo lại đề xuất]
Đã quyết:      ✓ Đã duyệt bởi Lan · #43   /  ⊘ Đã bỏ
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Tóm tắt | `summary`, ngôn ngữ thường | FR-INT-24 |
| Danh sách thao tác | Ô chọn, mặc định chọn hết; mỗi dòng "Thêm/Sửa/Xoá + tên đối tượng + chi tiết"; thao tác phụ thuộc thụt vào, chọn/bỏ cùng nhau (bỏ cha → bỏ con, kèm tooltip lý do) | FR-INT-24, FR-INT-25 |
| Huy hiệu ảnh hưởng | Mỗi dòng và tổng: Áp ngay / Cần build + bước, zone, phút | FR-INT-24, API-INT-05 |
| Rê chuột vào dòng | Tô sáng đối tượng liên quan trong xem trước (`bridge.highlight`) | UXR-INT-01 |
| Thay đổi lớn | Huy hiệu đỏ + câu "Brief sẽ cần xác nhận lại" | FR-INT-26 |
| Nút | "Duyệt" khi chọn hết; "Duyệt phần đã chọn" chỉ bật khi bỏ ít nhất một dòng; Bỏ không hỏi lại (có toast Hoàn tác 5 s trước khi gửi); ẩn với Chỉ xem; vô hiệu khi `HetHan` | SCR-INT-01, FR-WEB-12 |
| Duyệt khi không giữ khoá | Nút vô hiệu, tooltip ERR-WEB-06 | EP-WEB-12 |
| 409 | ERR-INT-07 → thẻ chuyển trạng thái Hết hạn + nút "Tạo lại đề xuất" (gửi lại câu gốc) | ERR-INT-07 |
| Cập nhật brief (v0.3) | Khi đề xuất có `briefUpdate`: khối gập "Cập nhật brief vN → vN+1" liệt kê trường cũ → mới; nút chính đổi thành "Duyệt và cập nhật brief"; thay đổi lớn: thêm câu "Brief sẽ cần xác nhận lại" và build bị khoá tới khi xác nhận | FR-INT-33 |
| Mở lại game (v0.3) | Thẻ `ChoDuyet` còn đúng `baseVersion` giữ nguyên nút; thẻ có `baseVersion` cũ hiện ngay trạng thái Hết hạn, không đợi người dùng bấm Duyệt mới báo 409 | FR-WEB-62 |

### WF-INT-02 Duyệt style bible (SCR-INT-02)

```text
┌ Style bible · s1 · AI ────────────────────────────────── [✕] ┐
│ ┌ Văn bản ──────────────────────┐ ┌ Ảnh tham chiếu ────────┐ │
│ │ Hình khối: …                  │ │ [ảnh][ảnh][ảnh]        │ │
│ │ Chất liệu chủ đạo: gỗ, lá dừa │ │ [ảnh][ảnh][ảnh]        │ │
│ │ Ánh sáng: …  Điều không làm: …│ └────────────────────────┘ │
│ └───────────────────────────────┘                            │
│ Bảng màu: ■nền ■nền ■nhấn ■ui ■ánh sáng ■vật liệu … (8–16)   │
│ [Yêu cầu sửa…]                                    [Duyệt s1] │
└──────────────────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Ảnh | 3–6 ảnh, bấm phóng to; nhãn AI | FR-INT-20 |
| Bảng màu | Ô màu có nhãn vai trò, mã hex khi rê chuột | FR-INT-21 |
| Duyệt | Chủ game hoặc người có quyền Sửa; ghi người, thời điểm, sN | SCR-INT-02, API-WEB-14 |
| Yêu cầu sửa | Ô văn bản bắt buộc (≥ 10 ký tự) → sinh lại sN+1 | SCR-INT-02 |
| Sau khi duyệt, sửa lại | Cảnh báo "Thay đổi lớn: {n} asset phải làm lại" + danh sách | FR-INT-22 |

### WF-WLD-01 Editor môi trường (SCR-WLD-01, bảng phải)

```text
┌ Môi trường ───────────────────────────────┐
│ [Địa hình][Nước][Thực vật][Bầu trời & giờ][Hậu kỳ][Bảng màu] │
│ Nguồn địa hình  [mixed ▾]          ⟳ Cần build │
│ Độ cao tối đa   [ 120 ] m (0–2.000)  ⟳ Cần build │
│ Độ gồ ghề       ──●──────  0,35       ⟳ Cần build │
│ Xói mòn         [ 80 ] vòng (0–500)   ⟳ Cần build │
│ ─ Thực vật ─                                      │
│ Mật độ rừng     [ 400 ] cây/ha        ⟳ Cần build │
│ Bán kính cỏ     ──●──  40 m (theo tier) ⚡ Áp ngay │
│ ─ Bầu trời & giờ ─                                │
│ Mốc đang xem    [16:00 ▾]             ⚡ Áp ngay │
│ [+ Thêm mốc]  (3/6)                    ⟳ Cần build │
│ Sương, bloom, màu  ──●──               ⚡ Áp ngay │
└───────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Trường | CMP-GEN-02 với mặc định, min–max, đơn vị; nút ↺ "Về mặc định" từng trường | FR-WLD-36 |
| Huy hiệu ảnh hưởng | Từ `x-impact` của schema; `build:<bước>` hiện tên bước khi rê chuột và ước lượng phút | FR-WLD-38 |
| Thanh trượt áp nóng | Kéo cập nhật xem trước liên tục (giới hạn 10 lần/giây, mỗi lần một `SendMessage` tới Unity player; CR-02), lưu một `OpGroup` khi thả | FR-WEB-17, UXR-WLD-01 |
| Mốc thời điểm | Tối đa 6; thêm mốc → cần bake | SRS-02 mục 7.2 |

### WF-WLD-02 Bản đồ vùng (SCR-WLD-02, mở rộng)

```text
┌ ← Về xem trước · Bản đồ vùng · zone z1 ───────────────────────────────────────┐
│ Công cụ: [↖ Chọn][⬠ Vẽ đa giác][✎ Sửa đỉnh][⌫ Xoá]  Loại vùng: [Sân ▾]         │
├──────────────────────────────────────────────┬────────────────────────────────┤
│ (bản đồ nhìn từ trên: heightfield + mask,     │ Vùng (12)        🔎 lọc         │
│  lưới 10 m, vùng tô màu theo loại, nhãn tên)  │ ▾ Sân (3)                       │
│      ⬠ Sân trước  ⬠ Chợ nổi                  │   Sân trước  · 1.240 m²  ⋯     │
│                                               │ ▾ Rừng (2) …                    │
│ [＋][－] [⤢ vừa khung]   tỉ lệ ─ 50 m          │ Thuộc tính vùng đang chọn:      │
│                                               │ Tên [Sân trước] Loại [Sân ▾]    │
└──────────────────────────────────────────────┴────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Vẽ | Nhấp thêm đỉnh, nhấp đỉnh đầu hoặc `Enter` để đóng, `Backspace` bỏ đỉnh cuối, `Esc` huỷ; đa giác tự cắt → viền đỏ, không lưu được, câu "Vùng không được tự cắt" (TXT-WLD-01) | FR-WLD-37, FR-WEB-25 |
| Sửa đỉnh | Kéo đỉnh; nhấp cạnh để chèn đỉnh | FR-WLD-37 |
| Danh sách vùng | Nhóm theo loại, diện tích m², chọn ↔ tô sáng | SCR-WLD-02 |
| Xoá | Toast Hoàn tác; vùng đang được đàn động vật/NPC dùng → hỏi "Vùng đang được 'Đàn gà sân trước' dùng. Vẫn xoá?" | UXR-GEN-02 |

### WF-AST-01 Duyệt asset (SCR-AST-01, mở rộng)

```text
┌ ← Về xem trước · Duyệt asset ─────────────────────────────────────────────────┐
│ [Chờ duyệt (5)] [Rủi ro cao (1)] [Bị từ chối (2)]            [Duyệt cả lưới]  │
│ ┌────────────────────────┐ ┌────────────────────────┐                          │
│ │ Nón lá · v1 · vòng 1/1 │ │ Tượng đá · v2 ▲ vòng 1/2│                          │
│ │ [0°][90°][180°][270°]  │ │ [0°][90°][180°][270°]  │                          │
│ │ [ảnh trong cảnh]       │ │ [ảnh trong cảnh]       │                          │
│ │ Tri LOD0 1,2k ✓ VL 1 ✓ │ │ Tri 18k ⚠  Tex 1024 ✓   │                          │
│ │ Nguồn: Forge · recipe  │ │ Nguồn: CC0 · polyhaven │                          │
│ │ [Từ chối…]   [Duyệt]   │ │ [Từ chối…]   [Duyệt]   │                          │
│ └────────────────────────┘ └────────────────────────┘                          │
└────────────────────────────────────────────────────────────────────────────────┘
Từ chối… → Lý do: ( ) Lệch phong cách ( ) Vượt ngân sách ( ) Lỗi hình ( ) Khác [___]  [Từ chối]
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Lọc | Chờ duyệt / Rủi ro cao / Bị từ chối, có số đếm | SCR-AST-01 |
| Thẻ | 4 ảnh turntable + ảnh trong cảnh (bấm phóng to, phím trái/phải chuyển góc); thông số Pass/Warn/Fail; nguồn và license; vòng duyệt ("vòng 1/2" với rủi ro cao) | FR-AST-31, FR-AST-32, FR-AST-33 |
| Từ chối | Bắt buộc chọn lý do (danh sách SRS-03) hoặc nhập "Khác"; thiếu → ERR-AST-08 | FR-AST-34, ERR-AST-08 |
| Duyệt cả lưới | Chỉ bật khi lưới toàn biến thể nhỏ trong `safeRanges`; hỏi xác nhận "Duyệt {n} biến thể?" | FR-AST-35 |
| Lịch sử duyệt | Liên kết "Lịch sử" trên thẻ: người, thời điểm, quyết định, lý do | FR-AST-34 |
| Quyền | Chủ game và người có quyền Sửa | SRS-03 mục 7.2 |

### WF-AST-02 Kho asset (SCR-AST-02)

Bản gọn ở tab Asset của cột trái (W3): ô tìm, lọc loại, lưới 2 cột thẻ nhỏ kéo thả được. Bản đầy đủ ở chế độ mở rộng (W4):

```text
┌ ← Về xem trước · Kho asset ───────────────────────────────────────────────────┐
│ 🔎 [giếng            ] Loại [Mọi ▾] Phong cách [▾] Nguồn [▾] License [▾] Tri ≤ [▾]│
│ [Nhập CC0 từ URL…]  [Sinh từ recipe…]          [ ] Hiện cả asset ngừng dùng   │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                                            │
│ │[ảnh] │ │[ảnh] │ │[ảnh] │ │[ảnh] │   kéo thả vào xem trước để đặt             │
│ │Giếng │ │Giếng │ │Chum  │ │Thuyền│                                            │
│ │đá v2 │ │gỗ v1 │ │v3    │ │v1    │                                            │
│ │3 game│ │1 game│ │5 game│ │⊘ Ngừng│                                           │
│ └──────┘ └──────┘ └──────┘ └──────┘                                            │
└────────────────────────────────────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Tìm, lọc | Loại, tag phong cách, nguồn, license, mức ngân sách (tri LOD0); mặc định ẩn `NgungDung` | FR-AST-36, FR-AST-38, API-WEB-40 |
| Thẻ | Ảnh, tên, phiên bản, số game dùng; chỉ asset `DaDuyet` kéo được | FR-WEB-23, FR-AST-37 |
| Nhập CC0 từ URL | Hộp: URL, loại; nguồn ngoài danh sách trắng → ERR-AST-01 ngay dưới ô; license sai → ERR-AST-02; xong tạo job `asset` (thẻ job trong chat) | API-WEB-41, ERR-AST-01, ERR-AST-02 |
| Sinh từ recipe | Hộp chọn recipe, số biến thể; hiện **chi phí ước lượng**; vượt ngưỡng xác nhận → hộp "Lô này ước tính {x} USD. Tiếp tục?" | API-WEB-42, FR-AST-39 |
| Ngừng dùng | Menu `⋯` (chủ game sở hữu hoặc quản trị): chọn asset thay thế (tuỳ chọn) → hiện số game bị ảnh hưởng; xoá asset đang dùng không có, thay bằng câu ERR-AST-07 | API-WEB-44, FR-AST-38, ERR-AST-07 |

### WF-CHR-01 Editor NPC (SCR-CHR-01, bảng phải)

```text
┌ NPC ──────────────────────────────── [+ Thêm NPC] ┐
│ Lọc: Zone [z1 ▾] Vai trò [Mọi ▾]  🔎              │
│ Ông lão · Kể chuyện · z1                      ⋯   │
│ Cô bán cá · Bán hàng · z1                     ⋯   │
│ ─ Ông lão ─────────────────────────────────────── │
│ Tên [Ông lão]   Vai trò [Kể chuyện ▾]  [✓] Quan trọng │
│ Ngoại hình  Mô hình [Người già nam ▾]  Áo ■ Quần ■│
│ Hành vi     Mẫu [Đi dạo + kể chuyện ▾] [Sửa sơ đồ…]│
│ Tuần tra    4 điểm  [Vẽ trên cảnh] [Xoá đường]     │
│ Lịch trình  Giờ  · Hoạt động · Vị trí              │
│             06:00 · Ra chợ    · [Chợ nổi ⌖]   ✕    │
│             16:00 · Ngồi quán · [Quán ⌖]      ✕    │
│             [+ Thêm dòng]                          │
│ Hội thoại   [Mở cây thoại →]                       │
│ Chiến đấu   (khi bật) Máu [..] Công [..] Thủ [..] … │
│ [↺ Đặt lại seed] [◷ Tua giờ]                       │
└───────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Danh sách | Lọc zone, vai trò; chọn ↔ tô sáng trong xem trước | SCR-CHR-01 |
| Ngoại hình | Chọn mô hình (chỉ mô hình đã retarget và duyệt; khác → ERR-CHR-02), ô màu trang phục lấy từ bảng màu game | FR-CHR-42, ERR-CHR-02 |
| Hành vi | Chọn mẫu; "Sửa sơ đồ…" mở WF-CHR-03 | FR-CHR-42 |
| Vẽ tuần tra | Chế độ vẽ trên khung xem trước: chạm điểm (bám navmesh, điểm ngoài navmesh tô đỏ), `Enter` xong, `Esc` huỷ; đường hiện mũi tên hướng | FR-CHR-42 |
| Lịch trình | Bảng giờ → hoạt động → vị trí (nút ⌖ chọn trên cảnh); giờ trùng → lỗi dưới dòng | FR-CHR-42 |
| Chiến đấu | Khối chỉ số, `invulnerable`, bảng rơi; chỉ khi bật chiến đấu/săn | FR-CBT-28 |
| Áp nóng | Sửa (trừ mô hình mới) áp ≤ 2 s; "Đặt lại seed", "Tua giờ" để xem hành vi | FR-CHR-44 |
| Vượt ngân sách | Thanh ngân sách nhân vật ở đầu panel; vượt → ERR-CHR-05 (cảnh báo, vẫn lưu) | ERR-CHR-05 |

### WF-CHR-02 Editor động vật (SCR-CHR-02, bảng phải)

```text
┌ Động vật ─────────────────────────── [+ Thêm đàn] ┐
│ Ngân sách nhân vật tier Vừa  ██████░░  38/60       │
│ ▾ Gà (2 đàn)                                       │
│   Gà sân trước · 5–7 con · Sân trước     ⋯         │
│ ▾ Vịt (1 đàn) …                                    │
│ ─ Gà sân trước ─────────────────────────────────── │
│ Loài [Gà ▾]  Vùng [Sân trước ▾] [Vẽ vùng mới]       │
│ Số lượng  tối thiểu [5]  tối đa [7]                │
│ Tính cách [Nhút nhát ▾]  Giờ hoạt động [05:00–18:00]│
└───────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Thanh ngân sách | Số nhân vật hiện / giới hạn tier Vừa; > 100% đỏ + ERR-CHR-05 | FR-CHR-43, ERR-CHR-05 |
| Vùng | Chọn vùng có sẵn hoặc "Vẽ vùng mới" (WF-WLD-02); vùng ngoài navmesh / ngoài nước (cá) → ERR-CHR-06 dưới ô | FR-CHR-43, ERR-CHR-06 |
| Số lượng | min ≤ max, kiểm ngay | FR-CHR-43 |

### WF-CHR-03 Sơ đồ hành vi (SCR-CHR-03, mở rộng)

```text
┌ ← Về xem trước · Hành vi: Ông lão (mẫu "Đi dạo + kể chuyện") ──────────────────┐
│ [+ Trạng thái]  [Kiểm sơ đồ]   ⚠ 1 lỗi                       [Chế độ biểu thức]│
│   ┌──────┐  giờ ≥ 16  ┌──────────┐ người chơi < 3 m ┌──────────┐              │
│   │Đi dạo│──────────▶│ Ngồi quán │─────────────────▶│ Kể chuyện │              │
│   └──────┘◀──────────└──────────┘                   └──────────┘              │
│                            ✕ "Ngủ" không tới được                              │
│ ─ Chuyển "Đi dạo → Ngồi quán" ─  Điều kiện: [Giờ ▾][≥ ▾][16]  [+ và] [+ hoặc]   │
└────────────────────────────────────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Sơ đồ | `@xyflow/react`; kéo nút, nối mũi tên; tự xếp bố cục khi mở lần đầu | SCR-CHR-03, TSD-08 mục 3.1 |
| Điều kiện | Trình dựng dạng form (biến ▾, phép so sánh ▾, giá trị) ở chế độ thường; "Chế độ biểu thức" chỉ cho người dùng nâng cao, sai cú pháp → ERR-CHR-04 | SCR-CHR-03, ERR-CHR-04 |
| Kiểm sơ đồ | Chạy tự động khi sửa; trạng thái không tới được / không lối ra viền đỏ + ERR-CHR-03; danh sách lỗi bấm để nhảy tới nút | SCR-CHR-03, ERR-CHR-03 |

### WF-CBT-02 Bảng cân bằng (SCR-CBT-02, mở rộng, khi bật chiến đấu/săn)

```text
┌ ← Về xem trước · Bảng cân bằng ──────────── [Xuất CSV] [Nhập CSV] [Thử đòn…] ┐
│ [Thực thể] [Vũ khí] [Bảng rơi]                                                 │
│ Tên        │ Máu │ Công │ Thủ │ Tốc độ │ Bất tử │ Bảng rơi                      │
│ Người chơi │ 100 │  10  │  5  │ 1,0    │  [ ]   │ —                             │
│ Lợn rừng   │  60 │  12  │  3  │ 1,2    │  [ ]   │ Thịt ×2                       │
│ Ông lão    │  —  │  —   │  —  │  —     │  [✓]   │ —                             │
│ Thử đòn: Người chơi + Dao rựa → Lợn rừng = 7 sát thương, 9 đòn                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Bảng | CMP-GEN-13 sửa tại ô; giới hạn từng cột từ schema, ngoài khoảng → lỗi dưới ô; áp nóng vào xem trước (`bridge.combat.applyBalance`) | SCR-CBT-02, FR-CBT-28 |
| Thử đòn | Chọn người đánh, vũ khí, mục tiêu → sát thương theo công thức đã chốt `max(1, atk + weapon − def)` và số đòn (`bridge.combat.simulateHit`) | SRS-06 v1.1 mục 2.1 |
| Xuất/Nhập CSV | Nhập: xem trước khác biệt trước khi áp; dòng lỗi liệt kê, không áp phần lỗi | SCR-CBT-02 |

### WF-DLG-01 Editor hội thoại (SCR-DLG-01, mở rộng)

```text
┌ ← Về xem trước · Hội thoại: Ông lão ▾ ─────────────────────────────────────────┐
│ [Kịch bản] [Hồ sơ AI] [Thử nói chuyện] [Kiểm thử]                              │
│ ── Kịch bản ──                         [+ Nút] [✨ Nhờ AI viết nháp]            │
│  (Chào) ──▶ (Hỏi chuyện trâu) ──▶ [lựa chọn 1] ──▶ (Giao nhiệm vụ ★mốc)       │
│                                  └▶ [lựa chọn 2] ──▶ (Tạm biệt)               │
│  ✕ Nút "Giao nhiệm vụ": hành động chi_duong thiếu đích                         │
│ ─ Nút đang chọn ─ Người nói [Ông lão] Lời [______] Điều kiện [+] Hành động [+] │
└────────────────────────────────────────────────────────────────────────────────┘
Thử nói chuyện:  khung chat với NPC · nhãn "thử – tính vào hạn mức của bạn" · 3 gợi ý · ô gõ (khi cho phép)
Kiểm thử:        [Chạy bộ câu] → bảng: câu · loại (đúng vai / phá vai / ngoài phạm vi / mốc chưa tới) · kết quả ✓/✕ · trả lời
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Kịch bản | Sơ đồ cây; thêm nút, lựa chọn, điều kiện, hành động bằng form; lỗi `dialogue.check` hiện ngay trên nút | FR-DLG-29, ERR-DLG-08 |
| Nhờ AI viết nháp | Ô mô tả ngắn → thẻ đề xuất (WF-INT-01) trong panel, chỉ lưu khi duyệt | FR-DLG-31 |
| Hồ sơ AI | Form hồ sơ, danh sách trắng hành động, câu dự phòng; mô hình lớn chỉ chọn được khi quản trị cho phép (tooltip lý do) | FR-DLG-30, FR-DLG-24 |
| Thử nói chuyện | Gắn nhãn "test", tính vào hạn mức người dùng; hết hạn mức → ERR-WEB-05 | FR-DLG-30 |
| Kiểm thử | Chạy bộ câu `qa/dialogue/<npc>.json`; kết quả theo loại câu, câu phá vai bị từ chối hiển thị ✓ | FR-DLG-11 |

### WF-WEB-17 JSON thô (chế độ nâng cao, FR-WEB-29, W4)

```text
┌ ← Về xem trước · JSON: world.json ▾ ───────────────── [Định dạng] [Áp dụng] ┐
│ 1 {                                                                         │
│ 2   "placedObjects": [                                                      │
│ 3     { "id": "gieng-1", "asset": "gieng-da@2",  ⚠ thiếu "position"          │
│ … (Monaco, kiểm schema trực tiếp, gợi ý theo schema)                         │
│ Lỗi (1): /placedObjects/0 cần trường position  [Nhảy tới]                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phần tử | Quy tắc | Nguồn |
|---|---|---|
| Bật chế độ | Menu tài khoản "Chế độ nâng cao" (mặc định tắt); khi tắt, tab `{ } JSON` ẩn | FR-WEB-29 |
| Soạn | Monaco nạp lười; kiểm schema khi gõ; "Áp dụng" vô hiệu khi còn lỗi; áp → diff thành JSON Patch, nguồn `json` | FR-WEB-29, FR-WEB-31 |
| Đồng bộ hai chiều | Sửa ở panel khác khi JSON đang mở: nếu chưa sửa JSON thì tự cập nhật; đã sửa → băng "Dữ liệu vừa đổi ở editor khác. [Tải lại] [Giữ bản đang sửa]" | FR-WEB-29 |

---

## 4. Quy tắc tương tác

| Mã | Quy tắc | Chi tiết |
|---|---|---|
| UXR-INT-01 | Đề xuất nối với cảnh | Rê chuột vào thao tác trong thẻ đề xuất tô sáng đối tượng; bấm tên đối tượng → chọn đối tượng đó sau khi duyệt |
| UXR-WLD-01 | Thanh trượt áp nóng | Cập nhật xem trước tối đa 10 lần/giây khi kéo; chỉ tạo một bước hoàn tác khi thả |
| UXR-CHR-01 | Vẽ trên cảnh | Mọi chế độ vẽ (tuần tra, vị trí lịch trình, vùng) có băng hướng dẫn ở đầu khung xem trước: "Chạm để thêm điểm · Enter xong · Esc huỷ"; tắt gizmo trong lúc vẽ |
| UXR-AST-01 | Asset chưa duyệt | Hiện mờ với huy hiệu "Chờ duyệt", không kéo được; rê chuột: "Cần duyệt trước khi dùng" |
| UXR-DLG-01 | Chi phí khi thử AI | Mọi nút gọi AI trong panel (Thử nói chuyện, Nhờ AI viết nháp, Sinh từ recipe) có chữ phụ "tính vào hạn mức AI" và vô hiệu khi hết hạn mức |

---

## 5. Câu chữ

| Mã | Ngữ cảnh | Câu |
|---|---|---|
| TXT-WLD-01 | Đa giác tự cắt | "Vùng không được tự cắt. Hãy sửa đỉnh." |
| TXT-INT-01 | Style bible sẵn sàng | "Style bible đã sẵn sàng để duyệt." · nút "Mở" |
| TXT-INT-02 | Sinh asset bị chặn | "Cần duyệt style bible trước khi sinh asset hàng loạt." |
| TXT-AST-01 | Asset chưa duyệt | "Cần duyệt trước khi dùng." |
| TXT-CHR-01 | Hướng dẫn vẽ | "Chạm để thêm điểm · Enter xong · Esc huỷ" |
| TXT-DLG-01 | Nhãn thử nói chuyện | "Thử – tính vào hạn mức AI của bạn" |

Câu lỗi SRS dùng nguyên văn: ERR-INT-07, ERR-AST-01, 02, 07, 08, ERR-CHR-02…06, ERR-DLG-08.

---

## 6. Trạng thái và lỗi
Mỗi panel có ba trạng thái CMP-GEN-14. Trạng thái rỗng: NPC "Game chưa có NPC. [+ Thêm NPC] hoặc nhắn cho AI 'thêm một ông lão kể chuyện ở đình'"; Động vật tương tự; Duyệt asset "Không có asset chờ duyệt."; Hội thoại "NPC này chưa có lời thoại." Chế độ chỉ xem: mọi panel thành chỉ đọc, ẩn nút thêm/xoá/vẽ.

---

## 7. Kiểm thử khả dụng

| Mã | Kịch bản | Đạt khi |
|---|---|---|
| UT-CHR-01 | Thêm NPC bán cá ở chợ với đường tuần tra 4 điểm và 2 dòng lịch trình | ≤ 5 phút, NPC đi đúng khi tua giờ |
| UT-WLD-01 | Vẽ vùng "Bãi cỏ" rồi thêm đàn trâu vào vùng đó | ≤ 3 phút |
| UT-AST-01 | Duyệt 3 asset, từ chối 1 với lý do | ≤ 2 phút, không bị chặn vì thiếu lý do mà không hiểu |
| UT-DLG-01 | Viết cây thoại 3 nút bằng form, thử nói chuyện | ≤ 5 phút |

---

## 8. Open item

| Mã | Câu hỏi | Đề xuất UIUX |
|---|---|---|
| OIU-DLG-01 | Tab Hồ sơ AI và Thử nói chuyện khi game `static` | Ẩn hẳn, thay bằng dòng "Hội thoại AI đang tắt trong brief" + liên kết sửa brief |
| OIU-AST-01 | Kho asset bản gọn ở W3 trước khi SCR-AST-02 đầy đủ ở W4 | Có: kéo thả là yêu cầu M ở W3 (FR-WEB-23), nên tab Asset gọn phải có ở W3 |

---

## 9. Truy vết

| SRS | UIUX |
|---|---|
| SCR-INT-01, FR-WEB-12, FR-INT-24, FR-INT-25, FR-INT-26, ERR-INT-07 | WF-INT-01, UXR-INT-01 |
| FR-INT-33, FR-WEB-62 | WF-INT-01 |
| SCR-INT-02, UC-INT-05, FR-INT-20, FR-INT-21, FR-INT-22 | UF-INT-01, WF-INT-02, TXT-INT-01, TXT-INT-02 |
| SCR-WLD-01, FR-WLD-36, FR-WLD-38 | WF-WLD-01, UXR-WLD-01 |
| SCR-WLD-02, FR-WLD-37, FR-WEB-25 | WF-WLD-02, TXT-WLD-01 |
| SCR-AST-01, FR-AST-31, FR-AST-32, FR-AST-33, FR-AST-34, FR-AST-35, ERR-AST-08 | UF-AST-01, WF-AST-01 |
| SCR-AST-02, FR-AST-36, FR-AST-37, FR-AST-38, FR-AST-39, FR-WEB-23, ERR-AST-01, ERR-AST-02, ERR-AST-07 | WF-AST-02, UXR-AST-01, TXT-AST-01 |
| SCR-CHR-01, FR-CHR-42, FR-CHR-44, ERR-CHR-02 | UF-CHR-01, WF-CHR-01, UXR-CHR-01, TXT-CHR-01 |
| SCR-CHR-02, FR-CHR-43, ERR-CHR-05, ERR-CHR-06 | WF-CHR-02 |
| SCR-CHR-03, ERR-CHR-03, ERR-CHR-04 | WF-CHR-03 |
| SCR-CBT-02, FR-CBT-28 | WF-CBT-02, WF-CHR-01 |
| SCR-DLG-01, FR-DLG-29, FR-DLG-30, FR-DLG-31, FR-DLG-11, FR-DLG-24, ERR-DLG-08 | UF-DLG-01, WF-DLG-01, UXR-DLG-01, TXT-DLG-01 |
| FR-WEB-29 | WF-WEB-17 |
| FR-WEB-30, FR-WEB-21, FR-WEB-26 | Mục 1, UXR-CHR-01 |

---

## 10. Lịch sử thay đổi

| Phiên bản | Ngày | Người | Nội dung |
|---|---|---|---|
| 0.1 | 23/11/2026 | Claude | Bản đầu |
| 0.2 | 23/11/2026 | Claude | Đổi phiên bản cùng bộ UIUX v0.2, nội dung không đổi |
| 0.3 | 23/11/2026 | Claude | WF-INT-01: mục "Cập nhật brief" khi đề xuất mở rộng phạm vi (FR-INT-33) và trạng thái khi mở lại game (FR-WEB-62) |
| 1.0 | 23/11/2026 | Huy | Duyệt bộ UIUX (gồm đề xuất trong các mục Open item, luồng làm tiếp/cập nhật game và prototype trong `prototype/`); thay đổi sau đây theo change request |
| 1.1 | 26/11/2026 | Claude | CR-02 (ADR-036): nguồn DDD-08 v1.1; thao tác trên khung xem trước (vẽ, chọn, gizmo, áp nóng) chạy trong Unity player qua `EditorBridge`; hành vi người dùng không đổi |
