/**
 * Rewrite S3 panorama URLs to local proxy (S3 blocks localhost Referer).
 */
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'hcmverse_hcm202');
const S3 = 'https://s3.hcm-1.cloud.cmctelecom.vn/';
const PROXY = '/proxy-s3/';

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}

function patchContent(text) {
  let n = 0;
  let out = text.split(S3).join(PROXY);
  n += (text.length - out.length) / (S3.length - PROXY.length) || 0;
  const count = (text.match(/https:\/\/s3\.hcm-1\.cloud\.cmctelecom\.vn\//g) || []).length;
  out = out.replace(
    /var GCS_url = "https:\/\/s3\.hcm-1\.cloud\.cmctelecom\.vn\/starglobal-3d\/smart-tourism-3d\/thanh-pho-ho-chi-minh\/panos\/";/,
    'var GCS_url = "/proxy-s3/starglobal-3d/smart-tourism-3d/sdl-tphcm/panos/";'
  );
  return { out, count };
}

const files = (await walk(ROOT)).filter((f) => ['.xml', '.html', '.js'].includes(extname(f)));
let total = 0;

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const { out, count } = patchContent(raw);
  if (count > 0 || out !== raw) {
    await writeFile(file, out, 'utf8');
    total += count;
    console.log(`patched ${count} URL(s): ${file.replace(ROOT, '')}`);
  }
}

console.log(`Done. ${total} S3 URLs → ${PROXY}`);
