#!/usr/bin/env python3
import sys
import os
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
VENV_DIR = SCRIPT_DIR / "venv"
VENV_PYTHON = VENV_DIR / "bin" / "python"

def check_venv_and_restart():
    if VENV_PYTHON.exists() and sys.executable != str(VENV_PYTHON):
        print("检测到虚拟环境，但当前未使用。正在切换到虚拟环境...")
        print(f"虚拟环境 Python: {VENV_PYTHON}")
        print()
        
        os.execv(str(VENV_PYTHON), [str(VENV_PYTHON)] + sys.argv)

check_venv_and_restart()

try:
    import uvicorn
except ImportError:
    print("=" * 60)
    print("  错误：缺少必要的依赖包！")
    print("=" * 60)
    print()
    print("请按照以下步骤安装依赖：")
    print()
    print("方法 1：使用启动脚本（推荐）")
    print("  cd " + str(SCRIPT_DIR.parent))
    print("  chmod +x start.sh")
    print("  ./start.sh")
    print()
    print("方法 2：手动安装")
    print("  cd " + str(SCRIPT_DIR))
    print("  python3 -m venv venv")
    print("  source venv/bin/activate")
    print("  pip install -r requirements.txt")
    print("  python run.py")
    print()
    print("=" * 60)
    sys.exit(1)

from app.main import app

if __name__ == "__main__":
    print("=" * 60)
    print("  国潮音乐生成应用 - 后端服务")
    print("=" * 60)
    print(f"Python 解释器: {sys.executable}")
    print(f"工作目录: {SCRIPT_DIR}")
    print()
    print("启动服务中...")
    print()
    print("服务地址: http://localhost:8000")
    print("API 文档: http://localhost:8000/docs")
    print("=" * 60)
    print()
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
