/**
 * Tải asset skin còn thiếu (sơ đồ tầng, map, controlbar…) từ baotang.hochiminh.vn
 * Usage: npm run repair:baotang:skin
 */
import { mkdir, stat } from 'fs/promises';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { pathsFromXmlAssets } from './baotang-xml-assets.mjs';

const BASE = 'https://baotang.hochiminh.vn';
const ROOT = join(import.meta.dirname, 'baotang-hochiminh');
const VMD = join(ROOT, 'virtualmuseumdata');
const CONCURRENCY = 10;

function toLocal(urlPath) {
  return join(ROOT, urlPath.replace(/^\//, '').replace(/\//g, '\\'));
}

async function downloadOne(urlPath) {
  const dest = toLocal(urlPath);
  try {
    await stat(dest);
    return { urlPath, ok: true, skipped: true };
  } catch (_) {}

  const url = `${BASE}${urlPath}`;
  await mkdir(dirname(dest), { recursive: true });
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    return { urlPath, ok: false, error: e.message };
  }
  if (!res.ok) return { urlPath, ok: false, status: res.status };
  await pipeline(res.body, createWriteStream(dest));
  return { urlPath, ok: true };
}

async function runPool(paths, label) {
  let done = 0;
  let failed = 0;
  let skipped = 0;
  const queue = [...paths];
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const r = await downloadOne(p);
      done++;
      if (r.skipped) skipped++;
      else if (!r.ok) {
        failed++;
        console.warn(`[${label}] FAIL ${p}`, r.status || r.error);
      } else if (done % 25 === 0) {
        console.log(`[${label}] ${done}/${paths.length}…`);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, paths.length) }, () => worker())
  );
  console.log(`[${label}] done ${done}, skipped ${skipped}, failed ${failed}`);
  return failed;
}

const paths = await pathsFromXmlAssets(VMD, 'virtualmuseumdata');
console.log(`Skin assets to check: ${paths.length}`);
const failed = await runPool(paths, 'skin');
process.exit(failed > 0 ? 1 : 0);
