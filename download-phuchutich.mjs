/**
 * Mirror tham quan 3D — http://phuchutich.egal.vn/ → phuchutich-egal/
 *
 * Usage:
 *   node download-phuchutich.mjs
 *   node download-phuchutich.mjs --capture   # Playwright capture trước (nếu có capture-phuchutich.mjs)
 */
import { mkdir, writeFile, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { pathsFromXmlAssets } from './baotang-xml-assets.mjs';

const BASE = 'http://phuchutich.egal.vn';
const ROOT = join(import.meta.dirname, 'phuchutich-egal');
const CONCURRENCY = 8;

const STATIC_PATHS = [
  '/',
  '/css/main.css',
  '/js/tour.js',
  '/js/lang.js',
  '/js/conf.js',
  '/js/main.js',
  '/js/egal.js',
  '/shadowbox/shadowbox.css',
  '/shadowbox/shadowbox.js',
  '/virtualmuseumdata/virtualmuseum.js',
  '/virtualmuseumdata/virtualmuseum.swf',
  '/virtualmuseumdata/virtualmuseum_final.xml',
  '/virtualmuseumdata/load_scene.xml',
  '/virtualmuseumdata/virtualmuseum_skin.xml',
  '/virtualmuseumdata/virtualmuseum_core.xml',
  '/virtualmuseumdata/virtualmuseum_messages_en.xml',
  '/virtualmuseumdata/skin.xml',
  '/virtualmuseumdata/floorplan/phuchutichmap.png',
  '/virtualmuseumdata/lib/jquery-2.1.1.min.js',
  '/virtualmuseumdata/lib/jquery-1.11.1.min.js',
  '/virtualmuseumdata/lib/jquery-ui-1.11.1/jquery-ui.min.css',
  '/virtualmuseumdata/lib/jquery-ui-1.11.1/jquery-ui.min.js',
  '/virtualmuseumdata/lib/jquery.ui.touch-punch.min.js',
  '/virtualmuseumdata/lib/Kolor/KolorTools.min.js',
  '/virtualmuseumdata/graphics/KolorBootstrap.js',
  '/data/sounds/bg.mp3',
  '/data/xml/config.xml',
  '/data/xml/exhibition.xml',
];

function toLocal(urlPath) {
  if (urlPath === '/') return join(ROOT, 'index.html');
  return join(ROOT, urlPath.replace(/^\//, '').replace(/\//g, '\\'));
}

function patchIndexHtml(html) {
  let out = html.replace(
    /embedpano\(\{[\s\S]*?swf\s*:\s*"virtualmuseumdata\/virtualmuseum\.swf"[\s\S]*?\}\);/,
    `embedpano({
					swf: "virtualmuseumdata/virtualmuseum.swf",
					xml: "virtualmuseumdata/virtualmuseum_final.xml",
					target: "panoDIV",
					html5: "auto",
					passQueryParameters: true,
					id: "virtualmuseum",
					basepath: "virtualmuseumdata/"
				});`
  );
  out = out.replace(
    'http://www.adobe.com/images/shared/download_buttons/get_flash_player.gif',
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  );
  return out;
}

function patchEgalJs(code) {
  if (code.includes('getElementById("virtualmuseum"))return')) return code;
  return code.replace(
    'EGALClass.prototype.home=function(){',
    'EGALClass.prototype.home=function(){if(document.getElementById("virtualmuseum"))return;'
  );
}

async function downloadOne(urlPath) {
  const url = urlPath === '/' ? `${BASE}/` : `${BASE}${urlPath}`;
  const dest = toLocal(urlPath);
  await mkdir(dirname(dest), { recursive: true });
  let res;
  try {
    res = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    return { urlPath, ok: false, error: e.message };
  }
  if (!res.ok) return { urlPath, ok: false, status: res.status };

  if (urlPath === '/') {
    await writeFile(dest, patchIndexHtml(await res.text()), 'utf8');
    return { urlPath, ok: true };
  }
  if (urlPath === '/js/egal.js') {
    await writeFile(dest, patchEgalJs(await res.text()), 'utf8');
    return { urlPath, ok: true };
  }
  await pipeline(res.body, createWriteStream(dest));
  return { urlPath, ok: true };
}

async function pathsFromTourXml() {
  const finalPath = join(ROOT, 'virtualmuseumdata', 'virtualmuseum_final.xml');
  let xml;
  try {
    xml = await readFile(finalPath, 'utf8');
  } catch {
    const res = await fetch(`${BASE}/virtualmuseumdata/virtualmuseum_final.xml`);
    if (!res.ok) throw new Error('virtualmuseum_final.xml not found');
    xml = await res.text();
  }

  const paths = new Set();
  const tileSize = 512;
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

  const relUrls = [...xml.matchAll(/url="([^"%][^"]+)"/g)].map((m) => m[1]);
  for (const u of relUrls) {
    if (/^https?:/i.test(u) || /RESSOURCES/i.test(u) || u.includes('://')) continue;
    if (u.startsWith('_')) paths.add(`/virtualmuseumdata/${u}`);
    else if (!u.includes('%')) paths.add(`/virtualmuseumdata/${u}`);
  }

  for (const f of [
    'virtualmuseum_skin.xml',
    'virtualmuseum_core.xml',
    'virtualmuseum_messages_en.xml',
    'skin.xml',
  ]) {
    paths.add(`/virtualmuseumdata/${f}`);
  }

  return [...paths];
}

async function pathsFromDataXml() {
  const names = ['exhibition.xml'];
  const paths = new Set();
  for (const name of names) {
    let text;
    try {
      text = await readFile(join(ROOT, 'data', 'xml', name), 'utf8');
    } catch {
      const res = await fetch(`${BASE}/data/xml/${name}`);
      if (!res.ok) continue;
      text = await res.text();
    }
    for (const m of text.matchAll(/<(?:vi|en)>([^<]+)<\/(?:vi|en)>/gi)) {
      let p = m[1].trim();
      if (!/^data\//i.test(p) && !/\.(mp3|m4a|jpg|jpeg|png|gif|webp|svg|xml)$/i.test(p)) continue;
      if (p.startsWith('http')) continue;
      if (!p.startsWith('/')) p = '/' + p;
      paths.add(p);
    }
  }
  return [...paths];
}

async function runPool(urlPaths, label) {
  const unique = [...new Set(urlPaths)];
  let ok = 0;
  let fail = 0;
  const failed = [];
  let i = 0;

  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      const r = await downloadOne(unique[idx]);
      if (r.ok) ok++;
      else {
        fail++;
        if (failed.length < 30) failed.push(r);
      }
      if ((ok + fail) % 100 === 0) {
        process.stdout.write(`\r${label}: ${ok + fail}/${unique.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\n${label}: ok=${ok} fail=${fail}`);
  if (failed.length) console.log('Sample failures:', failed.slice(0, 8));
}

console.log('Downloading static shell…');
await runPool(STATIC_PATHS, 'static');

console.log('Downloading panorama tiles from tour XML…');
const panoPaths = await pathsFromTourXml();
await runPool(panoPaths, 'pano');

console.log('Downloading data/xml media refs…');
const dataPaths = await pathsFromDataXml();
await runPool(dataPaths, 'data');

console.log('Downloading skin / hotspot assets…');
const skinPaths = await pathsFromXmlAssets(join(ROOT, 'virtualmuseumdata'), 'virtualmuseumdata');
await runPool(skinPaths, 'skin');

await writeFile(
  join(ROOT, 'README.txt'),
  `Tham quan 3D — Khu di tích Hồ Chí Minh tại Phủ Chủ Tịch (bản local)
====================================================================

Nguồn: http://phuchutich.egal.vn/
Tour: virtualmuseum_final.xml (83 scene).

Chạy:
  npm run start
  Mở: http://localhost:8765/phuchutich-egal/

Tải / sửa thiếu:
  npm run download:phuchutich
  npm run repair:phuchutich
  npm run repair:phuchutich:skin
`,
  'utf8'
);

console.log('Done →', ROOT);
