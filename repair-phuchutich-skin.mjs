/**
 * Tải asset skin / map còn thiếu — Phủ Chủ Tịch
 */
import { mkdir, stat } from 'fs/promises';
import { createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { pathsFromXmlAssets } from './baotang-xml-assets.mjs';

const BASE = 'http://phuchutich.egal.vn';
const ROOT = join(import.meta.dirname, 'phuchutich-egal');
const VMD = join(ROOT, 'virtualmuseumdata');
const CONCURRENCY = 10;

function toLocal(urlPath) {
  return join(ROOT, urlPath.replace(/^\//, '').replace(/\//g, '\\'));
}

async function downloadOne(urlPath) {
  const dest = toLocal(urlPath);
  try {
    await stat(dest);
    return { ok: true, skipped: true };
  } catch (_) {}
  const url = `${BASE}${urlPath}`;
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) return { ok: false, status: res.status, urlPath };
  await pipeline(res.body, createWriteStream(dest));
  return { ok: true };
}

async function runPool(paths, label) {
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
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`${label}: ok=${ok} skipped=${skipped} fail=${fail}`);
}

const paths = await pathsFromXmlAssets(VMD, 'virtualmuseumdata');
await runPool(paths, 'skin');
