/**
 * krpano tour requests voice at data/{id}.mp3 — copy from voice/vi/ for offline/production.
 */
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, 'phu-tho-bac-tp-ca-mau');
const SRC = join(ROOT, 'data/projects/denthobactpcamau/voice/vi');
const DEST = join(ROOT, 'data');

const FILES = ['1.mp3', '2.mp3', '2a.mp3', '2b.mp3', '3.mp3', '4.mp3', '5.mp3', '6.mp3'];

let ok = 0;
for (const f of FILES) {
  const from = join(SRC, f);
  const to = join(DEST, f);
  if (!existsSync(from)) {
    console.warn('SKIP (missing source):', from);
    continue;
  }
  copyFileSync(from, to);
  ok++;
  console.log('OK', f);
}

console.log(`Copied ${ok}/${FILES.length} voice files → phu-tho-bac-tp-ca-mau/data/`);
