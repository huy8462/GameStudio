# SRS-00 Phụ lục A: Ma trận truy vết BRD → SRS

| Mục | Nội dung |
|---|---|
| Mã tài liệu | SRS-00-PL-A |
| Phiên bản | 1.0 |
| Trạng thái | Đã duyệt (Huy, 22/11/2026) |
| Ngày | 22/11/2026 |
| Cách sinh | Sinh tự động bằng `tools/srs-trace.py` từ cột "Nguồn" của bảng yêu cầu chức năng trong SRS-01…09; không sửa tay |

## A.1 Yêu cầu nghiệp vụ tổng quan (BRD-00)

| BR | Yêu cầu (rút gọn) | Ưu tiên | Pha | Yêu cầu chức năng SRS |
|---|---|---|---|---|
| BR-01 | Người dùng tạo game mới bằng cách mô tả bằng lời qua `/new-game` | M | E1 | SRS-01: FR-INT-01, FR-INT-02, FR-INT-03, FR-INT-04, FR-INT-05, FR-INT-07, FR-INT-08, FR-INT-09, FR-INT-10, FR-INT-14, FR-INT-31 |
| BR-02 | Engine hỏi người dùng xác nhận brief trước khi dựng | M | E1 | SRS-01: FR-INT-17, FR-INT-18, FR-INT-19, FR-INT-31, FR-INT-32, FR-INT-33; SRS-08: FR-WEB-67 |
| BR-03 | Engine giữ nguyên thể loại và phong cách người dùng mô tả | M | E1 | SRS-01: FR-INT-06, FR-INT-15, FR-INT-16 |
| BR-04 | Brief nêu rõ asset rủi ro cao về chất lượng (nhân vật, tượng chi tiết…) và cách đầu tư thêm | M | E1 | SRS-01: FR-INT-11 |
| BR-05 | Style bible và bảng màu được chốt từ brief trước khi sản xuất asset | M | E2 | SRS-01: FR-INT-20, FR-INT-21, FR-INT-22 |
| BR-06 | Game được điều khiển bằng file dữ liệu (`game.json`, `world.json`, `palette.json`, `budgets.json`, `entitie… | M | E1 | SRS-01: FR-INT-09; SRS-04: FR-CLI-10, FR-RTM-01, FR-RTM-02; SRS-08: FR-WEB-68 |
| BR-07 | Engine tách khỏi game; mỗi game chỉ chứa dữ liệu, asset và ít script gameplay | M | E1 | SRS-04: FR-CLI-10, FR-RTM-03, FR-RTM-04; SRS-08: FR-WEB-68 |
| BR-08 | Công cụ theo tham số, không chứa giá trị cứng của cảnh | M | E1 | SRS-04: FR-RTM-05 |
| BR-09 | Mọi bước sinh thủ tục là tất định (RNG có seed) | M | E1 | SRS-01: FR-INT-28; SRS-04: FR-RTM-06 |
| BR-10 | Địa hình từ dữ liệu thật (OSM, DEM Copernicus GLO-30) | M | E1 | SRS-02: FR-WLD-05, FR-WLD-06, FR-WLD-07, FR-WLD-08, FR-WLD-14, FR-WLD-15, FR-WLD-16 |
| BR-11 | Địa hình sinh thủ tục và trộn với dữ liệu thật | M | E1 | SRS-02: FR-WLD-09, FR-WLD-10, FR-WLD-11, FR-WLD-12, FR-WLD-13 |
| BR-12 | Nước, thực vật (rừng, cây rải rác, cỏ), bố trí đối tượng theo luật | M | E3–E4 | SRS-02: FR-WLD-17, FR-WLD-18, FR-WLD-19, FR-WLD-20, FR-WLD-21, FR-WLD-22, FR-WLD-23, FR-WLD-24 |
| BR-13 | Bake ánh sáng và thời điểm trong ngày là tính năng lõi | M | E5 | SRS-02: FR-WLD-28, FR-WLD-29, FR-WLD-30, FR-WLD-31, FR-WLD-32 |
| BR-14 | Hiệu ứng môi trường: sương, hậu kỳ, hạt, thời tiết, bầu trời | S | E3 | SRS-02: FR-WLD-33, FR-WLD-34, FR-WLD-35 |
| BR-15 | Asset 3D theo thứ tự ưu tiên: mô hình CC0 → generator code → chỉnh CC0 | M | E4 | SRS-03: FR-AST-02 |
| BR-16 | Nhập mô hình CC0: kiểm license, chuẩn hoá scale/pivot/trục, decimate, LOD, đồng bộ vật liệu, gắn khung xươn… | M | E4 | SRS-03: FR-AST-01, FR-AST-02, FR-AST-03, FR-AST-04, FR-AST-05, FR-AST-06 |
| BR-17 | Generator tham số viết một lần cho mỗi họ asset; biến thể chỉ là JSON tham số + seed | M | E4 | SRS-03: FR-AST-07, FR-AST-08, FR-AST-09, FR-AST-10, FR-AST-11, FR-AST-12 |
| BR-18 | Vật liệu ba nguồn: thủ tục, scan CC0, texture sinh bằng Gemini; HDRI CC0 | M | E2 | SRS-03: FR-AST-14, FR-AST-15, FR-AST-16, FR-AST-17, FR-AST-18, FR-AST-19 |
| BR-19 | Âm thanh môi trường và hiệu ứng sinh bằng ElevenLabs | S | E6 | SRS-03: FR-AST-20, FR-AST-21, FR-AST-23, FR-AST-24, FR-AST-25 |
| BR-20 | Cổng duyệt asset: ảnh turntable 4 góc cộng thông số (tri, vật liệu, texture) | M | E4 | SRS-03: FR-AST-31, FR-AST-32, FR-AST-33, FR-AST-35 |
| BR-21 | Mọi asset có provenance sidecar (nguồn/công thức, tham số, seed, phiên bản generator; hoặc URL, tác giả, li… | M | E2 | SRS-03: FR-AST-26, FR-AST-27, FR-AST-28, FR-AST-29 |
| BR-22 | Hệ tier chất lượng Thấp / Vừa / Cao / Tối đa, chọn tự động | M | E1 | SRS-04: FR-RTM-07, FR-RTM-08 |
| BR-23 | Ngân sách hiệu năng trong `budgets.json` theo số đã kiểm chứng trên A56 | M | E0 | SRS-04: FR-RTM-12, FR-RTM-13, FR-RTM-14 |
| BR-24 | Stream theo zone; đóng gói theo zone và tier | M | E2 | SRS-02: FR-WLD-01, FR-WLD-02, FR-WLD-03, FR-WLD-04; SRS-04: FR-CLI-04, FR-RTM-09, FR-RTM-10, FR-RTM-11 |
| BR-25 | Điều khiển cảm ứng và safe area cho mobile; flycam/orbit cho dev | M | E2 | SRS-04: FR-RTM-15, FR-RTM-16, FR-RTM-17 |
| BR-26 | Tương tác, sự kiện, hội thoại điều khiển bằng dữ liệu; HUD, menu | M | E6 | SRS-04: FR-RTM-18, FR-RTM-19, FR-RTM-20, FR-RTM-21, FR-RTM-22; SRS-07: FR-DLG-02 |
| BR-27 | Mọi bước build trả báo cáo JSON (tri, draw, vật liệu, dung lượng, thời gian, pass/fail) | M | E1 | SRS-04: FR-QA-01 |
| BR-28 | QA hai mức: nhẹ (mặc định) và đầy đủ (trước cổng lớn) | M | E1 | SRS-04: FR-QA-02, FR-QA-03; SRS-09: FR-DEV-25 |
| BR-29 | Bằng chứng rẻ: ảnh từ game đang chạy, báo cáo hiệu năng JSON, visual regression so baseline | M | E1–E3 | SRS-04: FR-QA-04, FR-QA-05, FR-QA-06, FR-QA-10 |
| BR-30 | Đo hiệu năng trên Galaxy A56 thật ở mọi cổng có đo hiệu năng | M | E0 | SRS-04: FR-QA-07 |
| BR-31 | Bot playtest tự động | S | E6 | SRS-04: FR-QA-08 |
| BR-32 | `.claude/` gọn: 6–8 agent, 10–15 skill engine trên nền bộ gốc, rule theo đường dẫn, ít hook | M | E0 | SRS-09: FR-DEV-01, FR-DEV-02, FR-DEV-03, FR-DEV-04, FR-DEV-26, FR-DEV-27 |
| BR-33 | Quy trình nhẹ mặc định (`rigor: minimal`) đến khi có vòng chơi; nâng độ chặt theo từng hệ thống | M | E0 | SRS-09: FR-DEV-05, FR-DEV-06 |
| BR-34 | Làm việc qua phiếu phạm vi hẹp, mỗi phiếu có dòng "Mô hình khuyến nghị" | M | E0 | SRS-09: FR-DEV-07, FR-DEV-08 |
| BR-35 | Cổng duyệt theo pha (G-E0…G-E8); cổng là lời "xác nhận" của Huy; publish không đồng nghĩa với duyệt | M | E0 | SRS-04: FR-CLI-07; SRS-09: FR-DEV-09, FR-DEV-10 |
| BR-36 | Ghi ADR cho các quyết định kiến trúc | M | E0 | SRS-09: FR-DEV-11 |
| BR-37 | Ghi mọi thay đổi so với bộ gốc vào `UPSTREAM.md` | M | E0 | SRS-09: FR-DEV-12, FR-DEV-13 |
| BR-38 | Hook chặn đọc nguyên file .md lớn (> khoảng 40 KB, trả heading) và file nhị phân/log dài | M | E0 | SRS-09: FR-DEV-18, FR-DEV-19, FR-DEV-21, FR-DEV-26 |
| BR-39 | `CLAUDE.md` ngắn (< khoảng 150 dòng) | M | E0 | SRS-09: FR-DEV-14 |
| BR-40 | Build tăng dần, cache theo hash | M | E2 | SRS-02: FR-WLD-30; SRS-04: FR-CLI-01, FR-CLI-02, FR-CLI-03, FR-CLI-04, FR-CLI-08, FR-CLI-09; SRS-08: FR-WEB-63 |
| BR-41 | `/handoff` lưu ghi chú dự án gọn; `/clear` giữa các phiếu | S | E0 | SRS-09: FR-DEV-15, FR-DEV-16 |
| BR-42 | MCP xem cảnh chỉ dùng khi debug | S | Mọi pha | SRS-09: FR-DEV-17 |
| BR-43 | Khoá API (Gemini, ElevenLabs) để trong biến môi trường; không in giá trị; hook chặn đọc `.env` | M | E0 | SRS-08: FR-WEB-43; SRS-09: FR-DEV-22, FR-DEV-23 |
| BR-44 | Giữ LICENSE và thông báo bản quyền MIT của bộ gốc; ghi công | M | E0 | SRS-09: FR-DEV-13 |
| BR-45 | Tuân thủ license dữ liệu địa hình (OSM ODbL, Copernicus) và CC0 | M | E1 | SRS-02: FR-WLD-39, FR-WLD-40; SRS-09: FR-DEV-24 |
| BR-46 | Cố định phiên bản Blender và add-on; `engine doctor` kiểm tra môi trường | M | E0 | SRS-08: FR-WEB-45; SRS-09: FR-DEV-20 |
| BR-47 | Nhân vật người chơi khai báo bằng dữ liệu (`entities/player.json`): ngoại hình, tỷ lệ, trang phục, tốc độ đ… | M | E2 | SRS-05: FR-CHR-01 |
| BR-48 | Góc nhìn ngôi thứ nhất hoặc ngôi thứ ba, chọn theo `game.json`; camera ngôi ba tránh xuyên tường và địa hình | M | E2 | SRS-05: FR-CHR-02, FR-CHR-03 |
| BR-49 | Điều khiển: joystick ảo và chạm trên mobile; bàn phím, chuột trên desktop. Hành động cơ bản: đứng, đi, chạy… | M | E2 | SRS-05: FR-CHR-04, FR-CHR-05, FR-CHR-06 |
| BR-50 | Va chạm và bám địa hình: không xuyên công trình, cây lớn, NPC; đi được trên dốc trong giới hạn; không rơi k… | M | E2 | SRS-05: FR-CHR-07, FR-CHR-08, FR-CHR-09 |
| BR-51 | Animation người chơi dùng **khung xương người dùng chung**; chuyển trạng thái mượt (blend đứng → đi → chạy)… | M | E4 | SRS-05: FR-CHR-10 |
| BR-52 | Âm thanh bước chân theo loại bề mặt (đất, cỏ, đá, gỗ, nước) | S | E6 | SRS-05: FR-CHR-11 |
| BR-53 | Tuỳ biến ngoại hình người chơi trong game (chọn trang phục, màu…) | C | Sau E7 | SRS-05: FR-CHR-12 |
| BR-54 | NPC người khai báo bằng dữ liệu (`entities/npc/*.json`): ngoại hình (từ bộ khối tham số hoặc mô hình CC0), … | M | E6 | SRS-05: FR-CHR-13, FR-CHR-14 |
| BR-55 | Hành vi NPC theo mô hình trạng thái khai báo trong dữ liệu, tối thiểu: đứng yên/làm việc tại chỗ, đi tuần t… | M | E6 | SRS-05: FR-CHR-15, FR-CHR-16, FR-CHR-17 |
| BR-56 | NPC tìm đường trên mặt đất đi được, tránh vật cản, tránh nhau và tránh người chơi; không đi xuyên công trình | M | E6 | SRS-05: FR-CHR-18, FR-CHR-19, FR-CHR-20 |
| BR-57 | Hội thoại với NPC theo kịch bản dữ liệu: lời thoại, lựa chọn, điều kiện, sự kiện kích hoạt; hiển thị bằng U… | M | E6 | SRS-07: FR-DLG-02, FR-DLG-03, FR-DLG-04, FR-DLG-05, FR-DLG-06 |
| BR-58 | Lịch trình theo thời điểm trong ngày (đi làm, về nhà, ngủ) gắn với hệ thời gian của `lighting` | S | E6 | SRS-05: FR-CHR-21 |
| BR-59 | Đám đông ở xa (ví dụ người đi lễ, người ở chợ) dùng LOD thấp, animation instancing hoặc impostor | S | E7 | SRS-05: FR-CHR-22 |
| BR-60 | Giọng nói NPC (sinh bằng ElevenLabs) cho lời thoại chính | C | Sau E6 | SRS-05: FR-CHR-23; SRS-07: FR-DLG-27 |
| BR-61 | Thư viện họ động vật như bảng trên; mỗi họ một khung xương và bộ animation dùng chung; thêm loài mới trong … | M | E4 | SRS-05: FR-CHR-24, FR-CHR-25, FR-CHR-41 |
| BR-62 | Nguồn asset động vật theo QĐ-12: mô hình CC0 hợp phong cách trước, generator code sau; retarget về khung xư… | M | E4 | SRS-03: FR-AST-06; SRS-05: FR-CHR-30 |
| BR-63 | Hành vi thú nuôi (chó, mèo, lợn, trâu, bò…): lang thang trong vùng, ăn, nằm nghỉ, đi theo đàn; phản ứng với… | M | E6 | SRS-05: FR-CHR-26, FR-CHR-27, FR-CHR-29 |
| BR-64 | Gia cầm (gà, vịt): đi kiếm ăn theo nhóm, mổ đất, chạy tán loạn và vỗ cánh khi người chơi chạy tới; về chuồn… | S | E6 | SRS-05: FR-CHR-31 |
| BR-65 | Chim trời: bay theo đàn (luật boids), đậu trên cây, mái, dây; bay lên khi người chơi lại gần; ở xa chuyển s… | S | E6 | SRS-05: FR-CHR-32 |
| BR-66 | Cá: bơi theo đàn trong vùng nước do module `water` khai báo, không ra khỏi nước; né khi người chơi tới gần … | S | E6 | SRS-05: FR-CHR-33 |
| BR-67 | Âm thanh động vật (chó sủa, mèo kêu, gà gáy, bò rống, lợn ủn ỉn, chim hót…) phát theo khoảng cách và hành v… | S | E6 | SRS-03: FR-AST-22; SRS-05: FR-CHR-28 |
| BR-68 | Người chơi tương tác với động vật qua điểm tương tác dữ liệu (vuốt ve, cho ăn, dắt trâu, thả cá…) | C | Sau E6 | SRS-05: FR-CHR-34 |
| BR-69 | Mật độ và vị trí xuất hiện (spawn) của NPC, động vật khai báo bằng dữ liệu theo zone, vùng, thời điểm trong… | M | E6 | SRS-02: FR-WLD-25, FR-WLD-26, FR-WLD-27; SRS-05: FR-CHR-35 |
| BR-70 | Ngân sách nhân vật theo tier trong `budgets.json`: số nhân vật cận cảnh chi tiết, số nhân vật có skinning c… | M | E4 | SRS-05: FR-CHR-36 |
| BR-71 | LOD nhân vật 3 mức (cận, vừa, xa) cộng impostor/hạt cho đàn ở xa; **LOD hành vi**: NPC và động vật ngoài tầ… | M | E6 | SRS-05: FR-CHR-37 |
| BR-72 | Hành vi dùng RNG có seed để bot playtest và visual regression lặp lại được | M | E6 | SRS-05: FR-CHR-38 |
| BR-73 | Phong cách tất cả nhân vật và động vật bám đúng mô tả người dùng; brief ghi rõ loài và nhân vật nào rủi ro … | M | E1 | SRS-01: FR-INT-11, FR-INT-12; SRS-05: FR-CHR-39 |
| BR-74 | Không cấp phát bộ nhớ trong vòng lặp hành vi và animation (theo rule `engine/runtime/**`) | M | E6 | SRS-04: FR-RTM-23; SRS-05: FR-CHR-40 |
| BR-75 | `/new-game` nhận diện yêu cầu chiến đấu/săn bắt trong mô tả và ghi vào `game.json` (bật/tắt, kiểu chiến đấu… | M | E1 | SRS-01: FR-INT-13; SRS-06: FR-CBT-01, FR-CBT-02 |
| BR-76 | Module chiến đấu tuỳ chọn, tách riêng, chỉ đóng gói khi bật; game không bật không chịu chi phí tải hay hiệu… | M | Khi game cần (sớm nhất E6) | SRS-06: FR-CBT-03, FR-CBT-04 |
| BR-77 | Chỉ số khai báo bằng dữ liệu cho người chơi, NPC, động vật: máu, sát thương, phòng thủ, tầm đánh, tốc độ đá… | M | Khi game cần | SRS-06: FR-CBT-05, FR-CBT-06, FR-CBT-07, FR-CBT-08 |
| BR-78 | Hành động chiến đấu cơ bản: tấn công cận chiến và/hoặc tầm xa, né/đỡ, trúng đòn, ngã/gục; điều khiển dùng đ… | M | Khi game cần | SRS-06: FR-CBT-09, FR-CBT-10, FR-CBT-11 |
| BR-79 | Hành vi chiến đấu của NPC và động vật thêm vào máy trạng thái: tuần tra, phát hiện, truy đuổi, tấn công, bỏ… | M | Khi game cần | SRS-06: FR-CBT-12, FR-CBT-13, FR-CBT-14, FR-CBT-15 |
| BR-80 | Săn bắt: theo dấu, động vật cảnh giác (nghe, nhìn, đánh hơi), bỏ chạy theo đàn, thu chiến lợi phẩm/vật phẩm… | S | Khi game cần | SRS-06: FR-CBT-16, FR-CBT-17, FR-CBT-18, FR-CBT-19 |
| BR-81 | Kết quả chiến đấu và săn bắt: hồi sinh người chơi, hồi sinh/tái xuất hiện NPC và động vật theo luật dữ liệu… | S | Khi game cần | SRS-06: FR-CBT-20, FR-CBT-21, FR-CBT-22, FR-CBT-23 |
| BR-82 | Phản hồi chiến đấu: hiệu ứng trúng đòn, âm thanh, rung (nếu thiết bị hỗ trợ), HUD máu | S | Khi game cần | SRS-06: FR-CBT-24, FR-CBT-25 |
| BR-83 | Ngân sách chiến đấu theo tier: số đối thủ tấn công cùng lúc, số đạn/hiệu ứng cùng lúc | M | Khi game cần | SRS-06: FR-CBT-26 |
| BR-84 | Chế độ hội thoại khai báo theo game và theo NPC trong dữ liệu (`static` / `ai` / `hybrid`) | M | E6 | SRS-07: FR-DLG-01, FR-DLG-12, FR-DLG-13 |
| BR-85 | Mỗi NPC dùng AI có hồ sơ nhân vật trong dữ liệu: tính cách, giọng văn, kiến thức được biết, điều không được… | M | E6 | SRS-07: FR-DLG-07, FR-DLG-08, FR-DLG-09, FR-DLG-10, FR-DLG-11 |
| BR-86 | Khoá API của dịch vụ AI không bao giờ nằm trong mã phía trình duyệt; gọi qua một proxy mỏng giữ khoá, giới … | M | E6 | SRS-07: FR-DLG-14, FR-DLG-15, FR-DLG-16, FR-DLG-17 |
| BR-87 | Dự phòng: khi mất mạng, lỗi, chậm quá ngưỡng (đề xuất 3 s) hoặc hết hạn mức thì NPC chuyển sang câu kịch bả… | M | E6 | SRS-07: FR-DLG-18, FR-DLG-19, FR-DLG-20 |
| BR-88 | Kiểm soát nội dung và chi phí: lọc nội dung không phù hợp, giới hạn token mỗi lượt và mỗi phiên chơi, hạn m… | M | E6 | SRS-07: FR-DLG-21, FR-DLG-22, FR-DLG-23, FR-DLG-24, FR-DLG-25; SRS-08: FR-WEB-56 |
| BR-89 | Lời thoại AI có thể đọc bằng giọng nói sinh khi chạy (ElevenLabs) | C | Sau E6 | SRS-07: FR-DLG-28 |
| BR-90 | Đăng nhập bằng tài khoản được mời (không đăng ký tự do) | M | W1 | SRS-08: FR-WEB-01, FR-WEB-02, FR-WEB-03 |
| BR-91 | Vai trò: quản trị, người tạo game, người xem/chơi; quyền theo từng game (chủ sở hữu, được sửa, chỉ xem) | M | W1 | SRS-08: FR-WEB-04, FR-WEB-05, FR-WEB-54, FR-WEB-59 |
| BR-92 | Hạn mức theo người dùng: token AI, số job build, dung lượng lưu trữ; quản trị xem được mức dùng và chi phí | M | W2 | SRS-01: FR-INT-30; SRS-03: FR-AST-39; SRS-08: FR-WEB-06, FR-WEB-07 |
| BR-93 | Người dùng mô tả game bằng chat; hệ thống sinh `game-brief.md` và bộ dữ liệu khởi tạo như `/new-game`, hiển… | M | W1 | SRS-01: FR-INT-29, FR-INT-34; SRS-08: FR-WEB-10, FR-WEB-11, FR-WEB-62 |
| BR-94 | Sửa game bằng lời ("thêm đàn trâu ở bờ ruộng", "đổi trời sang hoàng hôn"); AI đề xuất thay đổi dữ liệu dưới… | M | W3 | SRS-01: FR-INT-23, FR-INT-24, FR-INT-25, FR-INT-26, FR-INT-33; SRS-08: FR-WEB-12, FR-WEB-13, FR-WEB-62 |
| BR-95 | Hiển thị tiến độ job (sinh dữ liệu, build zone, QA) và kết quả: báo cáo ngân sách, ảnh chụp, cảnh báo | M | W2 | SRS-08: FR-WEB-14 |
| BR-96 | Asset rủi ro cao và cổng duyệt (turntable, animation) hiện thành màn hình duyệt trên web | M | W3 | SRS-03: FR-AST-34; SRS-08: FR-WEB-15 |
| BR-97 | Khung xem trước nhúng engine runtime, mở bản build mới nhất của game; chế độ bay tự do và chế độ người chơi | M | W2 | SRS-08: FR-WEB-16, FR-WEB-18 |
| BR-98 | Cập nhật nóng: thay đổi dữ liệu không cần build lại (vị trí, thông số NPC, hội thoại, ánh sáng runtime) hiể… | M | W3 | SRS-08: FR-WEB-17 |
| BR-99 | Giả lập tier và khung điện thoại; hiển thị chỉ số hiệu năng (fps, draw call, tri) so với ngân sách A56 | S | W2 | SRS-08: FR-WEB-20 |
| BR-100 | Mã QR / link để mở bản xem trước trên điện thoại thật | S | W2 | SRS-08: FR-WEB-19 |
| BR-101 | Chỉnh cảnh: chọn, di chuyển, xoay, co giãn đối tượng; đặt đối tượng từ thư viện asset; bám địa hình; vẽ vùn… | M | W3 | SRS-02: FR-WLD-37; SRS-08: FR-WEB-21, FR-WEB-22, FR-WEB-23, FR-WEB-25, FR-WEB-30, FR-WEB-61 |
| BR-102 | Chỉnh NPC người: ngoại hình, vai trò, hành vi (máy trạng thái dạng form hoặc sơ đồ), đường đi tuần, lịch tr… | M | W3 | SRS-05: FR-CHR-42, FR-CHR-44; SRS-06: FR-CBT-28; SRS-07: FR-DLG-29, FR-DLG-30, FR-DLG-31; SRS-08: FR-WEB-30 |
| BR-103 | Chỉnh động vật: chọn họ và loài, kích thước/màu, tính cách, đàn (số lượng, vùng), lịch theo giờ | M | W3 | SRS-05: FR-CHR-43; SRS-08: FR-WEB-30 |
| BR-104 | Chỉnh môi trường mức tham số: địa hình (nguồn DEM/thủ tục, tham số noise), thực vật (mật độ, loài cây), nướ… | S | W4 | SRS-02: FR-WLD-36, FR-WLD-37, FR-WLD-38; SRS-08: FR-WEB-30 |
| BR-105 | Hoàn tác/làm lại, kiểm hợp lệ theo schema khi lưu, cảnh báo vượt ngân sách | M | W3 | SRS-08: FR-WEB-24, FR-WEB-26, FR-WEB-27, FR-WEB-28 |
| BR-106 | Chế độ xem dữ liệu thô (JSON) cho người dùng nâng cao, có kiểm schema | C | W4 | SRS-08: FR-WEB-29 |
| BR-107 | Thư viện game của người dùng: tạo, nhân bản, đổi tên, lưu trữ (archive), xoá | M | W1 | SRS-08: FR-WEB-08, FR-WEB-09, FR-WEB-60 |
| BR-108 | Lịch sử phiên bản cho dữ liệu game; xem khác biệt, khôi phục phiên bản cũ; mỗi lần sửa bằng chat hoặc edito… | M | W2 | SRS-08: FR-WEB-31, FR-WEB-32, FR-WEB-33, FR-WEB-64, FR-WEB-69 |
| BR-109 | Kho asset dùng chung giữa các game, giữ provenance; asset của game này dùng lại được cho game khác | S | W4 | SRS-03: FR-AST-36, FR-AST-37, FR-AST-38; SRS-08: FR-WEB-57 |
| BR-110 | Chia sẻ: mời người khác sửa hoặc chỉ xem một game; tạo link chơi thử (có thể đặt hạn, thu hồi) | M | W4 | SRS-08: FR-WEB-35, FR-WEB-36, FR-WEB-55, FR-WEB-59, FR-WEB-65 |
| BR-111 | Xuất bản bản build tĩnh của game (một zone hoặc toàn bộ) ra link cố định để chơi trên điện thoại; publish k… | M | W4 | SRS-04: FR-CLI-05, FR-CLI-06, FR-CLI-12; SRS-08: FR-WEB-37, FR-WEB-38, FR-WEB-55, FR-WEB-64 |
| BR-112 | Xuất/nhập gói game (dữ liệu + asset + provenance) để dùng với Claude Code/CLI hoặc sao lưu | S | W4 | SRS-01: FR-INT-32; SRS-04: FR-CLI-11; SRS-08: FR-WEB-34, FR-WEB-66, FR-WEB-67, FR-WEB-69; SRS-09: FR-DEV-27 |
| BR-113 | Màn hình credit/ghi công tự sinh từ provenance (OSM, CC0, MIT…) trong bản xuất bản | M | W4 | SRS-03: FR-AST-30; SRS-08: FR-WEB-39, FR-WEB-57, FR-WEB-66 |
| BR-114 | Hàng đợi job build chạy pipeline trên worker có Blender headless cố định phiên bản; tận dụng cache theo has… | M | W2 | SRS-08: FR-WEB-40, FR-WEB-41, FR-WEB-45, FR-WEB-52, FR-WEB-61, FR-WEB-63 |
| BR-115 | Cổng AI dùng chung: Claude API (sinh/sửa game, hội thoại NPC), Gemini, ElevenLabs; khoá chỉ ở server; giới … | M | W1 | SRS-07: FR-DLG-17; SRS-08: FR-WEB-42, FR-WEB-43 |
| BR-116 | Sao lưu định kỳ CSDL và kho asset; khôi phục được | M | W2 | SRS-08: FR-WEB-44 |
| BR-117 | Bảo mật web cơ bản: HTTPS, chống các lỗi phổ biến (OWASP Top 10), cách ly dữ liệu giữa người dùng, không th… | M | W1 | SRS-08: FR-WEB-46, FR-WEB-47, FR-WEB-49, FR-WEB-53 |
| BR-118 | Đo và báo thời gian phản hồi của web và thời gian job | S | W2 | SRS-08: FR-WEB-48, FR-WEB-51, FR-WEB-54, FR-WEB-56, FR-WEB-58 |
| BR-119 | Mở lại game thấy ngay giai đoạn tiến độ, việc đã xong, việc còn treo và việc tiếp theo; tiến độ tính lại từ… | M | E1, W2 | SRS-01: FR-INT-34; SRS-04: FR-CLI-08; SRS-08: FR-WEB-60, FR-WEB-61 |
| BR-120 | Làm tiếp game đang dở: phiên mô tả bỏ dở tiếp đúng chỗ; ngữ cảnh chat và đề xuất còn hiệu lực được giữ; job… | M | E1, W2 | SRS-01: FR-INT-31; SRS-08: FR-WEB-61, FR-WEB-62 |
| BR-121 | Cập nhật game đã có (thêm zone, NPC, loài, nhiệm vụ, tính năng tuỳ chọn) qua đề xuất có duyệt, ghi thành br… | M | W3, W4 | SRS-01: FR-INT-33 |
| BR-122 | Nhập game có sẵn (thư mục Claude Code, gói zip, game làm tay): kiểm cấu trúc, schema, provenance, phiên bản… | M | E1, W4 | SRS-01: FR-INT-32; SRS-04: FR-CLI-11; SRS-08: FR-WEB-66, FR-WEB-67, FR-WEB-69 |
| BR-123 | Build lại phần thay đổi bằng một thao tác; không làm lại việc đã xong (brief, style, asset đã duyệt, cache … | M | E1, W2 | SRS-04: FR-CLI-09; SRS-08: FR-WEB-63 |
| BR-124 | Nâng cấp game lên engine/schema mới trên bản sao, so ảnh trước/sau; lỗi thì giữ nguyên bản cũ | S | E3, W4 | SRS-04: FR-CLI-10; SRS-08: FR-WEB-68 |
| BR-125 | Xuất bản bản mới không ghi đè bản cũ, kèm tóm tắt thay đổi; link chơi thử chọn cố định (mặc định) hoặc mới … | M | W4 | SRS-04: FR-CLI-12; SRS-08: FR-WEB-64, FR-WEB-65 |
| BR-126 | Claude Code có `/resume-game` và `/import-game`; ghi chú handoff theo từng game để phiên sau làm tiếp với í… | M | E1 | SRS-09: FR-DEV-26, FR-DEV-27 |

## A.2 Yêu cầu chi tiết (BRD-01…09)

| BR chi tiết | BRD | Yêu cầu (rút gọn) | Ưu tiên | Yêu cầu chức năng SRS |
|---|---|---|---|---|
| BR-01.1 | BRD-01 | Nhận mô tả dạng văn bản tự do, tiếng Việt hoặc tiếng Anh, độ dài từ một câu tới vài trang | M | SRS-01: FR-INT-01 |
| BR-01.2 | BRD-01 | Cho phép đính kèm ảnh tham chiếu (concept, ảnh chụp bối cảnh) để bổ sung phong cách; ảnh chỉ dùng… | S | SRS-01: FR-INT-02 |
| BR-01.3 | BRD-01 | Trích xuất các trường bắt buộc của brief (bảng 6.1); trường nào không suy ra được thì hỏi làm rõ | M | SRS-01: FR-INT-03 |
| BR-01.4 | BRD-01 | Câu hỏi làm rõ tối đa 5 câu mỗi vòng, mỗi câu có phương án mặc định để người dùng chỉ cần bấm đồng ý | M | SRS-01: FR-INT-04 |
| BR-01.5 | BRD-01 | Cho phép người dùng bỏ qua hỏi làm rõ; khi đó dùng mặc định và đánh dấu "giả định" trong brief | S | SRS-01: FR-INT-05 |
| BR-01.6 | BRD-01 | Nhận diện mô tả có địa danh thật để đề xuất nguồn địa hình thật (OSM/DEM) hay thủ tục (QĐ-05) | M | SRS-01: FR-INT-07 |
| BR-01.7 | BRD-01 | Sinh `game-brief.md` **một trang** theo mẫu cố định (bảng 6.1) | M | SRS-01: FR-INT-08 |
| BR-01.8 | BRD-01 | Sinh `game.json`, `world.json`, `palette.json`, `budgets.json` (lấy mặc định A56), và khung `enti… | M | SRS-01: FR-INT-09 |
| BR-01.9 | BRD-01 | Mọi file sinh ra hợp lệ theo schema; lỗi schema thì tự sửa trước khi trình người dùng | M | SRS-01: FR-INT-10 |
| BR-01.10 | BRD-01 | Ước lượng sơ bộ: số zone, mức tải hình học so với ngân sách A56, cảnh báo nếu mô tả có khả năng v… | S | SRS-01: FR-INT-14 |
| BR-02.1 | BRD-01 | Không job build nào chạy khi brief chưa ở trạng thái "Đã xác nhận" | M | SRS-01: FR-INT-17 |
| BR-02.2 | BRD-01 | Xác nhận tạo phiên bản brief có số (v1, v2…), ghi người xác nhận và thời điểm | M | SRS-01: FR-INT-18 |
| BR-02.3 | BRD-01 | Sửa brief sau khi đã xác nhận tạo phiên bản mới; hệ thống liệt kê phần nào đã build bị ảnh hưởng … | M | SRS-01: FR-INT-19, FR-INT-33 |
| BR-03.1 | BRD-01 | Không đổi thể loại, bối cảnh, thời đại, phong cách mỹ thuật, giọng điệu so với mô tả | M | SRS-01: FR-INT-15 |
| BR-03.2 | BRD-01 | Mọi ý tưởng thêm của AI chỉ ghi ở mục "Gợi ý (chưa áp dụng)" trong brief; chỉ áp dụng khi người d… | M | SRS-01: FR-INT-15 |
| BR-03.3 | BRD-01 | Khi mô tả mâu thuẫn (ví dụ "hiện thực" nhưng "nhân vật chibi"), hỏi lại thay vì tự chọn | M | SRS-01: FR-INT-06 |
| BR-03.4 | BRD-01 | Lưu nguyên văn mô tả gốc cùng brief để đối chiếu về sau | M | SRS-01: FR-INT-16 |
| BR-04.1 | BRD-01 | Brief có mục "Asset rủi ro cao": liệt kê nhân vật, tượng, động vật, vật thể hữu cơ chi tiết, kèm … | M | SRS-01: FR-INT-11 |
| BR-05.1 | BRD-01 | Sinh style bible từ brief: phong cách hình khối, chất liệu chủ đạo, ánh sáng, mức chi tiết, tham … | M | SRS-01: FR-INT-20 |
| BR-05.2 | BRD-01 | Sinh `palette.json`: 8–16 màu chính, có vai trò (nền, nhấn, UI, ánh sáng) | M | SRS-01: FR-INT-21 |
| BR-05.3 | BRD-01 | Style bible và bảng màu phải được duyệt trước khi sinh asset hàng loạt; sau khi duyệt, đổi phong … | M | SRS-01: FR-INT-22 |
| BR-06.1 | BRD-04 | Có schema cho mọi file dữ liệu game; runtime từ chối nạp dữ liệu sai schema và báo lỗi rõ chỗ sai | M | SRS-04: FR-RTM-01 |
| BR-06.2 | BRD-04 | Schema có phiên bản; có bộ chuyển đổi dữ liệu cũ lên phiên bản mới | M | SRS-04: FR-CLI-10, FR-RTM-02; SRS-08: FR-WEB-68 |
| BR-07.1 | BRD-04 | Engine là gói thư viện có phiên bản; game khai báo phiên bản engine dùng | M | SRS-04: FR-CLI-10, FR-RTM-03; SRS-08: FR-WEB-68 |
| BR-07.2 | BRD-04 | Script gameplay riêng của game (nếu có) chỉ dùng API công khai của engine | M | SRS-04: FR-RTM-04 |
| BR-09.1 | BRD-04 | RNG có seed cho runtime (spawn, hành vi) và build; chế độ test cố định thời gian khung hình | M | SRS-04: FR-RTM-06 |
| BR-10.1 | BRD-02 | Nhập khung toạ độ (bbox) hoặc tên địa danh; tải DEM Copernicus GLO-30 và dữ liệu OSM (đường, sông… | M | SRS-02: FR-WLD-05 |
| BR-10.2 | BRD-02 | Dữ liệu tải về được lưu cache cục bộ kèm ngày tải và license; không tải lại khi bbox không đổi | M | SRS-02: FR-WLD-06 |
| BR-10.3 | BRD-02 | Cho phép phóng đại độ cao và làm mượt có tham số | S | SRS-02: FR-WLD-07 |
| BR-10.4 | BRD-02 | Vector OSM chuyển thành mask (đường, nước, ruộng, rừng) và đường cong để module khác dùng | M | SRS-02: FR-WLD-08 |
| BR-10.5 | BRD-02 | Chia chunk, LOD theo khoảng cách, không nứt mép giữa các LOD | M | SRS-02: FR-WLD-14 |
| BR-10.6 | BRD-02 | Splat map tự sinh từ độ dốc, độ cao, mask OSM; tối đa số lớp vật liệu theo tier | M | SRS-02: FR-WLD-15 |
| BR-10.7 | BRD-02 | Loại bề mặt (đất, cỏ, đá, cát, bùn, nước nông) ghi vào dữ liệu để dùng cho âm bước chân và hành v… | M | SRS-02: FR-WLD-16 |
| BR-11.1 | BRD-02 | Sinh địa hình từ tham số: kiểu (đồng bằng, đồi, núi, ven biển, thung lũng), độ cao tối đa, độ gồ … | M | SRS-02: FR-WLD-09 |
| BR-11.2 | BRD-02 | Có thể vẽ hoặc khai báo các yếu tố chính (sông, đường, hồ, đồi) để generator bám theo | S | SRS-02: FR-WLD-10 |
| BR-11.3 | BRD-02 | Trộn: nền DEM thật, chi tiết noise; vùng trộn có mặt nạ | M | SRS-02: FR-WLD-11 |
| BR-11.4 | BRD-02 | Xói mòn thuỷ lực/nhiệt có tham số, theo vùng | M | SRS-02: FR-WLD-12 |
| BR-11.5 | BRD-02 | Có thể dùng A.N.T. Landscape trong Blender làm một generator (QĐ-06) | S | SRS-02: FR-WLD-13 |
| BR-12.1 | BRD-02 | Sông, hồ, ao, ruộng ngập, biển từ mask OSM hoặc khai báo | M | SRS-02: FR-WLD-17 |
| BR-12.2 | BRD-02 | Shader nước theo tier: phản chiếu, khúc xạ, bọt bờ, gợn sóng; tier Thấp dùng bản rẻ | M | SRS-02: FR-WLD-18 |
| BR-12.3 | BRD-02 | Vùng nước khai báo độ sâu để dùng cho va chạm, bơi (nếu bật) và vùng sống của cá | M | SRS-02: FR-WLD-17, FR-WLD-19 |
| BR-12.4 | BRD-02 | Đối tượng trên mặt nước (thuyền, bèo, sen) đặt qua `placement` | S | SRS-02: FR-WLD-20 |
| BR-12.5 | BRD-02 | Thư viện loài cây có tham số (Sapling Tree Gen + code bổ sung): hình tán, chiều cao, mùa, màu lá,… | M | SRS-02: FR-WLD-21 |
| BR-12.6 | BRD-02 | Rải rừng, cây rải rác, bụi, cỏ theo mask và luật mật độ; instancing | M | SRS-02: FR-WLD-22 |
| BR-12.7 | BRD-02 | Impostor cho cây ở xa; cỏ chỉ hiện trong bán kính theo tier | M | SRS-02: FR-WLD-23 |
| BR-12.8 | BRD-02 | Gió lay cây, cỏ bằng shader (tắt ở tier Thấp) | S | SRS-02: FR-WLD-24 |
| BR-13.1 | BRD-02 | Bake lightmap và AO cho hình học tĩnh theo zone | M | SRS-02: FR-WLD-28 |
| BR-13.2 | BRD-02 | Các mốc thời điểm khai báo được (ví dụ sáng, trưa, chiều, đêm); mỗi mốc một bộ bake hoặc bộ tham số | M | SRS-02: FR-WLD-29 |
| BR-13.3 | BRD-02 | Chuyển giữa các mốc trong game (nếu mô tả có chu kỳ ngày đêm) bằng nội suy ánh sáng động + lightmap | S | SRS-02: FR-WLD-31 |
| BR-13.4 | BRD-02 | Nguồn sáng động hạn chế theo tier (đèn lồng, đuốc…) | S | SRS-02: FR-WLD-32 |
| BR-13.5 | BRD-02 | Thời gian bake được báo cáo; chỉ bake lại zone có đầu vào thay đổi | M | SRS-02: FR-WLD-30 |
| BR-14.1 | BRD-02 | Bầu trời từ HDRI CC0 hoặc mô hình bầu trời thủ tục, khớp thời điểm | M | SRS-02: FR-WLD-33 |
| BR-14.2 | BRD-02 | Sương theo độ cao/khoảng cách, mây, mưa, gió, sương mù sáng sớm; bật theo dữ liệu | S | SRS-02: FR-WLD-34 |
| BR-14.3 | BRD-02 | Hậu kỳ (tone mapping, bloom, màu) theo style bible; tier Thấp tối giản | M | SRS-02: FR-WLD-35 |
| BR-16.1 | BRD-03 | Nguồn CC0 được phép khai báo trong danh sách trắng (ví dụ Poly Haven, các kho CC0 khác do Huy duyệt) | M | SRS-03: FR-AST-01 |
| BR-16.2 | BRD-03 | Kiểm license khi nhập: chỉ nhận CC0 (hoặc license khác được Huy cho phép rõ ràng); lưu bằng chứng… | M | SRS-03: FR-AST-02 |
| BR-16.3 | BRD-03 | Chuẩn hoá: đơn vị mét, trục Y lên, pivot ở đáy, scale đúng thực tế, tên chuẩn | M | SRS-03: FR-AST-03 |
| BR-16.4 | BRD-03 | Giảm lưới và sinh LOD theo ngân sách tri của tier; sinh UV2 cho lightmap nếu là vật tĩnh | M | SRS-03: FR-AST-04 |
| BR-16.5 | BRD-03 | Đồng bộ vật liệu với bảng màu và style bible (đổi màu, độ nhám, gộp vật liệu) | M | SRS-03: FR-AST-05 |
| BR-16.6 | BRD-03 | Nhân vật/động vật: retarget về khung xương dùng chung của họ (chi tiết ở BRD-05) | M | SRS-03: FR-AST-06 |
| BR-17.1 | BRD-03 | Thư viện primitive tham số: cột, dầm, mái, tường, cửa, bậc, hàng rào, đá tảng, thùng, chum, bàn ghế… | M | SRS-03: FR-AST-07 |
| BR-17.2 | BRD-03 | Generator theo **họ asset** (ví dụ "nhà một gian", "mái ngói", "cây lá kim", "đá tảng"); biến thể… | M | SRS-03: FR-AST-08 |
| BR-17.3 | BRD-03 | Mesh hữu cơ bằng SDF, metaball hoặc script sculpt Blender cho vật thể không quá chi tiết | S | SRS-03: FR-AST-09 |
| BR-17.4 | BRD-03 | Generator tự sinh UV, LOD, collider đơn giản, provenance | M | SRS-03: FR-AST-10 |
| BR-17.5 | BRD-03 | `kit-builder`: lắp công trình từ bộ kit module theo spec tham số (số gian, số tầng, kiểu mái) | M | SRS-03: FR-AST-11 |
| BR-17.6 | BRD-03 | Ảnh tham chiếu Gemini (chính diện, bên, sau) dùng để generator bám tỷ lệ cho asset rủi ro cao | S | SRS-03: FR-AST-12 |
| BR-18.1 | BRD-03 | Ba nguồn vật liệu: thủ tục (`engine-texture-proc`), scan CC0, texture sinh bằng Gemini | M | SRS-03: FR-AST-14 |
| BR-18.2 | BRD-03 | Bộ map chuẩn PBR: màu, normal, nhám, kim loại, AO (height khi cần) | M | SRS-03: FR-AST-15 |
| BR-18.3 | BRD-03 | Chuẩn hoá độ phân giải theo tier: 2048² (Thấp/Vừa), 4096² (Cao/Tối đa); nén KTX2 (UASTC cho vật l… | M | SRS-03: FR-AST-16 |
| BR-18.4 | BRD-03 | Texture Gemini dùng cho vải, da, hoa văn, chạm khắc (normal/height), decal, UI; phải tileable khi… | M | SRS-03: FR-AST-17 |
| BR-18.5 | BRD-03 | HDRI bầu trời CC0, chuẩn hoá độ phân giải theo tier | M | SRS-03: FR-AST-18 |
| BR-18.6 | BRD-03 | Số vật liệu mỗi zone ≤ ngân sách (32 ở tier Vừa); `packager` gộp và atlas khi cần | M | SRS-03: FR-AST-19 |
| BR-19.1 | BRD-03 | Âm môi trường theo vùng và thời điểm (gió, nước, côn trùng, chim, chợ…) | S | SRS-03: FR-AST-20 |
| BR-19.2 | BRD-03 | Hiệu ứng: bước chân theo bề mặt, tương tác, UI | S | SRS-03: FR-AST-21 |
| BR-19.3 | BRD-03 | Nguồn: ElevenLabs (QĐ-09) hoặc âm thanh CC0; cùng quy tắc provenance | M | SRS-03: FR-AST-23 |
| BR-19.4 | BRD-03 | Nén (định dạng web phổ biến), chuẩn hoá âm lượng, cắt lặp mượt cho âm nền | M | SRS-03: FR-AST-24 |
| BR-19.5 | BRD-03 | Nhạc nền: theo mô tả; nguồn CC0 hoặc sinh bằng dịch vụ được phép (xem CH-03-02) | C | SRS-03: FR-AST-25 |
| BR-20.1 | BRD-03 | Mỗi asset mới hoặc biến thể lớn sinh turntable 4 góc dưới ánh sáng chuẩn + ảnh trong cảnh | M | SRS-03: FR-AST-31 |
| BR-20.2 | BRD-03 | Kèm thông số: tri theo từng LOD, số vật liệu, kích thước texture, dung lượng; so với ngân sách | M | SRS-03: FR-AST-32 |
| BR-20.3 | BRD-03 | Asset rủi ro cao (BRD-01, BR-04.1) có ít nhất 2 vòng duyệt | M | SRS-03: FR-AST-33 |
| BR-20.4 | BRD-03 | Biến thể nhỏ của một generator đã duyệt (chỉ đổi seed trong giới hạn) không cần duyệt lại từng cá… | S | SRS-03: FR-AST-35 |
| BR-21.1 | BRD-03 | Mỗi asset (mesh, texture, âm thanh, HDRI) có file sidecar `*.provenance.json` | M | SRS-03: FR-AST-26 |
| BR-21.2 | BRD-03 | Trường theo loại nguồn: **generator** (công thức, tham số, seed, phiên bản generator, commit); **… | M | SRS-03: FR-AST-27 |
| BR-21.3 | BRD-03 | Asset chỉnh sửa từ asset khác ghi asset gốc (chuỗi nguồn) | M | SRS-03: FR-AST-28 |
| BR-21.4 | BRD-03 | Build Fail khi asset trong cảnh thiếu provenance hoặc license không hợp lệ | M | SRS-03: FR-AST-29 |
| BR-22.1 | BRD-04 | Tự chọn tier khi khởi động theo thiết bị (GPU, bộ nhớ, màn hình) và đo nhanh vài giây đầu; người … | M | SRS-04: FR-RTM-07 |
| BR-22.2 | BRD-04 | Hạ tier tự động khi fps dưới mục tiêu kéo dài (đề xuất 5 s) | S | SRS-04: FR-RTM-08 |
| BR-23.1 | BRD-04 | `budgets.json` khai báo theo tier: tri tĩnh, tri tổng, draw call, vật liệu, texture tối đa, bộ nh… | M | SRS-04: FR-RTM-12 |
| BR-23.2 | BRD-04 | Giá trị mặc định tier Vừa lấy theo số đã kiểm chứng trên A56: ≤ 120 draw call, ≤ 32 vật liệu, kho… | M | SRS-04: FR-RTM-13 |
| BR-23.3 | BRD-04 | Mỗi build so với ngân sách và trả Pass / Warn (trong 10% cuối) / Fail | M | SRS-04: FR-RTM-14 |
| BR-24.1 | BRD-02 | Một hệ toạ độ thống nhất (mét, trục Y lên); toạ độ địa lý thật được quy đổi về gốc cục bộ của game | M | SRS-02: FR-WLD-01 |
| BR-24.2 | BRD-02 | Vùng chơi khai báo bằng đa giác; người chơi không ra khỏi vùng chơi | M | SRS-02: FR-WLD-02 |
| BR-24.3 | BRD-02 | Thế giới chia zone; mỗi zone có ranh giới, tâm, ngân sách riêng; zone lân cận được nạp trước khi … | M | SRS-02: FR-WLD-03 |
| BR-24.4 | BRD-02 | Kích thước zone mặc định do `budgets.json` quy định theo tier | M | SRS-02: FR-WLD-04 |
| BR-24.5 | BRD-04 | Màn hình tải có tiến độ; tải zone đầu tiên trước, các zone khác tải nền | M | SRS-04: FR-RTM-09 |
| BR-24.6 | BRD-04 | Giải phóng zone xa để giữ bộ nhớ trong ngân sách | M | SRS-04: FR-RTM-10 |
| BR-24.7 | BRD-04 | Loader KTX2, Meshopt/Draco; fallback khi thiết bị không hỗ trợ định dạng nén | M | SRS-04: FR-RTM-11 |
| BR-25.1 | BRD-04 | Điều khiển cảm ứng: joystick ảo, vuốt xoay camera, chạm để tương tác; bố cục theo safe area | M | SRS-04: FR-RTM-15 |
| BR-25.2 | BRD-04 | Bàn phím + chuột trên desktop; tay cầm là tuỳ chọn | S | SRS-04: FR-RTM-16 |
| BR-25.3 | BRD-04 | Chế độ dev: flycam, orbit, hiển thị chỉ số | M | SRS-04: FR-RTM-17 |
| BR-26.1 | BRD-04 | HUD, menu tạm dừng, cài đặt (âm lượng, tier, độ nhạy), màn hình credit | M | SRS-04: FR-RTM-18 |
| BR-26.2 | BRD-04 | Điểm tương tác khai báo bằng dữ liệu: vị trí, bán kính, điều kiện, hành động (hiện thông tin, bật… | M | SRS-04: FR-RTM-19 |
| BR-26.3 | BRD-04 | Hệ sự kiện và biến trạng thái game (cờ, bộ đếm, nhiệm vụ đơn giản) khai báo bằng dữ liệu | M | SRS-04: FR-RTM-20 |
| BR-26.4 | BRD-04 | Lưu tiến trình chơi cục bộ trên trình duyệt (không lưu trên server, GD-05) | S | SRS-04: FR-RTM-21 |
| BR-26.5 | BRD-04 | Giao diện tiếng Việt mặc định, chữ đọc được trên màn hình 6,5 inch | M | SRS-04: FR-RTM-22 |
| BR-27.1 | BRD-04 | Báo cáo JSON chung cho mọi bước build và QA: thời gian, đầu vào (hash), số đo, ngân sách, kết quả | M | SRS-04: FR-QA-01 |
| BR-28.1 | BRD-04 | QA mức nhẹ (mặc định, vài phút): smoke test, 3–5 góc chụp, đo nhanh, kiểm ngân sách | M | SRS-04: FR-QA-02 |
| BR-28.2 | BRD-04 | QA mức đầy đủ (trước cổng): toàn bộ góc chuẩn, visual regression, perf trên nhiều tier, bot playtest | M | SRS-04: FR-QA-03 |
| BR-29.1 | BRD-04 | Góc chụp chuẩn khai báo theo zone; ảnh chụp từ game đang chạy | M | SRS-04: FR-QA-04 |
| BR-29.2 | BRD-04 | Visual regression so với baseline; báo điểm khác biệt và chọn 2–4 ảnh khác nhất | M | SRS-04: FR-QA-05 |
| BR-29.3 | BRD-04 | Canvas inspector đo pixel và thống kê render (draw call, tri) trên desktop và giả lập mobile | M | SRS-04: FR-QA-06 |
| BR-30.1 | BRD-04 | Quy trình đo trên A56 thật: mở bản xuất bản, chạy đường bay/đi chuẩn, thu fps, bộ nhớ, nhiệt (nếu… | M | SRS-04: FR-QA-07 |
| BR-31.1 | BRD-04 | Bot playtest đi theo kịch bản và đi ngẫu nhiên có seed; báo kẹt, rơi, xuyên, lỗi console | S | SRS-04: FR-QA-08 |
| BR-32.1 | BRD-09 | Số agent ≤ 8, số skill engine thêm 10–15; mỗi agent/skill có mô tả một đoạn | M | SRS-09: FR-DEV-01 |
| BR-33.1 | BRD-09 | `project.yaml`: `rigor: minimal/standard/full`, ghi đè theo hệ thống; mặc định `minimal` đến G-E6 | M | SRS-09: FR-DEV-05 |
| BR-33.2 | BRD-09 | Hệ thống được nâng `standard` sớm: backend Web Studio, bảo mật, cổng AI (RR-24) | M | SRS-09: FR-DEV-06 |
| BR-34.1 | BRD-09 | Mẫu phiếu: mục tiêu, phạm vi, file/module được đọc, file được sửa, tiêu chí xong, "Mô hình khuyến… | M | SRS-09: FR-DEV-07 |
| BR-34.2 | BRD-09 | Hướng dẫn chọn mô hình: Opus (high/xhigh) cho kiến trúc, thuật toán mới, cổng; Sonnet (medium) ch… | M | SRS-09: FR-DEV-08 |
| BR-35.1 | BRD-09 | Mẫu báo cáo cổng: kết quả đạt/chưa theo điều kiện cổng, số đo A56, 2–4 ảnh, rủi ro mở, đề xuất | M | SRS-09: FR-DEV-09 |
| BR-35.2 | BRD-09 | `/gate-check` tự kiểm điều kiện đo được và liệt kê điều kiện cần Huy xác nhận | M | SRS-09: FR-DEV-10 |
| BR-36.1 | BRD-09 | ADR theo mẫu ngắn; ADR-001…015 tương ứng QĐ-01…15 ở E0 (GD-10) | M | SRS-09: FR-DEV-11 |
| BR-37.1 | BRD-09 | `UPSTREAM.md`: phiên bản gốc đã fork, danh sách thay đổi theo file, cách lấy bản mới | M | SRS-09: FR-DEV-12 |
| BR-37.2 | BRD-09 | Giữ nguyên LICENSE và ghi công tác giả gốc | M | SRS-09: FR-DEV-13 |
| BR-38.2 | BRD-09 | Đo token mỗi phiếu và ghi vào báo cáo để tính BO-02 | M | SRS-09: FR-DEV-19 |
| BR-38.3 | BRD-09 | Ảnh: Claude chỉ xem 2–4 ảnh khác biệt nhất khi qua cổng; ngoài ra đọc số liệu | M | SRS-09: FR-DEV-21 |
| BR-39.1 | BRD-09 | `CLAUDE.md` < khoảng 150 dòng: luật, cấu trúc thư mục, lệnh CLI, chỉ dẫn tới ADR | M | SRS-09: FR-DEV-14 |
| BR-40.1 | BRD-04 | `engine new-game`, `engine build --zone <id> [--tier]`, `engine qa --level=nhe/day-du`, `engine p… | M | SRS-04: FR-CLI-01 |
| BR-40.2 | BRD-04 | Build tăng dần theo hash đầu vào; `--force` để build lại | M | SRS-04: FR-CLI-02, FR-CLI-09; SRS-08: FR-WEB-63 |
| BR-40.3 | BRD-04 | Lệnh trả mã thoát chuẩn và báo cáo JSON để Web Studio và Claude Code dùng chung | M | SRS-04: FR-CLI-03, FR-CLI-08 |
| BR-41.1 | BRD-09 | Ghi chú dự án gọn (ràng buộc, việc đã xong, asset đang chờ, bước tiếp) cập nhật bằng `/handoff` c… | M | SRS-09: FR-DEV-15 |
| BR-41.2 | BRD-09 | `/clear` giữa các phiếu; phiếu sau đọc ghi chú thay vì lịch sử | M | SRS-09: FR-DEV-16 |
| BR-42.1 | BRD-09 | MCP xem cảnh (Unity, Blender) chỉ bật khi gỡ lỗi | S | SRS-09: FR-DEV-17 |
| BR-43.2 | BRD-09 | Khoá Gemini, ElevenLabs, Claude API để trong biến môi trường; script probe kiểm có khoá mà không … | M | SRS-09: FR-DEV-22 |
| BR-43.3 | BRD-09 | Không commit file bí mật; có `.gitignore` và quét bí mật trước commit | M | SRS-09: FR-DEV-23 |
| BR-44.1 | BRD-09 | LICENSE MIT gốc và thông báo bản quyền giữ trong repo | M | SRS-09: FR-DEV-13 |
| BR-45.1 | BRD-02 | Ghi công OSM (ODbL) và Copernicus trong provenance và màn hình credit | M | SRS-02: FR-WLD-39 |
| BR-45.2 | BRD-02 | HDRI và vật liệu CC0 ghi nguồn dù không bắt buộc | M | SRS-02: FR-WLD-40 |
| BR-45.3 | BRD-09 | Tài liệu license tổng hợp (`LICENSES.md`) liệt kê nguồn dữ liệu, thư viện, dịch vụ | M | SRS-09: FR-DEV-24 |
| BR-46.1 | BRD-09 | `engine doctor` kiểm: phiên bản Node, Python, Blender, add-on, khoá API có mặt, công cụ nén | M | SRS-09: FR-DEV-20 |
| BR-47.1 | BRD-05 | `entities/player.json`: mô hình/kiểu ngoại hình, chiều cao, tốc độ đi/chạy, bán kính va chạm, góc… | M | SRS-05: FR-CHR-01 |
| BR-48.1 | BRD-05 | Ngôi ba: camera bám sau vai, tự kéo gần khi bị che, xoay bằng vuốt; ngôi một: camera ở mắt, có lắ… | M | SRS-05: FR-CHR-02 |
| BR-49.1 | BRD-05 | Joystick ảo trái, vuốt phải để xoay, nút hành động ngữ cảnh (tương tác, nói chuyện, nhặt) chỉ hiệ… | M | SRS-05: FR-CHR-04 |
| BR-49.2 | BRD-05 | Chạy bằng đẩy joystick hết cỡ hoặc nút chạy (cấu hình) | M | SRS-05: FR-CHR-05 |
| BR-50.1 | BRD-05 | Đi được trên dốc ≤ giới hạn (đề xuất 40°); bậc thang thấp tự bước lên | M | SRS-05: FR-CHR-07 |
| BR-50.2 | BRD-05 | Nước sâu: chặn hoặc chuyển sang bơi nếu `player.swim` bật | M | SRS-05: FR-CHR-08 |
| BR-51.1 | BRD-05 | Chuyển trạng thái animation có blend; tốc độ chân khớp tốc độ di chuyển; chân bám mặt dốc (IK đơn… | M | SRS-05: FR-CHR-10 |
| BR-52.1 | BRD-05 | Âm bước chân theo loại bề mặt từ `terrain` (BR-10.7) hoặc vật liệu | S | SRS-05: FR-CHR-11 |
| BR-53.1 | BRD-05 | Tuỳ biến ngoại hình (trang phục, màu) khi mô tả yêu cầu | C | SRS-05: FR-CHR-12 |
| BR-54.1 | BRD-05 | `entities/npc/<id>.json`: tên, vai trò, ngoại hình (bộ khối tham số hoặc mô hình CC0 + biến thể t… | M | SRS-05: FR-CHR-13 |
| BR-54.2 | BRD-05 | NPC "đám đông" sinh từ mẫu + seed (tạo biến thể ngoại hình) thay vì khai báo từng người | M | SRS-05: FR-CHR-14 |
| BR-55.1 | BRD-05 | Bộ hành vi cơ bản: `idle` (đứng/ngồi/làm việc), `patrol` (theo đường), `wander` (trong vùng), `go… | M | SRS-05: FR-CHR-15 |
| BR-55.2 | BRD-05 | Máy trạng thái khai báo trong dữ liệu: trạng thái, điều kiện chuyển (khoảng cách người chơi, giờ,… | M | SRS-05: FR-CHR-16 |
| BR-55.3 | BRD-05 | NPC nhìn về phía người chơi khi ở gần (xoay đầu trong giới hạn) | S | SRS-05: FR-CHR-17 |
| BR-56.1 | BRD-05 | Tìm đường trên lưới điều hướng sinh tự động từ địa hình và vật cản lúc build | M | SRS-05: FR-CHR-18 |
| BR-56.2 | BRD-05 | Tránh va chạm cục bộ giữa NPC, động vật và người chơi | M | SRS-05: FR-CHR-19 |
| BR-56.3 | BRD-05 | NPC kẹt quá 5 s thì dịch chuyển nhẹ về điểm hợp lệ gần nhất và ghi log | M | SRS-05: FR-CHR-20 |
| BR-57.1 | BRD-07 | Cây hội thoại: nút lời thoại, lựa chọn của người chơi, điều kiện (biến game, nhiệm vụ, giờ, quan … | M | SRS-07: FR-DLG-02 |
| BR-57.2 | BRD-07 | Lời chào/câu bâng quơ ngẫu nhiên theo bối cảnh (giờ, thời tiết) khi người chơi đi ngang | S | SRS-07: FR-DLG-03 |
| BR-57.3 | BRD-07 | UI hội thoại: khung thoại, tên, chân dung (tuỳ chọn), lựa chọn bấm được bằng ngón cái, nút bỏ qua | M | SRS-07: FR-DLG-04 |
| BR-57.4 | BRD-07 | Mỗi NPC có ít nhất một bộ câu dự phòng dùng khi AI không khả dụng | M | SRS-07: FR-DLG-05 |
| BR-57.5 | BRD-07 | Kiểm tra kịch bản lúc build: nút không tới được, điều kiện luôn sai, nhánh cụt | M | SRS-07: FR-DLG-06 |
| BR-58.1 | BRD-05 | Lịch trình: danh sách (khung giờ → hành vi + vị trí) gắn với giờ trong game | S | SRS-05: FR-CHR-21 |
| BR-59.1 | BRD-05 | Đám đông xa: LOD thấp, animation instancing hoặc impostor | S | SRS-05: FR-CHR-22 |
| BR-60.1 | BRD-05 | Giọng nói NPC (chi tiết ở BRD-07) | C | SRS-05: FR-CHR-23 |
| BR-60.2 | BRD-07 | Giọng cho kịch bản tĩnh sinh trước lúc build (ElevenLabs), lưu như asset có provenance | C | SRS-07: FR-DLG-27 |
| BR-61.1 | BRD-05 | `entities/animals/<loài>.json`: họ, kích thước, tỷ lệ, bộ lông/màu, tốc độ, âm thanh, tập tính mặ… | M | SRS-05: FR-CHR-24 |
| BR-61.2 | BRD-05 | Thêm loài mới trong họ có sẵn chỉ bằng dữ liệu + mô hình (CC0 hoặc generator của họ) | M | SRS-05: FR-CHR-25 |
| BR-62.1 | BRD-05 | Mô hình động vật theo thứ tự nguồn của BRD-03; retarget về khung xương họ; duyệt turntable + clip… | M | SRS-03: FR-AST-06; SRS-05: FR-CHR-30 |
| BR-63.1 | BRD-05 | Thú nuôi: `wander`, `graze/eat`, `rest`, `herd` (theo đàn, có con đầu đàn), `flee`, `follow` | M | SRS-05: FR-CHR-26 |
| BR-63.2 | BRD-05 | Tính cách: thân thiện (lại gần, đi theo), nhút nhát (bỏ chạy khi người chơi tới gần bán kính X), … | M | SRS-05: FR-CHR-27 |
| BR-63.3 | BRD-05 | Chó/mèo có thể "nhận" người chơi làm chủ và đi theo nếu dữ liệu cho phép | C | SRS-05: FR-CHR-29 |
| BR-64.1 | BRD-05 | Gia cầm theo nhóm: kiếm ăn, mổ, tán loạn khi người chơi chạy tới, tụ lại sau vài giây; về chuồng … | S | SRS-05: FR-CHR-31 |
| BR-65.1 | BRD-05 | Chim: đàn bay theo boids, điểm đậu khai báo hoặc tự tìm (ngọn cây, mái, dây); cất cánh khi người … | S | SRS-05: FR-CHR-32 |
| BR-66.1 | BRD-05 | Cá: bơi theo đàn trong vùng nước có độ sâu đủ; không ra ngoài mask nước; né khi người chơi tới mé… | S | SRS-05: FR-CHR-33 |
| BR-67.1 | BRD-03 | Tiếng động vật theo loài và hành vi (BRD-05) | S | SRS-03: FR-AST-22; SRS-05: FR-CHR-28 |
| BR-68.1 | BRD-05 | Tương tác với động vật qua điểm tương tác: vuốt ve, cho ăn, dắt, thả (theo mô tả) | C | SRS-05: FR-CHR-34 |
| BR-69.1 | BRD-02 | Luật bố trí khai báo bằng dữ liệu: mật độ, khoảng cách tối thiểu, tránh đường/nước, độ dốc cho ph… | M | SRS-02: FR-WLD-25 |
| BR-69.2 | BRD-02 | Đối tượng đặt tay (từ editor) và đặt theo luật cùng tồn tại; đặt tay luôn ưu tiên | M | SRS-02: FR-WLD-26 |
| BR-69.3 | BRD-02 | Kết quả bố trí tất định theo seed | M | SRS-02: FR-WLD-27 |
| BR-69.4 | BRD-05 | Luật xuất hiện: loài/mẫu NPC, vùng, số lượng min–max, giờ hoạt động, nhóm/đàn | M | SRS-05: FR-CHR-35 |
| BR-70.1 | BRD-05 | Ngân sách nhân vật theo tier trong `budgets.json`: cận cảnh chi tiết, skinning đồng thời, cá thể … | M | SRS-05: FR-CHR-36 |
| BR-71.1 | BRD-05 | LOD hình 3 mức + impostor/hạt; LOD hành vi: gần cập nhật mỗi khung, vừa 5–10 Hz, xa 1–2 Hz, ngoài… | M | SRS-05: FR-CHR-37 |
| BR-72.1 | BRD-05 | Mọi lựa chọn ngẫu nhiên của hành vi dùng RNG có seed theo cá thể | M | SRS-05: FR-CHR-38 |
| BR-73.1 | BRD-01 | Danh sách loài động vật và kiểu NPC trong brief lấy đúng theo mô tả, không tự thêm loài | M | SRS-01: FR-INT-12 |
| BR-73.2 | BRD-05 | Kiểu dáng mọi nhân vật/động vật theo style bible | M | SRS-05: FR-CHR-39 |
| BR-74.1 | BRD-05 | Không cấp phát trong vòng lặp hành vi/animation | M | SRS-05: FR-CHR-40 |
| BR-75.1 | BRD-01 | Cờ tính năng tuỳ chọn: `combat`, `hunting`, `dialogueMode` (static/ai/hybrid) ghi trong `game.jso… | M | SRS-01: FR-INT-13 |
| BR-75.2 | BRD-06 | Brief hiển thị rõ chiến đấu/săn bắt bật hay tắt và kiểu nào; người dùng xác nhận | M | SRS-01: FR-INT-13; SRS-06: FR-CBT-01 |
| BR-76.1 | BRD-06 | Module `combat` chỉ được đóng gói khi bật; game tắt không có mã, asset, UI chiến đấu | M | SRS-06: FR-CBT-03 |
| BR-76.2 | BRD-06 | Bật chiến đấu sau khi game đã có là thay đổi lớn (QT-01-05) | M | SRS-06: FR-CBT-04 |
| BR-77.1 | BRD-06 | Chỉ số mỗi thực thể: máu, sát thương, phòng thủ, tầm đánh, tốc độ đánh, tốc độ di chuyển khi chiế… | M | SRS-06: FR-CBT-05 |
| BR-77.2 | BRD-06 | Vũ khí/công cụ là entity dữ liệu: loại (cận chiến, tầm xa, bẫy, lưới), sát thương, tầm, tốc độ, đ… | M | SRS-06: FR-CBT-06 |
| BR-77.3 | BRD-06 | Công thức sát thương đơn giản khai báo được (ví dụ sát thương − phòng thủ, tối thiểu 1) | M | SRS-06: FR-CBT-07 |
| BR-77.4 | BRD-06 | Bảng cân bằng xuất ra CSV/JSON để chỉnh hàng loạt | S | SRS-06: FR-CBT-08 |
| BR-78.1 | BRD-06 | Nút tấn công, né/đỡ trên cảm ứng; tự ngắm mềm (aim assist) vào mục tiêu gần nhất trước mặt | M | SRS-06: FR-CBT-09 |
| BR-78.2 | BRD-06 | Tầm xa: ngắm bằng vuốt hoặc khoá mục tiêu | S | SRS-06: FR-CBT-10 |
| BR-78.3 | BRD-06 | Trúng đòn có phản ứng (giật lùi), khoảng bất tử ngắn sau khi trúng | M | SRS-06: FR-CBT-11 |
| BR-79.1 | BRD-06 | Thêm các trạng thái Cảnh giác, Truy đuổi, Tấn công, Bỏ chạy, Gục vào máy trạng thái của BRD-05 | M | SRS-06: FR-CBT-12 |
| BR-79.2 | BRD-06 | Giác quan: tầm nhìn (góc, khoảng cách), nghe (bán kính theo tốc độ người chơi), đánh hơi (động vậ… | M | SRS-06: FR-CBT-13 |
| BR-79.3 | BRD-06 | Giới hạn số kẻ tấn công cùng lúc (token tấn công) để công bằng và đỡ tốn CPU | M | SRS-06: FR-CBT-14 |
| BR-79.4 | BRD-06 | Đàn bỏ chạy cùng nhau khi một con bị tấn công | S | SRS-06: FR-CBT-15 |
| BR-80.1 | BRD-06 | Dấu vết (dấu chân, tiếng động) hiển thị theo dữ liệu loài | S | SRS-06: FR-CBT-16 |
| BR-80.2 | BRD-06 | Mức cảnh giác loài: nhạy, vừa, chậm; ngồi xuống/đi chậm làm giảm bị phát hiện | S | SRS-06: FR-CBT-17 |
| BR-80.3 | BRD-06 | Săn được thì nhận vật phẩm theo bảng rơi khai báo | S | SRS-06: FR-CBT-18 |
| BR-80.4 | BRD-06 | Bẫy, lưới (bắt sống) là tuỳ chọn theo mô tả | C | SRS-06: FR-CBT-19 |
| BR-81.1 | BRD-06 | Người chơi gục: hồi sinh ở điểm hồi sinh gần nhất, giữ hoặc mất vật phẩm theo dữ liệu | M | SRS-06: FR-CBT-20 |
| BR-81.2 | BRD-06 | NPC/động vật gục: biến mất sau X giây (không ragdoll đầy đủ), tái xuất hiện theo luật xuất hiện v… | M | SRS-06: FR-CBT-21 |
| BR-81.3 | BRD-06 | NPC quan trọng cho cốt truyện có thể đặt "không thể bị hại" | M | SRS-06: FR-CBT-22 |
| BR-81.4 | BRD-06 | `violence.level = minimal`: không máu, gục là ngã/biến mất mềm | M | SRS-06: FR-CBT-23 |
| BR-82.1 | BRD-06 | Hiệu ứng trúng đòn, âm thanh, rung thiết bị (nếu được phép), số sát thương (tuỳ chọn) | S | SRS-06: FR-CBT-24 |
| BR-82.2 | BRD-06 | HUD máu người chơi, thanh máu mục tiêu khi đang giao tranh | M | SRS-06: FR-CBT-25 |
| BR-83.1 | BRD-06 | Ngân sách theo tier: kẻ tấn công cùng lúc, đạn bay cùng lúc, hạt hiệu ứng | M | SRS-06: FR-CBT-26 |
| BR-85.1 | BRD-07 | Hồ sơ: tên, tuổi, vai trò, tính cách, giọng văn, cách xưng hô, kiến thức được biết, điều không đư… | M | SRS-07: FR-DLG-07 |
| BR-85.2 | BRD-07 | Ngữ cảnh gửi kèm rút gọn: vị trí, giờ, trạng thái nhiệm vụ liên quan, 3–5 lượt thoại gần nhất | M | SRS-07: FR-DLG-08 |
| BR-85.3 | BRD-07 | AI không được thay đổi trạng thái game trực tiếp; nếu cần, chỉ được đề xuất một trong các hành độ… | M | SRS-07: FR-DLG-09 |
| BR-85.4 | BRD-07 | Không tiết lộ nội dung cốt truyện ngoài phần "được biết" ở mốc hiện tại | M | SRS-07: FR-DLG-10 |
| BR-85.5 | BRD-07 | Bộ câu hỏi kiểm thử cho mỗi NPC chính (đúng vai, cố tình phá vai, hỏi ngoài phạm vi) chạy được tự… | M | SRS-07: FR-DLG-11 |
| BR-86.1 | BRD-07 | Game không bao giờ chứa khoá API; mọi lời gọi qua cổng AI của backend | M | SRS-07: FR-DLG-14 |
| BR-86.2 | BRD-07 | Bản xuất bản gọi cổng bằng token phiên ngắn hạn gắn với game và link chia sẻ | M | SRS-07: FR-DLG-15 |
| BR-86.3 | BRD-07 | Giới hạn tần suất theo phiên chơi và theo IP | M | SRS-07: FR-DLG-16 |
| BR-86.4 | BRD-07 | Log tối thiểu: thời gian, game, NPC, số token, chi phí, kết quả lọc; không lưu nội dung lâu hơn t… | M | SRS-07: FR-DLG-17 |
| BR-87.1 | BRD-07 | Chờ quá 3 s (đề xuất), lỗi, mất mạng, hết hạn mức → dùng câu dự phòng ngay, không treo UI | M | SRS-07: FR-DLG-18 |
| BR-87.2 | BRD-07 | Hiển thị chỉ báo "đang suy nghĩ" trong lúc chờ | S | SRS-07: FR-DLG-19 |
| BR-87.3 | BRD-07 | Mất mạng giữa chừng không làm hỏng trạng thái nhiệm vụ | M | SRS-07: FR-DLG-20 |
| BR-88.1 | BRD-07 | Lọc đầu vào (người chơi cố khai thác) và đầu ra (nội dung không phù hợp, lộ hướng dẫn hệ thống) | M | SRS-07: FR-DLG-21 |
| BR-88.2 | BRD-07 | Giới hạn token mỗi lượt, mỗi phiên chơi; hạn mức chi phí theo ngày cho mỗi game và mỗi chủ game | M | SRS-07: FR-DLG-22 |
| BR-88.3 | BRD-07 | Cache câu trả lời cho câu hỏi phổ biến theo NPC và mốc | S | SRS-07: FR-DLG-23 |
| BR-88.4 | BRD-07 | Dùng mô hình nhỏ, nhanh cho trò chuyện; mô hình lớn chỉ khi cấu hình rõ | M | SRS-07: FR-DLG-24 |
| BR-88.5 | BRD-07 | Báo cáo chi phí hội thoại theo ngày trên Web Studio | M | SRS-07: FR-DLG-25 |
| BR-89.1 | BRD-07 | Giọng cho lời AI sinh khi chạy, qua cùng cổng và hạn mức | C | SRS-07: FR-DLG-28 |
| BR-90.1 | BRD-08 | Quản trị thêm email vào danh sách mời; người dùng đăng nhập lần đầu bằng email đó | M | SRS-08: FR-WEB-01 |
| BR-90.2 | BRD-08 | Khoá/mở khoá tài khoản; tài khoản bị khoá mất quyền ngay | M | SRS-08: FR-WEB-03 |
| BR-91.1 | BRD-08 | Phân quyền theo ma trận mục 2; kiểm tra quyền ở backend, không chỉ ở giao diện | M | SRS-08: FR-WEB-05 |
| BR-92.1 | BRD-08 | Hạn mức mỗi người: chi phí AI/ngày, số job build đồng thời, dung lượng lưu trữ, số game | M | SRS-08: FR-WEB-06 |
| BR-92.2 | BRD-08 | Cảnh báo khi dùng 80% hạn mức; chặn khi 100%; quản trị nâng hạn mức được | M | SRS-08: FR-WEB-07 |
| BR-93.1 | BRD-08 | Chat gắn với từng game, lưu lịch sử | M | SRS-08: FR-WEB-10 |
| BR-93.2 | BRD-08 | Dùng chung logic `game-intake` với Claude Code (NFR-01-03) | M | SRS-01: FR-INT-29; SRS-08: FR-WEB-11 |
| BR-94.1 | BRD-01 | Người dùng yêu cầu thay đổi bằng lời; hệ thống chuyển thành thay đổi dữ liệu cụ thể | M | SRS-01: FR-INT-23 |
| BR-94.2 | BRD-01 | Hiển thị diff dễ đọc (thêm, sửa, xoá theo đối tượng, không phải diff JSON thô) và ảnh hưởng (cần … | M | SRS-01: FR-INT-24 |
| BR-94.3 | BRD-01 | Chỉ áp dụng sau khi người dùng bấm duyệt; có thể duyệt từng phần | M | SRS-01: FR-INT-25 |
| BR-94.4 | BRD-01 | Yêu cầu làm đổi phong cách hoặc thể loại được cảnh báo là thay đổi lớn (QT-01-05) | M | SRS-01: FR-INT-26 |
| BR-94.5 | BRD-08 | Mỗi đề xuất thay đổi hiện dạng thẻ: tóm tắt, danh sách thay đổi theo đối tượng, ảnh hưởng build, … | M | SRS-08: FR-WEB-12 |
| BR-94.6 | BRD-08 | Chat có thể trả lời câu hỏi về game (ví dụ "zone 2 có bao nhiêu NPC?") từ dữ liệu, không cần sửa gì | S | SRS-08: FR-WEB-13 |
| BR-95.1 | BRD-08 | Tiến độ job hiện ngay trong chat và trong thanh trên | M | SRS-08: FR-WEB-14 |
| BR-96.1 | BRD-03 | Trên Web Studio: màn hình duyệt có Duyệt / Từ chối kèm lý do; lịch sử duyệt | M | SRS-03: FR-AST-34 |
| BR-97.1 | BRD-08 | Khung xem trước dùng đúng engine runtime của bản xuất bản | M | SRS-08: FR-WEB-16 |
| BR-97.2 | BRD-08 | Chế độ: bay tự do, người chơi, góc chuẩn QA; chọn zone; tua giờ trong game | M | SRS-08: FR-WEB-18 |
| BR-98.1 | BRD-08 | Thay đổi dữ liệu runtime (vị trí, tham số NPC, hội thoại, ánh sáng động) áp dụng nóng | M | SRS-08: FR-WEB-17 |
| BR-98.2 | BRD-08 | Thay đổi cần build lại hiện nhãn "cần build" trên đối tượng bị ảnh hưởng | M | SRS-08: FR-WEB-17 |
| BR-99.1 | BRD-08 | Lớp phủ chỉ số: fps, draw call, tri, bộ nhớ; so với ngân sách tier đang giả lập | S | SRS-08: FR-WEB-20 |
| BR-100.1 | BRD-08 | QR mở bản xem trước trên điện thoại; số đo từ điện thoại gửi về báo cáo (CH-04-03) | S | SRS-08: FR-WEB-19 |
| BR-101.1 | BRD-08 | Chọn đối tượng bằng chạm/nhấp trong khung xem trước hoặc cây đối tượng | M | SRS-08: FR-WEB-21 |
| BR-101.2 | BRD-08 | Gizmo di chuyển, xoay, co giãn; bám mặt đất; bám lưới tuỳ chọn | M | SRS-08: FR-WEB-22 |
| BR-101.3 | BRD-08 | Kéo thả asset đã duyệt từ thư viện vào cảnh | M | SRS-08: FR-WEB-23 |
| BR-101.4 | BRD-08 | Vẽ vùng đa giác trên bản đồ nhìn từ trên | M | SRS-02: FR-WLD-37; SRS-08: FR-WEB-25 |
| BR-102.1 | BRD-05 | Tạo/sửa NPC bằng form: ngoại hình (chọn + chỉnh màu), vai trò, hành vi (chọn từ mẫu hoặc sửa máy … | M | SRS-05: FR-CHR-42 |
| BR-102.2 | BRD-05 | Xem thử hành vi ngay trong khung xem trước (cập nhật nóng) | M | SRS-05: FR-CHR-44 |
| BR-102.3 | BRD-07 | Editor cây hội thoại dạng sơ đồ: thêm nút, lựa chọn, điều kiện, hành động | M | SRS-07: FR-DLG-29 |
| BR-102.4 | BRD-07 | Form hồ sơ nhân vật AI; nút "thử nói chuyện" ngay trong editor (tính vào hạn mức) | M | SRS-07: FR-DLG-30 |
| BR-102.5 | BRD-07 | AI hỗ trợ viết nháp kịch bản tĩnh từ mô tả; người dùng duyệt trước khi lưu | S | SRS-07: FR-DLG-31 |
| BR-103.1 | BRD-05 | Thêm đàn động vật: chọn loài, vẽ vùng, số lượng, tính cách, giờ | M | SRS-05: FR-CHR-43 |
| BR-104.1 | BRD-02 | Form tham số cho địa hình, nước, thực vật, bầu trời, thời điểm; có giá trị mặc định và giới hạn | S | SRS-02: FR-WLD-36 |
| BR-104.2 | BRD-02 | Vẽ vùng (vùng chơi, vùng rừng, vùng spawn) trên bản đồ nhìn từ trên | S | SRS-02: FR-WLD-37 |
| BR-104.3 | BRD-02 | Thay đổi cần build lại tạo job và báo ước lượng thời gian; thay đổi runtime hiện ngay | S | SRS-02: FR-WLD-38 |
| BR-105.1 | BRD-08 | Hoàn tác/làm lại tối thiểu 50 bước trong phiên | M | SRS-08: FR-WEB-26 |
| BR-105.2 | BRD-08 | Lưu tự động; mỗi lần lưu có ý nghĩa tạo một mốc phiên bản (gộp các thao tác nhỏ liên tiếp) | M | SRS-08: FR-WEB-27 |
| BR-105.3 | BRD-08 | Một người sửa một game tại một thời điểm; người khác thấy "đang được sửa bởi X" (CH-30) | M | SRS-08: FR-WEB-24 |
| BR-106.1 | BRD-08 | Chế độ JSON thô cho người dùng nâng cao | C | SRS-08: FR-WEB-29 |
| BR-107.1 | BRD-08 | Game có trạng thái: Đang làm, Lưu trữ, Đã xoá (thùng rác 30 ngày) | M | SRS-08: FR-WEB-09 |
| BR-108.1 | BRD-08 | Mốc phiên bản ghi: ai, khi nào, bằng chat hay editor, tóm tắt thay đổi | M | SRS-08: FR-WEB-31 |
| BR-108.2 | BRD-08 | Khôi phục tạo mốc mới (không xoá lịch sử) | M | SRS-08: FR-WEB-32 |
| BR-108.3 | BRD-08 | Đặt tên/đánh dấu mốc quan trọng (ví dụ "bản demo cho cả nhóm") | S | SRS-08: FR-WEB-33 |
| BR-109.1 | BRD-03 | Asset đã duyệt vào kho chung, tìm theo loại, phong cách, nguồn, license, ngân sách | S | SRS-03: FR-AST-36 |
| BR-109.2 | BRD-03 | Game khác dùng lại asset mà không nhân bản file | S | SRS-03: FR-AST-37 |
| BR-109.3 | BRD-03 | Asset được nhiều game dùng thì không xoá được; chỉ đánh dấu ngừng dùng | S | SRS-03: FR-AST-38 |
| BR-110.1 | BRD-08 | Chia sẻ game cho người trong danh sách với quyền Sửa hoặc Xem | M | SRS-08: FR-WEB-35 |
| BR-110.2 | BRD-08 | Link chơi thử: chọn bản xuất bản, hạn dùng, yêu cầu đăng nhập hay không (CH-26), thu hồi | M | SRS-08: FR-WEB-36, FR-WEB-65 |
| BR-111.1 | BRD-04 | Bản xuất bản là gói tĩnh (HTML, JS, asset) chạy được trên hosting tĩnh, không phụ thuộc Web Studi… | M | SRS-04: FR-CLI-05 |
| BR-111.2 | BRD-04 | Mỗi bản xuất bản có số phiên bản, ngày, phiên bản engine, hash dữ liệu | M | SRS-04: FR-CLI-06, FR-CLI-12 |
| BR-111.3 | BRD-08 | Xuất bản chạy QA mức nhẹ trước; Fail ngân sách thì cảnh báo, chủ game vẫn có thể xuất bản bản thử… | M | SRS-08: FR-WEB-37 |
| BR-112.1 | BRD-08 | Xuất gói game (zip) gồm dữ liệu, asset, provenance; nhập gói thành game mới | S | SRS-04: FR-CLI-11; SRS-08: FR-WEB-34 |
| BR-113.1 | BRD-03 | Màn hình credit tự sinh từ provenance khi xuất bản | M | SRS-03: FR-AST-30 |
| BR-113.2 | BRD-08 | Credit tự sinh, không xuất bản được khi thiếu provenance | M | SRS-08: FR-WEB-39 |
| BR-114.1 | BRD-08 | Hàng đợi job có ưu tiên (job nhỏ trước), giới hạn đồng thời mỗi người, huỷ, thử lại | M | SRS-08: FR-WEB-40, FR-WEB-52 |
| BR-114.2 | BRD-08 | Worker chạy Blender đúng phiên bản cố định; `engine doctor` chạy khi worker khởi động | M | SRS-08: FR-WEB-45 |
| BR-115.1 | BRD-08 | Cổng AI dùng chung cho sinh game, sửa game, ảnh, âm thanh, hội thoại NPC; ghi chi phí theo người,… | M | SRS-08: FR-WEB-42 |
| BR-116.1 | BRD-08 | Sao lưu CSDL hằng ngày, kho asset hằng tuần (đề xuất); diễn tập khôi phục mỗi pha | M | SRS-08: FR-WEB-44 |
| BR-117.1 | BRD-08 | HTTPS; phiên đăng nhập có hạn; chống CSRF/XSS/SSRF; cách ly dữ liệu theo quyền | M | SRS-08: FR-WEB-46 |
| BR-117.2 | BRD-08 | Mã do AI sinh (generator mới, script) không chạy trên server sản xuất ngoài sandbox; generator mớ… | M | SRS-08: FR-WEB-47 |
| BR-118.1 | BRD-08 | Trang quản trị: số người dùng, job, thời gian job, chi phí AI, dung lượng | S | SRS-08: FR-WEB-48, FR-WEB-51 |
| BR-119.1 | BRD-10 | Mở lại một game thì thấy ngay: giai đoạn, việc đã xong, việc còn treo, một nút/việc "tiếp theo" | M | SRS-08: FR-WEB-61 |
| BR-119.2 | BRD-10 | Thư viện game hiện giai đoạn và số việc treo trên từng thẻ; bộ lọc "Đang dở" | M | SRS-08: FR-WEB-60 |
| BR-119.3 | BRD-10 | Tóm tắt tiến độ bằng lời khi mở lại (ngắn, đọc trong vài giây) | M | SRS-01: FR-INT-34 |
| BR-119.4 | BRD-10 | Claude Code và CLI đọc cùng báo cáo tiến độ với Web Studio | M | SRS-04: FR-CLI-08 |
| BR-119.5 | BRD-10 | Nhắc khi có thay đổi chưa xuất bản | S | SRS-08: FR-WEB-60 |
| BR-120.1 | BRD-10 | Phiên mô tả bỏ dở được lưu sau mỗi lượt; mở lại tiếp đúng chỗ, không hỏi lại câu đã trả lời | M | SRS-01: FR-INT-31 |
| BR-120.2 | BRD-10 | Phiên bỏ dở quá 30 ngày (đề xuất) thì tự huỷ, có nhắc trước 3 ngày | S | SRS-01: FR-INT-31 |
| BR-120.3 | BRD-10 | Mở lại giữ ngữ cảnh: lịch sử chat, đề xuất còn hiệu lực; đề xuất đã cũ so với dữ liệu hiện tại đư… | M | SRS-08: FR-WEB-62 |
| BR-120.4 | BRD-10 | Job lỗi chưa xử lý hiện rõ, thử lại được | M | SRS-08: FR-WEB-61 |
| BR-121.1 | BRD-10 | Yêu cầu mở rộng (thêm zone, loài, NPC, nhiệm vụ, tính năng tuỳ chọn) được ghi vào brief thành phi… | M | SRS-01: FR-INT-33 |
| BR-121.2 | BRD-10 | Thay đổi lớn (thể loại, phong cách, góc nhìn, thời đại, bật/tắt tính năng tuỳ chọn) bắt buộc xác … | M | SRS-01: FR-INT-33 |
| BR-121.3 | BRD-10 | Cập nhật vẫn bám đúng mô tả gốc và style bible đã duyệt (QĐ-11) | M | SRS-01: FR-INT-33 |
| BR-122.1 | BRD-10 | Nhập từ thư mục game (Claude Code) hoặc gói zip; kiểm cấu trúc, schema, provenance, phiên bản eng… | M | SRS-04: FR-CLI-11; SRS-08: FR-WEB-66 |
| BR-122.2 | BRD-10 | Game chưa có brief: sinh brief nháp từ dữ liệu, ghi rõ trường nào suy ra, trường nào thiếu; bắt b… | M | SRS-01: FR-INT-32; SRS-08: FR-WEB-67 |
| BR-122.3 | BRD-10 | Nhập gói vào game đã có trên Web Studio (ví dụ bản vừa sửa bằng Claude Code): hiện khác biệt theo… | S | SRS-08: FR-WEB-69 |
| BR-122.4 | BRD-10 | Asset thiếu provenance khi nhập được giữ nhưng không vào bản xuất bản cho tới khi bổ sung (QT-03-03) | M | SRS-08: FR-WEB-66 |
| BR-123.1 | BRD-10 | Một thao tác "Build phần thay đổi" chỉ build các bước có đầu vào đổi hoặc chưa từng build | M | SRS-04: FR-CLI-09; SRS-08: FR-WEB-63 |
| BR-123.2 | BRD-10 | Trước khi chạy, hiện danh sách bước, zone, ước lượng thời gian; không có gì cần build thì báo rõ | M | SRS-08: FR-WEB-63 |
| BR-123.3 | BRD-10 | Không làm lại việc đã xong: câu trả lời làm rõ, brief đã xác nhận, style đã duyệt, asset đã duyệt… | M | SRS-04: FR-CLI-09 |
| BR-124.1 | BRD-10 | Game dùng engine/schema cũ được gắn cờ "Cần nâng cấp" | S | SRS-08: FR-WEB-68 |
| BR-124.2 | BRD-10 | Nâng cấp chạy trên bản sao: chuyển dữ liệu, build lại phần ảnh hưởng, QA nhẹ, so ảnh trước/sau; c… | S | SRS-04: FR-CLI-10; SRS-08: FR-WEB-68 |
| BR-124.3 | BRD-10 | Nâng cấp lỗi thì dữ liệu, cache và bản xuất bản giữ nguyên | M | SRS-04: FR-CLI-10 |
| BR-125.1 | BRD-10 | Xuất bản game đã có bản cũ luôn tạo bản số mới, không ghi đè bản cũ | M | SRS-04: FR-CLI-12; SRS-08: FR-WEB-64 |
| BR-125.2 | BRD-10 | Bản mới kèm tóm tắt thay đổi so với bản trước | M | SRS-04: FR-CLI-12; SRS-08: FR-WEB-64 |
| BR-125.3 | BRD-10 | Link chơi thử có hai chế độ: cố định (gắn một bản, mặc định) và mới nhất (luôn mở bản mới nhất đạ… | M | SRS-08: FR-WEB-65 |
| BR-125.4 | BRD-10 | Bản cũ chỉ mất khi chủ game gỡ; nhắc gỡ bớt khi giữ quá 10 bản (đề xuất) | S | SRS-08: FR-WEB-64 |
| BR-126.1 | BRD-10 | `/resume-game <id> [yêu cầu]`: đọc tiến độ và ghi chú handoff, tóm tắt ≤ 15 dòng, đề xuất phiếu t… | M | SRS-09: FR-DEV-26 |
| BR-126.2 | BRD-10 | `/import-game <thư mục/gói.zip>`: chạy kiểm nhập, trình brief nháp nếu thiếu, đề xuất phiếu nâng … | M | SRS-09: FR-DEV-27 |
| BR-126.3 | BRD-10 | Ghi chú handoff gắn với từng game để phiên sau làm tiếp mà không phải đọc lại lịch sử dài (tiết k… | M | SRS-09: FR-DEV-26 |

## A.3 Tổng hợp

| Chỉ số | Giá trị |
|---|---|
| BR tổng quan | 126 |
| BR tổng quan chưa phủ | 0 |
| BR chi tiết | 319 |
| BR chi tiết chưa phủ | 0 |
| Yêu cầu chức năng (FR) | 358 |
| FR truy vết trực tiếp tới BR | 351 |
