# Travelogue 后端部署指南

## 推荐架构：Supabase + Render（零运维）

| 组件 | 服务 | 费用 |
|---|---|---|
| 数据库 + 文件存储 | Supabase | 免费额度够用 |
| 后端 API | Render | 免费（有休眠） |
| 前端 Web | Vercel / 腾讯云 COS | 免费 |

---

## 第一步：Supabase 设置

### 1.1 创建 Supabase 项目

1. 打开 https://supabase.com ，用 GitHub 登录
2. 新建 Organization → 新建 Project
3. 选择 Region：**Asia Pacific (Singapore)** 或 **Northeast Asia (Tokyo)**（离国内最近）
4. 记住自动生成的 **Project URL** 和 **anon/public** 密码（后面用 Service Role Key）

### 1.2 获取数据库连接串

进入项目 → Project Settings → Database → Connection String → URI

复制 **Direct connection**（端口 5432，不是 6543 pooler）：
```
postgresql://postgres:[密码]@db.[project-ref].supabase.co:5432/postgres
```

### 1.3 开启 Storage 并创建 Bucket

1. 进入 Storage → New bucket
2. Name: `travelogue`
3. 勾选 **Public bucket**（让图片/音频可以直接公网访问）
4. 创建后点击 bucket → Policies → 给 `anon` 角色添加 `SELECT` 权限（允许公开读取）

### 1.4 获取 Service Role Key

Project Settings → API → Service role secret

> ⚠️ 这个 Key 拥有最高权限，**绝对不要暴露到前端**，只填在后端 `.env` 里。

---

## 第二步：后端代码配置

在本地修改 `backend/.env`：

```ini
ENVIRONMENT=production

# Supabase PostgreSQL
DATABASE_URL=postgresql://postgres:你的密码@db.xxxxx.supabase.co:5432/postgres

# Supabase Storage
STORAGE_TYPE=supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...（你的 service role key）
SUPABASE_STORAGE_BUCKET=travelogue

# LLM（示例用 Kimi / Moonshot）：https://platform.moonshot.cn/
LLM_BASE_URL=https://api.moonshot.cn/v1
LLM_API_KEY=sk-你的KimiKey
LLM_MODEL_CLEAN=moonshot-v1-8k
LLM_MODEL_ESSAY=moonshot-v1-32k

# CORS：填你的前端域名，多个逗号分隔
CORS_ORIGINS=https://your-web-domain.com,https://your-miniprogram-domain.com
```

---

## 第三步：部署到 Render

### 3.1 注册 Render

https://render.com ，用 GitHub 登录。

### 3.2 创建 Web Service

1. Dashboard → New → Web Service
2. 选择 **Build and deploy from a Git repository**
3. 授权 GitHub → 选择 `CK7952/travelogue`
4. 配置：

| 字段 | 值 |
|---|---|
| Name | travelogue-backend |
| Root Directory | `backend` |
| Runtime | Docker |
| Branch | master |
| Dockerfile Path | Dockerfile |
| Plan | Free |

5. 展开 **Advanced** → Add Environment Variables，把上面 `.env` 里的所有键值对一条一条加进去

6. 点击 **Create Web Service**

### 3.3 等待构建完成

Render 会自动：
- 构建 Docker 镜像
- 执行 `alembic upgrade head` 创建数据库表
- 启动 Gunicorn

构建日志里看到 `Application startup complete` 即成功。

### 3.4 验证

复制 Render 给你的 URL（如 `https://travelogue-backend-xxxx.onrender.com`）：

```bash
curl https://travelogue-backend-xxxx.onrender.com/health
```

应返回：
```json
{"status":"ok","database":"connected","whisper":"ready"}
```

> Render 免费实例 15 分钟无请求会休眠，首次唤醒需要 30-60 秒。

---

## 第四步：前端配置

### Web 端

```bash
cd web
VITE_API_BASE_URL=https://travelogue-backend-xxxx.onrender.com npm run build
```

把 `dist/` 部署到 Vercel / 腾讯云 COS 静态网站。

### 小程序端

```bash
cd miniprogram
TARO_APP_BASE_URL=https://travelogue-backend-xxxx.onrender.com npm run build:weapp
```

微信开发者工具上传，并在小程序后台添加域名到白名单。

---

## 备选：后端跑在自己的服务器上，只用 Supabase 存储数据

如果你已经有 Windows 10 / Linux 服务器，不想用 Render，可以：

1. 按之前的 **WSL2 + Docker** 或 **Windows 原生** 方案启动后端
2. `.env` 里填 Supabase 的数据库连接串和 Storage 配置
3. `docker-compose.prod.yml` 里**删掉 db 服务**（因为数据库在 Supabase 上）
4. 照常启动

这样文件和数据库都在 Supabase，后端跑在你的机器上。

---

## 费用预估

| 服务 | 免费额度 | 个人使用是否够 |
|---|---|---|
| Supabase DB | 500 MB | ✅ 够用 |
| Supabase Storage | 1 GB | ✅ 够用 |
| Supabase 带宽 | 2 GB/月 | ✅ 够用 |
| Render | 750 小时/月 + 休眠 | ✅ 够用 |

如果访问量大了，Render 升级到 $7/月（永不休眠），Supabase 按量计费通常也很低。

---

## 常见问题

**Q: Render 构建时 Whisper 模型下载超时？**  
A: Render 免费实例构建时间有限制。可以在 Dockerfile 里去掉预下载模型的 `RUN` 行，改成启动时懒加载（代码已支持）。缺点是首次请求转写会慢 30 秒。

**Q: 怎么让 Render 实例不休眠？**  
A: 升级到 Starter Plan（$7/月），或每隔 10 分钟用一个外部服务（如 UptimeRobot）ping `/health` 保持活跃。

**Q: 想换其他平台代替 Render？**  
A: 代码是标准 Docker，可以部署到 Railway、Fly.io、DigitalOcean App Platform、Heroku 等任何支持 Dockerfile 的平台。
