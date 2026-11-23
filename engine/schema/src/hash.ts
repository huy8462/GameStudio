// Băm dữ liệu (MOD-GEN-05). SHA-256 đồng bộ thuần JS (@noble/hashes) chạy cả Node lẫn trình duyệt,
// nên một bản dùng chung, không cần exports điều kiện "browser"/"node" như DDD gợi ý (cùng kết quả, ít bề mặt).
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { canonicalize } from './jcs.js';

export function sha256Hex(data: string | Uint8Array): string {
  return bytesToHex(sha256(typeof data === 'string' ? utf8ToBytes(data) : data));
}

/** Băm một giá trị JSON sau chuẩn tắc hoá: không đổi khi đổi thứ tự khoá (TST-GEN-03). */
export function jsonHash(value: unknown): string {
  return sha256Hex(canonicalize(value));
}

/**
 * `dataHash` của một phiên bản game (TSD-00 §5.3): SHA-256 của chuỗi nối `path + '\n' + canonicalize(json) + '\n'`
 * theo đường dẫn đã sắp (so theo đơn vị mã, không theo locale).
 */
export function dataHash(files: Readonly<Record<string, unknown>>): string {
  const parts = Object.keys(files)
    .sort()
    .map((p) => `${p}\n${canonicalize(files[p])}\n`);
  return sha256Hex(parts.join(''));
}
