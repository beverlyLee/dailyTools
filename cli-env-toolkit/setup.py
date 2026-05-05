from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="cli-env-toolkit",
    version="1.0.0",
    author="CLI Environment Toolkit Team",
    description="命令行环境工具集 - 智能 Shell 别名管理器和跨平台系统信息查询",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/example/cli-env-toolkit",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: System Administrators",
        "Topic :: System :: Systems Administration",
        "Topic :: Utilities",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
    install_requires=[
        "click>=8.0.0",
        "psutil>=5.9.0",
        "colorama>=0.4.4",
        "tabulate>=0.9.0",
    ],
    entry_points={
        "console_scripts": [
            "cet=cli_env_toolkit.cli:main",
            "cli-env-toolkit=cli_env_toolkit.cli:main",
        ],
    },
)
