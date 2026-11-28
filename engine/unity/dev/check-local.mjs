// T-0022 (EP-RTM-01 ?perf=1; SEQ-RTM-01): phục vụ bản build cục bộ ở 127.0.0.1, mở bằng Chromium headless,
// chờ player tới DangChay và (khi ?perf=1) JSON đo; in một dòng JSON {url, state, errors, failed, perf}.
// Dùng: node engine/unity/dev/check-local.mjs [thư mục build] [query, mặc định "?perf=1"]
// Máy dev không có GPU: fps ở đây chỉ để biết chạy được, không phải số hiệu năng.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] ?? join(here, '../Build/player'));
const query = process.argv[3] ?? '?perf=1';
const timeoutMs = Number(process.env.GS_CHECK_TIMEOUT_MS ?? 180_000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2',
  '.m4a': 'audio/mp4',
};

// Không gửi Content-Encoding (như máy chủ poc): player tự giải nén Brotli bằng decompression fallback.
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
  let file = join(root, rel);
  if (!file.startsWith(root + sep) && file !== root) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, {
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    'Content-Length': statSync(file).size,
    // Bản đa luồng (T-0019, Build/player-mt) cần cô lập nguồn gốc để có SharedArrayBuffer.
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  });
  createReadStream(file).pipe(res);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/${query}`;

const out = { url: query, state: null, errors: [], warnings: [], failed: [], perf: null };
const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => out.errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') out.errors.push(m.text().slice(0, 300));
    // Lệnh vẽ bị WebGL từ chối chỉ hiện ở mức cảnh báo nhưng nghĩa là có vật không được vẽ: tính là lỗi.
    else if (m.text().includes('GL_INVALID_OPERATION')) out.errors.push(m.text().slice(0, 300));
    else if (m.type() === 'warning') out.warnings.push(m.text().slice(0, 200));
  });
  page.on('response', (r) => r.status() >= 400 && out.failed.push(`${r.status()} ${new URL(r.url()).pathname}`));
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  const want = query.includes('perf=1')
    ? () => globalThis.__GS_PERF__ || globalThis.__GS_STATE__ === 'Loi'
    : () => ['SanSang', 'DangChay', 'Loi'].includes(globalThis.__GS_STATE__);
  await page.waitForFunction(want, null, { timeout: timeoutMs, polling: 500 }).catch(() => {});
  out.state = await page.evaluate(() => globalThis.__GS_STATE__ ?? null);
  out.perf = await page.evaluate(() => globalThis.__GS_PERF__ ?? null);
} finally {
  await browser.close();
  server.close();
}
out.warnings = out.warnings.slice(0, 15);
console.log(JSON.stringify(out));
process.exitCode =
  out.errors.length === 0 && out.failed.length === 0 && out.state !== 'Loi' && out.state !== null ? 0 : 1;
