# Brief khởi tạo dự án: Engine web game 3D dùng lại được

> Tài liệu bàn giao để mở một dự án mới: xây **engine/bộ công cụ** rồi dùng nó để làm **một web game 3D mới, khác hẳn** dự án hiện có.
> Dự án **Thiền viện online** (web game đi chùa online, cảnh Chùa Thầy) **chỉ là tài liệu tham khảo cách làm**: bài học, quy trình, ràng buộc đã kiểm chứng. Không chuyển code, không dựng lại cảnh của dự án đó.
> Bản 2 (22/11/2026): bổ sung tham khảo các dự án "AI Game Studio" nổi tiếng trên GitHub (mục 3) và cập nhật kiến trúc, quy trình theo đó.
> Bản 3 (22/11/2026 17:31): Huy chốt **lấy threejs-game-skills làm điểm xuất phát** (kéo theo runtime Three.js) và **chỉ hỗ trợ Claude Code**.
> Bản 4 (22/11/2026 17:45): Huy trả lời các câu hỏi mở, ghi thành QĐ-03…08.
> Bản 5 (22/11/2026 17:49): thêm QĐ-09…11 (sinh ảnh/âm thanh, thư viện CC0, bám đúng mô tả).
> Bản 6 (22/11/2026 18:04): thêm QĐ-12 (mô hình 3D CC0). Hết câu hỏi mở, brief sẵn sàng để bắt đầu E0.
> Người quyết định: Huy.

## Quyết định đã chốt

| Mã | Quyết định | Hệ quả |
|---|---|---|
| QĐ-01 | Điểm xuất phát là **majidmanzarpour/threejs-game-skills** (MIT) | Runtime là **Three.js + Vite + TypeScript**. Fork về repo riêng, giữ file LICENSE và ghi công tác giả gốc. Các skill engine bổ sung xây chồng lên bộ này |
| QĐ-02 | **Chỉ hỗ trợ Claude Code** | Không cần adapter cho Codex/Cursor. Dùng trọn tính năng riêng của Claude Code: `.claude/agents`, `.claude/skills`, hook trong `settings.json`, subagent, slash command. Có thể xoá phần hướng dẫn dành cho Codex trong bộ gốc |
| QĐ-03 | **Game do người dùng mô tả.** Engine không gắn với một thể loại, bối cảnh hay phong cách cố định | Engine cần bước tiếp nhận mô tả (`/new-game`): từ mô tả của người dùng, sinh `game-brief.md` một trang cùng `game.json`, `world.json`, `palette.json`, rồi hỏi người dùng xác nhận trước khi dựng. Game mẫu đầu tiên ở E6–E7 cũng làm theo cách này |
| QĐ-04 | **Thiết bị tối thiểu: Samsung Galaxy A56** | Ngân sách mặc định trong `budgets.json` lấy theo số đã kiểm chứng trên A56 (mục 2); mọi cổng có đo hiệu năng đều đo trên A56 |
| QĐ-05 | **Địa hình hỗ trợ cả hai nguồn:** dữ liệu thật (OSM/DEM) và sinh thủ tục | Module `world`/`terrain` có hai bộ nạp cùng xuất một định dạng trung gian (heightmap + mask + vector đường/nước). Có thể trộn: nền DEM thật, chi tiết thêm bằng noise thủ tục |
| QĐ-06 | **Dùng add-on Blender (Sapling Tree Gen, A.N.T. Landscape) và viết code bổ sung** | Script Blender headless gọi add-on qua Python, phần thiếu (biến thể lá, LOD, impostor, xói mòn theo vùng) viết thêm bằng code. Cố định phiên bản Blender và add-on trong `engine doctor` |
| QĐ-07 | **Dùng nội bộ** | Không phát hành ra ngoài. Vẫn giữ nguyên file LICENSE và thông báo bản quyền MIT của threejs-game-skills trong repo; ghi công trong `UPSTREAM.md` |
| QĐ-08 | **Không dùng Meshy hay Tripo; asset do Claude tự thiết kế** | Mọi asset 3D được sinh bằng code: hình học thủ tục trong Three.js/TypeScript hoặc script Python cho Blender headless, cùng texture thủ tục. Bỏ skill `threejs-3d-generator`. Xem rủi ro và cách giảm ở mục 4.5 |
| QĐ-09 | **Cho dùng sinh ảnh (Gemini) và âm thanh (ElevenLabs)** của bộ gốc | Giữ `threejs-image-generator` và `threejs-audio-generator`. Dùng cho texture, decal, ảnh concept/tham chiếu, UI, âm thanh môi trường và hiệu ứng. Khoá API để trong biến môi trường, dùng script probe của bộ gốc (không in giá trị khoá); hook chặn đọc `.env`. Mỗi lần sinh ghi provenance (prompt, model, ngày) |
| QĐ-10 | **Cho dùng thư viện CC0** (ví dụ Poly Haven: vật liệu scan, HDRI bầu trời) | Module `materials` có bộ nạp CC0: tải về kho cục bộ, ghi nguồn và license CC0 vào provenance, chuẩn hoá về độ phân giải theo tier rồi nén KTX2. Kết hợp với vật liệu thủ tục như cách đã hiệu quả ở Thiền viện online |
| QĐ-11 | **Engine phải bám đúng mô tả** của người dùng, không tự đề xuất đổi phong cách | Bước `/new-game` không được thay đổi thể loại hay phong cách. Nếu mô tả cần asset khó sinh bằng code (nhân vật, tượng chi tiết), engine vẫn làm đúng phong cách đó, chỉ báo rõ mức rủi ro chất lượng và tăng đầu tư cho các asset ấy (mục 4.5) |
| QĐ-12 | **Cho dùng mô hình 3D CC0 làm nguồn bổ sung**, nhất là cho nhân vật và tượng (bổ sung cho QĐ-08) | Thứ tự ưu tiên khi cần một asset 3D: (1) mô hình CC0 phù hợp phong cách mô tả, (2) generator code của Claude, (3) chỉnh mô hình CC0 bằng code/Blender cho khớp. Mô hình CC0 đi qua `asset-import`: kiểm license CC0, chuẩn hoá scale/pivot/trục, decimate và LOD theo ngân sách A56, đồng bộ vật liệu với bảng màu, gắn bộ khung xương dùng chung nếu là nhân vật, ghi provenance (nguồn, URL, tác giả, ngày tải). Vẫn không dùng Meshy/Tripo |

---

## 1. Mục tiêu

1. Xây một **engine web 3D theo hướng dữ liệu** (data-driven). Một game mới được tạo chủ yếu bằng cách viết file cấu hình và nạp asset, ít phải viết code mới.
2. Đi kèm một **"studio AI" gọn nhẹ** cho Claude Code: agent, skill, rule, hook, template nằm trong `.claude/`, giúp mọi phiên làm việc theo cùng một quy trình.
3. Dùng engine để làm **game mẫu đầu tiên**: một web game 3D mới, sinh từ mô tả của người dùng (QĐ-03).
4. **Tiết kiệm token.** Claude viết công cụ một lần. Việc lặp lại do script, dữ liệu và bộ kiểm tra tự động đảm nhận.
5. Chất lượng hình ảnh cao trên trình duyệt, chạy được trên điện thoại tầm trung.

### Ngoài phạm vi
- Tự viết renderer cấp thấp. Engine xây **trên** một engine web có sẵn.
- Sao chép code, asset hay cảnh từ Thiền viện online.
- Sao nguyên một framework studio AI cỡ lớn (40–50 agent). Chỉ mượn cấu trúc, xem mục 3.

---

## 2. Tham khảo từ Thiền viện online: điều nên làm và nên tránh

| # | Kinh nghiệm thực tế | Áp dụng cho engine mới |
|---|---|---|
| 1 | Dựng lại cảnh (v1 → v2) phải viết lại gần hết công cụ vì công cụ gắn chặt với cảnh cụ thể | Công cụ theo tham số, nhận dữ liệu đầu vào, không chứa giá trị cứng của cảnh |
| 2 | Địa hình do AI 3D sinh ra xấu; địa hình sinh bằng code từ DEM cộng xói mòn đẹp hơn | Địa hình sinh bằng code (heightmap thật hoặc thủ tục) |
| 3 | AI 3D (Meshy) tốt cho công trình, tượng, nhân vật; tượng và nhân vật dựng tay bằng Blender từng bị đánh giá chưa đạt | Engine mới không dùng AI 3D (QĐ-08), nên phải đầu tư vào generator tham số và chọn phong cách hợp với asset thủ tục (mục 4.5) |
| 4 | Baked lighting cùng vật liệu scan CC0 tạo bước nhảy chất lượng lớn nhất | Bake ánh sáng là tính năng lõi |
| 5 | Ngân sách hiệu năng phải chỉnh nhiều lần sau khi đo trên máy thật | Hệ tier chất lượng và bộ đo tự động ngay từ pha đầu |
| 6 | Build mỗi phiếu rất chậm; máy dev không có GPU | Build tăng dần, cache theo hash; bộ chụp/đo có mức nhẹ và đầy đủ |
| 7 | Cho Claude xem nhiều ảnh chụp là khoản tốn token lớn nhất | Script tự tính chỉ số và so ảnh; Claude chỉ xem vài ảnh khi qua cổng |
| 8 | Đổi phong cách mỹ thuật giữa chừng buộc làm lại toàn bộ | Chốt style bible và bảng màu trước khi sản xuất asset |
| 9 | Phân vai rõ (chat điều phối, Claude Code thực thi), làm qua phiếu và cổng "xác nhận" thì kiểm soát tốt | Giữ quy trình phiếu, cổng, ADR |
| 10 | Cân nhắc đổi runtime (Unity/Unreal) khi đã làm sâu thì rất tốn | Chọn runtime ở E0 qua pilot nhỏ; dữ liệu cảnh trung lập (glTF + manifest) |

### Ràng buộc kỹ thuật tham chiếu (điều chỉnh lại cho game mới)
- Thiết bị tối thiểu từng dùng: Samsung Galaxy A56 (web mobile).
- Tier: Thấp / Vừa / Cao / Tối đa; texture 2048² (Thấp/Vừa), 4096² (Cao/Tối đa).
- Một cảnh lớn đã chạy được trên A56 với khoảng 450k tri tĩnh, 650k mặc định, ≤ 120 draw call, ≤ 32 vật liệu.
- Nén: KTX2 (UASTC cho vật liệu cần nét, ETC1S cho phần còn lại), có cờ fallback; mesh dùng Meshopt hoặc Draco.
- Công cụ: Windows, Blender headless qua script (có Sapling, A.N.T.). Địa hình thật lấy từ OSM (ODbL) và Copernicus GLO-30. Thiền viện online từng dùng Meshy; engine mới **không** dùng (QĐ-08).
- Phát hành bản thử lên máy chủ poc để mở trên điện thoại. Publish không đồng nghĩa với duyệt.

---

## 3. Tham khảo các dự án AI Game Studio trên GitHub (khảo sát 22/11/2026)

### 3.1 Các dự án đã xem

| Dự án | Là gì | Điểm đáng học | Điểm cần tránh |
|---|---|---|---|
| **Donchitos/Claude-Code-Game-Studios** (CCGS, MIT) | Bộ cấu hình `.claude/` biến một phiên Claude Code thành studio: khoảng 49 agent, 72–74 skill, hook, rule, khoảng 62 template. Có bộ chuyên gia cho Godot, Unity, Unreal | Agent 3 tầng (director → lead → specialist), gán mô hình theo tầng (director dùng Opus, lead programmer và nhiều specialist dùng Sonnet). Rule áp theo đường dẫn file. Skill cổng `/gate-check`. Hook chặn đọc nguyên file tài liệu lớn hơn 40 KB và trả về danh sách heading. Một tham số `modes.rigor` (minimal / standard / full) điều khiển độ nặng quy trình. Thay đổi hiển thị với người chơi bắt buộc có ảnh chụp từ game đang chạy | Bề mặt quá lớn: mỗi hook là một chỗ phiên có thể kẹt. Tự kiểm thử của chính dự án: cùng một brief, bản `standard` viết 30 tài liệu (58 phút) trước khi code nhưng bị xếp hạng **cuối** khi đánh giá mù. Tài liệu nhiều chỉ tăng truy vết, không làm game hay hơn. Có báo cáo khoảng 500k token chỉ cho tài liệu thiết kế của một game cỡ Flappy Bird (bản cũ) |
| **majidmanzarpour/threejs-game-skills** (MIT) | 9 skill cho Claude Code/Codex để làm game Three.js trên trình duyệt | Skill `threejs-game-director` điều phối các skill chuyên môn (gameplay, đồ hoạ, UI, debug/profiler, QA/release, sinh asset). Mức kiểm tra tỷ lệ với độ lớn thay đổi. Giữ một ghi chú dự án gọn (ràng buộc, việc đã xong, asset đang chờ, bước tiếp). Khung Vite + TypeScript + Three.js. Hook kiểm thử tất định với RNG có seed. Playwright cho smoke test, visual regression, bot playtest. Canvas inspector đo pixel và ngân sách render trên desktop và mobile. Bắt buộc ghi hiệu năng khi đổi đồ hoạ. Khi hết credit sinh asset thì chuyển sang asset thủ tục; khi lỗi tạm thời thì khôi phục job cũ thay vì trả tiền gửi job mới | Thiên về game cỡ nhỏ và vừa; chưa có pipeline cảnh lớn hay địa hình thật. Không nêu ngân sách hiệu năng bằng số |
| **MRCalderon3D/everything-game-dev-code** | Scaffold nhiều engine (Unity, Unreal, Godot, HTML/JS), nhiều harness (Claude Code, Codex, Cursor…) | Tách các lớp rules / agents / commands / skills / contexts / hooks; manifest cài theo profile. `rules/common/` dùng chung, mỗi engine một thư mục riêng để quy ước không lẫn nhau. Các harness đọc từ một nguồn chung qua adapter mỏng. Asset sinh ra có file provenance đi kèm, asset không có provenance coi như chưa có license. Hỏi xác nhận khi chi phí sinh asset vượt ngưỡng. Có `doctor` chẩn đoán cài đặt | Rất lớn (khoảng 42 agent, 86 skill); không nói về quản lý token |
| **OpenBMB/ChatDev**, **GameGPT** (bài báo) | Nghiên cứu đa agent mô phỏng công ty phần mềm và làm game | Ý tưởng phân vai và kiểm tra chéo giữa các agent; GameGPT tách nhỏ việc sinh code để giảm ảo giác và trùng lặp | Chỉ phù hợp game nhỏ (2048, Gomoku); không dùng làm nền cho game 3D lớn |
| **MCP cho engine/cảnh** (Unity-MCP, Unreal MCP, các MCP cho Three.js và Blender; dự án 67.js/crucible của CodePawl) | Cho agent xem và sửa cảnh trực tiếp qua MCP | Hữu ích để debug cảnh: xem scene graph, vật liệu, đèn mà không phải đọc code | Mỗi lần gọi trả về nhiều dữ liệu, tốn token. Chỉ dùng khi debug, không dùng làm đường sản xuất chính |

### 3.2 Kết luận áp dụng

1. **Mượn cấu trúc, không mượn quy mô.** Dùng mô hình `.claude/` (agent, skill, rule, hook, template) nhưng chỉ khoảng **6–8 agent** và **10–15 skill**.
2. **Mặc định quy trình nhẹ** (tương đương `rigor=minimal`) cho đến khi game mẫu có vòng chơi tối thiểu. Sau đó chỉ tăng độ chặt cho từng hệ thống quan trọng.
3. **Một skill "director" điều phối** thay vì gọi nhiều agent; mức kiểm tra tỷ lệ với thay đổi.
4. **Bằng chứng bắt buộc nhưng rẻ:** ảnh chụp từ game đang chạy, báo cáo hiệu năng JSON, visual regression so với baseline. Claude đọc số liệu trước, chỉ xem ảnh khi chỉ số báo khác biệt.
5. **Hook bảo vệ token:** chặn đọc nguyên file lớn (trả về heading), chặn đọc `.glb`/texture/log dài, chặn lệnh phá huỷ và đọc file bí mật.
6. **Asset có kỷ luật:** mỗi asset có provenance sidecar (công thức, tham số, seed, phiên bản generator). Vì không dùng AI 3D (QĐ-08), "fallback sang asset thủ tục" của bộ gốc trở thành đường chính.
7. **Đã chốt (QĐ-01): dùng threejs-game-skills làm điểm xuất phát**, rồi mở rộng thêm pipeline cảnh lớn (địa hình, thực vật, bake ánh sáng, stream zone) mà bộ gốc chưa có.

---

## 4. Kiến trúc đề xuất

### 4.1 Nguyên tắc
1. **Dữ liệu điều khiển game:** `game.json`, `world.json`, `palette.json`, `budgets.json`, `entities/*.json`.
2. **Ba tầng tách biệt:**
   - **Nguồn:** heightmap/OSM hoặc tham số thủ tục, ảnh tham chiếu, **công thức asset** (`assets/recipes/*.json`) kèm provenance.
   - **Build offline:** Python cùng Blender headless sinh địa hình, thực vật, bố trí, bake ánh sáng, LOD, nén. Đầu ra là glTF/KTX2 cộng manifest và báo cáo JSON.
   - **Runtime web:** nạp manifest, stream theo zone, chọn tier, camera, nhân vật, tương tác, UI.
3. **Engine tách khỏi game:** repo engine riêng; mỗi game là repo hoặc thư mục `games/<tên>/` chỉ chứa dữ liệu, asset và ít script gameplay.
4. **Module nhỏ:** khoảng 300 dòng mỗi file trở xuống, interface rõ ràng, README ngắn, có test.
5. **Tất định:** RNG có seed cho mọi bước sinh thủ tục và test, để kết quả lặp lại được và so sánh được.
6. **Mọi bước build trả báo cáo JSON:** tri, draw, vật liệu, dung lượng, thời gian, pass/fail theo ngân sách.

### 4.2 Các module của engine

| Nhóm | Module | Chức năng |
|---|---|---|
| Build | `game-intake` | Từ mô tả của người dùng sinh `game-brief.md` và bộ file dữ liệu khởi tạo (QĐ-03) |
| Build | `world` | Hệ toạ độ, vùng chơi, zone; hai bộ nạp OSM/DEM và thủ tục, trộn được (QĐ-05) |
| Build | `terrain` | Mesh địa hình chia chunk, xói mòn, splat map, LOD |
| Build | `water` | Mặt nước, bờ, shader, đối tượng trên mặt nước |
| Build | `vegetation` | Rừng, cây rải rác, cỏ (Sapling + code bổ sung), instancing, impostor ở xa |
| Build | `placement` | Bố trí đối tượng theo luật (mật độ, tránh đường, bám địa hình) |
| Build | `kit-builder` | Lắp công trình từ bộ kit module theo spec tham số |
| Build | `asset-import` | Nạp mô hình 3D CC0 (QĐ-12): kiểm license, chuẩn hoá, LOD, retarget khung xương, đồng bộ vật liệu, provenance |
| Build | `asset-forge` | Sinh asset 3D bằng code từ công thức: thư viện primitive tham số (cột, mái, tường, đá, thùng, đồ vật…), mesh hữu cơ bằng SDF/metaball/sculpt script Blender, nhân vật từ bộ khung dùng chung; tự sinh LOD, UV, provenance (QĐ-08) |
| Build | `materials` | Ba nguồn vật liệu: thủ tục, scan CC0 (QĐ-10), texture sinh bằng Gemini (QĐ-09); bảng màu; texture theo tier; HDRI bầu trời CC0 |
| Build | `lighting` | Bake lightmap/AO, thời điểm trong ngày |
| Build | `packager` | Gộp draw call, atlas, nén, manifest theo zone và tier, cache theo hash |
| Runtime | `core` | Vòng lặp, nạp manifest, stream zone, chọn tier tự động |
| Runtime | `camera-player` | Flycam, orbit, người chơi, va chạm, điều khiển cảm ứng |
| Runtime | `fx` | Sương, hậu kỳ, hạt, thời tiết, bầu trời |
| Runtime | `interaction` | Điểm tương tác, sự kiện, hội thoại, điều khiển bằng dữ liệu |
| Runtime | `ui-audio` | HUD, menu, safe area mobile, âm thanh |
| QA | `qa` | Playwright smoke, chụp góc chuẩn, visual regression, canvas inspector, đo fps/bộ nhớ, bot playtest, kiểm ngân sách |
| Công cụ | `cli` | `engine new-game`, `engine build --zone`, `engine qa --level=nhe\|day-du`, `engine publish`, `engine doctor` |

### 4.3 Runtime web (đã chốt theo QĐ-01)

**Three.js + Vite + TypeScript**, dùng khung scaffold có sẵn trong threejs-game-skills.

Pilot ở E0 không còn để chọn runtime nữa, mà để **đo mức nền**: cảnh mẫu từ scaffold gốc chạy trên điện thoại mục tiêu, ghi fps, draw call, bộ nhớ làm baseline. Babylon.js, PlayCanvas và Unity WebGL không còn được xem xét.

Phần engine phải tự bổ sung trên Three.js: stream theo zone, LOD/impostor, instancing quy mô lớn, nạp lightmap bake, chọn tier tự động, KTX2/Meshopt loader.

### 4.3b Cách mở rộng threejs-game-skills

| Bộ gốc | Giữ / sửa | Bổ sung của engine |
|---|---|---|
| `threejs-game-director` | Giữ làm điểm vào chính; sửa để đọc `project.yaml` (rigor, ngân sách, tier) và giao việc cho các skill mới bên dưới | — |
| `threejs-gameplay-systems` | Giữ | Thêm luật: gameplay đọc từ `entities/*.json` |
| `threejs-aaa-graphics-builder` | Giữ; nối scorecard với `budgets.json` (số cụ thể theo tier) | `engine-lighting-bake`, `engine-materials` |
| `threejs-game-ui-designer` | Giữ | — |
| `threejs-debug-profiler` | Giữ; xuất báo cáo JSON theo định dạng chung | `/perf-snapshot` |
| `threejs-qa-release` | Giữ; thêm mức nhẹ/đầy đủ | `/qa-light`, `/qa-full`, `/visual-diff` |
| `threejs-3d-generator` (Tripo) | **Bỏ** (QĐ-08) | `engine-asset-forge` (asset 3D bằng code từ công thức) |
| `threejs-image-generator` (Gemini), `threejs-audio-generator` (ElevenLabs) | **Giữ** (QĐ-09); thêm ghi provenance và chuẩn hoá đầu ra (texture theo tier, âm thanh nén) | `engine-texture-proc` (texture thủ tục), `engine-cc0` (nạp vật liệu scan, HDRI và mô hình 3D từ thư viện CC0, QĐ-10, QĐ-12) |
| — | — | `engine-intake` (mô tả → brief + dữ liệu), `engine-world` (địa hình hai nguồn, nước, thực vật, bố trí), `engine-packager` (zone, tier, nén, cache), `engine-blender` (script headless, Sapling, A.N.T.) |

Nguyên tắc fork: mỗi thay đổi so với bộ gốc ghi vào `UPSTREAM.md` để sau này lấy bản mới của tác giả mà không mất phần đã sửa.

### 4.4 "Studio AI" gọn cho Claude Code (`.claude/`)

| Thành phần | Nội dung đề xuất |
|---|---|
| **Agent (6–8)** | `director` (Opus): phạm vi, cổng, kiến trúc. `engine-dev` (Sonnet): code engine. `tech-artist` (Sonnet): vật liệu, ánh sáng, shader, ngân sách. `world-builder` (Sonnet): địa hình, thực vật, bố trí. `asset-designer` (Opus khi viết generator mới, Sonnet khi chỉnh tham số): asset bằng code, Blender, nén, provenance. `gameplay-ui` (Sonnet): tương tác, UI, âm thanh. `qa` (Sonnet/Haiku): test, chụp, đo, báo cáo. `docs` (Haiku): tài liệu, ADR, changelog |
| **Skill (bộ gốc + 10–15 skill engine)** | 9 skill của threejs-game-skills (mục 4.3b), cộng thêm: `/start`, `/new-game`, `/ticket` (tạo phiếu theo mẫu), `/build-zone`, `/qa-light`, `/qa-full`, `/perf-snapshot`, `/visual-diff`, `/gate-check`, `/asset-recipe` (tạo hoặc chỉnh công thức asset), `/adr`, `/publish-poc`, `/handoff` (ghi chú dự án gọn) |
| **Rule theo đường dẫn** | `engine/runtime/**`: không cấp phát trong vòng lặp nóng. `engine/build/**`: tất định, có seed. `games/**/data/**`: không giá trị cứng ngoài dữ liệu. `prototypes/**`: nới lỏng |
| **Hook** | Chặn đọc nguyên file .md lớn hơn khoảng 40 KB (trả về heading). Chặn đọc `.glb`, `.ktx2`, ảnh lớn, log dài. Kiểm JSON dữ liệu khi ghi. Chặn lệnh phá huỷ và đọc `.env`. Nhắc chạy `/perf-snapshot` khi sửa thư mục đồ hoạ. Giữ số hook ít và "cảnh báo" nhiều hơn "chặn" |
| **Template** | Phiếu (có dòng "Mô hình khuyến nghị"), ADR, style bible, spec zone, spec công trình, báo cáo cổng |
| **Cấu hình** | `project.yaml` có `rigor: minimal\|standard\|full` và ghi đè theo hệ thống; `CLAUDE.md` ngắn |

### 4.5 Asset do Claude tự thiết kế (QĐ-08): rủi ro và cách làm

**Rủi ro cần biết trước.** Ở Thiền viện online, tượng và nhân vật dựng tay bằng Blender đã bị đánh giá chưa đạt, và đó là lý do chuyển sang Meshy. Asset sinh bằng code rất mạnh với vật thể cứng và có quy luật (kiến trúc, đá, đồ vật, địa hình, cây), nhưng yếu với vật thể hữu cơ chi tiết (mặt người, tượng, động vật). Chất lượng phụ thuộc nhiều vào phong cách người dùng chọn.

**Cách giảm rủi ro:**
0. **Tìm mô hình CC0 trước (QĐ-12).** Với nhân vật và tượng, trước tiên tìm mô hình CC0 hợp phong cách mô tả. Chỉ khi không có mới viết generator. Mô hình CC0 tìm được vẫn phải qua cổng turntable và ngân sách A56.
1. **Generator tham số, viết một lần.** Claude viết generator cho từng họ asset (ví dụ "mái ngói", "nhà một gian", "cây lá kim", "đá tảng"), sau đó mọi biến thể chỉ là JSON tham số và seed. Đây cũng là cách tiết kiệm token: không để Claude "vẽ" từng asset riêng lẻ.
2. **Bám đúng phong cách người dùng mô tả (QĐ-11).** Không đổi phong cách. Nếu mô tả cần nhiều nhân vật hoặc tượng chi tiết, `/new-game` ghi rõ trong brief những asset rủi ro cao, rồi đầu tư nhiều hơn vào chúng: generator chuyên biệt, nhiều vòng duyệt turntable hơn.
3. **Nhân vật:** một bộ khung xương dùng chung, thân ghép từ các khối tham số, animation thủ tục (đi, đứng, cúi) viết bằng code; giữ số nhân vật cận cảnh ít.
4. **Vật liệu và ánh sáng gánh chất lượng:** vật liệu scan CC0, texture sinh bằng Gemini (vải, da, hoa văn, chạm khắc dạng normal/height map), HDRI CC0, bake ánh sáng và hậu kỳ thường nâng cảm giác chân thực hơn so với tăng chi tiết hình học.
4b. **Dùng Gemini làm ảnh tham chiếu:** sinh ảnh chính diện, mặt bên, mặt sau của nhân vật hay tượng theo đúng phong cách mô tả, để generator bám theo tỷ lệ và hình khối.
5. **Cổng kiểm tra riêng cho asset:** ảnh turntable 4 góc cộng thông số (tri, vật liệu, kích thước texture) theo ngân sách A56; người dùng duyệt trước khi đưa vào cảnh.

---

## 5. Quy tắc làm việc với Claude để tiết kiệm token

1. **CLAUDE.md ngắn** (dưới khoảng 150 dòng): luật, cấu trúc thư mục, lệnh CLI, chỉ dẫn tới ADR.
2. **Quy trình nhẹ mặc định** (`rigor: minimal`) đến khi có vòng chơi; không viết tài liệu thiết kế dài trước khi có prototype chạy được.
3. **Phiếu có phạm vi hẹp**, ghi sẵn module và file được đọc. Chạy `/clear` giữa các phiếu. Dùng `/handoff` để lưu ghi chú gọn thay vì giữ context dài.
4. **Mỗi phiếu bắt đầu bằng dòng "Mô hình khuyến nghị"** gồm mô hình và mức effort.
   - Opus (high/xhigh): kiến trúc, thuật toán mới, cổng duyệt.
   - Sonnet (medium): chỉnh tham số, script lặp, sửa nhỏ, test.
   - Haiku: đổi tên, tài liệu, việc cơ học.
5. **Hook chặn đọc file lớn và nhị phân.** Dùng `grep`/`tail`, báo cáo JSON, tóm tắt.
6. **Ảnh:** QA tự chụp, so baseline, đo pixel. Claude chỉ xem 2–4 ảnh khác biệt nhất khi qua cổng. Mức nhẹ là mặc định; mức đầy đủ chỉ dùng trước cổng lớn.
7. **MCP xem cảnh trực tiếp chỉ dùng khi debug**, không dùng trong luồng sản xuất thường ngày.
8. **Build tăng dần:** chỉ dựng lại module có đầu vào thay đổi.
9. **Giao việc theo lô;** phiên chat điều phối và đánh giá, Claude Code thực thi, cổng duyệt là lời "xác nhận" của Huy.

---

## 6. Lộ trình đề xuất

| Pha | Nội dung | Cổng |
|---|---|---|
| E0 | Fork threejs-game-skills về repo engine, ghi `UPSTREAM.md`, bỏ phần dành cho Codex và skill `threejs-3d-generator`. Chạy scaffold gốc, đo baseline trên Galaxy A56. Ghi ADR-001…008 theo QĐ-01…08. Dựng `.claude/` tối giản (agent, hook, template), `project.yaml`, CLAUDE.md, định dạng dữ liệu. Chỉ đọc CCGS để tham khảo cấu trúc, không clone | G-E0 |
| E1 | `game-intake` (mô tả → brief + dữ liệu) + `core` + `world` (hai nguồn) + `terrain` + `qa` khung (Playwright smoke, chụp, perf snapshot, báo cáo JSON) + `cli` cơ bản | G-E1 |
| E2 | `materials` (thủ tục + CC0 + Gemini) + `engine-texture-proc` + `packager` + `camera-player`; style bible và bảng màu sinh từ brief | G-E2 |
| E3 | `vegetation` + `water` + `fx`; visual regression baseline | G-E3 |
| E4 | `asset-import` (mô hình CC0, retarget khung xương) + `asset-forge` (generator tham số, công thức, provenance, cổng turntable) + `kit-builder` + `placement` | G-E4 |
| E5 | `lighting` bake, thời điểm trong ngày | G-E5 |
| E6 | `interaction` + `ui-audio`: vòng chơi tối thiểu; bot playtest. Từ đây có thể nâng `rigor` cho từng hệ thống | G-E6 |
| E7 | Game mẫu (theo mô tả người dùng đưa ra ở thời điểm này) hoàn chỉnh một zone: tối ưu theo tier, đo trên Galaxy A56 | G-E7 |
| E8 | Tài liệu, mẫu `engine new-game`, thử tạo nhanh một game thứ hai cỡ nhỏ để chứng minh dùng lại được | G-E8 |

Tiêu chí thành công ở E8: tạo được một cảnh chơi được cho game mới chủ yếu bằng dữ liệu; thời gian build và token mỗi phiếu thấp hơn rõ rệt so với cách làm của Thiền viện online.

---

## 7. Câu hỏi mở

Không còn. Toàn bộ câu hỏi đã được trả lời và ghi thành QĐ-01…12 ở đầu tài liệu. Câu hỏi mới phát sinh trong quá trình làm sẽ ghi vào `docs/OPEN-ITEMS.md` của repo engine.

---

## 8. Tài liệu tham khảo

### Dự án Thiền viện online (chỉ đọc, `C:\Thien-vien-online`)
- `docs\TSD\ADR\`: ADR-012 (pipeline Meshy), 013 (lai Meshy/Blender), 014 (địa hình bằng code), 016 (ngân sách GPU), 018 (dựng lại v2)
- `docs\TSD\PHAM-VI-VA-LO-TRINH-3D.md`: cách chia pha, cổng, phiếu
- `docs\UIUX\`: ART-00/01/02 (mẫu style bible, bảng màu)
- `tasks\` và CLAUDE.md: mẫu phiếu và quy trình

### GitHub và bài phân tích
- Claude Code Game Studios: https://github.com/Donchitos/Claude-Code-Game-Studios
- Phân tích mức rigor và kết quả tự kiểm thử của CCGS: https://www.developersdigest.tech/blog/claude-code-game-studios-49-agents-rigor-analysis-2026
- Three.js Game Skills: https://github.com/majidmanzarpour/threejs-game-skills
- Everything Game Dev Code: https://github.com/MRCalderon3D/everything-game-dev-code
- ChatDev: https://github.com/OpenBMB/ChatDev — GameGPT: https://arxiv.org/abs/2310.08067
- Tổng hợp MCP cho engine game: https://chatforest.com/reviews/game-development-mcp-servers/
