import { mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const CDN_MARKER = '/4.%20ph%E1%BB%A7%20th%E1%BB%9D%20b%C3%A1c%20tp%20c%C3%A0%20mau/';
const ROOT = join(import.meta.dirname, 'phu-tho-bac-tp-ca-mau');
const BASE = 'https://dltm-cdn.vnptit3.vn/resources/portal//Images/CMU/3D/4.%20ph%E1%BB%A7%20th%E1%BB%9D%20b%C3%A1c%20tp%20c%C3%A0%20mau';

function toLocalPath(url) {
  const i = url.indexOf(CDN_MARKER);
  if (i === -1) throw new Error('Unexpected URL: ' + url);
  return join(ROOT, url.slice(i + CDN_MARKER.length).replace(/\//g, '\\'));
}

function buildPanoUrls() {
  const scenes = [];
  for (let n = 0; n <= 22; n++) scenes.push(`dtbh_s${n}`);
  scenes.push('scene_17a');
  const faces = ['pano_f', 'pano_b', 'pano_l', 'pano_r', 'pano_u', 'pano_d', 'preview', 'thumb'];
  const urls = [];
  for (const scene of scenes) {
    for (const face of faces) {
      urls.push(
        `${BASE}/data/projects/denthobactpcamau/panos/${scene}/${face}.jpg`
      );
    }
  }
  urls.push(`${BASE}/data/projects/denthobactpcamau/panos/3dmodel/thumb.jpg`);
  return urls;
}

async function collectUrls() {
  const urls = new Set();

  const list = (await readFile(join(import.meta.dirname, 'asset-urls.txt'), 'utf8'))
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  list.forEach((u) => urls.add(u));

  buildPanoUrls().forEach((u) => urls.add(u));

  for (const lang of ['vi', 'en']) {
    for (let v = 1; v <= 6; v++) {
      urls.add(`${BASE}/data/projects/denthobactpcamau/voice/${lang}/${v}.mp3`);
    }
    urls.add(`${BASE}/data/projects/denthobactpcamau/voice/${lang}/2a.mp3`);
    urls.add(`${BASE}/data/projects/denthobactpcamau/voice/${lang}/2b.mp3`);
  }

  urls.add(`${BASE}/data/index.swf`);
  urls.add(`${BASE}/data/font/BalooTammudu2-Medium.ttf`);

  const extraProjectAssets = [
    'projects/denthobactpcamau/bgd.jpg',
    'projects/denthobactpcamau/point/model/model.obj',
    'projects/denthobactpcamau/point/model/model.mtl',
    ...['model.jpg', ...Array.from({ length: 19 }, (_, i) => `model${i + 1}.jpg`)].map(
      (f) => `projects/denthobactpcamau/point/model/textures/${f}`
    ),
    'projects/denthobactpcamau/point/model1/model.obj',
    'projects/denthobactpcamau/point/model1/model.mtl',
    'projects/denthobactpcamau/point/model1/textures/Image_0.jpg',
    'module/vrhotspot/core/cir_nr.png',
    'module/vrhotspot/core/ahead.png',
    'module/vrhotspot/core/left.png',
    'module/vrhotspot/core/up.png',
    'module/vrhotspot/core/tri.png',
    'plugins/vi.png',
    'plugins/en.png',
    'plugins/bground.jpeg',
    'plugins/oculus.png',
  ];
  extraProjectAssets.forEach((p) => urls.add(`${BASE}/data/${p}`));

  const extraPlugins = [
    'depthmap_navigation.xml',
    'gyro2.js',
    'scrollarea.js',
    'showtext.xml',
    'combobox.xml',
    'fps.xml',
    'pp_blur.js',
    'pp_light.js',
    'pp_sharpen.js',
    'videoplayer.js',
    'doubleclick_style.xml',
    'bingmaps.js',
    'googlemaps.js',
    'soundinterface.swf',
  ];
  extraPlugins.forEach((f) => urls.add(`${BASE}/data/plugins/${f}`));

  return [...urls];
}

async function download(url) {
  const dest = toLocalPath(url);
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    return { url, dest, ok: false, status: res.status };
  }
  await pipeline(res.body, createWriteStream(dest));
  return { url, dest, ok: true };
}

const urls = await collectUrls();
console.log(`Downloading ${urls.length} files...`);

let ok = 0;
let fail = 0;
const failed = [];

for (const [i, url] of urls.entries()) {
  try {
    const r = await download(url);
    if (r.ok) {
      ok++;
      if ((i + 1) % 10 === 0) console.log(`[${i + 1}/${urls.length}] OK`);
    } else {
      fail++;
      failed.push(`${r.status} ${url}`);
    }
  } catch (e) {
    fail++;
    failed.push(`${url} -> ${e.message}`);
  }
}

const summary = { total: urls.length, ok, fail, failed };
await writeFile(join(import.meta.dirname, 'download-result.json'), JSON.stringify(summary, null, 2));
console.log(`Done: ${ok} OK, ${fail} failed`);
if (failed.length) console.log(failed.join('\n'));
