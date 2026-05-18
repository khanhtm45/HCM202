/**
 * Discover all asset URLs while loading https://baotang.hochiminh.vn/
 * Output: baotang-hochiminh/capture-urls.txt, capture-meta.json
 */
import { chromium } from 'playwright';
import { mkdir, writeFileSync } from 'fs';
import { join } from 'path';

const TARGET = 'https://baotang.hochiminh.vn/';
const OUT = join(import.meta.dirname, 'baotang-hochiminh');

const assets = new Set();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('response', (res) => {
  const u = res.url();
  if (res.status() < 400 && u.startsWith('http')) assets.add(u);
});

await mkdir(OUT, { recursive: true });
console.log('Loading', TARGET, '…');
await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 180000 });
await page.waitForTimeout(12000);

// Try switching scenes via krpano API if available
try {
  await page.evaluate(async () => {
    const k = document.getElementById('virtualmuseum');
    if (!k || !k.get) return;
    const scenes = ['pano185', 'pano9', 'pano11', 'pano13', 'pano15', 'pano17', 'pano19', 'pano21'];
    for (const s of scenes) {
      try {
        k.call('loadscene(' + s + ', null, MERGE, BLEND(0.5))');
      } catch {}
      await new Promise((r) => setTimeout(r, 2500));
    }
  });
  await page.waitForTimeout(8000);
} catch (e) {
  console.warn('Scene hop:', e.message);
}

const html = await page.content();
const title = await page.title();
const scripts = await page.$$eval('script[src]', (els) => els.map((e) => e.src));
const links = await page.$$eval('link[href]', (els) => els.map((e) => e.href));

const sorted = [...assets].sort();
writeFileSync(join(OUT, 'capture-meta.json'), JSON.stringify({ title, scripts, links, htmlLength: html.length, count: sorted.length }, null, 2));
writeFileSync(join(OUT, 'capture-urls.txt'), sorted.join('\n'), 'utf8');
writeFileSync(join(OUT, 'capture-page.html'), html, 'utf8');

console.log('Title:', title);
console.log('Assets captured:', sorted.length);
console.log('Written:', join(OUT, 'capture-urls.txt'));

await browser.close();
