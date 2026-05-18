/**
 * Re-download panorama tiles using correct level paths from tour XML.
 * Run after fixing download-baotang-hcm.mjs level-index bug.
 */
import { readFile, access } from 'fs/promises';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';

const BASE = 'https://baotang.hochiminh.vn';
const ROOT = join(import.meta.dirname, 'baotang-hochiminh');
const CONCURRENCY = 12;
const tileSize = 512;

async function pathsFromTourXml() {
  const xml = await readFile(
    join(ROOT, 'virtualmuseumdata', 'virtualmuseum_final.xml'),
    'utf8'
  );
  const paths = new Set();
  const sceneBlocks = xml.split(/<scene name="/).slice(1);
  for (const block of sceneBlocks) {
    const dirM = block.match(/%FIRSTXML%\/(_[^/"']+)/);
    if (!dirM) continue;
    const dir = dirM[1];
    paths.add(`/virtualmuseumdata/${dir}/thumbnail.jpg`);
    paths.add(`/virtualmuseumdata/${dir}/preview.jpg`);
    for (const lm of block.matchAll(
      /<level tiledimagewidth="(\d+)"[^>]*>([\s\S]*?)<\/level>/g
    )) {
      const w = Number(lm[1]);
      const n = Math.ceil(w / tileSize);
      const faces = [...lm[2].matchAll(
        /url="[^"]*\/(\d+)\/(\d+)\/%v_%u\.jpg"/g
      )];
      for (const [, face, levelNum] of faces) {
        for (let v = 0; v < n; v++) {
          for (let u = 0; u < n; u++) {
            paths.add(
              `/virtualmuseumdata/${dir}/${face}/${levelNum}/${v}_${u}.jpg`
            );
          }
        }
      }
    }
  }
  return [...paths];
}

function toLocal(urlPath) {
  return join(ROOT, urlPath.replace(/^\//, '').replace(/\//g, '\\'));
}

async function downloadOne(urlPath) {
  const dest = toLocal(urlPath);
  try {
    await access(dest);
    return { urlPath, ok: true, skipped: true };
  } catch {}
  const url = `${BASE}${urlPath}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return { urlPath, ok: false, status: res.status };
  const { mkdir } = await import('fs/promises');
  await mkdir(dirname(dest), { recursive: true });
  await pipeline(res.body, createWriteStream(dest));
  return { urlPath, ok: true, skipped: false };
}

const all = await pathsFromTourXml();
console.log(`Tile URLs from XML: ${all.length}`);

let i = 0;
let ok = 0;
let skip = 0;
let fail = 0;

async function worker() {
  while (i < all.length) {
    const p = all[i++];
    const r = await downloadOne(p);
    if (r.ok) {
      if (r.skipped) skip++;
      else ok++;
    } else fail++;
    if ((ok + skip + fail) % 200 === 0) {
      process.stdout.write(`\r${ok + skip + fail}/${all.length} (new ${ok}, skip ${skip}, fail ${fail})`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
console.log(`\nDone: new=${ok} skipped=${skip} fail=${fail}`);
