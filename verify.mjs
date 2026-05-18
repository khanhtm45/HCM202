import { existsSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, 'phu-tho-bac-tp-ca-mau');

const required = [
  'index.html',
  'data/index.js',
  'data/index.swf',
  'data/editsource/bgsound.mp3',
  'data/font/Montserrat-Regular.ttf',
  'data/plugins/depthmap_navigation.xml',
  'data/plugins/vi.png',
  'data/plugins/bground.jpeg',
  'data/projects/denthobactpcamau/index.xml',
  'data/projects/denthobactpcamau/bgd.jpg',
  'data/projects/denthobactpcamau/point/model1/model.obj',
  'data/projects/denthobactpcamau/point/model1/textures/Image_0.jpg',
  'data/projects/denthobactpcamau/point/model/model.obj',
  'data/projects/denthobactpcamau/voice/vi/2a.mp3',
  'data/projects/denthobactpcamau/voice/vi/2b.mp3',
  'data/module/vrhotspot/core/cir_nr.png',
  'data/module/vrhotspot/core/ahead.png',
  'data/projects/denthobactpcamau/panos/dtbh_s0/pano_f.jpg',
  'data/skin/skin_phone/logo.png',
  'data/skin/skin_phone/layout.xml',
  'data/skin/rotate_device.png',
  'data/skin/skin_phone/copyrights.png',
];

let bad = 0;
for (const rel of required) {
  const p = join(ROOT, rel);
  if (!existsSync(p) || statSync(p).size === 0) {
    console.log('MISSING:', rel);
    bad++;
  }
}

if (existsSync(join(ROOT, 'phu-tho-bac-tp-ca-mau', 'index.html'))) {
  console.log('WARN: nested phu-tho-bac-tp-ca-mau/index.html — open index.html ở thư mục cha, xóa bản lồng này');
  bad++;
}

console.log(bad ? `\n${bad} problem(s). Chạy: npm run download` : '\nOK — đủ file. Chạy: npm start → http://localhost:8765/index.html');
process.exit(bad ? 1 : 0);
