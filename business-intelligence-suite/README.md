# 商务智能与票据核验系统

## 项目结构

```
business-intelligence-suite/
├── cross-border-translation/     # 跨境商务实时翻译机子系统
│   ├── backend/                  # 后端服务 (Python + FastAPI)
│   └── README.md
├── invoice-verification/         # 增值税发票智能核验系统
│   ├── backend/                  # 后端服务 (Python + FastAPI)
│   └── README.md
├── frontend/                     # 前端应用 (uni-app)
│   ├── pages/
│   ├── components/
│   └── ...
└── README.md
```

## 子系统说明

### 1. 跨境商务实时翻译机

**核心功能：**
- 流式 ASR 实时语音转文字
- 本地翻译模型 (OPUS-MT/Marian NMT)
- 多语种互译 (中英、中日、中韩)
- TTS 语音合成
- 商务短语库离线模式
- SQLite 翻译历史存储

**技术栈：**
- 后端: Python + FastAPI
- ASR: Vosk / Whisper
- 翻译: OPUS-MT / Marian NMT
- TTS: pyttsx3 / gTTS
- 数据库: SQLite

### 2. 增值税发票智能核验系统

**核心功能：**
- PaddleOCR PP-Structure 版面分析
- 支持发票、火车票、机票等票据识别
- 关键字段自动提取
- 财税规则引擎校验
- 防止重复报销
- PostgreSQL 结构化存储
- Excel 导出

**技术栈：**
- 后端: Python + FastAPI
- OCR: PaddleOCR
- 数据库: PostgreSQL
- Excel导出: openpyxl / pandas

## 快速开始

### 环境要求
- Python 3.9+
- Node.js 14+ (uni-app 前端)
- PostgreSQL 12+ (发票核验系统)

### 安装依赖

```bash
# 翻译机后端
cd cross-border-translation/backend
pip install -r requirements.txt

# 发票核验后端
cd invoice-verification/backend
pip install -r requirements.txt

# 前端
cd frontend
npm install
```

### 启动服务

```bash
# 翻译机服务 (端口 8001)
cd cross-border-translation/backend
python main.py

# 发票核验服务 (端口 8002)
cd invoice-verification/backend
python main.py

# 前端开发
cd frontend
npm run dev:app
```
