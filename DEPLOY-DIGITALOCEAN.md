# Deploy HCM202 lên DigitalOcean (GitHub → auto redeploy)

Luồng làm việc:

```
Sửa code local → git push origin main → DigitalOcean tự build & deploy lại
```

Repo: https://github.com/khanhtm45/HCM202

---

## Chuẩn bị

| Yêu cầu | Ghi chú |
|---------|---------|
| Tài khoản [DigitalOcean](https://www.digitalocean.com/) | Có thể dùng gói App Platform hoặc Droplet |
| Repo GitHub **public** hoặc kết nối quyền DO ↔ GitHub | App Platform cần đọc repo |
| Code đã push lên `main` | Bao gồm `Dockerfile`, `.do/app.yaml` |
| Dung lượng repo **~4 GB** | Build lâu; cần gói instance đủ RAM/disk |

Server production chạy `node serve-hcm202.mjs` — cùng logic proxy `/proxy-s3/`, `/managements/` như local, lắng nghe cổng `PORT` (mặc định **8080** trên App Platform).

---

## Cách 1 — App Platform (khuyến nghị: đơn giản, auto redeploy)

### Bước 1: Kết nối GitHub

1. Đăng nhập [DigitalOcean Control Panel](https://cloud.digitalocean.com/)
2. **Apps** → **Create App**
3. Chọn **GitHub** → Authorize DigitalOcean
4. Chọn repository **`khanhtm45/HCM202`**, branch **`main`**
5. Bật **Autodeploy** (deploy lại mỗi lần push)

### Bước 2: Cấu hình build

DigitalOcean có thể tự nhận `Dockerfile`. Nếu hỏi loại app:

| Mục | Giá trị |
|-----|---------|
| Type | **Dockerfile** |
| Dockerfile path | `Dockerfile` |
| HTTP port | **8080** |
| Run command | *(để trống — dùng CMD trong Dockerfile)* |

Hoặc import spec có sẵn:

```bash
# Cài doctl: https://docs.digitalocean.com/reference/doctl/
doctl auth init
doctl apps create --spec .do/app.yaml
```

### Bước 3: Chọn gói (quan trọng với repo lớn)

| Gói | Ghi chú |
|-----|---------|
| **Basic 2GB RAM** (`apps-s-1vcpu-2gb`) | Tối thiểu thử nghiệm |
| **Professional 4GB** | Nên dùng nếu build fail / chậm |

Chi phí tham khảo: ~$12–24/tháng (tùy region `sgp` Singapore).

### Bước 4: Deploy lần đầu

1. **Create Resources** → đợi build (clone GitHub + `docker build`)
2. Lần đầu có thể **15–30 phút** vì ~4GB panorama
3. Khi **Active**, mở URL dạng `https://hcmverse-xxxxx.ondigitalocean.app`

### Bước 5: Redeploy sau mỗi lần push

```bash
git add .
git commit -m "fix: ..."
git push origin main
```

→ App Platform tự detect push → build mới → thay deployment (zero-downtime rolling).

**Redeploy thủ công** (không cần push):

- Control Panel → App → **Actions** → **Force Rebuild and Deploy**

### Bước 6: Tên miền riêng (tuỳ chọn)

1. App → **Settings** → **Domains**
2. Thêm domain (vd. `hcmverse.example.com`)
3. Trỏ DNS (CNAME) theo hướng dẫn DO
4. Bật **SSL** (Let's Encrypt tự động)

---

## Cách 2 — Droplet + Docker (repo rất lớn / build App Platform fail)

Phù hợp khi App Platform hết disk hoặc timeout build.

### Tạo Droplet

- **Ubuntu 24.04**, ít nhất **4GB RAM / 80GB disk**
- Cài Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

### Clone & chạy

```bash
git clone https://github.com/khanhtm45/HCM202.git
cd HCM202
docker build -t hcm202 .
docker run -d --name hcm202 -p 80:8080 --restart unless-stopped hcm202
```

### Auto redeploy khi push GitHub (webhook đơn giản)

Trên Droplet, script `~/redeploy-hcm202.sh`:

```bash
#!/bin/bash
cd /root/HCM202
git pull origin main
docker build -t hcm202 .
docker stop hcm202 && docker rm hcm202
docker run -d --name hcm202 -p 80:8080 --restart unless-stopped hcm202
```

GitHub → repo → **Settings** → **Webhooks** → Add:

- Payload URL: `http://IP_DROPLET:9000/hook` *(hoặc dùng GitHub Action SSH)*
- Events: **Just the push event**

*(Chi tiết webhook listener có thể dùng `webhook` container — hoặc cron `git pull` mỗi 5 phút nếu đơn giản.)*

**Cách đơn giản hơn — GitHub Actions deploy SSH:**

Tạo `.github/workflows/deploy-do.yml` *(chỉ khi đã có Droplet + SSH key)* — xem mục Phụ lục bên dưới.

---

## Kiểm tra sau deploy

| URL | Kỳ vọng |
|-----|---------|
| `/` | Hub HCMVERSE |
| `/hcmverse/` | Metaverse |
| `/hcmverse_hcm202/?fast=1` | Map 3D |
| `/baotang-hochiminh/` | Tour 360° |
| `/proxy-s3/...` | Proxy ảnh S3 (không 403) |

```bash
curl -I https://YOUR-APP-URL.ondigitalocean.app/
```

---

## Biến môi trường (tuỳ chọn)

Thêm trong App Platform → **Settings** → **App-Level Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` *(App Platform thường tự set)* |

---

## Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| Build timeout | Repo ~4GB | Nâng gói; hoặc Droplet 80GB |
| `npm ci` fail | Thiếu `package-lock.json` | Chạy `npm install` local, commit lock file |
| 502 Bad Gateway | App chưa listen PORT | Đảm bảo `serve-hcm202.mjs` dùng `process.env.PORT` |
| Ảnh panorama 403 | Thiếu proxy | Phải chạy qua `serve-hcm202.mjs`, không dùng static host thuần |
| Deploy không chạy sau push | Autodeploy tắt | Bật lại trong App → Settings → GitHub |

---

## Phụ lục: GitHub Actions → Droplet (SSH)

Chỉ dùng nếu chọn **Cách 2** và có Droplet.

Secrets trong GitHub repo (**Settings → Secrets**):

- `DO_HOST` — IP Droplet
- `DO_SSH_KEY` — private key SSH

File `.github/workflows/deploy-droplet.yml`:

```yaml
name: Deploy to DigitalOcean Droplet
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH redeploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DO_HOST }}
          username: root
          key: ${{ secrets.DO_SSH_KEY }}
          script: |
            cd /root/HCM202
            git pull origin main
            docker build -t hcm202 .
            docker stop hcm202 || true
            docker rm hcm202 || true
            docker run -d --name hcm202 -p 80:8080 --restart unless-stopped hcm202
```

---

## Tóm tắt lệnh local trước khi push

```bash
# Test production local
npm run start:prod
# → http://localhost:8765 (PORT mặc định 8765 khi không set)

# Push → DigitalOcean auto deploy
git add Dockerfile .do/app.yaml DEPLOY-DIGITALOCEAN.md package.json
git commit -m "chore: add DigitalOcean App Platform deploy config"
git push origin main
```

Sau push, vào DigitalOcean Apps xem tab **Activity** để theo dõi build.
