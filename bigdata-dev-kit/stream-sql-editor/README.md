# 流处理 SQL 编辑器 (Stream SQL Editor)

## 功能概述

流处理 SQL 编辑器是大数据处理开发套件的核心子项目之一，专门用于 Flink 流处理 SQL 的开发、调试和运行。

## 主要功能

### 1. Flink SQL 编辑器
- 集成 Monaco Editor，提供专业的 SQL 编辑体验
- Flink SQL 语法高亮显示
- 代码自动补全（SELECT, FROM, WHERE, GROUP BY, JOIN, CREATE TABLE 等）
- 代码格式化功能

### 2. Flink SQL 语法校验
- 实时 Flink SQL 语法检查
- WATERMARK 语法验证
- 窗口函数（TUMBLE, HOP, SESSION）语法检查
- WITH 子句格式验证
- 详细的错误提示信息

### 3. 流表数据实时预览
- 流表列表展示（Kafka, JDBC, HBase 等连接器类型）
- 表结构预览（列名、数据类型）
- 实时数据模拟预览（SELECT * FROM source_table）
- 数据延迟监控（实时显示处理延迟）
- 可启停的预览功能

### 4. UDF 函数管理
- 自定义函数（UDF）注册和管理
- 支持三种函数类型：
  - **SCALAR**: 标量函数（一进一出）
  - **AGGREGATE**: 聚合函数（多进一出）
  - **TABLE**: 表函数（一进多出）
- 函数启用/禁用切换
- 函数描述和类名管理
- 新增、编辑、删除操作

### 5. SQL 版本控制
- SQL 脚本版本历史记录
- 版本创建时间和描述
- 版本号递增管理
- 版本查看和恢复功能
- 支持多 SQL 脚本独立版本管理

## 技术架构

```
stream-sql-editor/
├── README.md                    # 项目说明文档
└── (功能已整合到主前端应用中)
```

### 前端技术栈
- **Electron**: 跨平台桌面应用框架
- **Monaco Editor**: 代码编辑器
- **原生 JavaScript**: 业务逻辑开发
- **CSS3**: 样式开发

### 后端集成
- 基于 Spring Boot REST API
- H2 嵌入式数据库
- SQL 版本管理服务

## 界面布局

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] 大数据处理开发套件                      [连接状态]    │
├──────────────┬──────────────────────────────────────────────┤
│              │  [流处理 SQL 编辑器]          [新建SQL][刷新] │
│  工作台      ├──────────────────────────────────────────────┤
│  ├─ 批处理   │                                              │
│  │   作业    │  ┌────────────────────────────────────────┐  │
│  └─ 流处理   │  │ 流表列表                               │  │
│              │  │ - source_table [KAFKA]                │  │
│  管理        │  │   user_id BIGINT, item_id BIGINT...  │  │
│  ├─ UDF管理  │  │ - result_table [JDBC]                 │  │
│  └─ 版本控制 │  │ - dim_table [HBASE]                   │  │
│              │  └────────────────────────────────────────┘  │
│              │                                              │
│              │  ┌────────────────────────────────────────┐  │
│              │  │  [SQL编辑器] [数据预览] [UDF管理] [版本历史] │
│              │  ├────────────────────────────────────────┤  │
│              │  │                                        │  │
│              │  │  Monaco Editor (Flink SQL)            │  │
│              │  │                                        │  │
│              │  ├────────────────────────────────────────┤  │
│              │  │  语法校验结果                          │  │
│              │  └────────────────────────────────────────┘  │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

## API 接口

### UDF 管理
- `GET /api/udfs` - 获取所有 UDF 列表
- `GET /api/udfs/enabled` - 获取已启用的 UDF 列表
- `GET /api/udfs/{id}` - 获取 UDF 详情
- `GET /api/udfs/name/{functionName}` - 按名称获取 UDF
- `POST /api/udfs` - 创建新 UDF
- `PUT /api/udfs/{id}` - 更新 UDF
- `PUT /api/udfs/{id}/toggle` - 启用/禁用 UDF
- `DELETE /api/udfs/{id}` - 删除 UDF

### SQL 版本控制
- `GET /api/sql-versions/{sqlName}` - 获取 SQL 的所有版本
- `GET /api/sql-versions/{sqlName}/latest` - 获取 SQL 的最新版本
- `GET /api/sql-versions/{sqlName}/version/{version}` - 获取指定版本
- `POST /api/sql-versions` - 保存新版本
- `DELETE /api/sql-versions/{sqlName}` - 删除 SQL 的所有版本

## Flink SQL 支持特性

### 支持的 DDL 语法
```sql
-- 创建源表（Kafka 连接器）
CREATE TABLE source_table (
    user_id BIGINT,
    item_id BIGINT,
    behavior STRING,
    ts TIMESTAMP(3),
    WATERMARK FOR ts AS ts - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'user-behavior',
    'properties.bootstrap.servers' = 'localhost:9092',
    'format' = 'json'
);

-- 创建结果表（JDBC 连接器）
CREATE TABLE result_table (
    window_start TIMESTAMP(3),
    window_end TIMESTAMP(3),
    behavior STRING,
    cnt BIGINT
) WITH (
    'connector' = 'jdbc',
    'url' = 'jdbc:mysql://localhost:3306/db',
    'table-name' = 'result',
    'username' = 'root',
    'password' = 'password'
);
```

### 支持的 DML 语法
```sql
-- 滚动窗口（TUMBLE）
INSERT INTO result_table
SELECT 
    TUMBLE_START(ts, INTERVAL '1' MINUTE) as window_start,
    TUMBLE_END(ts, INTERVAL '1' MINUTE) as window_end,
    behavior,
    COUNT(*) as cnt
FROM source_table
GROUP BY TUMBLE(ts, INTERVAL '1' MINUTE), behavior;

-- 滑动窗口（HOP）
SELECT 
    HOP_START(ts, INTERVAL '30' SECOND, INTERVAL '1' MINUTE),
    HOP_END(ts, INTERVAL '30' SECOND, INTERVAL '1' MINUTE),
    behavior,
    COUNT(*)
FROM source_table
GROUP BY HOP(ts, INTERVAL '30' SECOND, INTERVAL '1' MINUTE), behavior;

-- 会话窗口（SESSION）
SELECT 
    SESSION_START(ts, INTERVAL '10' MINUTE),
    SESSION_END(ts, INTERVAL '10' MINUTE),
    behavior,
    COUNT(*)
FROM source_table
GROUP BY SESSION(ts, INTERVAL '10' MINUTE), behavior;
```

### 支持的 UDF 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **SCALAR** | 标量函数，一进一出 | `json_parse(data), time_format(ts)` |
| **AGGREGATE** | 聚合函数，多进一出 | `top_n(col, 10), percentile(col, 0.95)` |
| **TABLE** | 表函数，一进多出 | `explode_json_array(json_data)` |

## 使用流程

### 1. 编写 Flink SQL
- 在侧边栏选择"流处理 SQL 编辑器"
- 在 Monaco Editor 中编写 Flink SQL
- 支持 DDL（CREATE TABLE）和 DML（INSERT INTO）语句
- 可以使用 Flink 特有的语法（WATERMARK, 窗口函数等）

### 2. 语法校验
- 点击"语法校验"按钮
- 系统会自动检查 Flink SQL 语法
- 检查内容包括：
  - 关键字识别
  - WATERMARK 与 TIMESTAMP 配合检查
  - 窗口函数与 GROUP BY 配合检查
- 校验结果显示在编辑器下方

### 3. 保存版本
- 在编辑器上方输入框中输入 SQL 名称
- 点击"保存版本"按钮
- 系统会自动创建新版本记录
- 可以在"版本历史"标签页查看历史版本

### 4. 执行 SQL
- 点击"执行"按钮
- 系统会提交 Flink 流作业
- 可以在监控面板查看作业运行状态

### 5. 流表数据预览
- 切换到"数据预览"标签页
- 在下拉框中选择要预览的流表
- 点击"开始预览"按钮
- 系统会模拟实时数据流
- 可以看到：
  - 行号
  - 数据内容（user_id, item_id, behavior 等）
  - 处理时间
  - 处理延迟（颜色标识：绿色=正常，黄色=警告，红色=异常）
- 点击"停止预览"结束预览

### 6. UDF 管理
- 切换到"UDF 管理"标签页（或侧边栏的"UDF 函数管理"）
- 查看已注册的自定义函数
- 点击"新增 UDF"添加新函数：
  - 函数名称（如 `json_parse`）
  - 类名（如 `com.example.JsonParseUDF`）
  - 函数类型（SCALAR / AGGREGATE / TABLE）
  - 函数描述
- 可以启用/禁用函数
- 可以删除不需要的函数

### 7. 版本历史
- 切换到"版本历史"标签页（或侧边栏的"SQL 版本控制"）
- 查看所有 SQL 脚本的版本历史
- 每个版本显示：
  - 版本号（v1, v2, v3...）
  - 创建时间
  - 版本描述
- 可以查看指定版本的内容
- 可以恢复到历史版本

## 语法校验规则

### 必须包含的关键字
- 至少包含以下关键字之一：
  - `SELECT`, `FROM`, `CREATE`, `INSERT`, `WITH`
  - Flink 特有：`WATERMARK`, `TUMBLE`, `HOP`, `SESSION`

### WATERMARK 语法检查
- 如果使用 `WATERMARK`，必须配合 `TIMESTAMP` 类型
- 示例：`WATERMARK FOR ts AS ts - INTERVAL '5' SECOND`

### 窗口函数检查
- 如果使用 `TUMBLE`, `HOP`, 或 `SESSION` 窗口函数
- 必须配合 `GROUP BY` 子句使用
- 窗口函数必须出现在 `GROUP BY` 中

## 注意事项

1. 确保后端服务已启动（http://localhost:8080）
2. 首次使用需要安装前端依赖：`npm install`
3. Flink SQL 的语法校验是基础检查，实际运行需要 Flink 集群
4. 数据预览是模拟数据，非真实流数据
5. UDF 函数需要实际的 Jar 包支持，前端仅做元数据管理

## 相关链接

- [主后端项目](../backend/) - Spring Boot 后端服务
- [主前端项目](../frontend/) - Electron 桌面应用
- [批处理作业工作台](../batch-job-workbench/) - 批处理子项目
