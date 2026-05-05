#!/bin/bash

# 清理系统缓存脚本
# 用法: ./clear-cache.sh

log() {
    local level=$1
    local message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"
}

log "INFO" "========================================"
log "INFO" "  系统缓存清理脚本"
log "INFO" "========================================"
log "INFO" "时间: $(date)"
log "INFO" ""

get_memory_info() {
    if [ -f /proc/meminfo ]; then
        local mem_total=$(grep 'MemTotal' /proc/meminfo | awk '{print $2}')
        local mem_free=$(grep 'MemFree' /proc/meminfo | awk '{print $2}')
        local mem_available=$(grep 'MemAvailable' /proc/meminfo | awk '{print $2}')
        local buffers=$(grep 'Buffers' /proc/meminfo | awk '{print $2}')
        local cached=$(grep '^Cached' /proc/meminfo | awk '{print $2}')
        
        local mem_used=$((mem_total - mem_free - buffers - cached))
        local mem_usage=$(echo "scale=2; $mem_used * 100 / $mem_total" | bc 2>/dev/null || echo "0")
        
        echo "总内存: $((mem_total / 1024)) MB"
        echo "已使用: $((mem_used / 1024)) MB (${mem_usage}%)"
        echo "可用: $((mem_available / 1024)) MB"
        echo "缓存: $((cached / 1024)) MB"
        echo "缓冲区: $((buffers / 1024)) MB"
    else
        echo "系统信息 (非 Linux):"
        if command -v vm_stat &> /dev/null; then
            vm_stat | head -5
        elif command -v top &> /dev/null; then
            top -l 1 | head -10
        fi
    fi
}

log "INFO" "清理前内存状态:"
get_memory_info
log "INFO" ""

log "INFO" "开始清理缓存..."

if [ "$(id -u)" -eq 0 ]; then
    log "INFO" "以 root 权限运行，执行完整清理"
    
    if [ -f /proc/sys/vm/drop_caches ]; then
        log "INFO" "清理 PageCache..."
        sync
        echo 1 > /proc/sys/vm/drop_caches
        sleep 1
        
        log "INFO" "清理 dentries 和 inodes..."
        sync
        echo 2 > /proc/sys/vm/drop_caches
        sleep 1
        
        log "INFO" "清理所有缓存..."
        sync
        echo 3 > /proc/sys/vm/drop_caches
        sleep 1
        
        log "INFO" "系统缓存清理完成"
    else
        log "WARN" "非 Linux 系统，执行模拟清理"
        sleep 1
    fi
else
    log "WARN" "非 root 权限，执行部分清理"
    log "INFO" ""
    
    log "INFO" "清理用户级缓存..."
    
    if [ -n "$HOME" ]; then
        if [ -d "$HOME/.cache" ]; then
            log "INFO" "清理 ~/.cache 目录..."
            find "$HOME/.cache" -type f -atime +7 -delete 2>/dev/null || true
        fi
        
        if [ -d "$HOME/Library/Caches" ]; then
            log "INFO" "清理 ~/Library/Caches 目录 (macOS)..."
            find "$HOME/Library/Caches" -type f -atime +7 -delete 2>/dev/null || true
        fi
    fi
    
    log "INFO" "同步文件系统..."
    sync
fi

log "INFO" ""
log "INFO" "清理后内存状态:"
get_memory_info
log "INFO" ""

log "INFO" "========================================"
log "INFO" "  清理完成"
log "INFO" "========================================"
log "INFO" "完成时间: $(date)"

exit 0
