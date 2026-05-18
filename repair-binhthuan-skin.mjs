/**
 * Tải asset UI thiếu (CSS @import, url(), megapixel.xml) cho binhthuan-hcmverse.
 * Usage: node repair-binhthuan-skin.mjs
 */
import { mkdir, readFile, readdir } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { pipeline } from 'stream/promises';
import { pathsFromXmlAssets } from './baotang-xml-assets.mjs';

const BASE = 'https://binhthuan.hochiminh.vn';
const ROOT = join(import.meta.dirname, 'binhthuan-hcmverse');
const PANO_STYLES = join(ROOT, 'Tour360data', 'pano', 'Styles');
const CONCURRENCY = 12;

const EXTRA_STATIC = [
  '/Tour360data/megapixel.xml',
  '/Tour360data/pano/Fonts/SanFrancisco/font.css',
  '/Tour360data/pano/Fonts/Weather/font.css',
  '/Tour360data/pano/Styles/font-awesome.min.css',
  '/Tour360data/pano/Images/help_screen_fg_en.png',
  '/Tour360data/graphics/soundinterface.js',
  '/Tour360data/graphics/soundinterface.swf',
  '/Tour360data/graphics/webvr.js',
  '/Tour360data/pano/sound.mp3',
];

/** Ảnh UI tham chiếu trong megapixel.css / menu.css */
const PANO_IMAGES = [
  'logo_bg.png',
  'logo.png',
  'control_bar.png',
  'control_btn_01.png',
  'control_btn_02.png',
  'control_btn_03.png',
  'control_btn_03_active.png',
  'control_btn_04.png',
  'control_btn_04_active.png',
  'control_btn_05.png',
  'control_btn_05_active.png',
  'control_btn_06.png',
  'control_btn_06_active.png',
  'control_btn_07.png',
  'title_bg.png',
  'menu_item_span.png',
  'help_screen_fg.png',
];

function toUrlPath(absPath) {
  const rel = relative(ROOT, absPath).replace(/\\/g, '/');
  return '/' + rel;
}

function resolveCssRef(cssFile, ref) {
  let u = ref.replace(/['"]/g, '').trim();
  if (!u || u.startsWith('data:')) return null;
  u = u.split('?')[0].split('#')[0];
  if (/^https?:/i.test(u)) {
    if (u.startsWith(BASE)) return u.slice(BASE.length) || '/';
    return null;
  }
  const baseDir = dirname(cssFile);
  const abs = resolve(baseDir, u);
  if (!abs.startsWith(ROOT)) return null;
  return toUrlPath(abs);
}

function extractRefs(cssText) {
  const paths = new Set();
  for (const m of cssText.matchAll(/@import\s+url\(([^)]+)\)/gi)) {
    const p = m[1];
    if (p) paths.add(p);
  }
  for (const m of cssText.matchAll(/url\(([^)]+)\)/gi)) {
    paths.add(m[1]);
  }
  return [...paths];
}

async function pathsFromMegapixelAudio() {
  const paths = new Set();
  let xml;
  try {
    xml = await readFile(join(ROOT, 'Tour360data', 'megapixel.xml'), 'utf8');
  } catch {
    return [];
  }
  for (const m of xml.matchAll(/playsound\([^,]+,\s*"([^"]+\.mp3)"/gi)) {
    paths.add(`/Tour360data/pano/${m[1]}`);
  }
  return [...paths];
}

async function collectFromCssFiles() {
  const urlPaths = new Set(EXTRA_STATIC);
  for (const name of PANO_IMAGES) {
    urlPaths.add(`/Tour360data/pano/Images/${name}`);
  }
  for (const p of await pathsFromMegapixelAudio()) urlPaths.add(p);
  for (const p of await pathsFromXmlAssets(
    join(ROOT, 'Tour360data'),
    'Tour360data'
  )) {
    urlPaths.add(p);
  }
  const cssFiles = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.css$/i.test(e.name)) cssFiles.push(p);
    }
  }

  await walk(PANO_STYLES);
  await walk(join(ROOT, 'Tour360data', 'pano', 'Fonts'));

  const queue = [...cssFiles];
  const seen = new Set();

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);

    let text;
    try {
      text = await readFile(file, 'utf8');
    } catch {
      continue;
    }

    for (const ref of extractRefs(text)) {
      const path = resolveCssRef(file, ref);
      if (!path) continue;
      urlPaths.add(path);
      const localCss = join(ROOT, path.slice(1).replace(/\//g, '\\'));
      if (/\.css$/i.test(path) && !seen.has(localCss)) queue.push(localCss);
    }
  }

  return [...urlPaths];
}

async function downloadOne(urlPath) {
  const url = `${BASE}${urlPath}`;
  const dest = join(ROOT, urlPath.slice(1).replace(/\//g, '\\'));
  if (existsSync(dest)) return { urlPath, ok: true, skipped: true };

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
        if (failed.length < 40) failed.push(r);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`skin: total=${unique.length} ok=${ok} skip=${skip} fail=${fail}`);
  if (failed.length) console.log('Failures:', failed.slice(0, 15));
}

console.log('Collecting paths from pano CSS…');
const paths = await collectFromCssFiles();
console.log('Downloading', paths.length, 'files…');
await runPool(paths);
console.log('Done.');
console.log('Tip: npm run repair:binhthuan:kolor — KolorArea / KolorMap plugins');
