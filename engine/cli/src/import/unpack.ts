// Nguồn nhập (MOD-CLI-09 unpack, PSC-CLI-07): thư mục hoặc zip → danh sách tệp tương đối (chưa ghi gì). Thư mục: chặn
// symlink/junction, tệp đặc biệt; zip: readZip. Bỏ qua build/, .intake/, .git/, node_modules/, data.bak-*/ (tạo lại
// được hoặc của máy khác). Gốc game là nơi có data/game.json, hoặc thư mục con duy nhất chứa nó (zip của cả thư mục).
import { lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { MAX_FILES, MAX_TOTAL_BYTES, readZip, safeRelPath } from './zip.js';

export interface SourceFile {
  size: number;
  read: () => Buffer;
}

export interface Problem {
  code: string;
  path: string;
  message: string;
}

export type SourceTree =
  { ok: true; files: Map<string, SourceFile>; skipped: string[] } | { ok: false; problem: Problem };

const SKIP_TOP = [/^build$/, /^\.intake$/, /^\.git$/, /^node_modules$/, /^data\.bak-/];
const p3 = (path: string, message: string): { ok: false; problem: Problem } => ({
  ok: false,
  problem: { code: 'ERR-CLI-03', path, message },
});

function fromDir(root: string): SourceTree {
  const files = new Map<string, SourceFile>();
  const skipped: string[] = [];
  let total = 0;
  const walk = (dir: string, rel: string): Problem | undefined => {
    for (const name of readdirSync(dir).sort()) {
      const abs = join(dir, name);
      const r = rel === '' ? name : `${rel}/${name}`;
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) return { code: 'ERR-CLI-03', path: r, message: 'Symlink/junction bị chặn.' };
      if (st.isDirectory() && rel === '' && SKIP_TOP.some((re) => re.test(name))) skipped.push(`${name}/`);
      else if (st.isDirectory()) {
        const bad = walk(abs, r);
        if (bad) return bad;
      } else if (st.isFile()) {
        if (safeRelPath(r) === undefined) return { code: 'ERR-CLI-03', path: r, message: 'Tên tệp không an toàn.' };
        total += st.size;
        if (files.size >= MAX_FILES) return { code: 'ERR-CLI-03', path: r, message: `Quá ${MAX_FILES} tệp.` };
        if (total > MAX_TOTAL_BYTES) return { code: 'ERR-CLI-03', path: r, message: 'Tổng dung lượng quá 2 GB.' };
        files.set(r, { size: st.size, read: () => readFileSync(abs) });
      } else return { code: 'ERR-CLI-03', path: r, message: 'Tệp đặc biệt bị chặn.' };
    }
    return undefined;
  };
  const bad = walk(root, '');
  return bad ? { ok: false, problem: bad } : { ok: true, files, skipped };
}

function fromZip(path: string): SourceTree {
  if (statSync(path).size > MAX_TOTAL_BYTES) return p3('', 'Gói zip quá 2 GB.');
  const z = readZip(readFileSync(path));
  if (!z.ok) return p3(z.path, z.message);
  return { ok: true, files: new Map(z.entries.map((e) => [e.name, { size: e.size, read: e.read }])), skipped: [] };
}

/** Bỏ thư mục bọc ngoài (nếu có) và các thư mục không nhập. */
function normalize(t: Extract<SourceTree, { ok: true }>): SourceTree {
  let files = t.files;
  if (!files.has('data/game.json')) {
    const tops = new Set([...files.keys()].map((k) => k.split('/')[0]));
    const [top] = [...tops];
    if (tops.size === 1 && top !== undefined && files.has(`${top}/data/game.json`))
      files = new Map([...files].map(([k, v]) => [k.slice(top.length + 1), v]));
  }
  const out = new Map<string, SourceFile>();
  const skipped = new Set<string>(t.skipped);
  for (const [k, v] of files) {
    const top = k.split('/')[0] ?? '';
    if (k.includes('/') && SKIP_TOP.some((re) => re.test(top))) skipped.add(`${top}/`);
    else out.set(k, v);
  }
  return { ok: true, files: out, skipped: [...skipped].sort() };
}

export function readSource(src: string): SourceTree {
  let st;
  try {
    st = statSync(src);
  } catch {
    return p3('', 'Không thấy thư mục hoặc tệp nguồn.');
  }
  if (st.isDirectory()) {
    if (lstatSync(src).isSymbolicLink()) return p3('', 'Nguồn là symlink: bị chặn.');
    const t = fromDir(src);
    return t.ok ? normalize(t) : t;
  }
  if (src.toLowerCase().endsWith('.zip')) {
    const t = fromZip(src);
    return t.ok ? normalize(t) : t;
  }
  return p3('', 'Nguồn phải là thư mục game hoặc gói .zip.');
}
