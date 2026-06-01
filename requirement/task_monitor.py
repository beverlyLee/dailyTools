#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import time
import subprocess
import sys
import os
from datetime import datetime

CHECK_INTERVAL = 3
MAX_WAIT_TIME = 600

COMPLETION_KEYWORDS = [
    "已完成", "完成", "成功", "✅", "🎉",
    "所有测试", "测试通过", "已实现", "验收通过",
    "Done", "Complete", "Finished", "Congratulations"
]

PROGRESS_KEYWORDS = [
    "正在", "处理中", "执行中", "加载", "生成",
    "处理", "运行", "Building", "Processing", "Running", "Working"
]

ERROR_KEYWORDS = [
    "错误", "失败", "❌", "Error", "Failed", "Exception", "Traceback"
]

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    level_colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m",
        "WARNING": "\033[93m",
        "ERROR": "\033[91m",
        "ENDC": "\033[0m"
    }
    color = level_colors.get(level, "")
    endc = level_colors["ENDC"] if color else ""
    print(f"[{timestamp}] {color}{msg}{endc}")

def get_trae_processes():
    try:
        result = subprocess.run(
            ["ps", "aux"],
            capture_output=True,
            text=True,
            timeout=5
        )
        processes = []
        for line in result.stdout.splitlines():
            if "TRAE" in line and "Electron" in line:
                parts = line.split()
                if len(parts) >= 11:
                    pid = parts[1]
                    cpu = float(parts[2])
                    cmd = " ".join(parts[10:])
                    processes.append({"pid": pid, "cpu": cpu, "cmd": cmd})
        return processes
    except Exception as e:
        log(f"获取进程失败: {e}", "WARNING")
        return []

def is_app_running():
    return len(get_trae_processes()) > 0

def get_avg_cpu():
    processes = get_trae_processes()
    if not processes:
        return 0
    return sum(p["cpu"] for p in processes) / len(processes)

def take_screenshot(output_path=None):
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"/tmp/task_monitor_{timestamp}.png"
    
    try:
        subprocess.run(
            ["screencapture", "-x", output_path],
            check=True,
            capture_output=True,
            timeout=10
        )
        return output_path
    except Exception as e:
        log(f"截图失败: {e}", "WARNING")
        return None

def analyze_screenshot_with_tesseract(image_path):
    try:
        output_base = image_path.replace('.png', '_output')
        result = subprocess.run(
            ["tesseract", "-l", "chi_sim+eng", image_path, output_base],
            capture_output=True,
            timeout=60,
            cwd=os.path.dirname(image_path) or '.'
        )
        
        output_file = output_base + ".txt"
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            os.remove(output_file)
            return text
        return None
    except FileNotFoundError:
        return None
    except Exception as e:
        return None

def analyze_screenshot_with_vision(image_path):
    try:
        script = f'''
        import Foundation
        import Vision
        
        let imagePath = "{image_path}"
        let imageURL = NSURL(fileURLWithPath: imagePath) as URL
        
        guard let image = CIImage(contentsOf: imageURL) else {{
            print("Failed to load image")
            exit(1)
        }}
        
        let requestHandler = VNImageRequestHandler(ciImage: image, options: [:])
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["zh-Hans", "en-US"]
        
        try requestHandler.perform([request])
        
        if let observations = request.results as? [VNRecognizedTextObservation] {{
            let text = observations.compactMap({{ $0.topCandidates(1).first?.string }}).joined(separator: " ")
            print(text)
        }}
        '''
        result = subprocess.run(
            ["python3", "-c", script],
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout
    except Exception:
        return None

def check_text_for_status(text):
    text_lower = text.lower()
    
    for keyword in ERROR_KEYWORDS:
        if keyword.lower() in text_lower:
            return "error", keyword
    
    for keyword in COMPLETION_KEYWORDS:
        if keyword.lower() in text_lower:
            return "completed", keyword
    
    for keyword in PROGRESS_KEYWORDS:
        if keyword.lower() in text_lower:
            return "in_progress", keyword
    
    return "unknown", None

def monitor_by_cpu(timeout=MAX_WAIT_TIME, high_cpu_threshold=25.0, idle_threshold=8.0, min_high_time=15):
    log("=" * 60)
    log("使用 CPU 使用率监控模式")
    log(f"配置: 高负载 > {high_cpu_threshold}%, 空闲 < {idle_threshold}%, 最小高负载时间: {min_high_time}秒")
    log("=" * 60)
    
    if not is_app_running():
        log("TRAE CN 未运行，请先启动应用", "WARNING")
        return False
    
    start_time = time.time()
    cpu_history = []
    in_progress = False
    progress_start_time = None
    last_log_time = 0
    
    while time.time() - start_time < timeout:
        elapsed = time.time() - start_time
        remaining = timeout - elapsed
        
        current_cpu = get_avg_cpu()
        cpu_history.append(current_cpu)
        if len(cpu_history) > 5:
            cpu_history.pop(0)
        
        avg_cpu = sum(cpu_history) / len(cpu_history)
        
        if avg_cpu > high_cpu_threshold and not in_progress:
            in_progress = True
            progress_start_time = time.time()
            log(f"🔄 检测到任务开始执行 (平均 CPU: {avg_cpu:.1f}%)", "INFO")
        
        if in_progress and progress_start_time:
            task_elapsed = time.time() - progress_start_time
            
            if avg_cpu < idle_threshold and task_elapsed > min_high_time:
                log(f"✅ 任务完成! 执行时间: {task_elapsed:.1f}秒, 当前 CPU: {avg_cpu:.1f}%", "SUCCESS")
                return True
        
        if time.time() - last_log_time > 10:
            if in_progress:
                task_elapsed = time.time() - progress_start_time
                log(f"⏱️  执行中... 已运行: {task_elapsed:.1f}秒, CPU: {avg_cpu:.1f}%", "INFO")
            else:
                log(f"⌛ 等待任务开始... 监控已运行: {elapsed:.0f}秒, CPU: {avg_cpu:.1f}%", "INFO")
            last_log_time = time.time()
        
        time.sleep(CHECK_INTERVAL)
    
    log(f"⏰ 监控超时 ({timeout}秒)，任务仍未完成", "WARNING")
    return False

def monitor_by_ocr(timeout=MAX_WAIT_TIME, interval=CHECK_INTERVAL):
    log("使用 OCR 截图监控模式")
    log(f"超时时间: {timeout}秒, 检查间隔: {interval}秒")
    
    if not is_app_running():
        log("TRAE CN 未运行，请先启动应用", "WARNING")
        return False
    
    start_time = time.time()
    last_status = None
    
    has_tesseract = subprocess.run(
        ["which", "tesseract"],
        capture_output=True
    ).returncode == 0
    
    if not has_tesseract:
        log("⚠️ 未检测到 tesseract，将仅使用 CPU 监控", "WARNING")
        return monitor_by_cpu()
    
    while time.time() - start_time < timeout:
        elapsed = int(time.time() - start_time)
        remaining = timeout - elapsed
        
        screenshot_path = take_screenshot()
        
        if screenshot_path:
            text = analyze_screenshot_with_tesseract(screenshot_path)
            os.remove(screenshot_path)
            
            if text:
                status, keyword = check_text_for_status(text)
                
                if status != last_status:
                    if status == "completed":
                        log(f"✅ 检测到完成关键词: '{keyword}'", "SUCCESS")
                        log(f"   识别文本片段: ...{text[max(0, text.find(keyword)-50):text.find(keyword)+100]}...", "INFO")
                        return True
                    elif status == "error":
                        log(f"❌ 检测到错误关键词: '{keyword}'", "ERROR")
                        return False
                    elif status == "in_progress":
                        log(f"🔄 任务执行中... 关键词: '{keyword}'", "INFO")
                    
                    last_status = status
        
        if elapsed % 30 == 0 and elapsed > 0:
            log(f"⏳ 监控中... (已等待 {elapsed}秒, 剩余 {remaining}秒)", "INFO")
        
        time.sleep(interval)
    
    log(f"⏰ 监控超时 ({timeout}秒)，任务仍未完成", "WARNING")
    return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="监控 TRAE CN 任务执行状态"
    )
    parser.add_argument(
        "--timeout", 
        type=int, 
        default=MAX_WAIT_TIME,
        help=f"最大等待时间（秒），默认 {MAX_WAIT_TIME} 秒"
    )
    parser.add_argument(
        "--interval", 
        type=int, 
        default=CHECK_INTERVAL,
        help=f"检查间隔（秒），默认 {CHECK_INTERVAL} 秒"
    )
    parser.add_argument(
        "--screenshot",
        action="store_true",
        help="监控结束时保存截图"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="只检查一次状态就退出"
    )
    parser.add_argument(
        "--cpu-only",
        action="store_true",
        help="仅使用 CPU 监控模式"
    )
    
    args = parser.parse_args()
    
    if args.once:
        processes = get_trae_processes()
        print(f"找到 {len(processes)} 个 TRAE 进程")
        for p in processes:
            print(f"  PID: {p['pid']}, CPU: {p['cpu']:.1f}%")
        avg_cpu = get_avg_cpu()
        print(f"平均 CPU 使用率: {avg_cpu:.1f}%")
        return 0
    
    if args.cpu_only:
        success = monitor_by_cpu(args.timeout)
    else:
        success = monitor_by_cpu(args.timeout)
    
    if args.screenshot:
        screenshot_path = take_screenshot()
        if screenshot_path:
            log(f"📸 截图已保存: {screenshot_path}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
