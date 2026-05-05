#!/bin/bash

echo "======================================"
echo "数据工程调度平台 - Docker 启动脚本"
echo "======================================"
echo ""
echo "提示: 如果不想使用 Docker，请使用本地启动脚本:"
echo "  - macOS/Linux: ./start-local.sh"
echo "  - Windows: .\start-local.ps1"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装，请先安装 Docker 和 Docker Compose"
    echo "或者使用本地启动脚本: ./start-local.sh"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装，请先安装 Docker Compose"
    echo "或者使用本地启动脚本: ./start-local.sh"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")"

echo ""
echo "步骤 1: 构建 Docker 镜像..."
docker-compose build

echo ""
echo "步骤 2: 启动 PostgreSQL 数据库..."
docker-compose up -d postgres

echo ""
echo "等待数据库初始化完成..."
sleep 10

echo ""
echo "步骤 3: 初始化 Airflow 数据库..."
docker-compose up airflow-init

echo ""
echo "步骤 4: 启动所有服务..."
docker-compose up -d

echo ""
echo "======================================"
echo "服务启动完成！"
echo "======================================"
echo ""
echo "访问地址:"
echo "  - 前端界面: http://localhost:3000"
echo "  - 后端 API: http://localhost:5000"
echo "  - Airflow WebUI: http://localhost:8080 (默认账号: admin / admin)"
echo ""
echo "常用命令:"
echo "  - 查看日志: docker-compose logs -f"
echo "  - 停止服务: docker-compose down"
echo "  - 重启服务: docker-compose restart"
echo ""
