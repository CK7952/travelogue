# Travelogue 后端部署指南

## 部署方式

### 方式一：Docker Compose（推荐）

适合单台云服务器（阿里云 ECS / 腾讯云 CVM / 轻量应用服务器等）。

#### 1. 准备服务器

- 安装 Docker 和 Docker Compose
- 开放端口 `8000`（后端 API）和 `5432`（如需外部访问数据库，否则可不开放）

#### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填写真实值：

```bash
cd backend
cp .env.example .env
```

关键变量：

| 变量 | 说明 | 示例 |
|---|---|---|
| `ENVIRONMENT` | 运行环境 | `production` |
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql+psycopg2://travelogue:your_password@db:5432/travelogue` |
| `STORAGE_TYPE` | 文件存储模式 | `local` 或 `cos` |
| `LOCAL_STORAGE_PATH` | 本地存储路径（容器内） | `./uploads` |
| `COS_SECRET_ID` | 腾讯云 COS SecretId（仅 COS 模式） | `AKID...` |
| `COS_SECRET_KEY` | 腾讯云 COS SecretKey | `...` |
| `COS_BUCKET` | COS 存储桶名 | `mybucket-123` |
| `COS_REGION` | COS 地域 | `ap-guangzhou` |
| `LLM_BASE_URL` | OpenAI-compatible API 地址 | `https://api.deepseek.com/v1` |
| `LLM_API_KEY` | API Key | `sk-...` |
| `LLM_MODEL_CLEAN` | 口语清理模型 | `deepseek-chat` |
| `LLM_MODEL_ESSAY` | 小记生成模型 | `deepseek-chat` |
| `CORS_ORIGINS` | 允许的前端域名（逗号分隔） | `https://yourdomain.com` |

#### 3. 启动服务

在项目根目录执行：

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

首次启动会：
- 拉取 pgvector 镜像并启动 PostgreSQL
- 构建后端镜像
- 自动执行 Alembic 数据库迁移
- 启动 Gunicorn + Uvicorn workers

#### 4. 验证

```bash
curl http://localhost:8000/health
```

预期返回：
```json
{"status": "ok", "service": "travelogue", "environment": "production", "database": "connected", "whisper": "ready"}
```

#### 5. 更新代码后重新部署

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

### 方式二：云函数 / Serverless（轻量场景）

如果流量很低，可将 FastAPI 部署到：
- 阿里云函数计算（Custom Runtime）
- 腾讯云云函数（SCF）

注意：
- Whisper 模型较大，首次冷启动可能超时，建议使用 **预置并发** 或换成云厂商语音转写 API
- 文件存储必须使用 COS / OSS，不能使用本地磁盘

---

## 数据库迁移

生产环境应使用 Alembic 管理数据库结构：

```bash
# 在容器内执行
docker exec travelogue_backend_prod alembic upgrade head

# 生成新迁移（开发环境）
cd backend
alembic revision --autogenerate -m "add xxx"
```

---

## Nginx 反向代理（生产必配）

如果要用域名和 HTTPS 访问，在前方加 Nginx：

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 前端部署

### Web 端

构建时指定后端地址：

```bash
cd web
# 开发（使用 Vite 代理）
npm run dev

# 生产构建（直接调用后端地址）
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

将 `dist/` 部署到任意静态托管（Nginx / Vercel / 腾讯云 COS 静态网站）。

### 小程序端

修改编译时环境变量指向云服务器：

```bash
cd miniprogram
TARO_APP_BASE_URL=https://api.yourdomain.com npm run build:weapp
```

用微信开发者工具打开 `dist` 目录上传。

---

## 常见问题

**Q: 容器重启后上传的文件丢失？**  
A: `docker-compose.prod.yml` 已挂载 `uploads` volume。如果 `STORAGE_TYPE=local`，文件会持久化。建议生产环境改用 COS。

**Q: Whisper 模型下载很慢？**  
A: Dockerfile 中通过 `ARG WHISPER_MODEL` 在构建时预下载模型。构建镜像前确保网络通畅，或在国内服务器上使用镜像源。

**Q: 如何查看日志？**  
A: `docker logs -f travelogue_backend_prod`
