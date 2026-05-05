# 自动化测试指挥台

一个完整的自动化测试解决方案，包含 Web UI 自动化设计器和 API 自动化测试矩阵。

## 项目结构

```
automation-test-console/
├── frontend/          # 前端测试管理后台 (Vue3 + Ant Design Pro)
├── backend/           # 后端调度执行器 (Python + FastAPI)
└── README.md
```

## 子项目

- [Web UI 自动化设计器](../ui-test-designer/) - 录制回放功能，自动生成 Playwright 脚本
- [API 自动化测试矩阵](../api-test-matrix/) - OpenAPI 文档导入，数据驱动测试

## 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
