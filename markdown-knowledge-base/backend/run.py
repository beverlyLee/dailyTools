import uvicorn
from pathlib import Path
import sys

# 添加项目根目录到路径
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.core.config import settings

if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Notes directory: {settings.NOTES_DIR}")
    print(f"Database: {settings.DATABASE_URL}")
    print(f"Index directory: {settings.INDEX_DIR}")
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
