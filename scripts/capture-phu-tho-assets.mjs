/**
 * Playwright: ghi danh sách URL /data/ khi chạy tour Phú Thọ local.
 * Output: asset-urls-full.txt (merge thủ công vào asset-urls.txt nếu cần)
 *
 *   npm start
 *   node scripts/capture-phu-tho-assets.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const url =
  process.env.PHU_THO_URL || 'http://localhost:8765/phu-tho-bac-tp-ca-mau/';
const outFile = join(import.meta.dirname, '..', 'asset-urls-full.txt');

const assets = new Set();
const missing = new Set();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('response', (res) => {
  const u = res.url();
  if (!u.includes('/data/') && !u.includes('phu-tho')) return;
  if (res.status() === 200) assets.add(u);
  if (res.status() === 404) missing.add(u);
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(3000);

for (const sel of [
  '[name="skin_btn_dollhouse"]',
  '[name*="dollhouse"]',
  '[name*="3dmodel"]',
  'layer[name*="doll"]',
]) {
  try {
    const el = page.locator(sel).first();
    if (await el.count()) {
      await el.click({ timeout: 2000 });
      await page.waitForTimeout(2000);
    }
  } catch {}
}

await page.waitForTimeout(5000);
await browser.close();

const list = [...assets].sort();
writeFileSync(outFile, list.join('\n'), 'utf8');
console.log('OK:', list.length, '→', outFile);
if (missing.size) {
  console.warn('404:', missing.size);
  [...missing].slice(0, 10).forEach((u) => console.warn(' ', u));
}
