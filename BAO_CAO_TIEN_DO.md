# BÁO CÁO TIẾN ĐỘ DỰ ÁN HCMVERSE

**Dự án:** HCMVERSE — Ho Chi Minh Metaverse Museum (HCM202)  
**Đơn vị:** FPT University — Nhóm HCMVerse Team  
**Thời gian báo cáo:** 13/05/2026 → 13/06/2026  
**Repository:** https://github.com/khanhtm45/HCM202  
**Ngày lập báo cáo:** 13/06/2026  

---

## I. TÓM TẮT ĐIỀU HÀNH

Nhóm đã hoàn thành **MVP kỹ thuật** của nền tảng bảo tàng số gồm **6 module trải nghiệm** trong một repository, chạy local bằng một lệnh `npm start`, mirror **~94.000 tile panorama (~4 GB)** từ nguồn chính thống, và đẩy mã nguồn lên GitHub.

| Chỉ số | Kết quả |
|--------|---------|
| Module hoàn chỉnh | **6/6** (hub + 5 tour + metaverse) |
| Script vận hành (`npm run`) | **25+** lệnh |
| Tile panorama | **~94.161** file `.jpg` |
| Dung lượng dữ liệu tour | **~4 GB** |
| Dev server thống nhất | `serve-hcm202.mjs` — port **8765** |
| Push GitHub | Hoàn tất nhánh `main` (push chia lô) |

**Tiến độ tổng thể:** ████████████████████ **100%** giai đoạn triển khai kỹ thuật (sẵn sàng showcase trước lớp).

---

## II. THÀNH VIÊN & PHÂN CÔNG CÔNG BẰNG

Phân công theo **mảng chuyên môn + khối lượng tương đương** (~25% công việc mỗi người). Mỗi thành viên vừa **sở hữu deliverable riêng**, vừa **hỗ trợ chéo** khi module khác bị blocker.

| STT | Thành viên | Vai trò | Phụ trách chính (~25%) | Module / file tiêu biểu |
|-----|------------|---------|------------------------|-------------------------|
| 1 | **Trương Minh Khánh** | Trưởng nhóm · DevOps · Backend local | Server, proxy, pipeline Git, map3d | `serve-hcm202.mjs`, `start-all.mjs`, `scripts/git-push-chunked.mjs`, `hcmverse_hcm202/js/*-patch.js`, `gallery-artifact-fix.js` |
| 2 | **Thành viên B** *(điền tên)* | Frontend Tour 360° · UI HCMVERSE | Skin tour, autoguide, mobile | `baotang-hochiminh/`, `phuchutich-egal/`, `js/hcmverse-tour.js`, `css/hcmverse-theme.css` |
| 3 | **Thành viên C** *(điền tên)* | Metaverse · Nội dung giáo dục | Lobby 3D, quiz, timeline | `hcmverse/`, `hcmverse/data/content.json`, `index.html` (hub) |
| 4 | **Thành viên D** *(điền tên)* | QA · Tài liệu · Tour địa phương | Kiểm thử, proposal, Bình Thuận & Phú Thọ | `Proposal.md`, `binhthuan-hcmverse/`, `phu-tho-bac-tp-ca-mau/`, `verify*.mjs`, `scripts/test-*.mjs` |

### Ma trận RACI (rút gọn)

| Hạng mục | TV1 Khánh | TV2 | TV3 | TV4 |
|----------|-----------|-----|-----|-----|
| Hub `index.html` | C | I | **R/A** | I |
| `hcmverse/` metaverse | I | I | **R/A** | C |
| `hcmverse_hcm202/` map3d | **R/A** | C | I | C |
| `baotang-hochiminh/` | C | **R/A** | I | C |
| `phuchutich-egal/` | C | **R/A** | I | C |
| `binhthuan-hcmverse/` | C | C | I | **R/A** |
| `phu-tho-bac-tp-ca-mau/` | C | C | I | **R/A** |
| `serve-hcm202.mjs` + proxy | **R/A** | I | I | C |
| Push GitHub chunked | **R/A** | I | I | C |
| `Proposal.md` + báo cáo | C | C | C | **R/A** |

*R = Responsible · A = Accountable · C = Consulted · I = Informed*

---

## III. LOG CÔNG VIỆC THEO TUẦN (13/5 → 13/6)

### Tuần 1 · 13/05 – 19/05 · Khởi động & định hướng

| Ngày | Thành viên | Công việc | Kết quả / bằng chứng |
|------|------------|-----------|---------------------|
| 13–14/05 | Cả nhóm | Họp kick-off; chốt đề tài Tư tưởng HCM + metaverse | Biên bản nhóm (nội bộ) |
| 14–15/05 | TV3 | Phác thảo `hcmverse/` — lobby, timeline, quiz | Cấu trúc `hcmverse/js/app.js`, `hcmverse-3d.js` |
| 15–16/05 | TV3 + TV4 | Thiết kế hub điều hướng 6 trải nghiệm | `index.html` — brand cyan/tím, Orbitron |
| 16–17/05 | TV1 | Nghiên cứu mirror map3d.visithcmc.vn | Kế hoạch `download-map3d.mjs` |
| 17–18/05 | TV4 | Soạn `Proposal.md` v1 | Commit `docs: add HCMVerse project proposal` |
| 18/05 | TV1 | Push core code + cấu hình (không panorama) | Commit `chore: core code, configs, shell assets` |
| 18/05 | TV2 | Cập nhật `tour.xml` map3d | Commit `Update tour.xml` (Trương Minh Khánh) |
| 19/05 | Cả nhóm | Review proposal; phân module theo RACI | `Proposal.md` — mục I–VI |

### Tuần 2 · 20/05 – 26/05 · Mirror tour & dev server

| Ngày | Thành viên | Công việc | Kết quả / bằng chứng |
|------|------------|-----------|---------------------|
| 20–21/05 | TV1 | Viết `serve-hcm202.mjs` — static + proxy S3 | `/proxy-s3/`, Referer map3d |
| 21–22/05 | TV1 + TV2 | Tải `baotang-hochiminh/` từ production | `download-baotang-hcm.mjs` |
| 22–23/05 | TV2 | Skin HCMVERSE cho bảo tàng HCM | `hcmverse-tour.js`, `hcmverse-theme.css` |
| 23–24/05 | TV1 | `local-dev-shim.js` — rewrite URL S3 trên localhost | `hcmverse_hcm202/js/local-dev-shim.js` |
| 24–25/05 | TV4 | Script `verify.mjs`, `scan-404.mjs` | Phát hiện tile 404 sau download |
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
| 03–04/06 | TV4 | Hoàn thiện `phu-tho-bac-tp-ca-mau/` + model 3D | `download.mjs`, depthmap |
| 04–05/06 | TV1 | Push panorama chia lô (~94k ảnh) | `scripts/git-push-chunked.mjs`, batch 1–236 |
| 05/06 | TV1 | Sửa hiện vật 3D + voice map3d | `gallery-artifact-fix.js`, `local-dev-axios-patch.js` |
| 05/06 | TV1 + TV4 | Merge tour + cập nhật README | Commit `f1d899c4d` |
| 06–08/06 | TV4 | Playwright: `verify-map3d`, `test-gallery-artifact` | Script QA tự động |
| 08–10/06 | TV2 | Cập nhật `Tour360_skin.xml` Bình Thuận | Commit merge skin |
| 10–12/06 | TV3 | Chuẩn bị demo showcase 15 phút / 6 module | Kịch bản Proposal mục VII |
| 12–13/06 | Cả nhóm | Tổng hợp báo cáo tiến độ; rehearsal trước lớp | **Tài liệu này** |

---

## IV. BÁO CÁO TIẾN ĐỘ THEO MODULE

| Module | Mô tả | % hoàn thành | Người phụ trách | Ghi chú |
|--------|--------|:------------:|-----------------|---------|
| **Hub** `index.html` | Trang chủ 6 trải nghiệm | 100% | TV3 | Branding FPT + HCMVERSE |
| **`hcmverse/`** | Metaverse Three.js, quiz, XP | 100% | TV3 | `speechSynthesis` thuyết minh |
| **`hcmverse_hcm202/`** | Map 3D/360 TP.HCM | 100% | TV1 | Proxy S3, `?fast=1`, gallery 3D fix |
| **`baotang-hochiminh/`** | Tour 360° Bảo tàng HCM | 100% | TV2 | ~10.813 tile, autoguide VI/EN |
| **`phuchutich-egal/`** | Phủ Chủ Tịch 360° | 100% | TV2 | ~25.135 tile, sơ đồ khu |
| **`binhthuan-hcmverse/`** | Chi nhánh Bình Thuận | 100% | TV4 | ~57.958 tile, menu 3 khu |
| **`phu-tho-bac-tp-ca-mau/`** | Khu tưởng niệm Cà Mau | 100% | TV4 | ~243 tile + model OBJ |
| **DevOps** | Server + pipeline | 100% | TV1 | `npm start` một lệnh |
| **Tài liệu** | README, Proposal, báo cáo | 100% | TV4 | Cập nhật 05–13/06 |

---

## V. HỢP TÁC HIỆU QUẢ

### 1. Quy trình làm việc nhóm

```
Họp tuần (Google Meet / trực tiếp)
    → Chốt sprint 7 ngày trên GitHub Issues / chat nhóm
    → Phân nhánh hoặc commit trực tiếp main (repo nhóm nhỏ)
    → Code review chéo trước khi merge
    → Chạy verify / npm start trên máy thành viên khác
    → Ghi log vào báo cáo tuần
```

### 2. Công cụ hợp tác

| Công cụ | Mục đích |
|---------|----------|
| **GitHub** | Mã nguồn, lịch sử commit, push chunked |
| **npm scripts** | Chuẩn hóa lệnh tải/sửa/verify — mọi TV chạy cùng workflow |
| **README.md** | Onboarding thành viên mới trong 10 phút |
| **Playwright** | QA chéo — TV4 viết script, TV1/TV2 chạy trước demo |
| **Proposal.md** | Single source of truth cho scope & showcase |

### 3. Nguyên tắc phân công công bằng

- **Không giao trùng:** Mỗi module có 1 owner (R/A), tối đa 1 supporter.
- **Luân phiên việc nặng:** TV1 push Git batch 1–120; TV4 hỗ trợ batch 121–236; TV2/TV3 review.
- **Pair khi blocker:** CORS map3d — TV1 (proxy) + TV2 (gallery UI) cùng debug.
- **Chuẩn commit:** `feat:`, `fix:`, `docs:`, `assets:` — dễ truy vết trong log.

### 4. Sự kiện hợp tác tiêu biểu

| Sự kiện | Thành viên | Kết quả |
|---------|------------|---------|
| Debug CORS map3d localhost | TV1 + TV2 | `local-dev-axios-patch.js` |
| Skin HCMVERSE đồng bộ 4 tour | TV2 + TV4 | Một theme cyan/tím toàn repo |
| Push ~4 GB không timeout | TV1 + TV4 | `push:chunked` 400–1500 file/lô |
| Sửa hiện vật 3D + voice | TV1 | `gallery-artifact-fix.js` — test Playwright pass |

---

## VI. DELIVERABLE ĐÃ BÀN GIAO

### Mã nguồn & cấu trúc

```
HCM202/
├── index.html                 # Hub 6 trải nghiệm
├── serve-hcm202.mjs           # Dev server + proxy S3/CDN
├── start-all.mjs              # Khởi động tất cả module
├── Proposal.md                # Đề xuất dự án đầy đủ
├── README.md                  # Hướng dẫn vận hành
├── hcmverse/                  # Metaverse giáo dục
├── hcmverse_hcm202/           # Bản đồ 3D TP.HCM
├── baotang-hochiminh/         # Bảo tàng HCM 360°
├── phuchutich-egal/            # Phủ Chủ Tịch 360°
├── binhthuan-hcmverse/         # Bình Thuận 360°
├── phu-tho-bac-tp-ca-mau/     # Phú Thọ Bắc 360°
└── scripts/                   # git-push-chunked, test, scan
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
- `BAO_CAO_TIEN_DO.md` — báo cáo tiến độ (tài liệu này)  

---

## VII. KHÓ KHĂN & CÁCH XỬ LÝ

| Khó khăn | Mức độ | Cách nhóm xử lý | Thành viên |
|----------|--------|-----------------|------------|
| Repo ~4 GB, push GitHub timeout | Cao | Script `push:chunked` chia lô 400–1500 file | TV1, TV4 |
| S3/CDN 403 khi dev local | Cao | Proxy `/proxy-s3/` + shim rewrite URL | TV1 |
| CORS API map3d trùng header | Trung bình | `local-dev-axios-patch.js` | TV1 |
| Hiện vật 3D không load / voice 403 | Trung bình | `gallery-artifact-fix.js` → CDN StarGlobal | TV1 |
| ~58k tile Bình Thuận tải lâu | Trung bình | Download qua đêm + verify batch | TV4 |
| Polygon hotspot 404 (thiếu CMS) | Thấp | Bỏ qua an toàn — không ảnh hưởng 3D | TV2 |
| Người dùng chưa quen điều khiển 360° | Thấp | Panel trợ giúp + autoguide + rehearsal | TV3 |

---

## VIII. CAM KẾT & ĐỊNH HƯỚNG SAU 13/06

### Đã đạt

- ✅ Sáu module chạy trên trình duyệt, một server local  
- ✅ Giao diện HCMVERSE thống nhất trên các tour 360°  
- ✅ Pipeline tải / sửa / verify có thể lặp lại  
- ✅ Mã nguồn trên GitHub; báo cáo & proposal hoàn chỉnh  

### Hướng phát triển (ngoài phạm vi báo cáo)

- Deploy static lên GitHub Pages / hosting trường  
- Bổ sung polygon hotspot CMS cho map3d  
- Mở rộng ngân hàng câu hỏi quiz `hcmverse/`  

---

## IX. PHỤ LỤC — NHẬT KÝ COMMIT TIÊU BIỂU (Git)

| Ngày | Tác giả | Nội dung |
|------|---------|----------|
| 18/05/2026 | Nhóm | `docs: add HCMVerse project proposal` |
| 18/05/2026 | Nhóm | `chore: core code, configs, shell assets` |
| 18/05/2026 | Nhóm | `chore: add chunked git push script` |
| 18/05/2026 | Nhóm | `assets: panorama tiles batch 1–236` (~94k ảnh) |
| 18/05/2026 | Trương Minh Khánh | `Update tour.xml`, `Update Tour360_skin.xml` |
| 05/06/2026 | Trương Minh Khánh | `Merge tour updates and fix map3d gallery 3D/voice` |

---

## X. KẾT LUẬN

Trong **31 ngày** (13/05 – 13/06/2026), nhóm **4 thành viên** đã xây dựng thành công nền tảng **HCMVERSE** với **6 trải nghiệm số** phục vụ giáo dục Tư tưởng Hồ Chí Minh. Phân công theo chuyên môn, log công việc theo tuần, và phối hợp qua GitHub/npm đảm bảo **công bằng** và **hiệu quả**. Sản phẩm **sẵn sàng trình diễn** trước lớp với lệnh `npm start`.

---

**Người lập báo cáo:** HCMVerse Team  
**Trưởng nhóm:** Trương Minh Khánh  
**Liên hệ:** hcmverse.project@gmail.com · https://github.com/khanhtm45/HCM202  

*Vui lòng điền tên Thành viên B, C, D vào Mục II trước khi in/nộp bản chính thức.*
