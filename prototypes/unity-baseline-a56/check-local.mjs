// POC-U1 (CR-02, ADR-036; FR-QA-07): mở bản build ở URL cục bộ bằng Chromium headless, chờ JSON ?perf=1,
// in một dòng JSON {url, errors, failed, perf}. Dùng: $env:GS_CHECK_URL='http://127.0.0.1:18090/?perf=1'; node check-local.mjs
import { chromium } from '@playwright/test';

const url = process.env.GS_CHECK_URL;
if (!url) throw new Error('Thiếu GS_CHECK_URL');
const timeoutMs = Number(process.env.GS_CHECK_TIMEOUT_MS ?? 180_000);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'] });
const out = { url, errors: [], warnings: [], failed: [], perf: null };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => out.errors.push(String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') out.errors.push(m.text().slice(0, 300));
    else if (m.type() === 'warning') out.warnings.push(m.text().slice(0, 200));
  });
  page.on('response', (r) => r.status() >= 400 && out.failed.push(`${r.status()} ${new URL(r.url()).pathname}`));
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  if (url.includes('perf=1')) {
    await page.waitForFunction(() => window.__POC_PERF__, null, { timeout: timeoutMs, polling: 500 }).catch(() => {});
    out.perf = await page.evaluate(() => window.__POC_PERF__ ?? null);
  } else {
    await page.waitForTimeout(15_000);
  }
} finally {
  await browser.close();
}
out.warnings = out.warnings.slice(0, 15);
console.log(JSON.stringify(out));
