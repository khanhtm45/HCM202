/**
 * Mirror https://binhthuan.hochiminh.vn/ → binhthuan-hcmverse/
 *
 *   node download-binhthuan.mjs
 *   node download-binhthuan.mjs --capture
 */
import { mkdir, writeFile, readFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { pathsFromTour360Xml, pathsFromIndexHtml } from './binhthuan-tour360-paths.mjs';
import { pathsFromXmlAssets } from './baotang-xml-assets.mjs';

const BASE = 'https://binhthuan.hochiminh.vn';
const ROOT = join(import.meta.dirname, 'binhthuan-hcmverse');
const CONCURRENCY = 10;

const STATIC_PATHS = [
  '/',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/Tour360data/thumbnail.jpg',
  '/Tour360data/Tour360.js',
  '/Tour360data/Tour360.swf',
  '/Tour360data/Tour360.xml',
  '/Tour360data/lib/jquery-2.1.1.min.js',
  '/Tour360data/lib/jquery-1.11.1.min.js',
  '/Tour360data/lib/jquery-ui-1.11.1/jquery-ui.min.css',
  '/Tour360data/lib/jquery-ui-1.11.1/jquery-ui.min.js',
  '/Tour360data/lib/jquery.ui.touch-punch.min.js',
  '/Tour360data/lib/Kolor/KolorTools.min.js',
  '/Tour360data/graphics/KolorBootstrap.js',
  '/Tour360data/graphics/soundinterface.js',
  '/Tour360data/graphics/soundinterface.swf',
  '/Tour360data/graphics/webvr.js',
  '/Tour360data/pano/sound.mp3',
  '/Tour360data/graphics/cursors_move_html5.cur',
  '/Tour360data/graphics/cursors_drag_html5.cur',
  '/Tour360data/pano/Js/jquery-lang.js',
  '/Tour360data/pano/langs/en.json',
  '/Tour360data/pano/langs/vi.json',
  '/Tour360data/pano/Js/bootstrap.min.js',
  '/Tour360data/pano/Js/bootstrap-debugger.js',
  '/Tour360data/pano/Js/screenfull.js',
  '/Tour360data/pano/Js/jquery.fancybox.js',
  '/Tour360data/pano/Js/megapixel.js',
  '/Tour360data/pano/Styles/bootstrap.min.css',
  '/Tour360data/pano/Styles/menu_btn.css',
  '/Tour360data/pano/Styles/menu.css',
  '/Tour360data/pano/Styles/jquery.fancybox.min.css',
  '/Tour360data/pano/Styles/loadings.css',
  '/Tour360data/pano/Styles/megapixel.css',
  '/Tour360data/pano/info.html',
  '/Tour360data/pano/Images/help_screen_fg.png',
  '/Tour360data/megapixel.xml',
  '/Tour360data/pano/Fonts/SanFrancisco/font.css',
  '/Tour360data/pano/Fonts/Weather/font.css',
  '/Tour360data/pano/Styles/font-awesome.min.css',
];

function toLocal(urlPath) {
  if (urlPath === '/') return join(ROOT, 'index.html');
  return join(ROOT, urlPath.replace(/^\//, '').replace(/\//g, '\\'));
}

function patchIndexHtml(html) {
  let out = html.replace(
    'http://www.adobe.com/images/shared/download_buttons/get_flash_player.gif',
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  );

  const headInject = `
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Orbitron:wght@600;700&display=swap" rel="stylesheet" />
	<link rel="stylesheet" href="css/hcmverse-theme.css?v=3" />
	<link rel="stylesheet" href="css/hcmverse-binhthuan.css?v=2" />
	<script>
	(function () {
	  var q = new URLSearchParams(location.search);
	  if (q.get('classic') !== '1') {
	    document.documentElement.classList.add('hcmverse-active');
	  }
	})();
	</script>`;

  if (!out.includes('hcmverse-binhthuan.css')) {
    out = out.replace('</head>', `${headInject}\n</head>`);
  }

  if (!out.includes('hcmverse-binhthuan.js')) {
    out = out.replace(
      '</body>',
      '\t<script src="js/hcmverse-binhthuan.js?v=2"></script>\n</body>'
    );
  }

  return out;
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
  await pipeline(res.body, createWriteStream(dest));
  return { urlPath, ok: true };
}

async function pathsFromTourXmlFile() {
  const finalPath = join(ROOT, 'Tour360data', 'Tour360.xml');
  let xml;
  try {
    xml = await readFile(finalPath, 'utf8');
  } catch {
    const res = await fetch(`${BASE}/Tour360data/Tour360.xml`);
    if (!res.ok) throw new Error('Tour360.xml not found');
    xml = await res.text();
  }
  return pathsFromTour360Xml(xml);
}

async function pathsFromLocalIndex() {
  try {
    const html = await readFile(join(ROOT, 'index.html'), 'utf8');
    return pathsFromIndexHtml(html);
  } catch {
    return [];
  }
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
      const r = await downloadOne(unique[idx]);
      if (r.ok) ok++;
      else {
        fail++;
        if (failed.length < 30) failed.push(r);
      }
      if ((ok + fail) % 200 === 0) {
        process.stdout.write(`\r${label}: ${ok + fail}/${unique.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\n${label}: ok=${ok} fail=${fail}`);
  if (failed.length) console.log('Sample failures:', failed.slice(0, 8));
}

async function runCapture() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['capture-binhthuan.mjs'], {
      cwd: import.meta.dirname,
      stdio: 'inherit',
    });
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`capture exit ${code}`))
    );
  });
}

const useCapture = process.argv.includes('--capture');
if (useCapture) {
  console.log('Running Playwright capture…');
  await runCapture();
}

console.log('Downloading static shell…');
await runPool(STATIC_PATHS, 'static');

console.log('Downloading index-linked assets…');
await runPool(await pathsFromLocalIndex(), 'index');

console.log('Downloading panorama tiles from Tour360.xml…');
const panoPaths = await pathsFromTourXmlFile();
await runPool(panoPaths, 'pano');

console.log('Downloading skin / plugins from XML…');
const skinPaths = await pathsFromXmlAssets(
  join(ROOT, 'Tour360data'),
  'Tour360data'
);
await runPool(skinPaths, 'skin');

const captured = await urlsFromCaptureFile();
if (captured.length) {
  console.log(`Downloading ${captured.length} URLs from capture-urls.txt…`);
  await runPool(captured, 'capture');
}

await mkdir(join(ROOT, 'css'), { recursive: true });
await mkdir(join(ROOT, 'js'), { recursive: true });

await writeFile(
  join(ROOT, 'README.txt'),
  `Bảo tàng Hồ Chí Minh — Chi nhánh Bình Thuận (bản local)
============================================================

Nguồn: https://binhthuan.hochiminh.vn/
Tour: Tour360data/Tour360.xml (Panotour / krpano).

Chạy:
  npm run start
  Giao diện gốc:  http://localhost:8765/binhthuan-hcmverse/
  Giao diện HCMVERSE: http://localhost:8765/binhthuan-hcmverse/?hcmverse=1

Tải / bổ sung file:
  npm run download:binhthuan
  npm run download:binhthuan -- --capture
`,
  'utf8'
);

console.log('Done →', ROOT);
