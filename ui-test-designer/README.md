# Web UI 自动化设计器

提供录制回放功能，用户操作浏览器自动生成 Playwright 脚本，支持元素定位校验和断言配置，可集成到 CI/CD 流水线。

## 功能特性

- **浏览器录制**: 实时录制用户在浏览器中的操作
- **脚本生成**: 自动生成 Playwright 测试脚本
- **元素定位校验**: 支持 CSS 选择器、XPath、文本内容等多种定位方式
- **断言配置**: 支持可见性、文本内容、属性值等断言
- **回放测试**: 一键回放录制的测试用例
- **CI/CD 集成**: 生成的脚本可直接集成到 CI/CD 流水线

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
playwright install
```

### 启动录制服务

```bash
python main.py
```

### 使用示例

```python
from recorder import UIRecorder
from script_generator import PlaywrightScriptGenerator

recorder = UIRecorder()
steps = await recorder.start_recording("http://example.com")

generator = PlaywrightScriptGenerator()
script = generator.generate(steps, "example_test")
print(script)
```
