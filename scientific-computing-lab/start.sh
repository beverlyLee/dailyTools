#!/bin/bash

echo "========================================"
echo "科学计算与仿真实验平台"
echo "Scientific Computing & Simulation Lab"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "可用的子系统:"
echo "  1) 傅里叶变换信号分析实验台"
echo "  2) 蒙特卡洛圆周率估算模拟器"
echo "  3) 启动所有子系统"
echo ""
echo "请输入选项 (1/2/3): "
read choice

case $choice in
    1)
        echo "启动傅里叶变换信号分析实验台..."
        cd "$SCRIPT_DIR/fourier-transform-analyzer"
        ./start.sh
        ;;
    2)
        echo "启动蒙特卡洛圆周率估算模拟器..."
        cd "$SCRIPT_DIR/monte-carlo-pi-estimator"
        ./start.sh
        ;;
    3)
        echo "启动所有子系统..."
        
        echo "启动傅里叶变换信号分析实验台..."
        cd "$SCRIPT_DIR/fourier-transform-analyzer/backend"
        source venv/bin/activate 2>/dev/null || python3 -m venv venv && source venv/bin/activate
        pip install -q -r requirements.txt 2>/dev/null
        python run.py &
        PID1=$!
        
        cd "$SCRIPT_DIR/fourier-transform-analyzer/frontend"
        npm run dev &
        PID2=$!
        
        echo "启动蒙特卡洛圆周率估算模拟器..."
        cd "$SCRIPT_DIR/monte-carlo-pi-estimator/backend"
        go build -o monte-carlo-pi .
        ./monte-carlo-pi &
        PID3=$!
        
        cd "$SCRIPT_DIR/monte-carlo-pi-estimator/frontend"
        npm run dev &
        PID4=$!
        
        echo ""
        echo "========================================"
        echo "所有服务已启动!"
        echo "========================================"
        echo "傅里叶变换分析台: http://localhost:3001"
        echo "蒙特卡洛Pi估算器:  http://localhost:3002"
        echo ""
        echo "按 Ctrl+C 停止所有服务"
        echo "========================================"
        
        trap "echo '停止所有服务...'; kill $PID1 $PID2 $PID3 $PID4 2>/dev/null; exit" SIGINT SIGTERM
        
        wait
        ;;
    *)
        echo "无效选项，退出。"
        exit 1
        ;;
esac
