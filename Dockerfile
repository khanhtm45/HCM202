# Production: Node server + static HCM202 (proxy S3/CDN như local)
FROM node:22-alpine

WORKDIR /app

# Chỉ cài dependency runtime (bỏ Playwright ~300MB)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "serve-hcm202.mjs"]
