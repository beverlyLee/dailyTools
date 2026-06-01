#!/usr/bin/env python3
"""
全栈工程开发启动脚本
同时启动 Next.js 前端和 FastAPI 后端

用法:
  python dev.py                    # 启动当前目录下的前后端
  python dev.py -p /path/to/proj  # 启动指定项目的前后端

约定目录结构:
  project/
  ├── frontend/   或 client/      (Next.js)
  └── backend/    或 server/      (FastAPI)
"""

import argparse
import os
import signal
import socket
import subprocess
import sys
from pathlib import Path

COLORS = {
    "frontend": "\033[96m",  # cyan
    "backend": "\033[93m",   # yellow
    "warn": "\033[91m",      # red
    "green": "\033[92m",
    "reset": "\033[0m",
}


def find_dir(base: Path, *candidates: str) -> Path | None:
    for name in candidates:
        p = base / name
        if p.is_dir():
            return p
    return None


def detect_env(dir_path: Path) -> dict:
    """检测目录中存在的虚拟环境"""
    venv = dir_path / ".venv"
    if venv.exists():
        return {"venv": venv}
    venv = dir_path / "venv"
    if venv.exists():
        return {"venv": venv}
    return {}


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", port)) == 0


def get_port_pids(port: int) -> list[tuple[int, str]]:
    """获取占用端口的 (PID, 进程名) 列表"""
    try:
        result = subprocess.run(
            ["lsof", "-i", f":{port}", "-t", "-sTCP:LISTEN"],
            capture_output=True, text=True, timeout=5,
        )
        pids = [int(p) for p in result.stdout.strip().split() if p.strip()]
    except Exception:
        return []

    entries = []
    for pid in pids:
        try:
            r = subprocess.run(["ps", "-p", str(pid), "-o", "comm="],
                               capture_output=True, text=True, timeout=3)
            name = r.stdout.strip() or "unknown"
        except Exception:
            name = "unknown"
        entries.append((pid, name))
    return entries


def kill_port(port: int) -> bool:
    """杀掉占用端口的所有进程，返回是否成功"""
    entries = get_port_pids(port)
    if not entries:
        return True
    for pid, name in entries:
        print(f"  终止进程 {name} (PID={pid})...")
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        except PermissionError:
            print(f"  {COLORS['warn']}权限不足，尝试 sudo kill...{COLORS['reset']}")
            subprocess.run(["sudo", "kill", str(pid)], timeout=5)

    # 等待端口释放
    for _ in range(15):
        if not is_port_in_use(port):
            return True
        import time; time.sleep(0.3)
    return not is_port_in_use(port)


def find_free_port(start: int, max_tries: int = 100) -> int:
    """从 start 开始找到第一个可用端口"""
    for port in range(start + 1, start + max_tries):
        if not is_port_in_use(port):
            return port
    return -1


def resolve_port(label: str, default_port: int) -> int:
    """
    检查端口占用，交互式选择：kill 占用进程 或 顺延端口
    返回最终可用端口，-1 表示放弃
    """
    if not is_port_in_use(default_port):
        return default_port

    entries = get_port_pids(default_port)
    proc_info = ", ".join(f"{name}(PID={pid})" for pid, name in entries) if entries else "未知进程"
    print(f"\n{COLORS['warn']}[{label}]{COLORS['reset']} 端口 {default_port} 已被占用: {proc_info}")
    print(f"  [1] Kill 占用进程，释放端口 {default_port}")
    print(f"  [2] 自动顺延到下一个可用端口")
    print(f"  [3] 跳过 {label} 启动")

    while True:
        choice = input("请选择 (1/2/3): ").strip()
        if choice == "1":
            if kill_port(default_port):
                print(f"  {COLORS['green']}端口 {default_port} 已释放{COLORS['reset']}")
                return default_port
            else:
                print(f"  {COLORS['warn']}端口 {default_port} 释放失败{COLORS['reset']}")
                return -1
        elif choice == "2":
            new_port = find_free_port(default_port)
            if new_port > 0:
                print(f"  {COLORS['green']}{label} 使用端口 {new_port}{COLORS['reset']}")
                return new_port
            print(f"  {COLORS['warn']}未找到可用端口{COLORS['reset']}")
            return -1
        elif choice == "3":
            print(f"  跳过 {label}")
            return -1


def start_frontend(frontend_dir: Path, port: int) -> subprocess.Popen | None:
    if port <= 0:
        return None
    cmd = ["npx", "next", "dev", "--port", str(port)]
    print(f"{COLORS['frontend']}[frontend]{COLORS['reset']} cd {frontend_dir} && {' '.join(cmd)}")
    return subprocess.Popen(
        cmd,
        cwd=str(frontend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def start_backend(backend_dir: Path, port: int) -> subprocess.Popen | None:
    if port <= 0:
        return None
    extra = detect_env(backend_dir)
    python = "python"
    if venv := extra.get("venv"):
        python = str(venv / "bin" / "python")

    # 查找 FastAPI 入口: main.py 或 app/main.py
    entry = None
    for candidate in ["main.py", "app/main.py", "run.py", "app.py"]:
        if (backend_dir / candidate).exists():
            entry = candidate
            break
    if entry is None:
        print(f"{COLORS['backend']}[backend]{COLORS['reset']} 未找到 FastAPI 入口文件 (main.py / app/main.py)，跳过后端")
        return None

    module = entry.replace("/", ".").removesuffix(".py")
    cmd = [python, "-m", "uvicorn", f"{module}:app", "--reload", "--port", str(port)]

    print(f"{COLORS['backend']}[backend]{COLORS['reset']} cd {backend_dir} && {' '.join(cmd)}")
    return subprocess.Popen(
        cmd,
        cwd=str(backend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )


def main():
    parser = argparse.ArgumentParser(description="全栈工程开发启动器")
    parser.add_argument("-p", "--project", default=".", help="项目根目录")
    parser.add_argument("--frontend-only", action="store_true", help="仅启动前端")
    parser.add_argument("--backend-only", action="store_true", help="仅启动后端")
    parser.add_argument("--fp", type=int, default=3000, help="前端端口 (默认 3000)")
    parser.add_argument("--bp", type=int, default=8000, help="后端端口 (默认 8000)")
    parser.add_argument("--kill", action="store_true", help="端口冲突时自动 kill，不询问")
    parser.add_argument("--increment", action="store_true", help="端口冲突时自动顺延，不询问")
    args = parser.parse_args()

    base = Path(args.project).resolve()

    frontend_dir = find_dir(base, "frontend", "client", "web")
    backend_dir = find_dir(base, "backend", "server", "api")

    if args.frontend_only:
        backend_dir = None
    if args.backend_only:
        frontend_dir = None

    if not frontend_dir and not backend_dir:
        print(f"在 {base} 下未找到 frontend/ 或 backend/ 目录")
        sys.exit(1)

    # 解析端口冲突
    frontend_port = 0
    backend_port = 0

    if frontend_dir:
        frontend_port = resolve_port_auto("frontend", args.fp, args.kill, args.increment)
    if backend_dir:
        backend_port = resolve_port_auto("backend", args.bp, args.kill, args.increment)

    procs = {}

    if frontend_dir and frontend_port > 0:
        proc = start_frontend(frontend_dir, frontend_port)
        if proc:
            procs["frontend"] = (proc, COLORS["frontend"])
    if backend_dir and backend_port > 0:
        proc = start_backend(backend_dir, backend_port)
        if proc:
            procs["backend"] = (proc, COLORS["backend"])

    if not procs:
        print("没有可启动的服务")
        sys.exit(1)

    def shutdown(*_):
        for label, (proc, _) in procs.items():
            print(f"停止 {label} (pid={proc.pid})...")
            proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("\n  全栈开发服务器已启动，按 Ctrl+C 停止\n")
    if "frontend" in procs:
        print(f"  前端: http://localhost:{frontend_port}")
    if "backend" in procs:
        print(f"  后端: http://localhost:{backend_port}")
    print()

    try:
        while procs:
            done = []
            for label, (proc, color) in procs.items():
                line = proc.stdout.readline()
                if line:
                    text = line.decode(errors="replace").rstrip()
                    if text:
                        print(f"{color}[{label}]{COLORS['reset']} {text}", flush=True)
                elif proc.poll() is not None:
                    done.append(label)
            for label in done:
                print(f"{procs[label][1]}[{label}]{COLORS['reset']} 进程已退出 (code={procs[label][0].returncode})")
                del procs[label]
    except KeyboardInterrupt:
        shutdown()
    finally:
        shutdown()


def resolve_port_auto(label: str, default_port: int, auto_kill: bool, auto_increment: bool) -> int:
    """根据参数决定端口冲突策略"""
    if not is_port_in_use(default_port):
        return default_port

    if auto_kill:
        entries = get_port_pids(default_port)
        proc_info = ", ".join(f"{name}(PID={pid})" for pid, name in entries) if entries else "未知进程"
        print(f"{COLORS['warn']}[{label}]{COLORS['reset']} 端口 {default_port} 被占用 ({proc_info})，自动 kill...")
        if kill_port(default_port):
            print(f"  {COLORS['green']}端口 {default_port} 已释放{COLORS['reset']}")
            return default_port
        print(f"  {COLORS['warn']}端口 {default_port} 释放失败，跳过 {label}{COLORS['reset']}")
        return -1

    if auto_increment:
        new_port = find_free_port(default_port)
        if new_port > 0:
            print(f"{COLORS['warn']}[{label}]{COLORS['reset']} 端口 {default_port} 被占用，自动顺延到 {new_port}")
            return new_port
        print(f"  {COLORS['warn']}未找到可用端口，跳过 {label}{COLORS['reset']}")
        return -1

    # 交互式
    return resolve_port(label, default_port)


if __name__ == "__main__":
    main()
