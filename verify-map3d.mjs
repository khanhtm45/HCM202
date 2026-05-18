import { chromium } from 'playwright';

const url = process.env.MAP3D_URL || 'http://localhost:8767/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];

page.on('response', (res) => {
  const u = res.url();
  if (res.status() >= 400 && u.includes('localhost:8767')) {
    errors.push(`${res.status()} ${u}`);
  }
});

await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(6000);

const title = await page.title();
const hasPano = (await page.locator('#pano, #panorama').count()) > 0;
const hasCanvas = (await page.locator('canvas').count()) > 0;

console.log(JSON.stringify({ title, hasPano, hasCanvas, localErrors: errors.slice(0, 20) }, null, 2));
await browser.close();
process.exit(errors.length > 5 ? 1 : 0);
