# HCMVERSE — Ho Chi Minh Metaverse Museum (HCM202)

**“Lịch sử không chỉ để đọc — mà để trải nghiệm.”**

**Dự án:** Nền tảng bảo tàng số & tour immersive phục vụ giáo dục Tư tưởng Hồ Chí Minh  
**Mã nguồn:** [github.com/khanhtm45/HCM202](https://github.com/khanhtm45/HCM202)  
**Đơn vị triển khai:** FPT University — HCMVerse Team

---

## I. Tóm tắt dự án

### 1. HCMVERSE là gì?

**HCMVERSE** (Ho Chi Minh Metaverse Museum) là **sáu trải nghiệm số ngang hàng** trong một repository HCM202, cùng chung giao diện thương hiệu và một lệnh chạy `npm start`. Mỗi thư mục con là **một sản phẩm chức năng hoàn chỉnh** — không phụ thuộc lẫn nhau khi tham quan, nhưng bổ trợ trong hành trình học Tư tưởng Hồ Chí Minh:

| # | Thư mục | Vai trò |
|---|---------|---------|
| 1 | `hcmverse/` | Bảo tàng metaverse giáo dục (Three.js, quiz, gamification) |
| 2 | `hcmverse_hcm202/` | Bản đồ & tour 3D/360 TP.HCM |
| 3 | `baotang-hochiminh/` | Tham quan 360° Bảo tàng Hồ Chí Minh |
| 4 | `phuchutich-egal/` | Tham quan 360° Phủ Chủ Tịch |
| 5 | `binhthuan-hcmverse/` | Tham quan 360° chi nhánh Bình Thuận |
| 6 | `phu-tho-bac-tp-ca-mau/` | Tour 360° Khu tưởng niệm Phú Thọ Bắc |

Trang `index.html` (hub) điều hướng tới cả sáu module; người dùng có thể vào trực tiếp từng URL.

Mục tiêu: đổi mới cách tiếp cận môn **Tư tưởng Hồ Chí Minh** — từ học thuần lý thuyết sang **khám phá trực quan, tương tác và ghi nhớ lâu** (immersive learning cho thế hệ Gen Z).

### 2. Quy mô đã triển khai (thực tế trong repo)

| Hạng mục | Số liệu |
|----------|---------|
| **Sáu module con (chức năng chính)** | `hcmverse`, `hcmverse_hcm202`, `baotang-hochiminh`, `phuchutich-egal`, `binhthuan-hcmverse`, `phu-tho-bac-tp-ca-mau` |
| Tile panorama `.jpg` (tổng repo) | **~94.161** file |
| Dung lượng dữ liệu tour | **~4 GB** (đã đẩy GitHub theo lô) |
| Script vận hành / tải / sửa | 25+ lệnh `npm` (Node.js, Playwright) |

---

## II. Vấn đề & cơ hội

### 1. Vấn đề hiện tại

- Nội dung môn Tư tưởng Hồ Chí Minh **nặng lý thuyết**, khó gây hứng thú nếu chỉ dạy bằng slide và giáo trình.
- Sinh viên Gen Z quen **multimedia, game, không gian 3D** — khoảng cách với phương pháp truyền thống ngày càng lớn.
- Bảo tàng & di tích thật **không phải lúc nào cũng tiếp cận được** (địa lý, thời gian, số lượng khách).

### 2. Cơ hội

- **Số hóa** tour 360° và shell 3D từ nguồn chính thống (Bảo tàng HCM, map3d TP.HCM, Phủ Chủ Tịch, chi nhánh Bình Thuận, Khu tưởng niệm Phú Thọ Bắc…).
- **Một nền tảng thống nhất** (HCMVERSE UI, dev server, pipeline tải/sửa asset) thay vì nhiều link rời rạc.
- **Gamification & AI thuyết minh** ngay trên trình duyệt, không bắt buộc cài app.

---

## III. Giải pháp & kiến trúc sản phẩm

### 1. Sơ đồ tổng quan

```
Người dùng → index.html (Hub HCMVERSE)
                ├── hcmverse/              Metaverse giáo dục (Three.js + quiz)
                ├── hcmverse_hcm202/       Bản đồ 3D / 360 TP.HCM (krpano + proxy S3)
                ├── baotang-hochiminh/     Bảo tàng HCM 3D (Virtual Museum / krpano)
                ├── phuchutich-egal/       Phủ Chủ Tịch 360° (E-Gal / krpano)
                ├── binhthuan-hcmverse/    Bảo tàng chi nhánh Bình Thuận (Panotour + HCMVERSE UI)
                └── phu-tho-bac-tp-ca-mau/ Khu tưởng niệm Phú Thọ Bắc (krpano + model 3D)
```

**Chạy local:** `npm install` → `npm start` → http://localhost:8765/

Server `serve-hcm202.mjs` (cổng **8765**): static toàn repo, proxy S3 (`/proxy-s3/`), proxy CDN quản trị (`/managements/`), stub API analytics — đủ điều kiện chạy map3d và tour offline sau khi tải asset.

### 2. Bảng tổng hợp sáu module

| Thư mục | URL local | Công nghệ | Nguồn gốc | ~Tile `.jpg` |
|---------|-----------|-----------|-----------|--------------|
| `hcmverse/` | `/hcmverse/` | Three.js, Web Speech | Nội dung team + Wikimedia/YouTube | — |
| `hcmverse_hcm202/` | `/hcmverse_hcm202/` | krpano, proxy S3 | map3d.visithcmc.vn | (trong tổng map) |
| `baotang-hochiminh/` | `/baotang-hochiminh/` | Virtual Museum / krpano | baotang.hochiminh.vn | 10.813 |
| `phuchutich-egal/` | `/phuchutich-egal/` | E-Gal Virtual Museum | phuchutich.egal.vn | 25.135 |
| `binhthuan-hcmverse/` | `/binhthuan-hcmverse/` | Panotour Pro | binhthuan.hochiminh.vn | 57.958 |
| `phu-tho-bac-tp-ca-mau/` | `/phu-tho-bac-tp-ca-mau/` | krpano, depthmap, model 3D | CDN VNPT / CMU | 243 |

---

## IV. Sáu chức năng chính (sáu thư mục con)

Mỗi module dưới đây là **một deliverable độc lập**, có thể demo riêng trong buổi showcase. Giao diện HCMVERSE (cyan/tím, Orbitron, Montserrat) được áp dụng trên các tour 360°; `hcmverse/` dùng lobby riêng nhưng cùng nhận diện thương hiệu.

---

### 1. `hcmverse/` — Bảo tàng số metaverse (giáo dục Tư tưởng HCM)

**Mục đích:** Không gian học tập immersive **không cần đến địa điểm thật** — timeline, hiện vật, tư tưởng và quiz trong một web app.

**Chức năng:**

- **Lobby & avatar:** Chọn vai (sinh viên, hướng dẫn viên, nghiên cứu); lưu tiến độ (`localStorage`).
- **Khu Timeline:** Đường hầm thời gian **Three.js**; các mốc (1911, 1930, 1945…) kèm ảnh Wikimedia, video YouTube, mô tả giáo dục.
- **Khu Hiện vật:** Phòng 3D; xoay/zoom hiện vật (máy đánh chữ, dép cao su, sách tư liệu…).
- **Khu Tư tưởng:** Multimedia về đạo đức, giáo dục, thanh niên, đại đoàn kết dân tộc.
- **Khu Quiz & gamification:** Câu hỏi trắc nghiệm, **XP**, huy hiệu, bảng xếp hạng.
- **Thuyết minh:** Giọng đọc trình duyệt (`speechSynthesis`).
- **Liên kết chéo:** Từ lobby sang các tour 360° còn lại.

**Dữ liệu:** `hcmverse/data/content.json` · **Lệnh:** `npm run download:verse-media`, `npm run start:verse` (port 8766) hoặc `npm start`.

---

### 2. `hcmverse_hcm202/` — Bản đồ 3D & tour 360° TP. Hồ Chí Minh

**Mục đích:** Khám phá **không gian đô thị** và các điểm panorama trên bản đồ thành phố — bổ ngữ cảnh địa lý cho học lịch sử – văn hóa TP.HCM.

**Chức năng:**

- Tour **krpano** đa scene trên nền map3d (XML: `tour.xml`, `tour_xml/`).
- Xem panorama **360°** theo vị trí trên bản đồ; chuyển scene, zoom, fullscreen.
- **Proxy S3** qua `serve-hcm202.mjs` (`/proxy-s3/`) — chạy offline sau khi tải asset.
- Chế độ tải nhanh: `?fast=1` · shim dev: `js/local-dev-shim.js`.

**Nguồn:** mirror từ https://map3d.visithcmc.vn/  
**Lệnh:** `npm run download:map3d`, `npm run patch:map3d`, `npm run verify:map3d`, `npm run start:map3d` (port 8767).

---

### 3. `baotang-hochiminh/` — Tham quan 360° Bảo tàng Hồ Chí Minh

**Mục đích:** Trải nghiệm **bên trong Bảo tàng Hồ Chí Minh** như khách tham quan thật — đi phòng, nghe thuyết minh, xem sơ đồ.

**Chức năng:**

- Tour **Virtual Museum** (krpano): di chuyển giữa các phòng triển lãm, hotspot nhảy scene.
- **Autoguide** (MP3 theo phòng, VI/EN); bật/tắt âm thanh, xoay tự động.
- **HCMVERSE UI:** Header logo | tên phòng | EN/VI; thumbnail góc trái; điều khiển (zoom, map, trợ giúp, di chuyển); ẩn skin đỏ gốc.
- **Chế độ phân giải** (SD/HD) và panel trợ giúp điều khiển.
- **Mobile:** Header 2 hàng, nút điều khiển tối ưu chạm.

**Nguồn:** mirror từ https://baotang.hochiminh.vn/ · **~10.813** tile panorama  
**Lệnh:** `npm run download:baotang`, `npm run repair:baotang`, `npm run repair:baotang:skin`, `npm run start:baotang`.

---

### 4. `phuchutich-egal/` — Tham quan 360° Khu di tích Phủ Chủ Tịch

**Mục đích:** Tham quan **Khu di tích Hồ Chí Minh tại Phủ Chủ Tịch** — không gian lịch sử gắn với Chủ tịch Hồ Chí Minh trước khi ra đi tìm đường cứu nước.

**Chức năng:**

- Tour **E-Gal Virtual Museum** đa điểm; chuyển scene bằng hotspot và menu phòng.
- **Sơ đồ khu di tích** (`phuchutichmap.png`) — overlay điểm bấm, nhảy tới panorama tương ứng.
- **Autoguide** đa ngôn ngữ; danh sách phòng (panel bên); thumbnail scene.
- **HCMVERSE UI** đồng bộ với bảo tàng HCM (theme, điều khiển, floor map).
- **Mobile** responsive.

**Nguồn:** mirror từ https://phuchutich.egal.vn/ · **~25.135** tile panorama  
**Lệnh:** `npm run download:phuchutich`, `npm run repair:phuchutich`, `npm run repair:phuchutich:skin`, `npm run start:phuchutich`.

---

### 5. `binhthuan-hcmverse/` — Tham quan 360° Bảo tàng chi nhánh Bình Thuận

**Mục đích:** Tham quan **Bảo tàng Hồ Chí Minh — Chi nhánh Bình Thuận** với cấu trúc ba khu triển lãm như bản production.

**Chức năng:**

- Tour **Panotour Pro** đa scene; **~58.000** tile — quy mô lớn nhất trong repo.
- **Menu 3 khu** (Bảo tàng / Dục Thanh / Trưng bày) + **dropdown** 2 cột, preview ảnh khi hover — thay menu đỏ gốc.
- Giao diện **HCMVERSE mặc định**; `?classic=1` để xem skin Panotour gốc.
- Ẩn thanh đỏ, thumbnail megapixel trùng lặp; header logo | tab | EN/VI.
- **Mobile:** Tab 3 cột, dropdown cuộn, safe-area.

**Nguồn:** mirror từ https://binhthuan.hochiminh.vn/  
**Lệnh:** `npm run download:binhthuan`, `npm run repair:binhthuan:skin`, `npm run embed:binhthuan:css`, `npm run start:binhthuan`.

---

### 6. `phu-tho-bac-tp-ca-mau/` — Tour 360° Khu tưởng niệm Phú Thọ Bắc

**Mục đích:** Tham quan **Khu tưởng niệm Chủ tịch Hồ Chí Minh Phú Thọ Bắc, TP. Cà Mau** — mở rộng địa bàn miền Nam ngoài TP.HCM.

**Chức năng:**

- Tour **krpano** (`denthobactpcamau`); panorama đa scene + **âm nền** tour.
- **Model 3D** (OBJ/MTL) và **depthmap navigation** — đi trong không gian có chiều sâu.
- **Skin mobile** đầy đủ (icon, layout, rotate device); giao diện chrome HCMVERSE (`hcmverse-tour.js`).
- **Panorama tùy chỉnh:** `npm run pano:demo` / `pano:add`, `custom-scene-loader.js`.
- **VR / gyro** (plugin krpano) khi thiết bị hỗ trợ.

**Nguồn:** CDN VNPT / portal CMU · **~243** tile + model/texture  
**Lệnh:** `npm run download`, `npm run verify`, `npm run scan-404`, `npm run capture:phu-tho`.

---

### 7. Nền tảng điều hướng & vận hành (hỗ trợ cả sáu module)

| Thành phần | Chức năng |
|------------|-----------|
| **`index.html` (hub)** | Trang chủ HCMVERSE; liệt kê và link tới **cả sáu** thư mục con |
| **`serve-hcm202.mjs`** | Một server port **8765** phục vụ sáu module + proxy S3/CDN |
| **Pipeline asset** | `download*`, `repair*`, `capture*`, `verify*`, `scan-404` |
| **Push Git lớn** | `npm run push:chunked` — đẩy ~4 GB, ~94k ảnh lên GitHub |

---

## V. Công nghệ sử dụng

| Hạng mục | Công nghệ (thực tế trong HCM202) |
|----------|----------------------------------|
| Frontend hub & metaverse | HTML5, CSS3, JavaScript (ES modules) |
| 3D immersive | **Three.js 0.160** (CDN), WebGL, OrbitControls |
| Tour 360° | **krpano**, Panotour Pro, Virtual Museum (E-Gal), SWF/HTML5 fallback |
| Âm thanh | MP3 autoguide, Web Speech API, nền nhạc tour |
| Dev server | **Node.js** — `serve-hcm202.mjs` (HTTP + proxy) |
| QA / capture | **Playwright** |
| Quản lý mã nguồn | Git, GitHub; push chunked cho asset lớn |
| Thiết kế UI | Figma (quy trình), CSS custom HCMVERSE (cyan `#00d2ff`, tím `#bf00ff`) |
| AI hỗ trợ nội dung | ChatGPT / công cụ AI (kịch bản, tóm tắt); giọng đọc trình duyệt |

*Lưu ý: Sản phẩm chính **không** dùng React cho các module tour; tập trung static web + krpano/Three.js để tối ưu triển khai và mirror production.*

---

## VI. Tính mới & điểm sáng tạo

1. **Sáu sản phẩm trong một repo:** Metaverse giáo dục + map TP.HCM + bốn địa điểm panorama thật — **cùng trọng số**, một lệnh `npm start`.
2. **Số hóa có thể lặp lại:** Mỗi folder có script tải/sửa riêng; mở rộng thêm chi nhánh bảo tàng theo cùng pipeline.
3. **HCMVERSE skin thống nhất:** Trải nghiệm 360° đồng nhất trên bảo tàng HCM, Phủ Chủ Tịch, Bình Thuận, Phú Thọ Bắc.
4. **Gamification** (`hcmverse/`) kết hợp **tour thực địa** — học lý thuyết trong metaverse, củng cố bằng tham quan ảo địa điểm thật.
5. **Quy mô production:** ~94k tile, ~4 GB — chứng minh triển khai dữ liệu lớn, không chỉ prototype.

---

## VII. Kịch bản trải nghiệm (Showcase — lướt qua sáu module)

| Thời gian | Module | Hoạt động demo |
|-----------|--------|----------------|
| 0–1 phút | **Hub** | Giới thiệu sáu thẻ trải nghiệm trên `index.html` |
| 1–3 phút | **`hcmverse/`** | Timeline 3D + một hiện vật + thuyết minh giọng máy |
| 3–5 phút | **`baotang-hochiminh/`** | Vào 1–2 phòng, bật autoguide, đổi scene |
| 5–7 phút | **`phuchutich-egal/`** | Mở sơ đồ khu, nhảy điểm trên map |
| 7–9 phút | **`binhthuan-hcmverse/`** | Chọn 1 trong 3 khu, dropdown chọn phòng |
| 9–11 phút | **`hcmverse_hcm202/`** | Map TP.HCM, chuyển 1 panorama |
| 11–13 phút | **`phu-tho-bac-tp-ca-mau/`** | Một scene 360° + model/depthmap (nếu mạng ổn) |
| 13–15 phút | **`hcmverse/`** (lại) | Quiz nhanh, XP/huy hiệu — kết thúc |

**Dự phòng:** Video quay sẵn từng module; `npm start` offline sau `download:*`; tour guide hướng dẫn thao tác 360°.

---

## VIII. Sử dụng AI — minh bạch & trách nhiệm

| Mục đích | Công cụ / cách làm |
|----------|-------------------|
| Soạn kịch bản, tóm tắt, cấu trúc đề xuất | ChatGPT / AI text |
| Thuyết minh tại chỗ | **Web Speech API** (trình duyệt), không ghi âm studio |
| Hình ảnh timeline / hiện vật | Wikimedia Commons (CC), asset local; ghi credit trong `content.json` |
| Video | YouTube embed (cần mạng) |
| Kiểm chứng nội dung | Nhóm đối chiếu **giáo trình Tư tưởng Hồ Chí Minh** và nguồn chính thống |

**Cam kết:** Không để AI tự sinh toàn bộ nội dung chính trị — lịch sử; mọi mốc thời gian và diễn giải quan trọng được rà soát thủ công. Có thể đính kèm phụ lục prompt / screenshot khi nộp báo cáo.

---

## IX. Timeline thực hiện (gợi ý 5 tuần — đã vượt qua giai đoạn MVP kỹ thuật)

| Tuần | Công việc (sáu module) | Trạng thái |
|------|------------------------|------------|
| 1 | `hcmverse/` + hub `index.html` + proposal | ✅ |
| 2 | `hcmverse_hcm202/` + `baotang-hochiminh/` (tải, proxy S3) | ✅ |
| 3 | `phuchutich-egal/` + `binhthuan-hcmverse/` + HCMVERSE skin | ✅ |
| 4 | `phu-tho-bac-tp-ca-mau/` + mobile UI + verify/repair | ✅ |
| 5 | Push GitHub chunked (~94k ảnh) + showcase & báo cáo | ✅ |

---

## X. Ngân sách

**Dự kiến: 0 VNĐ** (giai đoạn sinh viên / MVP)

- Công cụ: Node.js, Git, GitHub, trình duyệt, Playwright (open source).
- Hosting demo: local hoặc GitHub Pages / static host miễn phí.
- Asset: mirror từ nguồn công khai / CDN có sẵn; không mua license 3D cao cấp.

---

## XI. Rủi ro & kế hoạch dự phòng

| Rủi ro | Mức độ | Giải pháp |
|--------|--------|-----------|
| Web 3D / tour nặng, load chậm | Cao | Tối ưu tile; `?fast=1` map3d; video offline backup |
| Mạng yếu khi push / showcase | Trung bình | `push:chunked` lô 400–500 file; SSH; retry |
| GitHub HTTP 408 (~72 MB/commit) | Đã gặp | `push:chunked:finish`, giảm batch |
| Proxy S3/CDN lỗi khi dev | Trung bình | `serve-hcm202.mjs` + `patch-map3d-s3` |
| Người dùng không quen điều khiển 360° | Thấp | Panel trợ giúp, autoguide, tour guide trực tiếp |
| Bản quyền / chính trị nội dung | Cao | Nguồn chính thống; kiểm duyệt nội dung thủ công |

---

## XII. An toàn & tuân thủ

- Tuân thủ quy định nhà trường; không làm gián đoạn học tập.
- Nội dung đúng **định hướng giáo dục**; trích dẫn nguồn rõ ràng.
- Tôn trọng hiện vật, di tích; không xuyên tạc lịch sử.
- Không sử dụng tài liệu vi phạm bản quyền; ưu tiên CC / nguồn công khai.

### Nguồn tham khảo chính thống

- Cổng thông tin Chính phủ, Văn kiện Đảng  
- Bảo tàng Hồ Chí Minh — https://baotang.hochiminh.vn/  
- Map 3D TP.HCM — https://map3d.visithcmc.vn/  
- Phủ Chủ Tịch — https://phuchutich.egal.vn/  
- Chi nhánh Bình Thuận — https://binhthuan.hochiminh.vn/  
- Giáo trình **Tư tưởng Hồ Chí Minh** (chương trình đại học)

---

## XIII. Kết luận & cam kết

**HCM202 / HCMVERSE** là mô hình thử nghiệm cho **giáo dục số**, **bảo tàng tương tác** và **học tập immersive** — với **sáu module con** chạy được trên trình duyệt, hub điều hướng, pipeline dev và **~94.000** tile panorama trên GitHub.

Dự án hướng tới:

- **Tính giáo dục** — bám chương trình Tư tưởng Hồ Chí Minh  
- **Tính sáng tạo** — metaverse + gamification + tour thật  
- **Tính khả thi** — stack web, chi phí 0 VNĐ, mã nguồn mở trong team  
- **Ứng dụng công nghệ thực tế** — krpano, Three.js, Node.js, Playwright  

---

## XIV. Liên hệ

**Nhóm dự án:** HCMVerse Team — FPT University  

- Email: hcmverse.project@gmail.com  
- Facebook: HCMVerse Project  
- Repository: https://github.com/khanhtm45/HCM202  

---

*Tài liệu này được cập nhật theo trạng thái mã nguồn thực tế trong repository HCM202 (tháng 5/2026).*
