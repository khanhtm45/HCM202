/**
 * Nhúng CSS HCMVERSE vào binhthuan-hcmverse/index.html (inline <style>).
 * Chạy sau khi sửa css/hcmverse-theme.css hoặc css/hcmverse-binhthuan.css.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, 'binhthuan-hcmverse');
const indexPath = join(ROOT, 'index.html');
const themePath = join(ROOT, 'css', 'hcmverse-theme.css');
const localPath = join(ROOT, 'css', 'hcmverse-binhthuan.css');

const theme = readFileSync(themePath, 'utf8');
const local = readFileSync(localPath, 'utf8');
const bundle = `/* hcmverse-theme */\n${theme}\n/* hcmverse-binhthuan */\n${local}`;

let html = readFileSync(indexPath, 'utf8');

html = html.replace(
  /\t<link rel="stylesheet" href="\.\.\/phuchutich-egal\/css\/hcmverse-theme\.css[^"]*" \/>\r?\n?/g,
  ''
);
html = html.replace(
  /\t<link rel="stylesheet" href="css\/hcmverse-theme\.css[^"]*" \/>\r?\n?/g,
  ''
);
html = html.replace(
  /\t<link rel="stylesheet" href="css\/hcmverse-binhthuan\.css[^"]*" \/>\r?\n?/g,
  ''
);
html = html.replace(/<style id="hcmverse-embedded">[\s\S]*?<\/style>\s*/g, '');

const styleTag = `\t<style id="hcmverse-embedded">\n${bundle}\n\t</style>\n`;
const marker = '<link href="https://fonts.googleapis.com/css2?family=Montserrat';

if (!html.includes(marker)) {
  console.error('Không tìm thấy vị trí chèn CSS trong index.html');
  process.exit(1);
}

if (html.includes('id="hcmverse-embedded"')) {
  html = html.replace(
    /<style id="hcmverse-embedded">[\s\S]*?<\/style>/,
    styleTag.trim()
  );
} else {
  html = html.replace(marker, styleTag + marker);
}

writeFileSync(indexPath, html, 'utf8');
console.log(
  'Đã nhúng CSS vào index.html (~',
  Math.round(bundle.length / 1024),
  'KB)'
);
