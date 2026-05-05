# API 自动化测试矩阵

支持导入 OpenAPI/Swagger 文档生成测试用例，实现数据驱动测试（DDT），支持多环境（Dev/Test/Prod）一键切换执行，生成 Allure 风格的可视化报告。

## 功能特性

- **OpenAPI/Swagger 导入**: 从 URL 或 JSON 文件导入 API 文档，自动生成测试用例
- **数据驱动测试 (DDT)**: 支持 CSV/Excel 数据文件，实现多组数据的批量测试
- **多环境管理**: 支持开发环境、测试环境、生产环境一键切换
- **Allure 报告**: 生成美观的 Allure 风格测试报告，支持图表和详细信息
- **参数化测试**: 支持路径参数、查询参数、请求体参数的灵活配置
- **断言引擎**: 支持响应状态码、响应时间、JSON 结构、字段值等多种断言
- **CI/CD 集成**: 可集成到 Jenkins、GitLab CI、GitHub Actions 等流水线

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动服务

```bash
python main.py
```

### 使用示例

```python
from openapi_importer import OpenAPIImporter
from test_executor import TestExecutor
from allure_report import AllureReportGenerator

importer = OpenAPIImporter()
test_cases = await importer.import_from_url("http://example.com/openapi.json")

executor = TestExecutor(base_url="http://test.example.com")
results = await executor.execute(test_cases)

generator = AllureReportGenerator()
report_path = generator.generate(results, output_dir="./reports")
```

## 环境配置

在 `environments.yaml` 中配置测试环境：

```yaml
environments:
  dev:
    name: "开发环境"
    base_url: "http://dev.example.com/api"
    variables:
      timeout: 10
      retries: 3

  test:
    name: "测试环境"
    base_url: "http://test.example.com/api"
    variables:
      timeout: 15
      retries: 2

  prod:
    name: "生产环境"
    base_url: "http://prod.example.com/api"
    variables:
      timeout: 30
      retries: 1
```
