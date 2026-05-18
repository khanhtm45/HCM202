/**
 * Tải lại tile panorama còn thiếu — Phủ Chủ Tịch
 */
import { readFile, access, mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';

const BASE = 'http://phuchutich.egal.vn';
const ROOT = join(import.meta.dirname, 'phuchutich-egal');
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
    return { ok: true, skipped: true };
  } catch (_) {}
  const res = await fetch(`${BASE}${urlPath}`, { redirect: 'follow' });
  if (!res.ok) return { ok: false, status: res.status, urlPath };
  await mkdir(dirname(dest), { recursive: true });
  await pipeline(res.body, createWriteStream(dest));
  return { ok: true };
}

const paths = await pathsFromTourXml();
let i = 0;
let ok = 0;
let fail = 0;
let skipped = 0;

async function worker() {
  while (i < paths.length) {
    const p = paths[i++];
    const r = await downloadOne(p);
    if (r.skipped) skipped++;
    else if (r.ok) ok++;
    else fail++;
    if ((ok + fail + skipped) % 200 === 0) {
      process.stdout.write(`\r${ok + fail + skipped}/${paths.length}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
console.log(`\nRepair tiles: downloaded=${ok} skipped=${skipped} fail=${fail}`);
