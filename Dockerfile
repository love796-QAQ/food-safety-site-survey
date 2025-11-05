# 1) Build frontend
FROM node:18-alpine AS fe-build
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# 优先使用 npm ci；若无 lockfile 则回退 npm i（避免寻找未安装的 yarn/pnpm）
RUN npm ci --no-audit --no-fund || npm i --no-audit --no-fund
COPY . .
RUN npm run build

# 2) Build server (TypeScript)
FROM node:18-alpine AS be-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json* server/yarn.lock* server/pnpm-lock.yaml* ./
# 同上逻辑
RUN npm ci --no-audit --no-fund || npm i --no-audit --no-fund
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


