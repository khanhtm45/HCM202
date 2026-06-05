#!/usr/bin/env node
/**
 * Chạy toàn bộ HCM202 trên một server (sáu module + hub).
 *
 * Usage:
 *   node start-all.mjs           # khởi động server
 *   node start-all.mjs --open    # mở trình duyệt tại hub
 *   npm run start:all
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8765;
const OPEN_BROWSER = process.argv.includes('--open');

const APPS = [
  { label: 'Hub — trang chủ', path: '/' },
  { label: 'hcmverse — Bảo tàng số metaverse', path: '/hcmverse/' },
  { label: 'hcmverse_hcm202 — Bản đồ 3D TP.HCM', path: '/hcmverse_hcm202/' },
  { label: 'baotang-hochiminh — Bảo tàng 3D HCM', path: '/baotang-hochiminh/' },
  { label: 'phuchutich-egal — Phủ Chủ Tịch 360°', path: '/phuchutich-egal/' },
  { label: 'binhthuan-hcmverse — Bình Thuận 360°', path: '/binhthuan-hcmverse/' },
  { label: 'phu-tho-bac-tp-ca-mau — Phú Thọ Bắc', path: '/phu-tho-bac-tp-ca-mau/' },
];

function baseUrl() {
  return `http://localhost:${PORT}`;
}

function printUrls() {
  const base = baseUrl();
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  HCM202 — Tất cả module đang chạy (một server, port ' + PORT + ')');
  console.log('══════════════════════════════════════════════════════════\n');
  for (const app of APPS) {
    console.log(`  ${app.label}`);
    console.log(`    → ${base}${app.path}\n`);
  }
  console.log('  Map3d nhanh: ' + base + '/hcmverse_hcm202/?fast=1');
  console.log('  Bình Thuận giao diện gốc: ' + base + '/binhthuan-hcmverse/?classic=1');
  console.log('\n  Dừng server: Ctrl+C\n');
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'win32'
      ? `start "" "${url}"`
      : platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  spawn(cmd, [], { shell: true, stdio: 'ignore' });
}

const child = spawn(process.execPath, ['serve-hcm202.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) },
});

let bannerShown = false;
const showBanner = () => {
  if (bannerShown) return;
  bannerShown = true;
  printUrls();
  if (OPEN_BROWSER) openBrowser(baseUrl() + '/');
};

setTimeout(showBanner, 900);

child.on('error', (err) => {
  console.error('Không chạy được server:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
