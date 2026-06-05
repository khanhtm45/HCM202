import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:8765/binhthuan-hcmverse/';
const hits = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('response', (res) => {
  if (res.status() === 404) hits.push(res.url());
});
await page.goto(URL, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(8000);
try {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let k;
    for (let i = 0; i < 60; i++) {
      k = document.getElementById('krpanoSWFObject');
      if (k?.call) break;
      await wait(500);
    }
    if (!k?.call) return;
    for (const id of ['pano12', 'pano14']) {
      try {
        k.call(`loadscene(${id}, null, MERGE, BLEND(0.5));`);
      } catch {}
      await wait(2000);
    }
  });
} catch {}
await page.waitForTimeout(3000);
await browser.close();

const uniq = [...new Set(hits)];
console.log('404 count', uniq.length);
uniq.forEach((u) => console.log(u));
