// Đọc zip an toàn cho `engine import` (MOD-CLI-09 unpack, PSC-CLI-07 safeUnzip; như TSD-08 ALG-WEB-10): chỉ đọc bảng mục
// lục trung tâm, KHÔNG ghi ra đĩa ở bước này. Chặn: tên có '..'/tuyệt đối/ký tự ổ đĩa, symlink, mã hoá, zip64, nén lạ,
// trùng tên (không phân biệt hoa thường), > 20.000 tệp, tổng giải nén > 2 GB; giải nén kiểm đúng cỡ và CRC-32.
import { crc32, inflateRawSync } from 'node:zlib';

export const MAX_FILES = 20_000;
export const MAX_TOTAL_BYTES = 2 * 1024 ** 3;

export interface ZipEntry {
  name: string;
  size: number;
  read: () => Buffer;
}

export type ZipResult = { ok: true; entries: ZipEntry[] } | { ok: false; path: string; message: string };

const EOCD = 0x06054b50;
const CEN = 0x02014b50;
const LOC = 0x04034b50;

/** Tên tương đối an toàn: '/' phân cách, không rỗng, không '.', '..', không tuyệt đối, không ổ đĩa, không ký tự điều khiển. */
export function safeRelPath(raw: string): string | undefined {
  const p = raw.replace(/\\/g, '/');
  const control = [...p].some((ch) => ch.charCodeAt(0) < 0x20);
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p) || control) return undefined;
  const parts = p.replace(/\/$/, '').split('/');
  if (parts.some((s) => s === '' || s === '.' || s === '..' || s.includes(':'))) return undefined;
  return parts.join('/');
}

export function readZip(buf: Buffer): ZipResult {
  const fail = (path: string, message: string): ZipResult => ({ ok: false, path, message });
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--)
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  if (eocd < 0) return fail('', 'Không phải tệp zip hợp lệ (không thấy mục lục trung tâm).');
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) return fail('', 'Zip64 chưa hỗ trợ.');
  if (count > MAX_FILES) return fail('', `Quá ${MAX_FILES} tệp.`);

  const entries: ZipEntry[] = [];
  const seen = new Set<string>();
  let total = 0;
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== CEN) return fail('', 'Mục lục trung tâm hỏng.');
    const madeBy = buf.readUInt16LE(p + 4);
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const attr = buf.readUInt32LE(p + 38);
    const local = buf.readUInt32LE(p + 42);
    const raw = buf.toString('utf8', p + 46, p + 46 + nlen);
    p += 46 + nlen + elen + clen;

    const name = safeRelPath(raw);
    if (name === undefined) return fail(raw, 'Đường dẫn không an toàn trong zip (../, tuyệt đối hoặc ổ đĩa).');
    const isUnixLink = madeBy >> 8 === 3 && ((attr >>> 16) & 0o170000) === 0o120000;
    if (isUnixLink) return fail(name, 'Symlink trong zip bị chặn.');
    if (flags & 1) return fail(name, 'Tệp mã hoá trong zip bị chặn.');
    if (raw.endsWith('/') || raw.endsWith('\\')) continue; // thư mục
    if (method !== 0 && method !== 8) return fail(name, `Kiểu nén ${method} chưa hỗ trợ.`);
    const key = name.toLowerCase();
    if (seen.has(key)) return fail(name, 'Tên tệp trùng trong zip.');
    seen.add(key);
    total += usize;
    if (total > MAX_TOTAL_BYTES) return fail(name, 'Tổng dung lượng giải nén quá 2 GB.');
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== LOC) return fail(name, 'Header tệp hỏng.');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    if (start + csize > buf.length) return fail(name, 'Dữ liệu tệp vượt quá cỡ zip.');
    entries.push({
      name,
      size: usize,
      read: () => {
        const data = buf.subarray(start, start + csize);
        const out = method === 0 ? Buffer.from(data) : inflateRawSync(data, { maxOutputLength: Math.max(usize, 1) });
        if (out.length !== usize || crc32(out) !== crc) throw new Error(`zip: ${name} sai cỡ hoặc CRC`);
        return out;
      },
    });
  }
  return { ok: true, entries };
}
