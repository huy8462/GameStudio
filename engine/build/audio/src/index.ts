// T-0018 (MOD-AST-13): API công khai của @gamestudio/audio.
export { AUDIO_KINDS, type AudioKind, type EncodeProfile, profileFor } from './encode.js';
export { AudioToolError } from './ffmpeg.js';
export { CROSSFADE_MS, makeLoop, measureSeam, nearestZeroCrossing, ZERO_SEARCH_MS } from './loop.js';
export { SAMPLE_RATE, TARGET_LUFS, TARGET_TP } from './loudnorm.js';
export {
  type AudioCheck,
  type AudioJob,
  type AudioReport,
  type AudioSidecar,
  DURATION_TOLERANCE_S,
  LUFS_TOLERANCE,
  processAudio,
  SEAM_LIMIT,
} from './process.js';
