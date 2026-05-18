import { mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';

const OUT = join(import.meta.dirname, 'assets', 'images');
const DELAY_MS = 2500;
const MAX_RETRIES = 3;

const files = {
  'timeline-1890.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Khu_m%E1%BB%99_b%C3%A0_Ho%C3%A0ng_Th%E1%BB%8B_Loan.jpg/1280px-Khu_m%E1%BB%99_b%C3%A0_Ho%C3%A0ng_Th%E1%BB%8B_Loan.jpg',
  'timeline-1911.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Ph%E1%BB%A5c_d%E1%BB%B1ng_ng%C3%B5_C%C3%B4ng-poanh_t%E1%BA%A1i_B%E1%BA%BFn_Nh%C3%A0_r%E1%BB%93ng.jpg/1280px-Ph%E1%BB%A5c_d%E1%BB%B1ng_ng%C3%B5_C%C3%B4ng-poanh_t%E1%BA%A1i_B%E1%BA%BFn_Nh%C3%A0_r%E1%BB%93ng.jpg',
  'timeline-1930.png':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Indochinese_communist_party.svg/1280px-Indochinese_communist_party.svg.png',
  'timeline-1945.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Ba_Dinh_Square_September_2nd%2C_1945.jpg/1280px-Ba_Dinh_Square_September_2nd%2C_1945.jpg',
  'timeline-1954.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/The_Victory_Monument_of_Dien_Bien_Phu_%28front%29.jpg/1280px-The_Victory_Monument_of_Dien_Bien_Phu_%28front%29.jpg',
  'timeline-1969.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Hanoi%2C_Vietnam%2C_Ho_Chi_Minh_Mausoleum_on_Ba_Dinh_Square.jpg/1280px-Hanoi%2C_Vietnam%2C_Ho_Chi_Minh_Mausoleum_on_Ba_Dinh_Square.jpg',
  'thought-ethics.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Ho_Chi_Minh_City%2C_Ho_Chi_Minh_Statue%2C_2020-01_CN-01.jpg/1280px-Ho_Chi_Minh_City%2C_Ho_Chi_Minh_Statue%2C_2020-01_CN-01.jpg',
  'thought-unity.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Ba_Dinh_Square_panorama.jpg/1280px-Ba_Dinh_Square_panorama.jpg',
  'artifact-typewriter.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Olympia_Simplex.jpg/500px-Olympia_Simplex.jpg',
  'artifact-book.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ho_Chi_Minh_City_Peoples_Committee_%28City_Hall%29.jpg/1280px-Ho_Chi_Minh_City_Peoples_Committee_%28City_Hall%29.jpg',
  'thought-education.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ho_Chi_Minh_City_Peoples_Committee_%28City_Hall%29.jpg/1280px-Ho_Chi_Minh_City_Peoples_Committee_%28City_Hall%29.jpg',
  'artifact-letter.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Ba_Dinh_Square_September_2nd%2C_1945.jpg/1280px-Ba_Dinh_Square_September_2nd%2C_1945.jpg',
  'artifact-photo.jpg':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Ho_Chi_Minh_City%2C_Ho_Chi_Minh_Statue%2C_2020-01_CN-01.jpg/1280px-Ho_Chi_Minh_City%2C_Ho_Chi_Minh_Statue%2C_2020-01_CN-01.jpg',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function downloadOne(name, url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HCMVerse-Educational/1.0 (university project)' },
    });
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = DELAY_MS * attempt * 2;
      console.log('429', name, `retry in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      console.log('FAIL', name, res.status);
      return false;
    }
    await pipeline(res.body, createWriteStream(join(OUT, name)));
    console.log('OK', name);
    return true;
  }
  return false;
}

await mkdir(OUT, { recursive: true });

let ok = 0;
for (const [name, url] of Object.entries(files)) {
  if (await downloadOne(name, url)) ok++;
  await sleep(DELAY_MS);
}

console.log(`Done: ${ok}/${Object.keys(files).length} → hcmverse/assets/images/`);
