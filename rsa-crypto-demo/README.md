# RSA 密码学算法演示应用

一个用于教学演示的 RSA 算法可视化应用，支持分步密钥生成、模幂运算演示、文本加解密和历史记录管理。

## 功能特性

### 1. 密钥生成向导
- 分步演示 RSA 密钥生成过程
- 支持手动输入素数或随机生成素数
- 计算 n = p × q 和 φ(n) = (p-1) × (q-1)
- 选择公钥指数 e（默认 65537）
- 计算私钥指数 d
- 自动保存密钥对到数据库

### 2. 大整数计算器
- 模幂运算（快速模幂算法），展示详细计算步骤
- 最大公约数（GCD）计算
- 模逆计算
- 素数检查和随机素数生成

### 3. 加密解密功能
- 支持使用已保存的密钥对进行加解密
- 支持手动输入公钥/私钥参数
- 测试 RSA 加解密正确性
- 自动记录加解密操作历史

### 4. 历史记录管理
- 查看密钥对生成历史
- 查看加解密操作历史
- 统计信息展示
- 删除和清空历史记录

## 技术栈

### 后端
- **Python 3.x**
- **FastAPI** - 高性能 Web 框架
- **SQLAlchemy** - ORM 框架
- **SQLite** - 嵌入式数据库
- **Cryptography** - 密码学库

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Element Plus** - Vue 3 UI 组件库
- **Axios** - HTTP 客户端
- **Pinia** - 状态管理

## 项目结构

```
rsa-crypto-demo/
├── backend/                    # 后端项目
│   ├── app/
│   │   ├── core/              # 核心配置
│   │   │   ├── config.py      # 配置管理
│   │   │   └── database.py    # 数据库连接
│   │   ├── models/            # 数据模型
│   │   │   ├── __init__.py
│   │   │   ├── key_pair.py    # 密钥对模型
│   │   │   └── crypto_record.py # 加解密记录模型
│   │   ├── routers/           # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── rsa.py         # RSA 密钥生成相关
│   │   │   ├── calculator.py  # 计算器功能
│   │   │   ├── crypto.py      # 加解密功能
│   │   │   └── history.py     # 历史记录管理
│   │   ├── services/          # 业务逻辑
│   │   │   ├── __init__.py
│   │   │   ├── rsa_service.py # RSA 核心服务
│   │   │   ├── key_pair_service.py # 密钥对服务
│   │   │   └── crypto_service.py   # 加解密服务
│   │   ├── utils/             # 工具函数
│   │   │   ├── __init__.py
│   │   │   └── rsa_utils.py   # RSA 算法实现
│   │   ├── __init__.py
│   │   └── main.py            # 应用入口
│   ├── data/                   # SQLite 数据库目录
│   └── requirements.txt        # Python 依赖
│
├── frontend/                   # 前端项目
│   ├── src/
│   │   ├── router/            # 路由配置
│   │   │   └── index.js
│   │   ├── services/          # API 服务
│   │   │   └── api.js
│   │   ├── views/             # 页面组件
│   │   │   ├── HomeView.vue       # 首页
│   │   │   ├── KeyGenerationView.vue # 密钥生成向导
│   │   │   ├── CalculatorView.vue  # 大整数计算器
│   │   │   ├── CryptoView.vue      # 加密解密
│   │   │   └── HistoryView.vue     # 历史记录
│   │   ├── App.vue             # 根组件
│   │   └── main.js             # 入口文件
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 安装与运行

### 后端

1. 进入后端目录：
```bash
cd backend
```

2. 安装 Python 依赖：
```bash
pip install -r requirements.txt
```

3. 启动后端服务：
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端服务将在 `http://localhost:8000` 启动。

API 文档地址：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 前端

1. 进入前端目录：
```bash
cd frontend
```

2. 安装 Node.js 依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

前端服务将在 `http://localhost:5173` 启动。

## API 接口

### RSA 密钥生成
- `POST /api/v1/rsa/check-prime` - 检查素数
- `GET /api/v1/rsa/generate-prime` - 生成随机素数
- `POST /api/v1/rsa/generate-key-pair` - 生成密钥对
- `GET /api/v1/rsa/key-pairs` - 获取密钥对列表
- `GET /api/v1/rsa/key-pairs/{id}` - 获取指定密钥对
- `DELETE /api/v1/rsa/key-pairs/{id}` - 删除密钥对

### 计算器
- `POST /api/v1/calculator/gcd` - 计算最大公约数
- `POST /api/v1/calculator/mod-inverse` - 计算模逆
- `POST /api/v1/calculator/mod-exp` - 计算模幂

### 加密解密
- `POST /api/v1/crypto/encrypt` - 加密消息
- `POST /api/v1/crypto/decrypt` - 解密密文
- `POST /api/v1/crypto/encrypt-with-key-pair` - 使用保存的密钥对加密
- `POST /api/v1/crypto/decrypt-with-key-pair` - 使用保存的密钥对解密
- `POST /api/v1/crypto/test-encryption-decryption` - 测试加解密正确性

### 历史记录
- `GET /api/v1/history/key-pairs` - 获取密钥对历史
- `GET /api/v1/history/crypto-operations` - 获取加解密历史
- `GET /api/v1/history/crypto-operations/{id}` - 获取指定记录
- `DELETE /api/v1/history/crypto-operations/{id}` - 删除指定记录
- `DELETE /api/v1/history/crypto-operations` - 清空所有记录
- `GET /api/v1/history/stats` - 获取统计信息

## RSA 算法原理

### 密钥生成
1. 选择两个大素数 `p` 和 `q`
2. 计算模数 `n = p × q`
3. 计算欧拉函数 `φ(n) = (p-1) × (q-1)`
4. 选择公钥指数 `e`（满足 1 < e < φ(n) 且 gcd(e, φ(n)) = 1）
5. 计算私钥指数 `d ≡ e^(-1) mod φ(n)`

### 加密
公钥：`(e, n)`
加密公式：`c ≡ m^e mod n`

### 解密
私钥：`(d, n)`
解密公式：`m ≡ c^d mod n`

## 快速模幂算法

快速模幂算法（平方-乘算法）用于高效计算大整数的模幂运算，时间复杂度为 O(log n)。

算法步骤：
1. 初始化 result = 1
2. base = base mod modulus
3. 当 exponent > 0 时：
   - 如果 exponent 是奇数，result = (result × base) mod modulus
   - exponent = exponent / 2
   - base = (base × base) mod modulus
4. 返回 result

## 注意事项

1. **教学演示用途**：本应用主要用于教学演示，生产环境请使用专业的密码学库
2. **密钥大小**：演示使用较小的密钥长度（128-1024位），实际应用建议使用 2048 位或更长
3. **数据存储**：使用 SQLite 数据库，数据存储在 `backend/data/rsa_crypto.db`
4. **安全性**：演示目的不涉及密钥的安全存储和传输

## 许可证

MIT License
