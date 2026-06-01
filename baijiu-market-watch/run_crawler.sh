#!/bin/bash

cd "$(dirname "$0")"

echo "======================================"
echo "  🍶 白酒市场监控 - 爬虫启动脚本"
echo "======================================"
echo ""

if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "🔧 激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install -r requirements.txt -q

echo ""
echo "🗄️  初始化数据库..."
python -c "from src.database import db; print('数据库初始化完成')"

echo ""
echo "🕷️  启动爬虫..."
python -c "
import sys
sys.path.insert(0, '.')
from src.spiders.scheduler import CrawlerScheduler
scheduler = CrawlerScheduler()
scheduler.start(run_once=True)
"

echo ""
echo "✅ 爬虫执行完成！数据已保存到数据库。"
echo ""
echo "📊 接下来可以运行 ./start_backend.sh 启动后端服务"
