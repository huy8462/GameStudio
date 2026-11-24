// JSON Pointer RFC 6901 (MOD-GEN-06): đọc/ghi/xoá bất biến, chia sẻ cấu trúc không đổi.
// Dữ liệu web lưu dạng { "game.json": {...}, "entities/npc/ong-lao.json": {...} } nên '/' trong tên tệp mã hoá '~1'.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export class PointerError extends Error {}

export function parsePointer(ptr: string): string[] {
  if (ptr === '') return [];
  if (!ptr.startsWith('/')) throw new PointerError(`Con trỏ phải bắt đầu bằng '/': ${ptr}`);
  return ptr
    .slice(1)
    .split('/')
    .map((t) => t.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function formatPointer(tokens: readonly string[]): string {
  return tokens.map((t) => `/${t.replace(/~/g, '~0').replace(/\//g, '~1')}`).join('');
}

const isObj = (v: unknown): v is Record<string, Json> => typeof v === 'object' && v !== null && !Array.isArray(v);

function arrayIndex(arr: readonly Json[], tok: string, forAdd: boolean): number {
  if (forAdd && tok === '-') return arr.length;
  if (!/^(0|[1-9]\d*)$/.test(tok)) throw new PointerError(`Chỉ số mảng không hợp lệ: ${tok}`);
  const i = Number(tok);
  if (i > arr.length || (!forAdd && i === arr.length)) throw new PointerError(`Chỉ số ngoài phạm vi: ${tok}`);
  return i;
}

export function pointerHas(doc: Json, ptr: string): boolean {
  try {
    pointerGet(doc, ptr);
    return true;
  } catch {
    return false;
  }
}

export function pointerGet(doc: Json, ptr: string): Json {
  let cur: Json = doc;
  for (const tok of parsePointer(ptr)) {
    if (Array.isArray(cur)) cur = cur[arrayIndex(cur, tok, false)] as Json;
    else if (isObj(cur) && Object.hasOwn(cur, tok)) cur = cur[tok] as Json;
    else throw new PointerError(`Không có đường dẫn: ${ptr}`);
  }
  return cur;
}

type Mode = 'add' | 'replace' | 'remove';

function setIn(cur: Json, tokens: readonly string[], value: Json | undefined, mode: Mode, ptr: string): Json {
  const [tok, ...rest] = tokens;
  if (tok === undefined) {
    if (mode === 'remove') throw new PointerError('Không xoá được gốc tài liệu');
    return value as Json;
  }
  if (Array.isArray(cur)) {
    const last = rest.length === 0;
    const i = arrayIndex(cur, tok, last && mode === 'add');
    const copy = cur.slice();
    if (!last) copy[i] = setIn(cur[i] as Json, rest, value, mode, ptr);
    else if (mode === 'add') copy.splice(i, 0, value as Json);
    else if (mode === 'replace') copy[i] = value as Json;
    else copy.splice(i, 1);
    return copy;
  }
  if (isObj(cur)) {
    const has = Object.hasOwn(cur, tok);
    if (rest.length > 0) {
      if (!has) throw new PointerError(`Không có đường dẫn: ${ptr}`);
      return { ...cur, [tok]: setIn(cur[tok] as Json, rest, value, mode, ptr) };
    }
    if (mode !== 'add' && !has) throw new PointerError(`Không có đường dẫn: ${ptr}`);
    if (mode === 'remove') {
      const { [tok]: _removed, ...others } = cur;
      return others;
    }
    return { ...cur, [tok]: value as Json };
  }
  throw new PointerError(`Không đi vào giá trị nguyên thuỷ: ${ptr}`);
}

/** add (RFC 6902): chèn vào mảng hoặc đặt khoá; cha phải tồn tại. */
export function pointerAdd(doc: Json, ptr: string, value: Json): Json {
  return setIn(doc, parsePointer(ptr), value, 'add', ptr);
}

/** replace: đích phải tồn tại. */
export function pointerSet(doc: Json, ptr: string, value: Json): Json {
  return setIn(doc, parsePointer(ptr), value, 'replace', ptr);
}

export function pointerRemove(doc: Json, ptr: string): Json {
  return setIn(doc, parsePointer(ptr), undefined, 'remove', ptr);
}
