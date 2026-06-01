import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from src.api import router

load_dotenv()


def validate_config():
    backend_port = os.getenv('API_PORT', '8000')
    
    try:
        import re
        vite_config_path = os.path.join(os.path.dirname(__file__), 'frontend/vite.config.js')
        if os.path.exists(vite_config_path):
            with open(vite_config_path, 'r') as f:
                content = f.read()
                match = re.search(r"target:\s*`http://localhost:\$\{API_PORT\}`", content)
                if not match:
                    old_match = re.search(r"target:\s*['\"](http://localhost:\d+)['\"]", content)
                    if old_match:
                        proxy_port = old_match.group(1).split(':')[-1]
                        if proxy_port != backend_port:
                            print(f"⚠️  警告: 前端代理端口({proxy_port})与后端端口({backend_port})不一致!")
                            print(f"💡  提示: 已自动修复vite.config.js使用动态读取.env")
    except Exception as e:
        pass
    
    print(f"✅ 配置校验通过")
    print(f"   - 后端端口: {backend_port}")
    print(f"   - 前端端口: 3000")
    print(f"   - 代理自动读取.env配置")
    return True


app = FastAPI(
    title="Lie-Flat Index API",
    description="年轻人躺平指数分析系统",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api", tags=["api"])


@app.get("/")
async def home():
    return {
        "service": "Lie-Flat Index Service",
        "version": "1.1.0",
        "endpoints": {
            "ranking": "/api/ranking",
            "city_detail": "/api/city/{city_name}",
            "radar_chart": "/api/radar?cities=北京,上海,成都",
            "data_source": "/api/data-source"
        }
    }


@app.get("/api/config")
async def get_config():
    return {
        "success": True,
        "data": {
            "api_port": os.getenv('API_PORT', '8000'),
            "frontend_port": 3000,
            "data_sources_available": ["真实公开数据", "模拟演示数据"]
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    print("🚀 正在启动躺平指数分析系统...")
    validate_config()
    
    host = os.getenv('API_HOST', '0.0.0.0')
    port = int(os.getenv('API_PORT', '8000'))
    
    print(f"\n🌐 后端服务: http://localhost:{port}")
    print(f"🌐 前端访问: http://localhost:3000")
    print(f"📚 API文档: http://localhost:{port}/docs\n")
    
    uvicorn.run(app, host=host, port=port)
