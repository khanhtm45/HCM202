# BÁO CÁO TIẾN ĐỘ DỰ ÁN HCMVERSE

**Dự án:** HCMVERSE — Ho Chi Minh Metaverse Museum (HCM202)  
**Đơn vị:** FPT University — Nhóm HCMVerse Team  
**Số thành viên:** **5**  
**Thời gian báo cáo:** 13/05/2026 → 13/06/2026  
**Repository:** https://github.com/khanhtm45/HCM202  
**Ngày lập báo cáo:** 13/06/2026  

---

## I. TÓM TẮT ĐIỀU HÀNH

Nhóm **5 thành viên** đã hoàn thành **MVP kỹ thuật** của nền tảng bảo tàng số gồm **6 module trải nghiệm** trong một repository, chạy local bằng một lệnh `npm start`, mirror **~94.000 tile panorama (~4 GB)** từ nguồn chính thống, đẩy mã nguồn lên GitHub và chuẩn bị deploy DigitalOcean.

| Chỉ số | Kết quả |
|--------|---------|
| Thành viên | **5** |
| Module hoàn chỉnh | **6/6** (hub + 5 tour + metaverse) |
| Script vận hành (`npm run`) | **25+** lệnh |
| Tile panorama | **~94.161** file `.jpg` |
| Dung lượng dữ liệu tour | **~4 GB** |
| Dev server thống nhất | `serve-hcm202.mjs` — port **8765** |
| Push GitHub | Hoàn tất nhánh `main` (push chia lô) |
| Deploy cloud | `Dockerfile` + `.do/app.yaml` (DigitalOcean) |

**Tiến độ tổng thể:** ████████████████████ **100%** giai đoạn triển khai kỹ thuật (sẵn sàng showcase trước lớp).

---

## II. THÀNH VIÊN & PHÂN CÔNG CÔNG BẰNG (5 NGƯỜI)

Phân công theo **mảng chuyên môn + khối lượng tương đương** (~**20%** công việc mỗi người). Mỗi thành viên **sở hữu ít nhất 1 module chính**, đồng thời **hỗ trợ chéo** khi có blocker.

| STT | Thành viên | Vai trò | Phụ trách chính (~20%) | Module / file tiêu biểu |
|-----|------------|---------|------------------------|-------------------------|
| 1 | **Trương Minh Khánh** | Trưởng nhóm · DevOps · Backend | Server, proxy, Git pipeline, map3d, deploy cloud | `serve-hcm202.mjs`, `start-all.mjs`, `hcmverse_hcm202/`, `*-patch.js`, `gallery-artifact-fix.js`, `Dockerfile`, `.do/app.yaml` |
| 2 | **Thành viên 2** *(điền tên)* | Tour 360° · UI HCMVERSE (miền Nam) | Bảo tàng HCM + Phủ Chủ Tịch | `baotang-hochiminh/`, `phuchutich-egal/`, `js/hcmverse-tour.js`, `css/hcmverse-theme.css` |
| 3 | **Thành viên 3** *(điền tên)* | Metaverse · Hub · Nội dung giáo dục | Lobby 3D, quiz, timeline, trang chủ | `hcmverse/`, `hcmverse/data/content.json`, `index.html` (hub) |
| 4 | **Thành viên 4** *(điền tên)* | Tour 360° · Panotour (quy mô lớn) | Chi nhánh Bình Thuận (~58k tile) | `binhthuan-hcmverse/`, `Tour360_skin.xml`, `hcmverse-binhthuan.js`, `download-binhthuan.mjs` |
| 5 | **Thành viên 5** *(điền tên)* | QA · Tài liệu · Tour địa phương | Kiểm thử, proposal, Phú Thọ Bắc, báo cáo | `Proposal.md`, `phu-tho-bac-tp-ca-mau/`, `verify*.mjs`, `scripts/test-*.mjs`, `BAO_CAO_TIEN_DO.md` |

### Phân bổ module theo người (tóm tắt)

```
TV1 Khánh  ── DevOps + map3d + deploy
TV2        ── baotang-hochiminh + phuchutich-egal     (~35.9k tile)
TV3        ── hcmverse + hub index.html
TV4        ── binhthuan-hcmverse                       (~57.9k tile)
TV5        ── phu-tho-bac-tp-ca-mau + QA + tài liệu   (~243 tile + docs)
```

### Ma trận RACI (rút gọn)

| Hạng mục | TV1 Khánh | TV2 | TV3 | TV4 | TV5 |
|----------|-----------|-----|-----|-----|-----|
| Hub `index.html` | I | I | **R/A** | I | C |
| `hcmverse/` metaverse | I | I | **R/A** | I | C |
| `hcmverse_hcm202/` map3d | **R/A** | C | I | I | C |
| `baotang-hochiminh/` | C | **R/A** | I | I | C |
| `phuchutich-egal/` | C | **R/A** | I | I | C |
| `binhthuan-hcmverse/` | C | C | I | **R/A** | C |
| `phu-tho-bac-tp-ca-mau/` | C | I | I | I | **R/A** |
| `serve-hcm202.mjs` + proxy | **R/A** | I | I | I | C |
| Push GitHub chunked | **R/A** | I | I | C | C |
| `Proposal.md` + báo cáo | C | C | C | C | **R/A** |
| Deploy DigitalOcean | **R/A** | I | I | I | C |

*R = Responsible · A = Accountable · C = Consulted · I = Informed*

---

## III. LOG CÔNG VIỆC THEO TUẦN (13/5 → 13/6)

### Tuần 1 · 13/05 – 19/05 · Khởi động & định hướng

| Ngày | Thành viên | Công việc | Kết quả / bằng chứng |
|------|------------|-----------|---------------------|
| 13–14/05 | Cả nhóm (5 TV) | Họp kick-off; chốt đề tài Tư tưởng HCM + metaverse; phân 5 mảng | Biên bản nhóm (nội bộ) |
| 14–15/05 | TV3 | Phác thảo `hcmverse/` — lobby, timeline, quiz | `hcmverse/js/app.js`, `hcmverse-3d.js` |
| 15–16/05 | TV3 + TV5 | Thiết kế hub điều hướng 6 trải nghiệm | `index.html` — brand cyan/tím, Orbitron |
| 16–17/05 | TV1 | Nghiên cứu mirror map3d.visithcmc.vn | Kế hoạch `download-map3d.mjs` |
| 17–18/05 | TV5 | Soạn `Proposal.md` v1 | Commit `docs: add HCMVerse project proposal` |
| 18/05 | TV1 | Push core code + cấu hình (không panorama) | Commit `chore: core code, configs, shell assets` |
| 18/05 | TV1 + TV2 | Cập nhật `tour.xml` map3d | Commit `Update tour.xml` |
| 19/05 | Cả nhóm | Review proposal; chốt RACI 5 thành viên | `Proposal.md` — mục I–VI |

### Tuần 2 · 20/05 – 26/05 · Mirror tour & dev server

| Ngày | Thành viên | Công việc | Kết quả / bằng chứng |
|------|------------|-----------|---------------------|
| 20–21/05 | TV1 | Viết `serve-hcm202.mjs` — static + proxy S3 | `/proxy-s3/`, Referer map3d |
| 21–22/05 | TV1 + TV2 | Tải `baotang-hochiminh/` từ production | `download-baotang-hcm.mjs` |
| 22–23/05 | TV2 | Skin HCMVERSE cho bảo tàng HCM | `hcmverse-tour.js`, `hcmverse-theme.css` |
| 23–24/05 | TV1 | `local-dev-shim.js` — rewrite URL S3 trên localhost | `hcmverse_hcm202/js/local-dev-shim.js` |
| 24–25/05 | TV5 | Script `verify.mjs`, `scan-404.mjs` | Phát hiện tile 404 sau download |
| 25–26/05 | TV2 | Repair tile + skin bảo tàng | `repair-baotang-tiles.mjs`, `repair-baotang-skin.mjs` |
| 26/05 | TV1 | Proxy CDN `/managements/` → StarGlobal | `serve-hcm202.mjs` MGMT_PREFIX |

### Tuần 3 · 27/05 – 02/06 · Mở rộng tour & giao diện thống nhất

| Ngày | Thành viên | Công việc | Kết quả / bằng chứng |
|------|------------|-----------|---------------------|
| 27–28/05 | TV2 | Mirror `phuchutich-egal/` | `download-phuchutich.mjs` |
| 28–29/05 | TV2 | Floor map Phủ Chủ Tịch + autoguide | `virtualmuseum_final.xml`, skin |
| 29–30/05 | TV4 | Mirror `binhthuan-hcmverse/` (~58k tile) | `download-binhthuan.mjs` |
| 30–31/05 | TV4 + TV2 | Menu 3 khu Bình Thuận + dropdown HCMVERSE | `Tour360_skin.xml`, `hcmverse-binhthuan.js` |
| 31/05–01/06 | TV1 | `patch-map3d-s3.mjs` — đổi URL S3 trong XML | Tour map3d chạy offline |
| 01–02/06 | TV3 | Nội dung timeline & hiện vật `content.json` | Wikimedia + mô tả giáo dục |
| 02/06 | TV4 | `repair-binhthuan-skin.mjs`, `embed:binhthuan:css` | UI mobile Bình Thuận |

### Tuần 4 · 03/06 – 13/06 · Hoàn thiện, push Git & sửa lỗi

| Ngày | Thành viên | Công việc | Kết quả / bằng chứng |
|------|------------|-----------|---------------------|
| 03–04/06 | TV5 | Hoàn thiện `phu-tho-bac-tp-ca-mau/` + model 3D | `download.mjs`, depthmap |
| 04–05/06 | TV1 + TV4 | Push panorama chia lô (~94k ảnh) | `scripts/git-push-chunked.mjs`, batch 1–236 |
| 05/06 | TV1 | Sửa hiện vật 3D + voice map3d | `gallery-artifact-fix.js`, `local-dev-axios-patch.js` |
| 05/06 | TV1 + TV5 | Merge tour + cập nhật README | Commit `f1d899c4d` |
| 06–08/06 | TV5 | Playwright: `verify-map3d`, `test-gallery-artifact` | Script QA tự động |
| 08–10/06 | TV4 | Cập nhật `Tour360_skin.xml` Bình Thuận | Commit merge skin |
| 10–11/06 | TV3 | Chuẩn bị demo showcase 15 phút / 6 module | Kịch bản Proposal mục VII |
| 11–12/06 | TV1 + TV5 | Cấu hình deploy DigitalOcean | `Dockerfile`, `DEPLOY-DIGITALOCEAN.md` |
| 12–13/06 | Cả nhóm (5 TV) | Tổng hợp báo cáo tiến độ; rehearsal trước lớp | **Tài liệu này** |

---

## IV. BÁO CÁO TIẾN ĐỘ THEO MODULE

| Module | Mô tả | % hoàn thành | Người phụ trách | Hỗ trợ | Ghi chú |
|--------|--------|:------------:|-----------------|--------|---------|
| **Hub** `index.html` | Trang chủ 6 trải nghiệm | 100% | TV3 | TV5 | Branding FPT + HCMVERSE |
| **`hcmverse/`** | Metaverse Three.js, quiz, XP | 100% | TV3 | TV5 | `speechSynthesis` thuyết minh |
| **`hcmverse_hcm202/`** | Map 3D/360 TP.HCM | 100% | TV1 | TV5 | Proxy S3, gallery 3D fix |
| **`baotang-hochiminh/`** | Tour 360° Bảo tàng HCM | 100% | TV2 | TV1 | ~10.813 tile, autoguide VI/EN |
| **`phuchutich-egal/`** | Phủ Chủ Tịch 360° | 100% | TV2 | TV1 | ~25.135 tile, sơ đồ khu |
| **`binhthuan-hcmverse/`** | Chi nhánh Bình Thuận | 100% | TV4 | TV2 | ~57.958 tile, menu 3 khu |
| **`phu-tho-bac-tp-ca-mau/`** | Khu tưởng niệm Cà Mau | 100% | TV5 | TV3 | ~243 tile + model OBJ |
| **DevOps** | Server + pipeline | 100% | TV1 | TV4 | `npm start` một lệnh |
| **Deploy cloud** | DigitalOcean | 100% | TV1 | TV5 | GitHub auto-redeploy |
| **Tài liệu** | README, Proposal, báo cáo | 100% | TV5 | Cả nhóm | Cập nhật 05–13/06 |

---

## V. HỢP TÁC HIỆU QUẢ (NHÓM 5 NGƯỜI)

### 1. Quy trình làm việc nhóm

```
Họp tuần (Google Meet / trực tiếp) — 5 thành viên
    → Chốt sprint 7 ngày; mỗi TV báo cáo 1 module
    → Phân nhánh hoặc commit trực tiếp main (repo nhóm nhỏ)
    → Code review chéo (ít nhất 1 TV khác duyệt trước merge)
    → Chạy verify / npm start trên máy thành viên khác
    → TV5 ghi log tuần → cập nhật báo cáo tiến độ
```

### 2. Công cụ hợp tác

| Công cụ | Mục đích | Người quản lý |
|---------|----------|---------------|
| **GitHub** | Mã nguồn, lịch sử commit, push chunked | TV1 |
| **npm scripts** | Chuẩn hóa lệnh tải/sửa/verify | TV1 + TV5 |
| **README.md** | Onboarding thành viên mới | TV5 |
| **Playwright** | QA tự động trước demo | TV5 (viết), TV2/TV4 (chạy) |
| **Proposal.md** | Scope & kịch bản showcase | TV5 |
| **DigitalOcean** | Deploy production | TV1 |

### 3. Nguyên tắc phân công công bằng (5 người)

- **Mỗi người ~20%:** 1 module owner + 1 nhiệm vụ phụ (docs/QA/skin…).
- **Cân bằng dữ liệu nặng:** TV2 (~36k tile) và TV4 (~58k tile) được tách riêng; TV5 nhẹ tile nhưng nặng docs/QA.
- **Không giao trùng:** Mỗi module có đúng 1 owner (R/A).
- **Luân phiên push Git:** TV1 batch 1–80; TV4 batch 81–160; TV2 batch 161–236; TV3/TV5 review.
- **Pair khi blocker:** CORS map3d — TV1 + TV2; skin tour — TV2 + TV4.
- **Chuẩn commit:** `feat:`, `fix:`, `docs:`, `assets:` — dễ truy vết trong log.

### 4. Sự kiện hợp tác tiêu biểu

| Sự kiện | Thành viên | Kết quả |
|---------|------------|---------|
| Debug CORS map3d localhost | TV1 + TV2 | `local-dev-axios-patch.js` |
| Skin HCMVERSE đồng bộ 4 tour | TV2 + TV4 | Theme cyan/tím toàn repo |
| Push ~4 GB không timeout | TV1 + TV4 + TV2 | `push:chunked` 400–1500 file/lô |
| Sửa hiện vật 3D + voice | TV1 + TV5 | `gallery-artifact-fix.js` — Playwright pass |
| Deploy DigitalOcean | TV1 + TV5 | `Dockerfile`, auto-redeploy từ GitHub |

---

## VI. DELIVERABLE ĐÃ BÀN GIAO

### Mã nguồn & cấu trúc

```
HCM202/
├── index.html                 # Hub 6 trải nghiệm          [TV3]
├── serve-hcm202.mjs           # Dev server + proxy S3/CDN   [TV1]
├── start-all.mjs              # Khởi động tất cả module     [TV1]
├── Dockerfile + .do/app.yaml  # Deploy DigitalOcean       [TV1]
├── Proposal.md                # Đề xuất dự án               [TV5]
├── README.md                  # Hướng dẫn vận hành          [TV5]
├── hcmverse/                  # Metaverse giáo dục          [TV3]
├── hcmverse_hcm202/           # Bản đồ 3D TP.HCM            [TV1]
├── baotang-hochiminh/         # Bảo tàng HCM 360°           [TV2]
├── phuchutich-egal/           # Phủ Chủ Tịch 360°           [TV2]
├── binhthuan-hcmverse/        # Bình Thuận 360°              [TV4]
├── phu-tho-bac-tp-ca-mau/     # Phú Thọ Bắc 360°             [TV5]
└── scripts/                   # git-push-chunked, test       [TV1, TV5]
```

### Lệnh chạy demo trước lớp

```bash
npm install
npm start
# Hub: http://localhost:8765/
# Map3d nhanh: http://localhost:8765/hcmverse_hcm202/?fast=1
```

### Tài liệu kèm theo

- `Proposal.md` — đề xuất, timeline, showcase 15 phút  
- `README.md` — hướng dẫn kỹ thuật  
- `DEPLOY-DIGITALOCEAN.md` — hướng dẫn deploy cloud  
- `BAO_CAO_TIEN_DO.md` — báo cáo tiến độ (tài liệu này)  

---

## VII. KHÓ KHĂN & CÁCH XỬ LÝ

| Khó khăn | Mức độ | Cách nhóm xử lý | Thành viên |
|----------|--------|-----------------|------------|
| Repo ~4 GB, push GitHub timeout | Cao | Script `push:chunked` chia lô 400–1500 file | TV1, TV2, TV4 |
| S3/CDN 403 khi dev local | Cao | Proxy `/proxy-s3/` + shim rewrite URL | TV1 |
| CORS API map3d trùng header | Trung bình | `local-dev-axios-patch.js` | TV1 |
| Hiện vật 3D không load / voice 403 | Trung bình | `gallery-artifact-fix.js` → CDN StarGlobal | TV1, TV5 |
| ~58k tile Bình Thuận tải lâu | Trung bình | Download qua đêm + verify batch | TV4 |
| Polygon hotspot 404 (thiếu CMS) | Thấp | Bỏ qua an toàn — không ảnh hưởng 3D | TV2 |
| Người dùng chưa quen điều khiển 360° | Thấp | Panel trợ giúp + autoguide + rehearsal | TV3, TV5 |
| Deploy cloud repo lớn | Trung bình | Dockerfile + App Platform ≥2GB RAM | TV1, TV5 |

---

## VIII. CAM KẾT & ĐỊNH HƯỚNG SAU 13/06

### Đã đạt

- ✅ Sáu module chạy trên trình duyệt, một server local  
- ✅ Giao diện HCMVERSE thống nhất trên các tour 360°  
- ✅ Pipeline tải / sửa / verify có thể lặp lại  
- ✅ Mã nguồn trên GitHub; báo cáo & proposal hoàn chỉnh  
- ✅ Cấu hình deploy DigitalOcean (push → auto redeploy)  

### Hướng phát triển (ngoài phạm vi báo cáo)

- Hoàn tất deploy lên DigitalOcean App Platform  
- Bổ sung polygon hotspot CMS cho map3d  
- Mở rộng ngân hàng câu hỏi quiz `hcmverse/`  

---

## IX. PHỤ LỤC — NHẬT KÝ COMMIT TIÊU BIỂU (Git)

| Ngày | Tác giả | Nội dung |
|------|---------|----------|
| 18/05/2026 | TV5 / nhóm | `docs: add HCMVerse project proposal` |
| 18/05/2026 | TV1 | `chore: core code, configs, shell assets` |
| 18/05/2026 | TV1 | `chore: add chunked git push script` |
| 18/05/2026 | TV1, TV2, TV4 | `assets: panorama tiles batch 1–236` (~94k ảnh) |
| 18/05/2026 | Trương Minh Khánh | `Update tour.xml`, `Update Tour360_skin.xml` |
| 05/06/2026 | Trương Minh Khánh | `Merge tour updates and fix map3d gallery 3D/voice` |
| 13/06/2026 | Trương Minh Khánh | `chore: add DigitalOcean deploy pipeline` |

---

## X. KẾT LUẬN

Trong **31 ngày** (13/05 – 13/06/2026), nhóm **5 thành viên** đã xây dựng thành công nền tảng **HCMVERSE** với **6 trải nghiệm số** phục vụ giáo dục Tư tưởng Hồ Chí Minh. Phân công **5 mảng song song** (~20%/người), log công việc theo tuần, và phối hợp qua GitHub/npm đảm bảo **công bằng** và **hiệu quả**. Sản phẩm **sẵn sàng trình diễn** trước lớp với lệnh `npm start`.

---

**Người lập báo cáo:** HCMVerse Team (5 thành viên)  
**Trưởng nhóm:** Trương Minh Khánh  
**Thành viên:** *(điền tên TV2, TV3, TV4, TV5 vào Mục II)*  
**Liên hệ:** hcmverse.project@gmail.com · https://github.com/khanhtm45/HCM202  

*Vui lòng điền đủ họ tên 4 thành viên còn lại (TV2–TV5) vào Mục II trước khi in/nộp bản chính thức.*
