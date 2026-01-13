# 项目运行与部署指南

本文档详细说明了本项目的本地开发、构建打包、GitHub 同步及服务器部署流程。

## 1. 项目简介

本项目是一个基于 React + Vite + Tailwind CSS 的 AI PPT 生成器，支持调用 Zenmux/Google Gemini API 生成内容。
项目默认配置部署在服务器的 `/AIPPT/` 子路径下。

## 2. 本地开发

### 环境要求
- Node.js (推荐 v18 或 v20)
- npm

### 启动步骤
1. **安装依赖**：
   ```bash
   npm install
   ```
2. **启动开发服务器**：
   ```bash
   npm run dev
   ```
   启动后访问 `http://localhost:3000` (或控制台显示的端口)。

## 3. 构建打包

生产环境部署前需要进行构建，生成优化后的静态文件。

### ⚠️ 重要提示：部署路径配置
本项目支持通过环境变量配置部署路径。
1. 复制 `.env.example` 为 `.env`。
2. 修改 `.env` 文件中的 `VITE_BASE_PATH` 变量。

- **如果您部署在根目录 (例如 `https://example.com/`)**：设置 `VITE_BASE_PATH=/` (默认值)。
- **如果您部署在 `/AIPPT/` 子路径**：设置 `VITE_BASE_PATH=/AIPPT/`。
- **如果您部署在其他子路径**：设置为您对应的路径。

### 构建命令
```bash
npm run build
```

### 构建产物
构建完成后，生成的静态文件位于 `dist/` 目录下：
- `dist/index.html`: 入口 HTML 文件
- `dist/assets/`: JS, CSS 及图片资源

**注意**：`vite.config.ts` 中配置了 `base: '/AIPPT/'`，这意味着构建出的资源路径是绝对路径 `/AIPPT/assets/...`，必须部署在服务器的相应子路径或配置 Nginx 别名才能正常访问。

## 4. 同步到 GitHub

保持代码仓库的最新状态。

```bash
# 1. 添加变更
git add .

# 2. 提交代码 (请填写具体的修改信息)
git commit -m "Update: 描述你的修改内容"

# 3. 推送到远程仓库
git push origin main
```

## 5. 发布到生产服务器 (京东云)

### 前置条件
- 服务器 IP: `117.72.154.22`
- 部署目录: `/opt/auto_ppt_gen/`
- SSH 私钥: `~/Downloads/jim.pem` (本地路径)
- 登录用户: `root`

### 部署步骤 (全量更新)

我们采用 **本地代码同步 -> 远程构建** 的方式，确保依赖环境一致。

#### 第一步：同步代码到服务器
使用 `rsync` 将本地项目文件同步到服务器（排除 `node_modules` 和构建产物，节省传输时间）。

```bash
rsync -avz -e "ssh -o StrictHostKeyChecking=no -i ~/Downloads/jim.pem" \
--exclude 'node_modules' \
--exclude 'dist' \
--exclude '.git' \
--exclude '.trae' \
. root@117.72.154.22:/opt/auto_ppt_gen/
```

#### 第二步：远程执行安装与构建
登录服务器，在服务器端安装依赖并打包。

```bash
ssh -o StrictHostKeyChecking=no -i ~/Downloads/jim.pem root@117.72.154.22 \
"cd /opt/auto_ppt_gen && npm install && npm run build"
```

### Nginx 配置说明

由于项目部署在 `/AIPPT/` 子路径下，服务器 Nginx 需要做如下配置（参考）：

```nginx
# /etc/nginx/sites-enabled/ai-biao.com (或相应配置文件)

server {
    listen 443 ssl;
    server_name www.ai-biao.com;
    
    # ... SSL 配置 ...

    # 关键配置：处理 /AIPPT/ 路径
    # 使用 ^~ 确保优先级高于通用正则匹配（如 .js/.css），防止静态资源 404
    location ^~ /AIPPT/ {
        alias /opt/auto_ppt_gen/dist/; # 指向构建产物目录
        index index.html;
        try_files $uri $uri/ /AIPPT/index.html; # 支持 React Router 刷新
    }
}
```

## 6. 常见问题排查

1. **页面白屏，控制台报错 404**
   - 检查 `vite.config.ts` 中的 `base` 是否为 `/AIPPT/`。
   - 检查 Nginx 配置中是否使用了 `alias` 且路径正确。

2. **样式丢失 (Tailwind 失效)**
   - 确认使用的是 Tailwind v3 (v4 目前有兼容性问题)。
   - 运行 `npm run build` 后检查 `dist/assets/*.css` 文件大小，正常应大于 10KB。

3. **字体或图标不显示**
   - 本项目已移除 Google Fonts 依赖，改用系统字体，确保内网或弱网环境下加载正常。
