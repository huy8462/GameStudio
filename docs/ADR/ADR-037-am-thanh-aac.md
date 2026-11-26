# ADR-037: Âm thanh xuất bản dùng AAC (M4A) thay Opus

| Mục | Nội dung |
|---|---|
| Mã | ADR-037 |
| Trạng thái | Đã chốt (Huy, 26/11/2026: đồng ý cập nhật tài liệu theo POC-U1, gồm âm thanh AAC) |
| Ngày | 26/11/2026 |
| Người chốt | Huy |
| Nguồn | POC-U1 Q7 (`docs/POC/POC-U1.md`), OI-CR02-02, CR-02 |
| Thay thế | **ADR-024** phần âm thanh (ffmpeg + libopus, Opus/WebM làm đường chính). Phần glTF, Meshopt, KTX2 của ADR-024 giữ nguyên |

## Bối cảnh và lý do
POC-U1 đo trên Galaxy A56 (Samsung Internet 31, Unity 6000.3.29f1): Unity Web player không phát được Ogg/Opus, phát được AAC trong vỏ M4A. Runtime nay là Unity (ADR-036), nên âm thanh phải theo định dạng Unity Web giải mã được.

## Quyết định
1. Âm thanh xuất bản (hiệu ứng, âm nền, nhạc, giọng NPC tĩnh) mã hoá **AAC-LC trong M4A**: 128 kbps stereo; âm nền và giọng 96 kbps mono. Chuẩn hoá −16 LUFS và cắt lặp giữ nguyên.
2. Một định dạng duy nhất: bỏ bản Opus/WebM và trường `files.opus`; sidecar âm thanh chỉ còn `files.aac`.
3. ffmpeg (bản LGPL) dùng bộ mã `aac` tích hợp; không cần libopus. `engine doctor` kiểm có bộ mã `aac`.
4. Âm thanh ElevenLabs (mp3) chuyển sang M4A ở bước build như mọi âm thanh khác.

## Hệ quả
- Dung lượng âm thanh tăng khoảng 20–30% so với Opus cùng chất lượng; nằm trong ngân sách lõi zone ≤ 8 MB (TSD-00 §7.4) vì âm thanh lõi ít.
- Điểm lặp của AAC có độ trễ đệm đầu (priming): bước `audio` ghi `loopPoints` sau khi trừ độ trễ này và kiểm không click ở mép (FR-AST-24).
- SRS-03 FR-AST-24, TSD-03, DDD-03 và các chỗ nhắc Opus cập nhật theo CR-02.

## Phương án đã loại
- **Giữ Opus, giải mã bằng WASM riêng:** thêm dung lượng player và luồng giải mã ngoài `AudioSource` của Unity.
- **MP3:** điểm lặp kém chính xác hơn AAC, chất lượng thấp hơn cùng bitrate.
- **Hai định dạng (Opus + AAC):** gấp đôi dung lượng lưu trữ mà player chỉ dùng một.
