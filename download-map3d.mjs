/**
 * Mirror local assets from https://map3d.visithcmc.vn/ into hcmverse_hcm202/
 * Panorama tiles stay on S3/CDN (same as production).
 */
import { mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const BASE = 'https://map3d.visithcmc.vn';
const ROOT = join(import.meta.dirname, 'hcmverse_hcm202');

const PATHS = [
  '/',
  '/tour.xml',
  '/tour_xml/tour.xml',
  '/tour_xml/tour_viewhome_linhvuc.xml',
  '/tour_xml/tour_viewhome_phuong.xml',
  '/starglobal/js/local-vn.js',
  '/upload/image/logo.png',
  '/upload/image/logo_bottom.png',
  '/upload/image/thumbnail-sdl.png',
  '/upload/audio/Making-my-way-MTP.m4a',
];

function toLocalPath(urlPath) {
  if (urlPath === '/') return join(ROOT, 'index.html');
  const clean = urlPath.replace(/^\/+/, '').replace(/\//g, '\\');
  return join(ROOT, clean);
}

async function download(urlPath) {
  const url = urlPath === '/' ? `${BASE}/` : `${BASE}${urlPath}`;
  const dest = toLocalPath(urlPath);
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return { url, dest, ok: false, status: res.status };
  if (urlPath === '/') {
    let html = await res.text();
    html = patchIndexHtml(html);
    await writeFile(dest, html, 'utf8');
    return { url, dest, ok: true };
  }
  await pipeline(res.body, createWriteStream(dest));
  return { url, dest, ok: true };
}

function patchIndexHtml(html) {
  const localPaths =
    "var root_path = window.location.pathname.replace(/[^/]*$/, '') || '/';\n\t\tvar root_path2 = window.location.origin + root_path.replace(/\\/?$/, '/');";
  return html
    .replace(
      /var root_path = window\.location\.pathname;\s*\n\t\t\/\/alert\(window\.location\.pathname\);\s*\n\t\tvar root_path2 = "https:\/\/map3d\.visithcmc\.vn\/";/,
      localPaths
    )
    .replace(
      /var root_path2 = \(function\(\)\{var p=window\.location\.pathname\.replace\(\/\[^\/\]\*\$\/,''\);return window\.location\.origin\+p;\}\)\(\);/,
      "var root_path2 = window.location.origin + root_path.replace(/\\/?$/, '/');"
    )
    .replace(
      /content="https:\/\/map3d\.visithcmc\.vn\/\/upload\/image\/thumbnail-sdl\.png"/,
      'content="upload/image/thumbnail-sdl.png"'
    )
    .replace(
      /var root_path2 = window\.location\.origin \+ root_path\.replace\(\/\\\/?\$\/, '\/'\);/,
      "var root_path2 = window.location.origin + root_path.replace(/\\/?$/, '/');\n\t</script>\n\t<script src=\"js/local-dev-shim.js\"></script>\n\t<script"
    )
    .replace(
      /<script src="https:\/\/sanpham\.starglobal3d\.com\/managements\/js\/tour\.js"><\/script>/,
      '<script src="https://sanpham.starglobal3d.com/managements/js/tour.js"></script>'
    )
    .replace(
      /(<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/axios@[^"]+"><\/script>)\s*\n\s*(<script src="https:\/\/sanpham\.starglobal3d\.(vn|com)\/managements\/user_FE\/theme\/api\/config_api\.js"><\/script>)/,
      '$1\n            <script src="js/local-dev-axios-patch.js"></script>\n            $2'
    );
}

const urls = PATHS;
console.log(`Downloading ${urls.length} files from map3d.visithcmc.vn...`);

let ok = 0;
let fail = 0;
const failed = [];

for (const [i, urlPath] of urls.entries()) {
  try {
    const r = await download(urlPath);
    if (r.ok) {
      ok++;
      console.log(`[${i + 1}/${urls.length}] OK ${urlPath || 'index.html'}`);
    } else {
      fail++;
      failed.push(`${r.status} ${urlPath}`);
    }
  } catch (e) {
    fail++;
    failed.push(`${urlPath} -> ${e.message}`);
  }
}

const summary = { total: urls.length, ok, fail, failed };
await writeFile(join(ROOT, 'download-map3d-result.json'), JSON.stringify(summary, null, 2));
console.log(`Done: ${ok} OK, ${fail} failed`);
if (failed.length) console.log(failed.join('\n'));

console.log('Patching S3 URLs for local proxy...');
await import('./patch-map3d-s3.mjs');
