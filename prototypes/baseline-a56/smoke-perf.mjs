// Kiểm nhanh trên máy dev (không phải số đo A56): mở dist/ bằng Chromium giả lập viewport A56,
// chờ ?perf=1 xong và in JSON. Dùng: node prototypes/baseline-a56/smoke-perf.mjs [dpr]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const DIST = resolve(fileURLToPath(import.meta.url), '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  const path = normalize(new URL(req.url ?? '/', 'http://x').pathname).replace(/^([\\/])+/, '');
  const file = join(DIST, path === '' ? 'index.html' : path);
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const dpr = process.argv[2] ? `&dpr=${process.argv[2]}` : '';
  await page.goto(`http://127.0.0.1:${port}/?perf=1${dpr}`);
  await page.waitForFunction(() => window.__GS_PERF__ !== undefined, null, { timeout: 120_000 });
  const sample = await page.evaluate(() => window.__GS_PERF__);
  process.stdout.write(JSON.stringify({ ok: errors.length === 0, errors, sample }) + '\n');
} finally {
  await browser.close();
  server.close();
}
