#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time
import subprocess
import os
import json
from datetime import datetime

class SoloTaskMonitor:
    def __init__(self):
        self.base_path = os.path.expanduser("~/Library/Application Support/TRAE SOLO CN")
        self.last_tasks = []
    
    def check_process_cpu(self):
        """检查 TRAE 进程的 CPU 使用率来判断任务状态"""
        try:
            result = subprocess.run(
                ["ps", "-A", "-o", "%cpu,command"],
                capture_output=True,
                text=True
            )
            trae_processes = []
            for line in result.stdout.splitlines():
                if "TRAE SOLO" in line or "trae" in line.lower():
                    parts = line.strip().split(None, 1)
                    if len(parts) >= 2:
                        cpu = float(parts[0])
                        cmd = parts[1]
                        trae_processes.append({"cpu": cpu, "cmd": cmd[:50]})
            return trae_processes
        except Exception as e:
            print(f"获取进程信息失败: {e}")
            return []
    
    def get_avg_cpu(self, processes):
        """计算平均 CPU 使用率"""
        if not processes:
            return 0
        return sum(p["cpu"] for p in processes) / len(processes)
    
    def detect_task_status(self, check_interval=3, duration=30):
        """
        检测任务状态
        返回: 'running' (正在执行), 'idle' (空闲), 'unknown'
        """
        cpu_readings = []
        
        print(f"开始检测任务状态 (采样 {duration} 秒)...")
        start_time = time.time()
        
        while time.time() - start_time < duration:
            processes = self.check_process_cpu()
            avg_cpu = self.get_avg_cpu(processes)
            cpu_readings.append(avg_cpu)
            
            elapsed = time.time() - start_time
            print(f"  [{elapsed:.0f}s] 平均 CPU: {avg_cpu:.1f}%")
            
            time.sleep(check_interval)
        
        # 分析
        avg_overall = sum(cpu_readings) / len(cpu_readings)
        max_cpu = max(cpu_readings)
        min_cpu = min(cpu_readings)
        
        print(f"\n分析结果:")
        print(f"  平均 CPU: {avg_overall:.1f}%")
        print(f"  峰值 CPU: {max_cpu:.1f}%")
        print(f"  最低 CPU: {min_cpu:.1f}%")
        
        # 阈值判断
        if avg_overall > 50 or max_cpu > 80:
            print("  → 🟢 检测到任务正在执行中!")
            return "running"
        elif avg_overall < 15:
            print("  → ⚪ 系统处于空闲状态")
            return "idle"
        else:
            print("  - 🟡 可能有轻度活动或后台任务")
            return "unknown"
    
    def check_logs_for_tasks(self):
        """检查日志中的任务信息"""
        log_path = os.path.join(self.base_path, "logs/aha_log")
        
        task_info = {
            "running_tasks": [],
            "completed_tasks": [],
            "recent_events": []
        }
        
        if os.path.exists(log_path):
            log_files = sorted([f for f in os.listdir(log_path) if f.endswith('.log')])
            if log_files:
                latest_log = os.path.join(log_path, log_files[-1])
                try:
                    with open(latest_log, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # 搜索任务相关关键词
                    keywords = ['running', 'complete', 'done', 'finish', 'start', 'task', 'agent']
                    for kw in keywords:
                        import re
                        pattern = re.compile(f'.{{0,50}}{kw}.{{0,100}}', re.IGNORECASE)
                        matches = pattern.findall(content)
                        if matches:
                            task_info["recent_events"].extend(matches[-5:])
                except Exception as e:
                    pass
        
        return task_info
    
    def monitor_until_complete(self, check_interval=10, timeout=1800):
        """
        监控直到任务完成或超时
        """
        print("=" * 60)
        print("TRAE SOLO 任务监控器")
        print("=" * 60)
        
        start_time = time.time()
        
        # 首先检测初始状态
        initial_status = self.detect_task_status(duration=15)
        
        if initial_status == "idle":
            print("\n警告: 当前没有检测到运行中的任务!")
            print("请确保 TRAE SOLO 中有任务在执行。")
            return False
        
        print(f"\n开始监控任务... (超时: {timeout} 秒)")
        print(f"开始时间: {datetime.now().strftime('%H:%M:%S')}")
        print("-" * 60)
        
        # 持续监控
        idle_count = 0
        required_idle_count = 3  # 需要连续 3 次检测到空闲才认为完成
        
        while time.time() - start_time < timeout:
            elapsed = time.time() - start_time
            remaining = timeout - elapsed
            
            processes = self.check_process_cpu()
            avg_cpu = self.get_avg_cpu(processes)
            
            timestamp = datetime.now().strftime("%H:%M:%S")
            status_indicator = "🔄" if avg_cpu > 30 else "⏳" if avg_cpu > 15 else "💤"
            
            print(f"[{timestamp}] {status_indicator} CPU: {avg_cpu:5.1f}% | 已运行: {elapsed:.0f}s | 剩余: {remaining:.0f}s")
            
            if avg_cpu < 15:
                idle_count += 1
                if idle_count >= required_idle_count:
                    print("\n" + "=" * 60)
                    print("✅ 任务可能已完成!")
                    print(f"   检测到连续 {required_idle_count} 次 CPU 使用率低于 15%")
                    print(f"   总运行时间: {elapsed:.0f} 秒")
                    print("=" * 60)
                    return True
            else:
                idle_count = 0  # 重置计数器
            
            time.sleep(check_interval)
        
        print("\n" + "=" * 60)
        print(f"⏰ 监控超时 ({timeout} 秒)，任务可能仍在运行或卡住了")
        print("=" * 60)
        return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="TRAE SOLO 任务监控")
    parser.add_argument("--mode", choices=["detect", "monitor"], default="monitor",
                        help="运行模式: detect=检测一次, monitor=监控直到完成")
    parser.add_argument("--interval", type=int, default=10, help="检测间隔 (秒)")
    parser.add_argument("--timeout", type=int, default=1800, help="监控超时时间 (秒)")
    
    args = parser.parse_args()
    
    monitor = SoloTaskMonitor()
    
    if args.mode == "detect":
        monitor.detect_task_status(duration=15)
    else:
        monitor.monitor_until_complete(
            check_interval=args.interval,
            timeout=args.timeout
        )

if __name__ == "__main__":
    main()
