// T-0020, T-0026 (MOD-CLI-04): API công khai của @gamestudio/packager: texture (PSC-CLI-02 bước 5, 7, 9), glb scene
// mặc định (bước 6), đóng gói zone × tier và manifest/1 cho Unity player (bước 1, 7, 8, 10).
export { PackToolError } from './exec.js';
export { type TextureBudget, type TextureCheck, type TextureReport, textureReport } from './metrics.js';
export {
  ETC1S_ARGS,
  fitWithin,
  type PackedFile,
  type PackedTexture,
  packTextures,
  type TextureInput,
  type TextureOptions,
  UASTC_ARGS,
  vkFormat,
} from './textures.js';
export { GlbError, readGlbJson, withDefaultScene, writeGlb } from './glb.js';
export {
  boundsOf,
  centroid,
  type FileRef,
  fileRef,
  type Manifest,
  modulesOf,
  semverOf,
  spawnOf,
  TIER_ORDER,
  type TierKey,
  type ZoneEntry,
} from './manifest.js';
export {
  packGame,
  type PackGameInput,
  type PackGameResult,
  type PackTierBudget,
  type PackZoneInput,
} from './pack-game.js';
