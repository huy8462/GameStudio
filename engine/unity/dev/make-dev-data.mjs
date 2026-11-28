// T-0022 (DTO-RTM-01 manifest/1): sinh dữ liệu thử cho bản build cục bộ của player.
// Chép 16 chunk glb địa hình của POC-U1 (đầu ra thật của bước terrain.mesh) vào <out>/data và ghi manifest.json.
// Đây là dữ liệu kiểm khung, không phải đầu ra packager. Dùng: node engine/unity/dev/make-dev-data.mjs [thư mục build]
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const src = join(repo, 'prototypes/unity-baseline-a56/UnityProject/Assets/StreamingAssets/terrain');
const out = resolve(process.argv[2] ?? join(here, '../Build/player'));
const zoneDir = join(out, 'data/zones/z1');
mkdirSync(zoneDir, { recursive: true });

const CHUNK_M = 64;
const names = readdirSync(src)
  .filter((n) => n.endsWith('.glb'))
  .sort()
  .slice(0, 16);
if (names.length === 0) throw new Error(`Không thấy glb ở ${src}`);

let minX = Infinity;
let minZ = Infinity;
let maxX = -Infinity;
let maxZ = -Infinity;
const core = names.map((name) => {
  const bytes = readFileSync(join(src, name));
  copyFileSync(join(src, name), join(zoneDir, name));
  // Tên tệp là chỉ số chunk "<ix>_<iz>.glb" trên lưới 64 m.
  const [ix, iz] = name.replace('.glb', '').split('_').map(Number);
  minX = Math.min(minX, ix * CHUNK_M);
  minZ = Math.min(minZ, iz * CHUNK_M);
  maxX = Math.max(maxX, (ix + 1) * CHUNK_M);
  maxZ = Math.max(maxZ, (iz + 1) * CHUNK_M);
  return { path: `zones/z1/${name}`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});

const manifest = {
  schema: 'manifest/1',
  gameId: 'dev-khung-player',
  engineVersion: '0.1.0',
  schemaVersion: 1,
  tiers: ['thap', 'vua', 'cao', 'toi_da'],
  startZone: 'z1',
  spawn: { zone: 'z1', pos: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2], yaw: 0 },
  zones: [
    {
      id: 'z1',
      bounds: { min: [minX, minZ], max: [maxX, maxZ] },
      neighbors: [],
      parts: Object.fromEntries(['thap', 'vua', 'cao', 'toi_da'].map((t) => [t, { core, full: [] }])),
    },
  ],
  modules: {},
};
writeFileSync(join(out, 'data/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const total = core.reduce((s, f) => s + f.bytes, 0);
console.log(JSON.stringify({ ok: true, out: 'data/manifest.json', files: core.length, bytes: total }));
