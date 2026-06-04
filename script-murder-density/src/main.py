import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uvicorn
from dotenv import load_dotenv

load_dotenv()

from src.config import API_HOST, API_PORT


def main():
    host = os.getenv("API_HOST", API_HOST)
    port = int(os.getenv("API_PORT", API_PORT))

    print("=" * 60)
    print("  剧本杀/密室逃脱 城市娱乐热度分析系统")
    print("=" * 60)
    print(f"  Backend API:  http://{host}:{port}")
    print(f"  API Docs:     http://{host}:{port}/docs")
    print(f"  Frontend:     http://{host}:{port}")
    print()
    print("  Endpoints:")
    print(f"    GET /api/health           - 健康检查")
    print(f"    GET /api/shops            - 商户列表")
    print(f"    GET /api/clusters         - 标签聚类")
    print(f"    GET /api/districts        - 区域画像")
    print(f"    GET /api/radar/{{city}}/{{district}} - 雷达图数据")
    print(f"    GET /api/overview         - 总览数据")
    print("=" * 60)

    uvicorn.run(
        "src.api.app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )


if __name__ == "__main__":
    main()
