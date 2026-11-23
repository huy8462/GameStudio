// Kiểm một URL đã xuất bản chạy được (không đo): mở bằng Chromium giả lập viewport A56, chờ 6 giây,
// báo lỗi trang/console và yêu cầu hỏng. URL lấy từ biến môi trường GS_CHECK_URL để không lộ mã trong lệnh.
import { chromium } from '@playwright/test';

const url = process.env.GS_CHECK_URL;
if (!url) throw new Error('Thiếu GS_CHECK_URL');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true });
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${new URL(r.url()).pathname.split('/').slice(-2).join('/')}`));
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForTimeout(6000);
  const diag = await page.evaluate(() => {
    const d = window.__THREE_GAME_DIAGNOSTICS__;
    return d ? { frame: d.frame, calls: d.renderer.calls, tris: d.renderer.triangles, canvas: `${d.canvas.width}x${d.canvas.height}` } : null;
  });
  const panel = await page.evaluate(() => document.querySelector('pre')?.textContent?.slice(0, 80) ?? null);
  // GS_SHOT=<đường dẫn .png>: chụp màn hình (ảnh minh hoạ cho báo cáo cổng, không phải ảnh từ A56).
  if (process.env.GS_SHOT) await page.screenshot({ path: process.env.GS_SHOT });
  process.stdout.write(JSON.stringify({ ok: errors.length === 0 && failed.length === 0 && diag !== null && diag.frame > 10, errors, failed, diag, panel }) + '\n');
} finally {
  await browser.close();
}
