// T-0018 (MOD-AST-13): chạy thử một tệp từ dòng lệnh, in một dòng JSON (AudioReport).
// Dùng: node engine/build/audio/dist/main.js --in <tệp> --out <thư mục> --id <id> --kind sfx|ambience|music|voice [--loop]
// Mã thoát theo SRS-04 §7.2: 0 đạt, 2 kiểm không đạt, 4 sai đối số/đầu vào, 5 thiếu công cụ, 6 công cụ lỗi.
import { parseArgs } from 'node:util';

import { AUDIO_KINDS, type AudioKind } from './encode.js';
import { AudioToolError } from './ffmpeg.js';
import { processAudio } from './process.js';

const { values } = parseArgs({
  options: {
    in: { type: 'string' },
    out: { type: 'string' },
    id: { type: 'string' },
    kind: { type: 'string' },
    loop: { type: 'boolean', default: false },
  },
});

const kind = values.kind as AudioKind | undefined;
if (
  values.in === undefined ||
  values.out === undefined ||
  values.id === undefined ||
  kind === undefined ||
  !AUDIO_KINDS.includes(kind)
) {
  console.error('ERR-CLI-01 Cần --in, --out, --id, --kind sfx|ambience|music|voice [--loop].');
  process.exitCode = 4;
} else {
  try {
    const report = await processAudio({ id: values.id, kind, input: values.in, outDir: values.out, loop: values.loop });
    console.log(JSON.stringify(report));
    process.exitCode = report.ok ? 0 : 2;
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = e instanceof AudioToolError ? e.code : 4;
  }
}
