"""
代码质量管理工具集安装配置
"""

from setuptools import setup, find_packages
import os

here = os.path.abspath(os.path.dirname(__file__))

version = {}
with open(os.path.join(here, 'code_quality_toolkit', '__version__.py')) as f:
    exec(f.read(), version)

long_description = ''
readme_path = os.path.join(here, 'README.md')
if os.path.exists(readme_path):
    with open(readme_path, encoding='utf-8') as f:
        long_description = f.read()
else:
    long_description = '''
代码质量管理工具集 (Code Quality Toolkit)
============================================

一个功能强大的代码质量管理工具集，提供智能代码审查和依赖更新分析功能。

主要功能:
1. 智能代码审查助手
   - 自动分析 Git 提交（commit）或合并请求（MR）的代码变更
   - 识别潜在的 Bug、安全漏洞、代码异味（Code Smell）
   - 提供优化建议，如性能改进、可读性提升
   - 生成代码审查报告，支持输出为 Markdown 或 JSON 格式

2. 智能依赖更新分析器
   - 检查项目依赖的最新版本，并识别重大变更（Breaking Changes）
   - 分析更新可能带来的影响（通过静态分析或测试用例）
   - 自动生成更新建议和风险评估报告
   - 支持交互式更新，允许用户选择性地升级依赖

安装:
    pip install code-quality-toolkit

使用示例:
    code-quality review --commit HEAD
    code-quality dependency check
    code-quality dependency update --interactive
'''

setup(
    name='code-quality-toolkit',
    version=version['__version__'],
    description='代码质量管理工具集 - 智能代码审查和依赖更新分析',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='Code Quality Team',
    author_email='dev@example.com',
    url='https://github.com/example/code-quality-toolkit',
    license='MIT',
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: Developers',
        'Topic :: Software Development :: Quality Assurance',
        'Topic :: Software Development :: Testing',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
    ],
    keywords='code-review, static-analysis, dependency-management, code-quality',
    packages=find_packages(exclude=['tests', 'tests.*']),
    include_package_data=True,
    python_requires='>=3.8',
    install_requires=[
        'requests>=2.28.0',
        'packaging>=21.0',
    ],
    extras_require={
        'dev': [
            'pytest>=7.0',
            'pytest-cov>=4.0',
            'flake8>=5.0',
            'black>=22.0',
            'mypy>=1.0',
        ],
        'yaml': [
            'pyyaml>=6.0',
        ],
        'toml': [
            'toml>=0.10.2',
        ],
    },
    entry_points={
        'console_scripts': [
            'code-quality=code_quality_toolkit.cli:main',
            'cqt=code_quality_toolkit.cli:main',
        ],
    },
    zip_safe=False,
)
