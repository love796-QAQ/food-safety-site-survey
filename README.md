# 食堂设备点位勘探

基于 React + TypeScript + Vite 的网页应用，用于在食堂平面图上标注摄像头点位、扇形覆盖范围，并配置状态与 AI 分析类型。

## 功能
- 导入食堂平面图（图片即可）
- 触摸/鼠标：拖拽平移、双指/滚轮缩放
- 点击空白添加摄像头
- 摄像头可拖拽、旋转（箭头）、调整扇形角度与半径（橙色手柄）
- 摄像头属性：名称、状态（可配置）、AI 分析类型（可配置，支持多选）
- 配置管理：状态与 AI 类型可增删改
- 自动保存到浏览器 LocalStorage
- 项目导入/导出 JSON

## 本地运行
1. 安装 Node.js (建议 18+)
2. 安装依赖：
```bash
npm i
cd server && npm i
cd ..
```
3. 启动：
```bash
npm run build # 可选，先构建前端
npm run dev
# 另开一个终端
cd server && npm run dev
```
打开终端输出的本地地址（默认 `http://localhost:5173`）。

环境变量：前端可使用 `VITE_API_BASE` 指向后端（默认为同域反代 '/api'）。

## 使用提示
- 顶部「导入平面图」选择图片
- 画布空白处点击即可添加摄像头
- 拖拽圆点移动位置；拖拽箭头调整朝向；拖拽橙色手柄调整扇形角度与半径
- 侧栏可编辑名称、状态与 AI 类型，并可在「配置管理」中自定义可选项
- 「导出JSON」保存当前项目，「导入JSON」可恢复

## 技术栈
- React 18 + TypeScript
- Vite 5
- Zustand（状态管理）
- Konva + react-konva（画布与图形）
 - Fastify + SQLite（多人协作后端）

## Linux 部署指南（简要）
1) 构建前端：`npm ci && npm run build`
2) 后端：`cd server && npm ci && npm run build`
3) 目录准备：在 `server/` 下创建 `data/uploads/`（自动创建亦可）
4) 使用 systemd 启动后端（监听 8080）
5) Nginx 反向代理：
   - 静态：指向前端 `dist/`
   - API：`location /api` 反代到 `http://127.0.0.1:8080`
   - 上传文件：后端已通过 `/uploads/` 提供
6) SQLite 备份：定时复制 `server/data/app.db` 与 `uploads/`

## Docker 运行
本仓库提供单容器镜像（内置前端静态与后端 API）。

- 本地构建：
```bash
docker build -t food-safety-site-survey:local .
```
- 运行（映射数据卷与端口 8080）：
```bash
docker run --name fsss \
  -p 8080:8080 \
  -v fsss_data:/app/server/data \
  -e PORT=8080 \
  -d food-safety-site-survey:local
```
- 访问：`http://localhost:8080`（前端）；API：`http://localhost:8080/api`；上传：`/uploads/`

说明：容器启动后端口 8080 同时提供前端（由 Fastify 静态托管）与 API，数据（SQLite 与上传文件）位于容器内 `/app/server/data`，建议挂载卷备份。

### Docker Compose（一键启动）
仓库已包含 `docker-compose.yml`，支持两种使用方式：

- 使用 GHCR 远程镜像（在你推送到 GitHub 并构建后）：
  1) 编辑 `docker-compose.yml` 将 `image: ghcr.io/OWNER_REPO/food-safety-site-survey:latest` 中的 `OWNER_REPO` 替换为 `你的GitHub用户名/仓库名`
  2) 启动：
  ```bash
  docker compose up -d
  ```
- 本地构建并启动：
  1) 注释掉 `image:` 行，取消注释 `build: .`
  2) 启动：
  ```bash
  docker compose up -d --build
  ```

默认会把数据落在工作目录 `./server_data`，如需改为命名卷，按 compose 文件底部注释修改。

## GitHub Actions 构建镜像
推送到 `main`（或打 `v*.*.*` 标签）会自动构建并推送镜像到 GHCR：`ghcr.io/<你的GitHub用户名>/food-safety-site-survey:latest`。

- 首次使用：确保仓库为 `public` 或者在需要拉取镜像的环境已登录 GHCR。
- 拉取与运行：
```bash
docker login ghcr.io -u <你的GitHub用户名> -p <你的PAT或GITHUB_TOKEN>
docker pull ghcr.io/<你的GitHub用户名>/food-safety-site-survey:latest
docker run --name fsss \
  -p 8080:8080 \
  -v fsss_data:/app/server/data \
  -d ghcr.io/<你的GitHub用户名>/food-safety-site-survey:latest
```

注意：如需自定义端口，修改 `-p 宿主端口:8080`；如需持久化目录到宿主机，如 `/opt/fsss/data`：
```bash
docker run -p 8080:8080 -v /opt/fsss/data:/app/server/data -d ghcr.io/<user>/food-safety-site-survey:latest
```


