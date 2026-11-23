// Mẫu đường dẫn và lệnh (DDD-09 MOD-DEV-07). Không phụ thuộc gói ngoài (IF-DEV-02).
import { readFileSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';

export const P = JSON.parse(readFileSync(new URL('./patterns.json', import.meta.url), 'utf8'));

/** '\' → '/', bỏ 'C:' viết hoa khác nhau; so không phân biệt hoa thường (Windows). */
export function norm(p) {
  return String(p).replace(/\\/g, '/').toLowerCase();
}

/** Glob đơn giản → RegExp: "**" + "/" = 0..n thư mục, "**" = mọi thứ, "*" = trong một đoạn, "?" = một ký tự. */
export function globToRegExp(glob) {
  let re = '';
  const g = norm(glob);
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      if (g[i + 2] === '/') {
        re += '(?:.*/)?';
        i += 2;
      } else {
        re += '.*';
        i += 1;
      }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  // Glob bắt đầu bằng **/ khớp ở bất kỳ đâu trong đường dẫn tuyệt đối.
  return new RegExp(g.startsWith('**/') ? `(?:^|/)${re.slice('(?:.*/)?'.length)}$` : `^${re}$`);
}

const cache = new Map();
export function matchAny(path, globs) {
  const n = norm(path);
  return globs.some((g) => {
    if (!cache.has(g)) cache.set(g, globToRegExp(g));
    return cache.get(g).test(n);
  });
}

/** Đường dẫn tương đối so với thư mục dự án ('/' ngăn cách); null nếu nằm ngoài. */
export function relToProject(path, dir) {
  if (!path) return null;
  const abs = isAbsolute(path) ? path : `${dir}/${path}`;
  const rel = relative(dir, abs).replace(/\\/g, '/');
  return rel.startsWith('..') || isAbsolute(rel) ? null : rel;
}

export function isSecretPath(p) {
  return matchAny(p, P.secretPaths) && !matchAny(p, P.secretAllow);
}

const bashRules = P.bash.map((r) => ({ ...r, re: new RegExp(r.regex, r.flags) }));

/** → {code, rule} khi lệnh nguy hiểm hoặc đọc bí mật; null nếu không. */
export function dangerousBash(cmd) {
  if (typeof cmd !== 'string') return null;
  const hit = bashRules.find((r) => r.re.test(cmd));
  return hit ? { code: hit.code, rule: hit.id } : null;
}
