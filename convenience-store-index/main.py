#!/usr/bin/env python3
"""
中国城市便利店发展指数 - 后端入口文件
"""

import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    print(f"🚀 启动 FastAPI 服务: http://{host}:{port}")
    print(f"📖 API 文档: http://{host}:{port}/docs")
    
    uvicorn.run(
        "src.api.routes:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
