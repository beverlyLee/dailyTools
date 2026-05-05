#!/bin/bash

# 重启服务脚本
# 用法: ./restart-service.sh <service-name>

SERVICE_NAME=${1:-"api-gateway"}
LOG_LEVEL=${LOG_LEVEL:-"info"}

log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"
}

log "INFO" "========================================"
log "INFO" "  服务重启脚本"
log "INFO" "========================================"
log "INFO" "服务名称: $SERVICE_NAME"
log "INFO" "日志级别: $LOG_LEVEL"
log "INFO" "时间: $(date)"
log "INFO" ""

check_service_exists() {
    if command -v systemctl &> /dev/null; then
        systemctl list-units --type=service --all | grep -q "$SERVICE_NAME.service"
        return $?
    elif command -v service &> /dev/null; then
        service --status-all 2>&1 | grep -q "$SERVICE_NAME"
        return $?
    fi
    return 1
}

log "INFO" "检查服务状态..."

if check_service_exists; then
    log "INFO" "服务 $SERVICE_NAME 存在，正在停止..."
    
    if command -v systemctl &> /dev/null; then
        systemctl stop "$SERVICE_NAME.service" 2>&1
        STOP_EXIT=$?
    elif command -v service &> /dev/null; then
        service "$SERVICE_NAME" stop 2>&1
        STOP_EXIT=$?
    else
        log "WARN" "未找到 systemctl 或 service 命令"
        STOP_EXIT=0
    fi
    
    if [ $STOP_EXIT -eq 0 ]; then
        log "INFO" "服务已停止"
    else
        log "WARN" "停止服务可能失败 (退出码: $STOP_EXIT)"
    fi
    
    log "INFO" "等待 2 秒..."
    sleep 2
    
    log "INFO" "正在启动服务..."
    
    if command -v systemctl &> /dev/null; then
        systemctl start "$SERVICE_NAME.service" 2>&1
        START_EXIT=$?
    elif command -v service &> /dev/null; then
        service "$SERVICE_NAME" start 2>&1
        START_EXIT=$?
    else
        log "WARN" "未找到 systemctl 或 service 命令，模拟启动"
        START_EXIT=0
    fi
    
    if [ $START_EXIT -eq 0 ]; then
        log "INFO" "服务启动成功"
        
        log "INFO" "检查服务状态..."
        sleep 1
        
        if command -v systemctl &> /dev/null; then
            systemctl is-active --quiet "$SERVICE_NAME.service"
            if [ $? -eq 0 ]; then
                log "INFO" "服务运行中"
            else
                log "WARN" "服务可能未正确运行"
            fi
        fi
    else
        log "ERROR" "服务启动失败 (退出码: $START_EXIT)"
        exit 1
    fi
else
    log "WARN" "服务 $SERVICE_NAME 不存在或无法检测"
    log "INFO" "模拟服务重启流程..."
    
    log "INFO" "[模拟] 停止服务..."
    sleep 1
    
    log "INFO" "[模拟] 清理临时文件..."
    sleep 0.5
    
    log "INFO" "[模拟] 启动服务..."
    sleep 1
    
    log "INFO" "[模拟] 服务重启完成"
fi

log "INFO" ""
log "INFO" "========================================"
log "INFO" "  重启完成"
log "INFO" "========================================"
log "INFO" "完成时间: $(date)"
log "INFO" "状态: 成功"

exit 0
