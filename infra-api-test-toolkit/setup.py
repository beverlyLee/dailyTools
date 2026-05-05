from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="infra-api-test-toolkit",
    version="1.0.0",
    author="Infrastructure & API Test Toolkit Team",
    description="基础设施与 API 测试工具集 - 智能 IaC 审计和 API 契约测试",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/example/infra-api-test-toolkit",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: System Administrators",
        "Topic :: Software Development :: Testing",
        "Topic :: Security",
        "Topic :: Utilities",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=[
        "click>=8.0.0",
        "pyyaml>=6.0",
        "jsonschema>=4.0.0",
        "requests>=2.28.0",
    ],
    extras_require={
        "llm": [
            "openai>=1.0.0",
        ],
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "iat=infra_api_test_toolkit.cli:main",
            "infra-api-test-toolkit=infra_api_test_toolkit.cli:main",
        ],
    },
)
