/**
 * Mirror Bảo tàng 3D — https://baotang.hochiminh.vn/ into baotang-hochiminh/
 *
 * Usage:
 *   node download-baotang-hcm.mjs           # core files + pano tiles from XML
 *   node download-baotang-hcm.mjs --capture # run Playwright capture first, then download all URLs
 */
import { mkdir, writeFile, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { dirname, join, relative } from 'path';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { pathsFromXmlAssets } from './baotang-xml-assets.mjs';

const BASE = 'https://baotang.hochiminh.vn';
const ROOT = join(import.meta.dirname, 'baotang-hochiminh');
const CONCURRENCY = 8;

const STATIC_PATHS = [
  '/',
  '/css/main.css',
  '/js/lang.js',
  '/js/conf.js',
  '/js/main.js',
  '/js/egal.js',
  '/js/lib/jquery-2.0.3.min.js',
  '/shadowbox/shadowbox.css',
  '/shadowbox/shadowbox.js',
  '/virtualmuseumdata/virtualmuseum.js',
  '/virtualmuseumdata/virtualmuseum.swf',
  '/virtualmuseumdata/virtualmuseum_final.xml',
  '/virtualmuseumdata/load_scene.xml',
  '/virtualmuseumdata/virtualmuseum_skin.xml',
  '/virtualmuseumdata/virtualmuseum_core.xml',
  '/virtualmuseumdata/virtualmuseum_messages_en.xml',
  '/virtualmuseumdata/virtualmuseum_messages_vi.xml',
  '/virtualmuseumdata/skin.xml',
  '/data/sounds/bg.mp3',
  '/data/xml/config.xml',
  '/data/xml/exhibition.xml',
  '/data/xml/photo.xml',
  '/data/xml/object.xml',
  '/data/xml/video.xml',
];

function toLocal(urlPath) {
  if (urlPath === '/') return join(ROOT, 'index.html');
  return join(ROOT, urlPath.replace(/^\//, '').replace(/\//g, '\\'));
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
    let html = await res.text();
    html = patchIndexHtml(html);
    await writeFile(dest, html, 'utf8');
    return { urlPath, ok: true };
  }
  await pipeline(res.body, createWriteStream(dest));
  return { urlPath, ok: true };
}

function patchIndexHtml(html) {
  if (html.includes('hcmverse-theme.css')) return html;
  let out = html
    .replace(
      /<title>[^<]*<\/title>/,
      '<title>HCMVERSE — Bảo tàng 3D Hồ Chí Minh</title>'
    )
    .replace(
      /embedpano\(\{[\s\S]*?swf:"virtualmuseumdata\/virtualmuseum\.swf"[\s\S]*?\}\);/,
      `embedpano({
					swf: "virtualmuseumdata/virtualmuseum.swf",
					xml: "virtualmuseumdata/virtualmuseum_final.xml",
					target: "panoDIV",
					html5: "auto",
					passQueryParameters: true,
					id: "virtualmuseum",
					basepath: "virtualmuseumdata/"
					});`
    )
    .replace(
      'http://www.adobe.com/images/shared/download_buttons/get_flash_player.gif',
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    );
  const themeBlock = `
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Orbitron:wght@600;700&display=swap" rel="stylesheet" />
	<link rel="stylesheet" href="css/hcmverse-theme.css" />`;
  if (!out.includes('hcmverse-theme.css')) {
    out = out.replace('</head>', `${themeBlock}\n</head>`);
  }
  if (!out.includes('hcmverse-tour.js')) {
    out = out.replace('</body>', '\t<script src="js/hcmverse-tour.js"></script>\n</body>');
  }
  return out;
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
  const panoDirs = [...xml.matchAll(/%FIRSTXML%\/(_[^/"']+)/g)].map((m) => m[1]);
  const relUrls = [...xml.matchAll(/url="([^"%][^"]+)"/g)].map((m) => m[1]);

  const tileSize = 512;
  const sceneBlocks = xml.split(/<scene name="/).slice(1);
  for (const block of sceneBlocks) {
    const dirM = block.match(/%FIRSTXML%\/(_[^/"']+)/);
    if (!dirM) continue;
    const dir = dirM[1];
    paths.add(`/virtualmuseumdata/${dir}/thumbnail.jpg`);
    paths.add(`/virtualmuseumdata/${dir}/preview.jpg`);
    // krpano level folder is in URL (…/face/LEVEL/…), not XML <level> order (often 2,1,0)
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

  for (const u of relUrls) {
    if (u.startsWith('_')) paths.add(`/virtualmuseumdata/${u}`);
    else if (!u.includes('%')) paths.add(`/virtualmuseumdata/${u}`);
  }

  const includes = [
    'virtualmuseum_skin.xml',
    'virtualmuseum_core.xml',
    'virtualmuseum_messages_en.xml',
    'virtualmuseum_messages_vi.xml',
    'skin.xml',
  ];
  for (const f of includes) paths.add(`/virtualmuseumdata/${f}`);

  return [...paths];
}

async function pathsFromDataXml() {
  const names = ['exhibition.xml', 'photo.xml', 'object.xml', 'video.xml'];
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

function urlsFromCaptureFile() {
  const cap = join(ROOT, 'capture-urls.txt');
  return readFile(cap, 'utf8')
    .then((t) =>
      t
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith(BASE))
        .map((l) => l.slice(BASE.length) || '/')
    )
    .catch(() => []);
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
      const p = unique[idx];
      const r = await downloadOne(p);
      if (r.ok) ok++;
      else {
        fail++;
        if (failed.length < 30) failed.push(r);
      }
      if ((ok + fail) % 50 === 0) process.stdout.write(`\r${label}: ${ok + fail}/${unique.length}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\n${label}: ok=${ok} fail=${fail}`);
  if (failed.length) console.log('Sample failures:', failed.slice(0, 8));
  return { ok, fail };
}

async function runCapture() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['capture-baotang-hcm.mjs'], {
      cwd: import.meta.dirname,
      stdio: 'inherit',
    });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`capture exit ${code}`))));
  });
}

const useCapture = process.argv.includes('--capture');

if (useCapture) {
  console.log('Running Playwright capture…');
  await runCapture();
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

const captured = await urlsFromCaptureFile();
if (captured.length) {
  console.log(`Downloading ${captured.length} URLs from capture-urls.txt…`);
  await runPool(captured, 'capture');
}

await writeFile(
  join(ROOT, 'README.txt'),
  `Bảo tàng 3D — HCMVERSE (bản local)
==================================

Nguồn: https://baotang.hochiminh.vn/
Tour: virtualmuseum_final.xml (đủ phòng).

  npm run start
  npm run download:baotang
  npm run repair:baotang:skin
`,
  'utf8'
);

console.log('Done →', ROOT);
