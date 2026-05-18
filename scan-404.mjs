import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CDN =
  'https://dltm-cdn.vnptit3.vn/resources/portal//Images/CMU/3D/4.%20ph%E1%BB%A7%20th%E1%BB%9D%20b%C3%A1c%20tp%20c%C3%A0%20mau/phu-tho-bac-tp-ca-mau/index.html';

const LOCAL_URLS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['http://localhost:8765/index.html'];

const ROOT = join(import.meta.dirname, 'phu-tho-bac-tp-ca-mau');
const missing = new Map();

async function scan(url, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', (res) => {
    if (res.status() !== 404) return;
    const u = res.url();
    if (!u.includes('/data/') && !u.includes('favicon')) return;
    missing.set(u, { label, url: u });
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(5000);

  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let k;
    for (let i = 0; i < 40; i++) {
      k = document.getElementById('pano')?.get?.('global');
      if (k) break;
      await wait(250);
    }
    if (!k) return;
    const n = k.get('scene.count') || 0;
    for (let i = 0; i < n; i++) {
      try {
        k.call(`loadscene(${k.get(`scene[${i}].name`)}, null, MERGE, BLEND(0.2))`);
      } catch {}
      await wait(500);
    }
    for (const c of [
      'callwith(layer[skin_btn_dollhouse], onclick);',
      'callwith(layer[skin_btn_map], onclick);',
      'callwith(layer[skin_btn_info], onclick);',
    ]) {
      try {
        k.execute(c);
      } catch {}
      await wait(1000);
    }
  });

  await page.waitForTimeout(5000);
  await browser.close();
}

await scan(CDN, 'cdn');
for (const u of LOCAL_URLS) {
  try {
    await scan(u, 'local');
  } catch (e) {
    console.error('Local scan failed:', e.message);
  }
}

const list = [...missing.values()];
writeFileSync('missing-404.json', JSON.stringify(list, null, 2));

if (!list.length) {
  console.log('Không phát hiện 404 khi quét tour.');
  process.exit(0);
}

console.log('\n=== 404 (' + list.length + ') ===\n');
for (const m of list) {
  const path = new URL(m.url).pathname;
  const rel = path.replace(/^\/phu-tho-bac-tp-ca-mau\//, '').replace(/^\//, '');
  const local = join(ROOT, rel);
  console.log(path);
  console.log('  local:', existsSync(local) ? 'có file — sai đường dẫn server' : 'THIẾU — npm run download');
}
