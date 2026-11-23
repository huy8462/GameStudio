// deriveSeed (MOD-GEN-02, ALG-GEN-01): 4 byte đầu SHA-256(parts.join('|')) big-endian, uint32.
// SHA-256 đồng bộ thuần JS (@noble/hashes) để chạy được cả trình duyệt lẫn Node mà không cần crypto.subtle.
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

export function deriveSeed(...parts: (string | number)[]): number {
  const d = sha256(utf8ToBytes(parts.map(String).join('|')));
  return (((d[0] ?? 0) << 24) | ((d[1] ?? 0) << 16) | ((d[2] ?? 0) << 8) | (d[3] ?? 0)) >>> 0;
}
