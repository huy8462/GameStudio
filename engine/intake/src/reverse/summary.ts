// summarizeData (MOD-INT-23, PSC-INT-13, CFG-INT-07): tóm tắt dữ liệu game ≤ 6 KB cho mô hình reverse_brief.
// Mỗi dòng "<tệp>#<JSON Pointer> = <giá trị JSON>"; thứ tự tất định: game.json, world.json, entities/, dialogue/, còn lại.
// Mảng số (toạ độ) rút gọn thành một dòng; chuỗi cắt 120 ký tự; bỏ "$schema". Chỉ đọc JSON, không chạy gì.
import { REVERSE_SUMMARY_MAX_BYTES } from '../config.js';
import type { GameDataFiles } from '../types.js';

export interface DataSummary {
  text: string;
  /** Con trỏ đã có dòng trong bản tóm tắt. */
  paths: string[];
  truncated: boolean;
}

const MAX_STR = 120;
const esc = (k: string): string => k.replace(/~/g, '~0').replace(/\//g, '~1');
const isNum = (v: unknown): v is number => typeof v === 'number';

function flatten(ptr: string, v: unknown, out: [string, string][]): void {
  if (Array.isArray(v)) {
    if (v.length > 0 && v.every(isNum)) out.push([ptr, v.length <= 4 ? JSON.stringify(v) : `"[${v.length} số]"`]);
    else if (v.length > 0 && v.every((x) => Array.isArray(x) && x.every(isNum)))
      out.push([ptr, `"[${v.length} điểm]"`]);
    else if (v.length === 0) out.push([ptr, '[]']);
    else v.forEach((x, i) => flatten(`${ptr}/${i}`, x, out));
    return;
  }
  if (typeof v === 'object' && v !== null) {
    const keys = Object.keys(v).filter((k) => k !== '$schema');
    if (keys.length === 0) out.push([ptr, '{}']);
    for (const k of keys) flatten(`${ptr}/${esc(k)}`, (v as Record<string, unknown>)[k], out);
    return;
  }
  const s = typeof v === 'string' && v.length > MAX_STR ? `${v.slice(0, MAX_STR)}…` : v;
  out.push([ptr, JSON.stringify(s) ?? 'null']);
}

/** Nội dung (game, world, thực thể, thoại) trước số liệu kỹ thuật (budgets, palette…) để không bị cắt ở 6 KB. */
const order = (k: string): string =>
  k === 'game.json'
    ? '0'
    : k === 'world.json'
      ? '1'
      : k.startsWith('entities/')
        ? `2${k}`
        : k.startsWith('dialogue/')
          ? `3${k}`
          : `4${k}`;

/** Giá trị tại con trỏ '<tệp>#<JSON Pointer>' (undefined nếu không có). */
export function valueAt(data: GameDataFiles, ptr: string): unknown {
  const i = ptr.indexOf('#');
  if (i < 0) return undefined;
  let v: unknown = data[ptr.slice(0, i)];
  for (const raw of ptr
    .slice(i + 1)
    .split('/')
    .slice(1)) {
    const k = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (typeof v !== 'object' || v === null) return undefined;
    v = (v as Record<string, unknown>)[k];
  }
  return v;
}

/** Dạng gọn cho dòng đầu: mảng/đối tượng chỉ ghi số mục (giá trị đầy đủ nằm ở các dòng sau). */
export const compact = (v: unknown): unknown =>
  Array.isArray(v) ? `[${v.length} mục]` : typeof v === 'object' && v !== null ? '{…}' : v;

/** `head`: dòng đặt đầu (vd nguồn của trường suy tất định), luôn giữ trong giới hạn nếu đủ chỗ. */
export function summarizeData(
  data: GameDataFiles,
  head: readonly [string, unknown][] = [],
  maxBytes: number = REVERSE_SUMMARY_MAX_BYTES,
): DataSummary {
  const lines: [string, string][] = head.map(([p, v]) => [p, JSON.stringify(v) ?? 'null']);
  for (const file of Object.keys(data).sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0)))
    flatten(`${file}#`, data[file], lines);
  const enc = new TextEncoder();
  const kept: string[] = [];
  const paths = new Set<string>();
  let bytes = 0;
  let truncated = false;
  for (const [p, v] of lines) {
    if (paths.has(p)) continue; // dòng đầu đã có con trỏ này
    const line = `${p} = ${v}\n`;
    const n = enc.encode(line).length;
    if (bytes + n > maxBytes) {
      truncated = true;
      break;
    }
    bytes += n;
    kept.push(line);
    paths.add(p);
  }
  return { text: kept.join(''), paths: [...paths], truncated };
}

/** Con trỏ `p` có căn cứ: trùng một dòng, hoặc là tiền tố (nút cha) của một dòng trong bản tóm tắt. */
export const coveredBy = (paths: readonly string[], p: string): boolean =>
  paths.some((x) => x === p || x.startsWith(`${p}/`));
