/**
 * Dev server: static files + S3 proxy (/proxy-s3/) + map3d analytics stub.
 * Usage:
 *   node serve-hcm202.mjs         → http://localhost:8765  (whole project)
 *   node serve-hcm202.mjs map3d   → http://localhost:8767  (hcmverse_hcm202 only)
 */
import http from 'http';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join, extname, normalize, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const map3dOnly = process.argv[2] === 'map3d';
const ROOT = resolve(map3dOnly ? join(__dirname, 'hcmverse_hcm202') : __dirname);

function resolveStaticPath(pathname) {
  const clean = (pathname || '/').split('?')[0];
  const rel = clean.startsWith('/') ? clean.slice(1) : clean;
  return resolve(ROOT, rel);
}

function isUnderRoot(filePath) {
  const rel = relative(ROOT, resolve(filePath));
  return rel === '' || (!rel.startsWith('..') && !rel.includes('..'));
}
const PORT = Number(process.env.PORT) || (map3dOnly ? 8767 : 8765);
const API_ROOT = '/managements/user_FE/theme/api/analytic/post/';
const PROXY_PREFIX = '/proxy-s3/';
const S3_ORIGIN = 'https://s3.hcm-1.cloud.cmctelecom.vn';
const S3_REFERER = 'https://map3d.visithcmc.vn/';
const MGMT_PREFIX = '/managements/';
const CDN_ORIGIN = 'https://sanpham.starglobal3d.vn';
const CDN_TOUR_ORIGIN = 'https://sanpham.starglobal3d.com';
/** krpano / cached shim may request these at site root on localhost */
const CDN_TOUR_PREFIXES = [
  '/smart-city-3d/',
  '/smart-tourism-3d/',
  '/smart-facility-3d/',
  '/smart-starglobal-3d/',
];

function cdnTourPrefix(pathname) {
  return CDN_TOUR_PREFIXES.find((p) => pathname.startsWith(p)) ?? null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.swf': 'application/x-shockwave-flash',
  '.obj': 'text/plain',
  '.mtl': 'text/plain',
};

const S3_HOST = 'https://s3.hcm-1.cloud.cmctelecom.vn/';

const CDN_CACHE_MAX = 96;
const CDN_CACHE_MAX_BYTES = 4 * 1024 * 1024;
const cdnCache = new Map();

function cdnCacheable(pathname) {
  return /\.(js|css|woff2?)(\?|$)/i.test(pathname);
}

function getCdnCached(key) {
  const hit = cdnCache.get(key);
  if (!hit) return null;
  hit.at = Date.now();
  return hit;
}

function setCdnCached(key, entry) {
  if (cdnCache.size >= CDN_CACHE_MAX) {
    let oldestKey;
    let oldest = Infinity;
    for (const [k, v] of cdnCache) {
      if (v.at < oldest) {
        oldest = v.at;
        oldestKey = k;
      }
    }
    if (oldestKey) cdnCache.delete(oldestKey);
  }
  cdnCache.set(key, entry);
}

function staticCacheControl(ext, pathname = '') {
  if (/hcmverse-tour\.js|hcmverse-theme\.css|hcmverse-binhthuan\.(js|css)/i.test(pathname)) {
    return 'no-cache, must-revalidate';
  }
  if (['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.ico'].includes(ext)) {
    return 'public, max-age=3600';
  }
  return 'no-cache';
}

/** /hcmverse_hcm202/index.html/upload/... → /hcmverse_hcm202/upload/... */
function normalizeLocalPath(pathname) {
  return pathname.replace(/\/index\.html(?=\/)/g, '');
}

const APP_SLUGS = new Set([
  'hcmverse',
  'hcmverse_hcm202',
  'phu-tho-bac-tp-ca-mau',
  'baotang-hochiminh',
  'phuchutich-egal',
  'binhthuan-hcmverse',
]);

/** Alias paths that krpano / browser request but files live elsewhere. */
function remapStaticPath(pathname) {
  if (pathname === '/favicon.ico') {
    return '/assets/images/hero-museum.png';
  }

  const voice = pathname.match(/^\/phu-tho-bac-tp-ca-mau\/data\/([^/]*)\.mp3$/);
  if (voice) {
    const id = voice[1];
    if (!id) return null;
    const flat = `/phu-tho-bac-tp-ca-mau/data/${id}.mp3`;
    const nested = `/phu-tho-bac-tp-ca-mau/data/projects/denthobactpcamau/voice/vi/${id}.mp3`;
    return existsSync(resolveStaticPath(flat)) ? flat : nested;
  }

  return pathname;
}

/** Pretty URLs: bỏ index.html, thêm slash cuối cho thư mục app. */
function canonicalRedirect(pathname, search) {
  if (pathname === '/index.html' || pathname.endsWith('/index.html')) {
    const base = pathname === '/index.html' ? '/' : pathname.slice(0, -'/index.html'.length);
    const withSlash = base.endsWith('/') ? base : `${base}/`;
    return `${withSlash}${search}`;
  }
  const oneSegment = pathname.match(/^\/([^/.]+)$/);
  if (oneSegment && APP_SLUGS.has(oneSegment[1])) {
    return `/${oneSegment[1]}/${search}`;
  }
  return null;
}

function rewriteS3InText(text) {
  return text.split(S3_HOST).join(PROXY_PREFIX);
}

function todayLabel() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

function handleAnalytics(res, pathname) {
  const name = pathname.slice(API_ROOT.length);
  const id = new URL(pathname, `http://127.0.0.1:${PORT}`).searchParams.get('id') || '20250624';

  if (name === 'counter.php') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('0 Online');
    return;
  }
  if (name === 'view_counter.php') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify([{ id_name: id, view_count: '—', views_per_day: `0 ${todayLabel()}` }]));
    return;
  }
  if (name === 'list.php') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<p style="padding:12px">Local dev — danh sách online.</p>');
    return;
  }
  res.writeHead(404);
  res.end('Not found');
}

async function proxyUpstream(req, res, origin, pathname, search, { rewriteXml = false } = {}) {
  const target = `${origin}${pathname}${search}`;
  const cacheKey = `${origin}${pathname}${search}`;
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (method === 'GET' && cdnCacheable(pathname)) {
    const hit = getCdnCached(cacheKey);
    if (hit) {
      res.writeHead(200, {
        'Content-Type': hit.ctype,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
        'X-HCM202-Cache': 'HIT',
      });
      res.end(hit.body);
      return;
    }
  }

  const headers = { 'User-Agent': 'HCM202-local-proxy' };
  if (req.headers.range) headers.Range = req.headers.range;
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

  const reqBody =
    method !== 'GET' && method !== 'HEAD' ? await readBody(req) : undefined;

  let upstream;
  try {
    upstream = await fetch(target, { method, headers, body: reqBody, redirect: 'follow' });
  } catch (e) {
    res.writeHead(502);
    res.end(`Proxy error: ${e.message}`);
    return;
  }

  const ctype = upstream.headers.get('content-type') || '';
  const isTextXml =
    rewriteXml &&
    upstream.ok &&
    (ctype.includes('xml') || pathname.endsWith('.xml') || pathname.endsWith('.php'));

  if (isTextXml) {
    let text = await upstream.text();
    text = rewriteS3InText(text);
    res.writeHead(upstream.status, {
      'Content-Type': ctype || 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(text);
    return;
  }

  const canCache =
    method === 'GET' &&
    upstream.ok &&
    cdnCacheable(pathname) &&
    !req.headers.range;

  if (canCache) {
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length <= CDN_CACHE_MAX_BYTES) {
      setCdnCached(cacheKey, { body: buf, ctype: ctype || 'application/octet-stream', at: Date.now() });
    }
    res.writeHead(upstream.status, {
      'Content-Type': ctype || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
      'X-HCM202-Cache': 'MISS',
    });
    res.end(buf);
    return;
  }

  const out = {
    'Content-Type': ctype || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  };
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) out[h] = v;
  }
  if (upstream.status >= 400) console.warn(`[proxy] ${upstream.status} ${target}`);

  res.writeHead(upstream.status, out);
  if (!upstream.body) {
    res.end();
    return;
  }
  const body = Readable.fromWeb(upstream.body);
  req.on('close', () => body.destroy());
  try {
    await pipeline(body, res);
  } catch (e) {
    if (e?.code !== 'ERR_STREAM_PREMATURE_CLOSE' && e?.code !== 'ECONNRESET') {
      console.warn('[proxy] stream:', e.message);
    }
  }
}

async function proxyS3(req, res, pathname, search) {
  const sub = pathname.slice(PROXY_PREFIX.length).replace(/^\//, '');
  if (!sub) {
    res.writeHead(400);
    res.end('Bad proxy path');
    return;
  }
  const target = `${S3_ORIGIN}/${sub}${search}`;
  const headers = { Referer: S3_REFERER, 'User-Agent': 'HCM202-local-proxy' };
  if (req.headers.range) headers.Range = req.headers.range;

  let upstream;
  try {
    upstream = await fetch(target, { headers, redirect: 'follow' });
  } catch (e) {
    res.writeHead(502);
    res.end(`S3 proxy error: ${e.message}`);
    return;
  }

  let ctype = upstream.headers.get('content-type') || 'application/octet-stream';
  if (sub.endsWith('.png')) ctype = 'image/png';
  else if (sub.endsWith('.jpg') || sub.endsWith('.jpeg')) ctype = 'image/jpeg';
  else if (sub.endsWith('.webp')) ctype = 'image/webp';
  else if (sub.endsWith('.gif')) ctype = 'image/gif';
  else if (sub.endsWith('.mp3')) ctype = 'audio/mpeg';
  else if (sub.endsWith('.m4a')) ctype = 'audio/mp4';

  const out = {
    'Content-Type': ctype,
    'Access-Control-Allow-Origin': '*',
  };
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) out[h] = v;
  }

  if (upstream.status >= 400) {
    console.warn(`[proxy-s3] ${upstream.status} ${target}`);
  }

  res.writeHead(upstream.status, out);
  if (!upstream.body) {
    res.end();
    return;
  }
  const body = Readable.fromWeb(upstream.body);
  req.on('close', () => body.destroy());
  try {
    await pipeline(body, res);
  } catch (e) {
    if (e?.code !== 'ERR_STREAM_PREMATURE_CLOSE' && e?.code !== 'ECONNRESET') {
      console.warn('[proxy-s3] stream:', e.message);
    }
  }
}

async function serveStatic(res, pathname) {
  const remapped = remapStaticPath(pathname);
  if (remapped === null) {
    res.writeHead(204);
    res.end();
    return;
  }
  pathname = remapped;

  let requestPath = pathname === '/' ? '/index.html' : pathname;
  requestPath = requestPath.split('?')[0];
  if (requestPath.endsWith('/')) requestPath += 'index.html';

  const filePath = resolveStaticPath(requestPath);

  if (!isUnderRoot(filePath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let st;
  try {
    st = await stat(filePath);
  } catch {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (st.isDirectory()) {
    const indexPath = requestPath.endsWith('/') ? `${requestPath}index.html` : `${requestPath}/index.html`;
    return serveStatic(res, indexPath.startsWith('/') ? indexPath : `/${indexPath}`);
  }

  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': staticCacheControl(ext, requestPath),
  });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let pathname = normalizeLocalPath(decodeURIComponent(url.pathname));

  const redirectTo = canonicalRedirect(pathname, url.search);
  if (redirectTo) {
    res.writeHead(301, { Location: redirectTo });
    res.end();
    return;
  }

  if (pathname.startsWith(API_ROOT)) {
    await readBody(req);
    handleAnalytics(res, pathname);
    return;
  }
  if (pathname.startsWith(PROXY_PREFIX)) {
    await proxyS3(req, res, pathname, url.search);
    return;
  }
  if (pathname.startsWith(MGMT_PREFIX)) {
    await proxyUpstream(req, res, CDN_ORIGIN, pathname, url.search, { rewriteXml: true });
    return;
  }
  if (cdnTourPrefix(pathname)) {
    await proxyUpstream(req, res, CDN_TOUR_ORIGIN, pathname, url.search, { rewriteXml: true });
    return;
  }
  await serveStatic(res, pathname);
});

server.on('clientError', () => {});

server.listen(PORT, () => {
  console.log(`HCM202 dev server: http://localhost:${PORT}`);
  console.log(`  root: ${ROOT}`);
  console.log(`  S3 proxy: ${PROXY_PREFIX}*`);
  console.log(`  CDN proxy: ${MGMT_PREFIX}* → ${CDN_ORIGIN}`);
  console.log(`  tour CDN:  ${CDN_TOUR_PREFIXES.map((p) => `${p}*`).join(', ')} → ${CDN_TOUR_ORIGIN}`);
  if (map3dOnly) {
    console.log(`  tour: http://localhost:${PORT}/`);
  } else {
    console.log(`  hub:         http://localhost:${PORT}/`);
    console.log(`  hcmverse:    http://localhost:${PORT}/hcmverse/`);
    console.log(`  map3d:       http://localhost:${PORT}/hcmverse_hcm202/`);
    console.log(`  baotang:     http://localhost:${PORT}/baotang-hochiminh/`);
    console.log(`  phuchutich:  http://localhost:${PORT}/phuchutich-egal/`);
    console.log(`  binhthuan:   http://localhost:${PORT}/binhthuan-hcmverse/`);
    console.log(`  phu-tho:     http://localhost:${PORT}/phu-tho-bac-tp-ca-mau/`);
    console.log(`  (hoac: node start-all.mjs --open)`);
  }
});
