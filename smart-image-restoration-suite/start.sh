#!/bin/bash

# 智能图像修复与生成系统启动脚本
# 此脚本用于快速启动两个子系统

set -e

echo "======================================="
echo "智能图像修复与生成系统"
echo "======================================="

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查Python和Node.js
echo "检查运行环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python 3.8+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 16+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Python3: $(python3 --version)"
echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"

# 安装依赖选项
echo ""
echo "请选择要启动的系统："
echo "1) 国风服饰虚拟换装系统 (端口: 前端3000, 后端8000)"
echo "2) 老照片超分辨率修复系统 (端口: 前端3001, 后端8001)"
echo "3) 同时启动两个系统"
echo "4) 仅安装依赖"
echo "5) 退出"

read -p "请输入选项 (1-5): " choice

install_dependencies() {
    echo ""
    echo "安装后端依赖..."
    cd "$SCRIPT_DIR"
    
    # 安装国风服饰后端依赖
    if [ -d "traditional-costume-virtual-try-on/backend" ]; then
        echo "安装国风服饰虚拟换装系统后端依赖..."
        cd "$SCRIPT_DIR/traditional-costume-virtual-try-on/backend"
        pip3 install -r requirements.txt -q
        echo "✅ 国风服饰后端依赖安装完成"
    fi
    
    # 安装老照片修复后端依赖
    if [ -d "old-photo-restoration/backend" ]; then
        echo "安装老照片超分辨率修复系统后端依赖..."
        cd "$SCRIPT_DIR/old-photo-restoration/backend"
        pip3 install -r requirements.txt -q
        echo "✅ 老照片修复后端依赖安装完成"
    fi
    
    # 安装前端依赖
    echo ""
    echo "安装前端依赖..."
    
    if [ -d "traditional-costume-virtual-try-on/frontend" ]; then
        echo "安装国风服饰虚拟换装系统前端依赖..."
        cd "$SCRIPT_DIR/traditional-costume-virtual-try-on/frontend"
        npm install --silent
        echo "✅ 国风服饰前端依赖安装完成"
    fi
    
    if [ -d "old-photo-restoration/frontend" ]; then
        echo "安装老照片超分辨率修复系统前端依赖..."
        cd "$SCRIPT_DIR/old-photo-restoration/frontend"
        npm install --silent
        echo "✅ 老照片修复前端依赖安装完成"
    fi
    
    cd "$SCRIPT_DIR"
    echo ""
    echo "✅ 所有依赖安装完成！"
}

start_traditional_costume() {
    echo ""
    echo "启动国风服饰虚拟换装系统..."
    echo "端口: 前端 3000, 后端 8000"
    echo ""
    
    # 检查是否需要安装依赖
    if [ ! -d "traditional-costume-virtual-try-on/backend/venv" ] && [ ! -d "traditional-costume-virtual-try-on/frontend/node_modules" ]; then
        read -p "检测到依赖可能未安装，是否先安装依赖？(y/n): " install_choice
        if [ "$install_choice" = "y" ] || [ "$install_choice" = "Y" ]; then
            install_dependencies
        fi
    fi
    
    cd "$SCRIPT_DIR"
    
    # 启动后端
    echo "启动后端服务 (端口 8000)..."
    cd "$SCRIPT_DIR/traditional-costume-virtual-try-on/backend"
    python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo "后端服务已启动，PID: $BACKEND_PID"
    
    # 等待后端启动
    sleep 3
    
    # 启动前端
    echo ""
    echo "启动前端服务 (端口 3000)..."
    cd "$SCRIPT_DIR/traditional-costume-virtual-try-on/frontend"
    BROWSER=none npm start &
    FRONTEND_PID=$!
    echo "前端服务已启动，PID: $FRONTEND_PID"
    
    echo ""
    echo "======================================="
    echo "国风服饰虚拟换装系统已启动！"
    echo "访问地址: http://localhost:3000"
    echo "API文档: http://localhost:8000/docs"
    echo "======================================="
    echo ""
    echo "按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    trap "echo ''; echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '服务已停止'; exit 0" INT
    
    wait
}

start_old_photo() {
    echo ""
    echo "启动老照片超分辨率修复系统..."
    echo "端口: 前端 3001, 后端 8001"
    echo ""
    
    # 检查是否需要安装依赖
    if [ ! -d "old-photo-restoration/backend/venv" ] && [ ! -d "old-photo-restoration/frontend/node_modules" ]; then
        read -p "检测到依赖可能未安装，是否先安装依赖？(y/n): " install_choice
        if [ "$install_choice" = "y" ] || [ "$install_choice" = "Y" ]; then
            install_dependencies
        fi
    fi
    
    cd "$SCRIPT_DIR"
    
    # 启动后端
    echo "启动后端服务 (端口 8001)..."
    cd "$SCRIPT_DIR/old-photo-restoration/backend"
    python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
    BACKEND_PID=$!
    echo "后端服务已启动，PID: $BACKEND_PID"
    
    # 等待后端启动
    sleep 3
    
    # 启动前端
    echo ""
    echo "启动前端服务 (端口 3001)..."
    cd "$SCRIPT_DIR/old-photo-restoration/frontend"
    PORT=3001 BROWSER=none npm start &
    FRONTEND_PID=$!
    echo "前端服务已启动，PID: $FRONTEND_PID"
    
    echo ""
    echo "======================================="
    echo "老照片超分辨率修复系统已启动！"
    echo "访问地址: http://localhost:3001"
    echo "API文档: http://localhost:8001/docs"
    echo "======================================="
    echo ""
    echo "按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    trap "echo ''; echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '服务已停止'; exit 0" INT
    
    wait
}

start_both() {
    echo ""
    echo "同时启动两个系统..."
    echo ""
    
    # 检查是否需要安装依赖
    read -p "是否先安装所有依赖？(y/n): " install_choice
    if [ "$install_choice" = "y" ] || [ "$install_choice" = "Y" ]; then
        install_dependencies
    fi
    
    cd "$SCRIPT_DIR"
    
    # 启动国风服饰系统
    echo "启动国风服饰虚拟换装系统后端 (端口 8000)..."
    cd "$SCRIPT_DIR/traditional-costume-virtual-try-on/backend"
    python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    TC_BACKEND_PID=$!
    
    echo "启动国风服饰虚拟换装系统前端 (端口 3000)..."
    cd "$SCRIPT_DIR/traditional-costume-virtual-try-on/frontend"
    BROWSER=none npm start &
    TC_FRONTEND_PID=$!
    
    # 启动老照片修复系统
    sleep 2
    echo "启动老照片超分辨率修复系统后端 (端口 8001)..."
    cd "$SCRIPT_DIR/old-photo-restoration/backend"
    python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload &
    OP_BACKEND_PID=$!
    
    echo "启动老照片超分辨率修复系统前端 (端口 3001)..."
    cd "$SCRIPT_DIR/old-photo-restoration/frontend"
    PORT=3001 BROWSER=none npm start &
    OP_FRONTEND_PID=$!
    
    sleep 3
    
    echo ""
    echo "======================================="
    echo "所有系统已启动！"
    echo ""
    echo "国风服饰虚拟换装系统:"
    echo "  前端: http://localhost:3000"
    echo "  后端: http://localhost:8000/docs"
    echo ""
    echo "老照片超分辨率修复系统:"
    echo "  前端: http://localhost:3001"
    echo "  后端: http://localhost:8001/docs"
    echo "======================================="
    echo ""
    echo "按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    trap "echo ''; echo '正在停止所有服务...'; kill $TC_BACKEND_PID $TC_FRONTEND_PID $OP_BACKEND_PID $OP_FRONTEND_PID 2>/dev/null; echo '所有服务已停止'; exit 0" INT
    
    wait
}

# 处理用户选择
case $choice in
    1)
        start_traditional_costume
        ;;
    2)
        start_old_photo
        ;;
    3)
        start_both
        ;;
    4)
        install_dependencies
        ;;
    5)
        echo "退出..."
        exit 0
        ;;
    *)
        echo "无效选项，请重新运行脚本"
        exit 1
        ;;
esac
