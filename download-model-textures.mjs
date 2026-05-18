import { mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';

const BASE =
  'https://dltm-cdn.vnptit3.vn/resources/portal//Images/CMU/3D/4.%20ph%E1%BB%A7%20th%E1%BB%9D%20b%C3%A1c%20tp%20c%C3%A0%20mau/data/projects/denthobactpcamau/point/model';
const OUT = join(import.meta.dirname, 'phu-tho-bac-tp-ca-mau/data/projects/denthobactpcamau/point/model/textures');

const files = ['model.jpg', ...Array.from({ length: 19 }, (_, i) => `model${i + 1}.jpg`)];

await mkdir(OUT, { recursive: true });

let ok = 0;
let fail = 0;

for (const name of files) {
  const url = `${BASE}/textures/${name}`;
  const dest = join(OUT, name);
  const res = await fetch(url);
  if (!res.ok) {
    console.log('FAIL', name, res.status);
    fail++;
    continue;
  }
  await pipeline(res.body, createWriteStream(dest));
  console.log('OK', name);
  ok++;
}

console.log(`\nDone: ${ok} OK, ${fail} failed`);
