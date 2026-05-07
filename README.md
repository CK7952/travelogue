# 风物志 — 旅行感悟随手记

> 旅途中按住说话，归来后自动汇总成小记。

## 项目结构

```
travelogue/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── main.py              # 入口
│   │   ├── models.py            # 数据库模型
│   │   ├── schemas.py           # Pydantic 校验
│   │   ├── routers/             # API 路由
│   │   │   ├── trips.py         # 行程 CRUD
│   │   │   ├── fragments.py     # 碎片 + 语音转写
│   │   │   └── essays.py        # 小记生成
│   │   └── services/            # 业务服务
│   │       ├── whisper_service.py   # 语音转写
│   │       └── llm_service.py       # LLM 清理 + 生成
│   ├── requirements.txt
│   └── .env.example
├── miniprogram/      # Taro 3 微信小程序
│   └── src/
│       ├── pages/
│       │   ├── index/           # 首页：行程 + 录音 + 碎片列表
│       │   ├── tripDetail/      # 行程详情（预留）
│       │   └── essay/           # 小记展示
│       ├── components/
│       │   └── Recorder/        # 录音按钮组件
│       └── api/
│           └── request.ts       # HTTP 封装
└── docker-compose.yml   # 一键启动 PostgreSQL + pgvector
```

## 快速启动

### 1. 启动数据库

```bash
docker-compose up -d
```

### 2. 启动后端

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# 编辑 .env 配置你的 LLM 服务地址

mkdir -p uploads/audio uploads/photos

# 开发模式启动（无 LLM 也能跑，会自动降级）
uvicorn app.main:app --reload --port 8000
```

### 3. 启动小程序

```bash
cd miniprogram
npm install
npm run dev:weapp
```

用微信开发者工具打开 `miniprogram/dist` 目录。

## 核心流程

1. **创建行程** → 首页顶部切换/新建
2. **按住说话** → 录音组件 → 上传音频 → Whisper 转写 → LLM 保守清理 → 返回预览
3. **确认保存** → 碎片存入数据库，带 GPS + 标签
4. **结束行程** → 选择风格（文艺/碎碎念/博物）→ LLM 生成小记 → 展示可编辑

## 技术栈

| 层 | 技术 |
|---|---|
| 小程序 | Taro 3 + React |
| API | FastAPI |
| 数据库 | PostgreSQL + pgvector + PostGIS |
| 语音 | faster-whisper |
| LLM | OpenAI-compatible API (vLLM / Ollama / 云API) |
| 文件 | 本地存储 (开发) / 腾讯云 COS (生产) |
