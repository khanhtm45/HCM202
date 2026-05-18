/**
 * Playwright — thu URL khi load https://binhthuan.hochiminh.vn/
 */
import { chromium } from 'playwright';
import { mkdir, writeFileSync } from 'fs';
import { join } from 'path';

const TARGET = 'https://binhthuan.hochiminh.vn/';
const OUT = join(import.meta.dirname, 'binhthuan-hcmverse');

const assets = new Set();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('response', (res) => {
  const u = res.url();
  if (res.status() < 400 && u.startsWith('http')) assets.add(u);
});

await mkdir(OUT, { recursive: true });
console.log('Loading', TARGET, '…');
await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 240000 });
await page.waitForTimeout(15000);

try {
  await page.evaluate(async () => {
    const k = document.getElementById('krpanoSWFObject');
    if (!k?.call) return;
    const scenes = [
      'pano10',
      'pano12',
      'pano14',
      'pano17',
      'pano124',
      'pano200',
      'pano205',
    ];
    for (const s of scenes) {
      try {
        k.call(`loadscene(${s}, null, MERGE, BLEND(0.5));`);
      } catch {}
      await new Promise((r) => setTimeout(r, 3500));
    }
  });
  await page.waitForTimeout(10000);
} catch (e) {
  console.warn('Scene hop:', e.message);
}

const sorted = [...assets].sort();
writeFileSync(
  join(OUT, 'capture-meta.json'),
  JSON.stringify({ count: sorted.length }, null, 2)
);
writeFileSync(join(OUT, 'capture-urls.txt'), sorted.join('\n'), 'utf8');
console.log('Assets captured:', sorted.length);
await browser.close();
