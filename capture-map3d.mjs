import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const TARGET = 'https://map3d.visithcmc.vn/';
const OUT = join(import.meta.dirname, 'map3d-capture');

const assets = new Set();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('response', (res) => {
  const u = res.url();
  if (res.status() < 400) assets.add(u);
});

await page.goto(TARGET, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(8000);

const html = await page.content();
const title = await page.title();
const scripts = await page.$$eval('script[src]', (els) => els.map((e) => e.src));
const links = await page.$$eval('link[href]', (els) => els.map((e) => e.href));
const iframes = await page.$$eval('iframe', (els) =>
  els.map((e) => ({ src: e.src, id: e.id }))
);

writeFileSync(
  join(OUT + '-meta.json'),
  JSON.stringify({ title, scripts, links, iframes, htmlLength: html.length }, null, 2),
  'utf8'
);
writeFileSync(join(OUT + '-page.html'), html, 'utf8');
writeFileSync(join(OUT + '-urls.txt'), [...assets].sort().join('\n'), 'utf8');

console.log('Title:', title);
console.log('Scripts:', scripts.length);
console.log('Assets:', assets.size);
console.log('Sample URLs:', [...assets].slice(0, 30).join('\n'));

await browser.close();
