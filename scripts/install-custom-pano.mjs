/**
 * Cài panorama tự chụp vào tour 360°.
 *
 * Cách dùng:
 *   node scripts/install-custom-pano.mjs --demo
 *   node scripts/install-custom-pano.mjs path/to/panorama.jpg
 *   node scripts/install-custom-pano.mjs --title "Sân chính" path/to/pano.jpg
 *
 * Ảnh equirectangular (tỉ lệ 2:1) → chế độ sphere (một file pano_sphere.jpg).
 * Xuất 6 mặt cube (pano_f,b,l,r,u,d) từ PTGui/krpano Tools → đặt vào input/cube/ rồi:
 *   node scripts/install-custom-pano.mjs --cube-dir input/cube
 */
import { mkdir, copyFile, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { createReadStream } from 'fs';

const ROOT = join(import.meta.dirname, '..');
const TOUR = join(ROOT, 'phu-tho-bac-tp-ca-mau');
const OUT = join(TOUR, 'data', 'projects', 'denthobactpcamau', 'panos', 'custom_user');
const CONFIG = join(TOUR, 'data', 'projects', 'denthobactpcamau', 'custom-scene-config.json');
const DEMO_SRC = join(TOUR, 'data', 'projects', 'denthobactpcamau', 'panos', 'dtbh_s0');
const FACES = ['f', 'b', 'l', 'r', 'u', 'd'];

function parseArgs(argv) {
  const opts = { title: 'Góc chụp bổ sung — HCM202', demo: false, cubeDir: null, file: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--demo') opts.demo = true;
    else if (a === '--cube-dir') opts.cubeDir = argv[++i];
    else if (a === '--title') opts.title = argv[++i];
    else if (!a.startsWith('-')) opts.file = a;
  }
  return opts;
}

async function copyDirFaces(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  for (const face of FACES) {
    await copyFile(join(srcDir, `pano_${face}.jpg`), join(destDir, `pano_${face}.jpg`));
  }
  for (const extra of ['preview.jpg', 'thumb.jpg']) {
    try {
      await copyFile(join(srcDir, extra), join(destDir, extra));
    } catch {
      await copyFile(join(srcDir, 'pano_f.jpg'), join(destDir, extra));
    }
  }
}

async function imageSize(path) {
  const buf = Buffer.alloc(24);
  const fd = await import('fs').then((fs) =>
    new Promise((resolve, reject) => {
      const s = createReadStream(path, { start: 0, end: 23 });
      const chunks = [];
      s.on('data', (c) => chunks.push(c));
      s.on('end', () => resolve(Buffer.concat(chunks)));
      s.on('error', reject);
    })
  );
  const b = fd;
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) break;
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  if (b[0] === 0x89 && b[1] === 0x50) {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  }
  return null;
}

async function writeConfig(mode, title) {
  const cfg = {
    scenes: [
      {
        name: 'custom_user',
        title,
        mode,
        folder: 'panos/custom_user',
        linkFrom: 'dtbh_s0',
        thumb:
          mode === 'sphere'
            ? 'panos/custom_user/thumb.jpg'
            : 'panos/custom_user/thumb.jpg',
        uiLabel: 'Góc chụp 360° mới',
        navLabel: 'Góc chụp mới →',
      },
    ],
  };
  await writeFile(CONFIG, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

async function main() {
  const opts = parseArgs(process.argv);
  await mkdir(OUT, { recursive: true });

  if (opts.demo) {
    console.log('Demo: sao chép pano từ dtbh_s0 → custom_user (thay bằng ảnh bạn chụp sau)');
    await copyDirFaces(DEMO_SRC, OUT);
    await writeConfig('cube', opts.title);
    console.log('OK →', OUT);
    return;
  }

  if (opts.cubeDir) {
    await copyDirFaces(opts.cubeDir, OUT);
    await writeConfig('cube', opts.title);
    console.log('OK cube →', OUT);
    return;
  }

  if (!opts.file) {
    console.log(`Thiếu file panorama.

  npm run pano:demo          — scene mẫu (sao chép dtbh_s0)
  npm run pano:add -- <ảnh>  — ảnh equirectangular 2:1 (.jpg)

Hoặc đặt 6 file pano_*.jpg vào input/cube/ rồi:
  node scripts/install-custom-pano.mjs --cube-dir phu-tho-bac-tp-ca-mau/input/cube
`);
    process.exit(1);
  }

  const src = join(process.cwd(), opts.file);
  await stat(src);
  const size = await imageSize(src);
  const ratio = size ? size.w / size.h : 0;
  const isEquirect = ratio > 1.7 && ratio < 2.3;

  if (isEquirect) {
    await copyFile(src, join(OUT, 'pano_sphere.jpg'));
    await copyFile(src, join(OUT, 'thumb.jpg'));
    await copyFile(src, join(OUT, 'preview.jpg'));
    await writeConfig('sphere', opts.title);
    console.log(`OK sphere (${size.w}×${size.h}) →`, join(OUT, 'pano_sphere.jpg'));
    console.log('Mẹo: xuất cube từ PTGui/krpano Tools để chất lượng cao hơn.');
    return;
  }

  console.log(
    `Ảnh ${size ? `${size.w}×${size.h}` : '?'} không phải equirect 2:1 — thử --cube-dir hoặc chụp lại panorama 360°.`
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
