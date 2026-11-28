// T-0026 (MOD-CLI-04, PSC-CLI-02 bước 6): mọi glb đóng gói có `scene` mặc định.
// POC-U1: glTFast không dựng gì khi glb thiếu `scene`; terrain.mesh (T-0010) ghi scenes nhưng không ghi scene.
// Sửa thẳng chunk JSON của GLB 2.0 (không giải nén lưới, không đổi BIN), tất định: cùng đầu vào → cùng byte.

const MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a; // 'JSON'

export class GlbError extends Error {}

interface GltfJson {
  scene?: number;
  scenes?: unknown[];
  [k: string]: unknown;
}

/** Tách chunk JSON của GLB 2.0; trả JSON và phần còn lại (chunk BIN nguyên vẹn). */
export function readGlbJson(buf: Buffer): { json: GltfJson; rest: Buffer } {
  if (buf.length < 20 || buf.readUInt32LE(0) !== MAGIC) throw new GlbError('không phải GLB');
  if (buf.readUInt32LE(4) !== 2) throw new GlbError(`GLB phiên bản ${buf.readUInt32LE(4)}, cần 2`);
  const len = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== CHUNK_JSON) throw new GlbError('chunk đầu không phải JSON');
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as GltfJson;
  return { json, rest: buf.subarray(20 + len) };
}

/** Ghép lại GLB từ JSON (đệm khoảng trắng tới bội 4) và phần chunk còn lại. */
export function writeGlb(json: GltfJson, rest: Buffer): Buffer {
  let text = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (text.length % 4)) % 4;
  if (pad > 0) text = Buffer.concat([text, Buffer.alloc(pad, 0x20)]);
  const head = Buffer.alloc(20);
  head.writeUInt32LE(MAGIC, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + text.length + rest.length, 8);
  head.writeUInt32LE(text.length, 12);
  head.writeUInt32LE(CHUNK_JSON, 16);
  return Buffer.concat([head, text, rest]);
}

/** Đặt `scene: 0` khi glb có cảnh mà thiếu cảnh mặc định; đã có thì trả nguyên bộ đệm. */
export function withDefaultScene(buf: Buffer): { buf: Buffer; changed: boolean } {
  const { json, rest } = readGlbJson(buf);
  if (json.scene !== undefined) return { buf, changed: false };
  if (!Array.isArray(json.scenes) || json.scenes.length === 0) throw new GlbError('glb không có cảnh nào');
  return { buf: writeGlb({ ...json, scene: 0 }, rest), changed: true };
}
