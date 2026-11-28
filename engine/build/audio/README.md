# @gamestudio/audio

Âm thanh ở bước build (MOD-AST-13, PSC-AST-11, ALG-AST-11, FR-AST-24; ADR-037). Một tệp nguồn (wav, mp3, flac…) ra `<id>.m4a` (AAC-LC) và sidecar `<id>.audio.json` (schema `audio/1`, DTO-AST-05). Cần `ffmpeg`, `ffprobe` trên PATH (`engine doctor` kiểm bộ mã `aac`).

## Trình tự (`processAudio`)

1. Đo âm lượng (`loudnorm` lượt 1), chuẩn hoá về −16 LUFS, đỉnh −1,5 dBTP (lượt 2, `linear=true`), ra PCM 48 kHz.
2. Nếu `loop`: dời điểm cắt về zero-crossing gần nhất (±20 ms), trộn chéo 50 ms cuối vào đầu (đẳng công suất, làm bằng mã). Rồi chèn 100 ms cuối vòng vào trước và 100 ms đầu vòng vào sau, vì AAC mã hoá kém ở khung đầu và cuối tệp.
3. Đo lại và bù âm lượng một lần (không vượt trần đỉnh).
4. Mã hoá `aac`: `sfx`/`music` 128 kbps stereo, `ambience`/`voice` 96 kbps mono (CFG-AST-05). Cờ bitexact, bỏ metadata: hai lần chạy ra cùng sha256.
5. Giải mã lại để kiểm: codec AAC-LC, âm lượng lệch ≤ 0,5 LU, độ dài lệch ≤ 20 ms, bước nhảy ở mép lặp.

`loopPoints` trỏ vào phần giữa tệp (sau 100 ms đệm), đã trừ độ trễ priming mà `ffprobe` báo (`start_time`; ffmpeg ghi edit list nên hiện là 0). **Player phải lặp theo `loopPoints`**, không lặp cả clip.

Kiểm mép (`seam`): đạt khi bước nhảy giữa mẫu cuối và mẫu đầu của đoạn lặp ≤ 0,01 (thang 1,0), hoặc không lớn hơn phân vị 99 của bước nhảy giữa hai mẫu liền nhau trong chính tệp đó (âm nhiều tần số cao tự nhiên đã nhảy hơn 0,01 mỗi mẫu).

## Dùng

```ts
import { processAudio } from '@gamestudio/audio';
const report = await processAudio({ id: 'amb-rung', kind: 'ambience', input: 'src.wav', outDir: 'out', loop: true });
// report.ok, report.checks[], report.sha256, report.sidecar
```

Chạy thử một tệp (in một dòng JSON; thoát 0 đạt, 2 kiểm không đạt, 4 sai đầu vào, 5 thiếu ffmpeg, 6 ffmpeg lỗi):

```
node engine/build/audio/dist/main.js --in src.wav --out out --id amb-rung --kind ambience --loop
node engine/cli/dist/main.js validate out/amb-rung.audio.json --schema engine/schema/schemas/audio/1.json
```

## Chưa có

Gán âm nền theo `world.ambience[]` (`ambience.ts`), bước chân theo bề mặt, bước build `audio` có `step.json`, âm thanh ElevenLabs (E6).
