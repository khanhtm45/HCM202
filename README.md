# HCM202 — Ho Chi Minh Metaverse Museum

Trang chủ: [index.html](index.html) — chọn một trong các trải nghiệm bên dưới.

## Trải nghiệm

| Thư mục | Mô tả | URL local (sau `npm start`) |
|---------|--------|------------------------------|
| [hcmverse/](hcmverse/) | Bảo tàng số metaverse | http://localhost:8765/hcmverse/ |
| [hcmverse_hcm202/](hcmverse_hcm202/) | Bản đồ 3D/360 TP.HCM (map3d) | http://localhost:8765/hcmverse_hcm202/ |
| [phu-tho-bac-tp-ca-mau/](phu-tho-bac-tp-ca-mau/) | Tour panorama khu di tích | http://localhost:8765/phu-tho-bac-tp-ca-mau/ |
| [baotang-hochiminh/](baotang-hochiminh/) | Bảo tàng 3D Hồ Chí Minh (krpano) | http://localhost:8765/baotang-hochiminh/ |

Trang hub: **http://localhost:8765/** (không cần `index.html`). Server tự redirect `*/index.html` → đường dẫn có dấu `/` cuối.

## Cài đặt & chạy

```bash
npm install
npm start
```

**Server chính:** `serve-hcm202.mjs` (cổng **8765**)

- Phục vụ static toàn project
- Proxy S3: `/proxy-s3/` (Referer `map3d.visithcmc.vn`)
- Proxy CDN quản trị: `/managements/` → `sanpham.starglobal3d.vn`
- Stub API analytics (counter, view_counter, …)

**Không dùng** `npx serve` cho map3d — thiếu proxy S3, ảnh/nhạc sẽ 403.

Chỉ map3d (cổng **8767**):

```bash
npm run start:map3d
# → http://localhost:8767/
```

## Lệnh npm (theo module)

### Map 3D TP.HCM (`hcmverse_hcm202`)

| Lệnh | Việc làm |
|------|----------|
| `npm start` | Server đầy đủ (khuyến nghị) |
| `npm run start:map3d` | Chỉ thư mục map3d, port 8767 |
| `npm run download:map3d` | Tải lại shell từ map3d.visithcmc.vn |
| `npm run patch:map3d` | Đổi URL S3 → `/proxy-s3/` trong XML/HTML |
| `npm run capture-map3d` | Playwright: chụp URL/asset từ production |
| `npm run verify:map3d` | Playwright: kiểm tra 404 local (port 8767) |

Tải nhanh: `?fast=1` — ví dụ `http://localhost:8765/hcmverse_hcm202/?fast=1`  
Shim local: [hcmverse_hcm202/js/local-dev-shim.js](hcmverse_hcm202/js/local-dev-shim.js) (chỉ localhost).

### Bảo tàng 3D (`baotang-hochiminh`)

| Lệnh | Việc làm |
|------|----------|
| `npm run download:baotang` | Panorama + shell |
| `npm run download:baotang:full` | Thêm `--capture` (Playwright) |
| `npm run repair:baotang` | Sửa tile panorama 404 |
| `npm run repair:baotang:skin` | Sửa ảnh sơ đồ / skin map |
| `npm run capture:baotang` | Chụp asset từ baotang.hochiminh.vn |

Tour: `virtualmuseumdata/virtualmuseum.js` + `virtualmuseum_final.xml`. UI: `js/hcmverse-tour.js`, `css/hcmverse-theme.css`.

### Panorama Phú Thọ Bắc

| Lệnh | Việc làm |
|------|----------|
| `npm run download` | Tải data tour + texture model |
| `npm run verify` | Kiểm tra file sau download |
| `npm run scan-404` | Quét link 404 |
| `npm run pano:demo` / `pano:add` | Thêm panorama tùy chỉnh |

### HCMVerse metaverse

| Lệnh | Việc làm |
|------|----------|
| `npm run download:verse-media` | Tải media assets |

## Dev tools (Playwright)

Cần `npm install` (dependency `playwright`).

| Script | Mục đích |
|--------|----------|
| [capture-map3d.mjs](capture-map3d.mjs) | Liệt kê asset từ map3d.visithcmc.vn |
| [verify-map3d.mjs](verify-map3d.mjs) | Smoke test map3d local |
| [capture-baotang-hcm.mjs](capture-baotang-hcm.mjs) | Capture bảo tàng gốc |
| `npm run capture:phu-tho` | Capture URL `/data/` tour Phú Thọ → `asset-urls-full.txt` |

Biến môi trường: `MAP3D_URL` (mặc định `http://localhost:8767/`) cho `verify:map3d`.

## Chạy riêng từng app (không proxy S3)

Chỉ khi không cần proxy map3d:

```bash
npm run start:tour    # phu-tho, port 8765 + serve.json
npm run start:verse   # hcmverse, port 8766
npm run start:baotang # baotang, port 8768
```

Map3d và bảo tàng khi cần asset S3/CDN vẫn nên dùng **`npm start`**.

## Cấu trúc repo

```
HCM202/
├── index.html              # Hub chọn trải nghiệm
├── serve-hcm202.mjs        # Dev server chính
├── package.json
├── hcmverse/
├── hcmverse_hcm202/        # map3d + local-dev-shim.js
├── phu-tho-bac-tp-ca-mau/
├── baotang-hochiminh/
└── scripts/                # Công cụ panorama
```

## Push GitHub (repo lớn ~4GB)

Push **chia lô** (tránh timeout một lần ~4GB):

```bash
npm run push:chunked
# hoặc lô nhỏ hơn nếu bị 408/timeout:
node scripts/git-push-chunked.mjs --jpg-batch=400
# commit lớn bị 408:
npm run push:chunked:finish
```

Script tạo nhánh `push-chunks`, push lần lượt: code → mp3 → jpg (mặc định 500 file/lô). Tiến độ lưu `.git-push-chunked-state.json` — **chạy lại cùng lệnh** nếu giữa chừng bị ngắt.

Xong hết:

```bash
git branch -f main push-chunks && git checkout main
```


## Nguồn production

- Map 3D: https://map3d.visithcmc.vn/
- Bảo tàng 3D: https://baotang.hochiminh.vn/
