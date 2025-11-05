# 1) Build frontend
FROM node:18-alpine AS fe-build
WORKDIR /app
RUN apk add --no-cache libc6-compat
# 缓解 npm 安装失败：关闭审计/资助，放宽 peer deps 严格性
ENV npm_config_fund=false \
    npm_config_audit=false \
    npm_config_legacy_peer_deps=true
# 仅拷贝 npm 所需文件，避免通配符未命中报错
COPY package*.json ./
# 有 lockfile 用 ci，否则用 i
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm i --no-audit --no-fund; fi
COPY . .
RUN npm run build

# 2) Build server (TypeScript)
FROM node:18-alpine AS be-build
WORKDIR /app/server
RUN apk add --no-cache libc6-compat
ENV npm_config_fund=false \
    npm_config_audit=false \
    npm_config_legacy_peer_deps=true
# 仅拷贝 npm 所需文件
COPY server/package*.json ./
# 有 lockfile 用 ci，否则用 i
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm i --no-audit --no-fund; fi
COPY server ./
RUN npm run build

# 3) Runtime
FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /app

# server files
COPY --from=be-build /app/server/dist ./server/dist
COPY --from=be-build /app/server/package.json ./server/package.json

# frontend dist -> server/public
COPY --from=fe-build /app/dist ./server/public

# data dir
RUN mkdir -p /app/server/data/uploads
VOLUME ["/app/server/data"]

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/dist/index.js"]


