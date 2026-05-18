/**
 * Tải plugin Kolor (KolorArea, KolorMap) cho binhthuan-hcmverse.
 * Usage: node repair-binhthuan-kolor.mjs
 */
import { mkdir, readFile } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';

const BASE = 'https://binhthuan.hochiminh.vn';
const ROOT = join(import.meta.dirname, 'binhthuan-hcmverse');
const CONCURRENCY = 12;

const KOLOR_MAP_LIB = [
  'mxn.js',
  'mxn.basemap.js',
  'mxn.core.js',
  'mxn.googlev3.core.js',
  'mxn.googlev3.core.labels.js',
  'mxn.openlayersv2.core.js',
  'mxn.microsoftv7.core.js',
  'mxn.yandexv2.core.js',
];

const KOLOR_AREA = [
  '/Tour360data/graphics/KolorArea/kolorArea.css',
  '/Tour360data/graphics/KolorArea/KolorArea.min.js',
  '/Tour360data/graphics/KolorArea/images/sablier.png',
  '/Tour360data/graphics/KolorArea/images/btn_close.png',
];

const KOLOR_MAP = [
  '/Tour360data/graphics/KolorMap/js/KolorMap.min.js',
  '/Tour360data/graphics/KolorMap/js/kolorMap.css',
  ...KOLOR_MAP_LIB.map((f) => `/Tour360data/graphics/KolorMap/lib/${f}`),
];

async function pathsFromKolorBootstrap() {
  const paths = new Set([...KOLOR_AREA, ...KOLOR_MAP]);
  let js;
  try {
    js = await readFile(
      join(ROOT, 'Tour360data', 'graphics', 'KolorBootstrap.js'),
      'utf8'
    );
  } catch {
    return [...paths];
  }
  for (const m of js.matchAll(/Tour360data\/graphics\/([^"'\\]+)/g)) {
    const rel = m[1].split('?')[0];
    if (/\.(js|css|png|jpg|gif|swf)$/i.test(rel)) {
      paths.add(`/Tour360data/graphics/${rel}`);
    }
  }
  return [...paths];
}

async function pathsFromKolorCss() {
  const paths = new Set();
  const cssFiles = [
    join(ROOT, 'Tour360data', 'graphics', 'KolorArea', 'kolorArea.css'),
    join(ROOT, 'Tour360data', 'graphics', 'KolorMap', 'js', 'kolorMap.css'),
  ];
  for (const file of cssFiles) {
    let text;
    try {
      text = await readFile(file, 'utf8');
    } catch {
      const urlPath = file.includes('KolorArea')
        ? '/Tour360data/graphics/KolorArea/kolorArea.css'
        : '/Tour360data/graphics/KolorMap/js/kolorMap.css';
      try {
        const res = await fetch(`${BASE}${urlPath}`);
        if (res.ok) text = await res.text();
      } catch {}
    }
    if (!text) continue;
    const base = dirname(file).replace(/\\/g, '/');
    const urlBase = base.slice(base.indexOf('Tour360data'));
    for (const m of text.matchAll(/url\(([^)]+)\)/g)) {
      let u = m[1].replace(/['"]/g, '').trim().split('?')[0];
      if (!u || u.startsWith('data:')) continue;
      const full = u.startsWith('http')
        ? u.replace(BASE, '')
        : `/${urlBase}/${u}`.replace(/\/+/g, '/');
      paths.add(full);
    }
  }
  return [...paths];
}

async function downloadOne(urlPath) {
  const dest = join(ROOT, urlPath.slice(1).replace(/\//g, '\\'));
  if (existsSync(dest)) return { urlPath, ok: true, skipped: true };
  await mkdir(dirname(dest), { recursive: true });
  let res;
  try {
    res = await fetch(`${BASE}${urlPath}`, { redirect: 'follow' });
  } catch (e) {
    return { urlPath, ok: false, error: e.message };
  }
  if (!res.ok) return { urlPath, ok: false, status: res.status };
  await pipeline(res.body, createWriteStream(dest));
  return { urlPath, ok: true };
}

async function runPool(urlPaths) {
  const unique = [...new Set(urlPaths)];
  let ok = 0;
  let skip = 0;
  let fail = 0;
  const failed = [];
  let i = 0;

  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      const r = await downloadOne(unique[idx]);
      if (r.ok) {
        ok++;
        if (r.skipped) skip++;
      } else {
        fail++;
        if (failed.length < 20) failed.push(r);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`kolor: total=${unique.length} ok=${ok} skip=${skip} fail=${fail}`);
  if (failed.length) console.log('Failures:', failed);
}

const paths = [
  ...(await pathsFromKolorBootstrap()),
  ...(await pathsFromKolorCss()),
];
console.log('Downloading', paths.length, 'Kolor assets…');
await runPool(paths);
console.log('Done.');
