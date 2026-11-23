// JSON Canonicalization Scheme, RFC 8785 (MOD-GEN-04). Dùng trước mọi phép băm dữ liệu (ALG-GEN-02, TST-GEN-03).
// - Khoá sắp theo đơn vị mã UTF-16 (so sánh chuỗi mặc định của JS, KHÔNG dùng localeCompare).
// - Số theo Number.prototype.toString của ECMAScript (đúng quy tắc RFC 8785 §3.2.2.3); -0 → "0".
// - Chuỗi: JSON.stringify của ES2019+ đã escape tối thiểu và đúng surrogate lẻ như RFC 8785 yêu cầu.
// - Từ chối NaN, Infinity, undefined (kể cả trong mảng), hàm, symbol, bigint; bỏ qua khoá có giá trị undefined như JSON.

export class JcsError extends Error {}

export function canonicalize(value: unknown): string {
  return ser(value, '$');
}

function ser(v: unknown, at: string): string {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'boolean':
      return v ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(v)) throw new JcsError(`${at}: số không hữu hạn (${String(v)})`);
      return Object.is(v, -0) ? '0' : String(v);
    case 'string':
      return JSON.stringify(v);
    case 'object': {
      if (Array.isArray(v)) return `[${v.map((x, i) => ser(x, `${at}[${i}]`)).join(',')}]`;
      const proto = Object.getPrototypeOf(v) as unknown;
      if (proto !== Object.prototype && proto !== null) {
        throw new JcsError(`${at}: chỉ nhận object thuần (gặp ${(v as object).constructor?.name ?? 'lạ'})`);
      }
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${ser(obj[k], `${at}.${k}`)}`).join(',')}}`;
    }
    default:
      throw new JcsError(`${at}: kiểu không hợp lệ trong JSON (${typeof v})`);
  }
}
