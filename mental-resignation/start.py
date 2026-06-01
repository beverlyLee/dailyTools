#!/usr/bin/env python3
"""
职场精神离职分析仪表板 - 统一启动脚本
先启动 Flask 后端，等待健康检查通过后，再启动 Streamlit 前端
"""
import sys
import os
import time
import socket
import subprocess
import signal
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from typing import Optional

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

flask_process: Optional[subprocess.Popen] = None
streamlit_process: Optional[subprocess.Popen] = None


def is_port_in_use(port: int) -> bool:
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            return False
        except OSError:
            return True


def check_api_health(host: str = "localhost", port: int = 5001, timeout: int = 3) -> bool:
    """检查 Flask API 是否健康运行"""
    try:
        import requests
        resp = requests.get(f"http://{host}:{port}/api/health", timeout=timeout)
        return resp.status_code == 200 and resp.json().get("status") == "ok"
    except Exception:
        return False


def find_process_on_port(port: int) -> Optional[str]:
    """查找占用指定端口的进程信息"""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().split("\n")
            return ", ".join(pids)
    except Exception:
        pass
    return None


def kill_process_on_port(port: int) -> bool:
    """尝试杀死占用指定端口的进程"""
    pids = find_process_on_port(port)
    if pids:
        try:
            for pid in pids.split(", "):
                subprocess.run(["kill", "-9", pid.strip()], check=True)
            time.sleep(1)
            return True
        except Exception:
            return False
    return True


def start_flask(port: int, debug: bool = False) -> subprocess.Popen:
    """启动 Flask 后端服务"""
    print("🚀 启动 Flask 后端服务...")

    env = os.environ.copy()
    env["FLASK_APP"] = "src/api/server.py"
    env["FLASK_ENV"] = "development" if debug else "production"
    env["PYTHONPATH"] = PROJECT_DIR
    env["API_PORT"] = str(port)

    cmd = [
        sys.executable,
        "src/api/server.py",
    ]

    process = subprocess.Popen(
        cmd,
        cwd=PROJECT_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return process


def start_streamlit(port: int, api_port: int) -> subprocess.Popen:
    """启动 Streamlit 前端服务"""
    print("🎨 启动 Streamlit 前端服务...")

    env = os.environ.copy()
    env["API_BASE"] = f"http://localhost:{api_port}"

    cmd = [
        sys.executable,
        "-m",
        "streamlit",
        "run",
        "app.py",
        "--server.port",
        str(port),
        "--server.address",
        "0.0.0.0",
        "--browser.gatherUsageStats",
        "false",
    ]

    process = subprocess.Popen(
        cmd,
        cwd=PROJECT_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return process


def wait_for_api(port: int, max_attempts: int = 30, interval: float = 1.0) -> bool:
    """等待 API 服务启动"""
    print("⏳ 等待后端 API 启动...")
    for i in range(max_attempts):
        if check_api_health(port=port):
            print(f"✅ 后端 API 启动成功 (耗时 {i + 1} 秒)")
            return True
        print(f"  等待中... ({i + 1}/{max_attempts})")
        time.sleep(interval)

    print(f"❌ 后端 API 启动超时 ({max_attempts} 秒)")
    return False


def cleanup(signum, frame):
    """清理子进程"""
    print("\n🛑 正在关闭服务...")
    global flask_process, streamlit_process

    for name, proc in [("Flask", flask_process), ("Streamlit", streamlit_process)]:
        if proc and proc.poll() is None:
            try:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                print(f"  ✅ {name} 服务已关闭")
            except Exception as e:
                print(f"  ⚠️  关闭 {name} 时出错: {e}")

    print("👋 服务已全部停止")
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(
        description="职场精神离职分析仪表板 - 统一启动脚本"
    )
    parser.add_argument(
        "--flask-port",
        type=int,
        default=5001,
        help="Flask 后端端口 (默认: 5001)",
    )
    parser.add_argument(
        "--streamlit-port",
        type=int,
        default=8501,
        help="Streamlit 前端端口 (默认: 8501)",
    )
    parser.add_argument(
        "--force-kill",
        action="store_true",
        help="如果端口被占用，强制杀死占用进程",
    )
    parser.add_argument(
        "--no-frontend",
        action="store_true",
        help="仅启动后端 API，不启动前端",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="开启 Flask debug 模式",
    )
    args = parser.parse_args()

    flask_port = args.flask_port
    streamlit_port = args.streamlit_port

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    print("=" * 60)
    print("  😮‍💨 职场精神离职分析仪表板 - 服务启动")
    print("=" * 60)

    # 检查端口
    print(f"\n📌 检查端口占用...")
    for service, port in [("Flask", flask_port), ("Streamlit", streamlit_port)]:
        if is_port_in_use(port):
            pids = find_process_on_port(port)
            if args.force_kill:
                print(f"  ⚠️  端口 {port} 被占用 (PID: {pids})，正在强制关闭...")
                if kill_process_on_port(port):
                    print(f"  ✅ 端口 {port} 已释放")
                else:
                    print(f"  ❌ 无法释放端口 {port}，请手动处理")
                    sys.exit(1)
            else:
                print(f"  ❌ 端口 {port} 已被占用 (PID: {pids})")
                print(f"     使用 --force-kill 参数可强制关闭占用进程")
                sys.exit(1)
        else:
            print(f"  ✅ 端口 {port} 可用")

    # 启动 Flask
    global flask_process, streamlit_process
    try:
        flask_process = start_flask(flask_port, debug=args.debug)
    except Exception as e:
        print(f"❌ 启动 Flask 失败: {e}")
        sys.exit(1)

    # 等待 Flask 就绪
    if not wait_for_api(port=flask_port):
        print("❌ 后端服务未能正常启动，检查日志:")
        if flask_process and flask_process.poll() is not None:
            print(flask_process.stdout.read() if flask_process.stdout else "无输出")
        cleanup(None, None)

    # 启动 Streamlit
    if not args.no_frontend:
        try:
            streamlit_process = start_streamlit(streamlit_port, flask_port)
        except Exception as e:
            print(f"❌ 启动 Streamlit 失败: {e}")
            cleanup(None, None)

    # 打印访问信息
    print("\n" + "=" * 60)
    print("  🎉 所有服务启动成功!")
    print("=" * 60)
    print(f"  🌐 前端仪表板: http://localhost:{streamlit_port}")
    print(f"  🔌 后端 API:   http://localhost:{flask_port}/api/health")
    print(f"  📂 项目目录:   {PROJECT_DIR}")
    print("=" * 60)
    print("  💡 提示: 按 Ctrl+C 停止所有服务")
    print("=" * 60 + "\n")

    # 保持运行，监控子进程
    try:
        while True:
            time.sleep(2)

            if flask_process and flask_process.poll() is not None:
                print(f"❌ Flask 后端已退出 (代码: {flask_process.returncode})")
                if flask_process.stdout:
                    print(flask_process.stdout.read())
                cleanup(None, None)

            if streamlit_process and streamlit_process.poll() is not None:
                print(f"❌ Streamlit 前端已退出 (代码: {streamlit_process.returncode})")
                if streamlit_process.stdout:
                    print(streamlit_process.stdout.read())
                cleanup(None, None)

    except KeyboardInterrupt:
        cleanup(None, None)


if __name__ == "__main__":
    main()
