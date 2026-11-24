// JSON Patch RFC 6902 (MOD-GEN-06, DTO-GEN-04; TSD-00 §2.4 #1: mọi ghi dữ liệu đi qua applyPatch).
// Bất biến: trả bản mới, phần không đổi dùng chung. Lỗi ở một op → không đổi gì (nguyên tử).
import { canonicalize } from './jcs.js';
import {
  type Json,
  parsePointer,
  pointerAdd,
  pointerGet,
  pointerHas,
  PointerError,
  pointerRemove,
  pointerSet,
} from './pointer.js';
import type { SchemaKind } from './registry.js';
import { kindByPath, validate, type ValidationError } from './validate.js';

export type JsonPatchOp =
  | { op: 'add' | 'replace' | 'test'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'move' | 'copy'; path: string; from: string };

export type PatchResult =
  | { ok: true; value: { doc: Json; touchedFiles: string[] } }
  | { ok: false; error: { code: 'patch'; message: string; opIndex: number } }
  | { ok: false; error: { code: 'schema'; message: string; errors: Record<string, ValidationError[]> } };

const clone = (v: unknown): Json => JSON.parse(JSON.stringify(v)) as Json;

function applyOne(doc: Json, op: JsonPatchOp): Json {
  switch (op.op) {
    case 'add':
      return pointerAdd(doc, op.path, clone(op.value));
    case 'replace':
      return pointerSet(doc, op.path, clone(op.value));
    case 'remove':
      return pointerRemove(doc, op.path);
    case 'test':
      if (canonicalize(pointerGet(doc, op.path)) !== canonicalize(op.value)) {
        throw new PointerError(`test thất bại tại ${op.path}`);
      }
      return doc;
    case 'copy':
      return pointerAdd(doc, op.path, pointerGet(doc, op.from));
    case 'move': {
      if (op.path === op.from) return doc;
      if (op.path.startsWith(`${op.from}/`)) throw new PointerError(`Không move vào chính con của nó: ${op.path}`);
      const v = pointerGet(doc, op.from);
      return pointerAdd(pointerRemove(doc, op.from), op.path, v);
    }
  }
}

/** Tệp bị chạm = token đầu của path (và from), vd '/world.json/zones/0' → 'world.json'. */
export function touchedFilesOf(ops: readonly JsonPatchOp[]): string[] {
  const set = new Set<string>();
  for (const op of ops) {
    for (const p of 'from' in op ? [op.path, op.from] : [op.path]) {
      const first = parsePointer(p)[0];
      if (first !== undefined) set.add(first);
    }
  }
  return [...set].sort();
}

export interface ApplyOptions {
  /** Kiểm schema các tệp bị chạm (khoá tài liệu là đường dẫn tương đối `data/`, vd 'world.json'). */
  validate?: boolean;
}

export function applyPatch(doc: Json, ops: readonly JsonPatchOp[], opts: ApplyOptions = {}): PatchResult {
  let cur = doc;
  for (const [i, op] of ops.entries()) {
    try {
      cur = applyOne(cur, op);
    } catch (e) {
      return { ok: false, error: { code: 'patch', message: e instanceof Error ? e.message : String(e), opIndex: i } };
    }
  }
  const touchedFiles = touchedFilesOf(ops);
  if (opts.validate === true && typeof cur === 'object' && cur !== null && !Array.isArray(cur)) {
    const errors: Record<string, ValidationError[]> = {};
    for (const f of touchedFiles) {
      const kind: SchemaKind | undefined = kindByPath(`data/${f}`);
      if (kind === undefined || !(f in cur)) continue;
      const errs = validate(kind, cur[f]);
      if (errs.length > 0) errors[f] = errs;
    }
    if (Object.keys(errors).length > 0) {
      return { ok: false, error: { code: 'schema', message: 'Dữ liệu sau khi sửa sai schema', errors } };
    }
  }
  return { ok: true, value: { doc: cur, touchedFiles } };
}

/**
 * Patch đảo (hoàn tác): áp `ops` lên `docBefore` rồi trả các op đưa kết quả về lại `docBefore`.
 * Mỗi op được đảo theo trạng thái ngay trước nó; thứ tự đảo ngược. Ném lỗi nếu `ops` không áp được.
 */
export function invertPatch(docBefore: Json, ops: readonly JsonPatchOp[]): JsonPatchOp[] {
  const inverse: JsonPatchOp[] = [];
  let cur = docBefore;
  for (const op of ops) {
    switch (op.op) {
      case 'add':
        inverse.push(
          pointerHas(cur, op.path) && !isArrayInsert(cur, op.path)
            ? { op: 'replace', path: op.path, value: pointerGet(cur, op.path) }
            : { op: 'remove', path: resolveDash(cur, op.path) },
        );
        break;
      case 'replace':
        inverse.push({ op: 'replace', path: op.path, value: pointerGet(cur, op.path) });
        break;
      case 'remove':
        inverse.push({ op: 'add', path: op.path, value: pointerGet(cur, op.path) });
        break;
      case 'copy':
        inverse.push({ op: 'remove', path: resolveDash(cur, op.path) });
        break;
      case 'move':
        inverse.push({ op: 'move', from: resolveDash(applyOne(cur, op), op.path, true), path: op.from });
        break;
      case 'test':
        break;
    }
    cur = applyOne(cur, op);
  }
  return inverse.reverse();
}

function parentAndLast(ptr: string): [string, string] {
  const i = ptr.lastIndexOf('/');
  return [ptr.slice(0, i), ptr.slice(i + 1)];
}

function isArrayInsert(doc: Json, ptr: string): boolean {
  const [parent] = parentAndLast(ptr);
  return Array.isArray(pointerGet(doc, parent));
}

/** Đổi chỉ số '-' (cuối mảng) thành chỉ số thật để op đảo trỏ đúng phần tử. */
function resolveDash(doc: Json, ptr: string, after = false): string {
  const [parent, last] = parentAndLast(ptr);
  if (last !== '-') return ptr;
  const arr = pointerGet(doc, parent);
  const len = Array.isArray(arr) ? arr.length : 0;
  return `${parent}/${after ? len - 1 : len}`;
}
