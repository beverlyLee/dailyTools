#!/usr/bin/env python3
"""
项目启动脚本：检测项目类型 → 检查端口冲突 → 在 Trae 终端中启动工程

用法:
    python3 run_project.py braille-ocr
    python3 run_project.py 2d-platformer-game
    python3 run_project.py --list

端口冲突时可选:
  1. kill 占用端口的进程
  2. 自动 +1 找空闲端口启动
"""

import json
import os
import re
import signal
import socket
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parent.parent
KILL_PORT_SCRIPT = Path(__file__).resolve().parent / "kill_port.py"

# 默认端口映射
DEFAULT_PORTS = {
    "vite": 5173,
    "node": 3000,
    "python": 8000,
    "go": 8080,
    "rust": 8080,
}


# ============================
# 端口工具
# ============================

def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def find_free_port(start: int, max_tries: int = 100) -> int:
    for p in range(start, start + max_tries):
        if not port_in_use(p):
            return p
    return start + max_tries


def get_pid_on_port(port: int) -> int | None:
    try:
        out = subprocess.check_output(
            ["lsof", "-nP", "-i", f"TCP:{port}", "-t"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        pids = [int(x) for x in out.splitlines() if x.strip().isdigit()]
        return pids[0] if pids else None
    except (subprocess.CalledProcessError, ValueError):
        return None


def get_process_info(pid: int) -> str:
    try:
        out = subprocess.check_output(
            ["ps", "-p", str(pid), "-o", "comm="],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return out
    except subprocess.CalledProcessError:
        return "unknown"


def kill_port_via_script(port: int) -> bool:
    """使用 kill_port.py 脚本关闭指定端口"""
    if not KILL_PORT_SCRIPT.exists():
        print(f"⚠️  未找到 kill_port.py: {KILL_PORT_SCRIPT}")
        return False

    try:
        result = subprocess.run(
            [sys.executable, str(KILL_PORT_SCRIPT), str(port), "-y"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(result.stdout, end="")
            return True
        else:
            print(result.stdout, end="")
            if result.stderr:
                print(result.stderr, end="")
            return False
    except Exception as e:
        print(f"⚠️  调用 kill_port.py 失败: {e}")
        return False


def handle_port_conflict(port: int) -> int:
    """端口冲突处理，返回最终要使用的端口"""
    pid = get_pid_on_port(port)
    proc_name = get_process_info(pid) if pid else "unknown"
    print(f"\n⚠️  端口 {port} 已被占用 (PID: {pid}, 进程: {proc_name})")
    print("请选择:")
    print(f"  1. 使用 kill_port.py 关闭端口 {port}")
    print(f"  2. 自动寻找空闲端口启动 (从 {port+1} 开始)")

    while True:
        choice = input("\n输入选择 [1/2]: ").strip()
        if choice == "1":
            if kill_port_via_script(port):
                if not port_in_use(port):
                    print(f"✅ 端口 {port} 已成功释放")
                    return port
                else:
                    print(f"⚠️  端口 {port} 仍被占用，请手动检查")
                    return port
            else:
                print("关闭失败，保留原端口")
                return port
        elif choice == "2":
            new_port = find_free_port(port + 1)
            print(f"将使用端口 {new_port}")
            return new_port
        else:
            print("请输入 1 或 2")


def ensure_port(port: int) -> int:
    """确保端口可用，冲突则交互处理"""
    if port_in_use(port):
        return handle_port_conflict(port)
    return port


# ============================
# 端口提取（从配置文件）
# ============================

def extract_vite_port(project_dir: Path) -> int:
    """从 vite.config.js/ts 中提取端口"""
    for name in ["vite.config.js", "vite.config.ts"]:
        cfg = project_dir / name
        if not cfg.exists():
            continue
        try:
            text = cfg.read_text(encoding="utf-8")
            m = re.search(r"port\s*:\s*(\d+)", text)
            if m:
                return int(m.group(1))
        except Exception:
            pass
    return DEFAULT_PORTS["vite"]


def extract_python_port(project_dir: Path) -> int:
    """从 Python 入口文件中提取端口"""
    for py in project_dir.rglob("*.py"):
        try:
            text = py.read_text(encoding="utf-8", errors="ignore")
            m = re.search(r"port\s*=\s*(\d+)", text)
            if m:
                return int(m.group(1))
        except Exception:
            pass
    return DEFAULT_PORTS["python"]


def extract_go_port(project_dir: Path) -> int:
    """从 Go 代码中提取端口"""
    for go in project_dir.rglob("*.go"):
        try:
            text = go.read_text(encoding="utf-8", errors="ignore")
            m = re.search(r":(\d{4,5})", text)
            if m:
                return int(m.group(1))
        except Exception:
            pass
    return DEFAULT_PORTS["go"]


# ============================
# 项目检测
# ============================

def list_projects():
    projects = []
    for entry in sorted(BASE_DIR.iterdir()):
        if not entry.is_dir() or entry.name.startswith(".") or entry.name == "requirement":
            continue
        info = detect_project(entry)
        if info:
            projects.append((entry.name, info["type"], info["desc"]))
    if not projects:
        print("未找到任何可启动的项目")
        return
    print(f"{'项目名':<40} {'类型':<20} {'说明'}")
    print("-" * 90)
    for name, ptype, desc in projects:
        print(f"{name:<40} {ptype:<20} {desc}")


def detect_project(folder: Path) -> dict | None:
    if (folder / "start.sh").exists():
        return {"type": "shell", "desc": "有 start.sh 启动脚本", "launch": "start_sh"}

    fe_dir = folder / "frontend"
    be_dir = folder / "backend"
    if fe_dir.is_dir() and be_dir.is_dir():
        return _detect_fullstack(folder, fe_dir, be_dir)

    if (folder / "index.html").exists() and not (folder / "package.json").exists():
        return {"type": "static", "desc": "纯静态 HTML 项目", "launch": "open_html"}

    pkg = folder / "package.json"
    if pkg.exists():
        return _detect_node_project(folder, pkg)

    py_info = _detect_python(folder)
    if py_info:
        return py_info

    if (folder / "go.mod").exists():
        return {"type": "go", "desc": "Go 项目 (go run)", "launch": "go_run"}

    if (folder / "Cargo.toml").exists():
        return {"type": "rust", "desc": "Rust 项目 (cargo run)", "launch": "cargo_run"}

    return None


def _detect_fullstack(folder: Path, fe_dir: Path, be_dir: Path) -> dict:
    parts = []
    if (be_dir / "go.mod").exists():
        parts.append(("go", "Go"))
    elif (be_dir / "requirements.txt").exists() or (be_dir / "app" / "main.py").exists() or (be_dir / "run.py").exists():
        parts.append(("python", "Python"))
    elif (be_dir / "package.json").exists():
        parts.append(("node", "Node.js"))

    fe_pkg = fe_dir / "package.json"
    if fe_pkg.exists():
        parts.append(("vite", "Vite"))
    elif (fe_dir / "index.html").exists():
        parts.append(("static", "静态HTML"))

    desc = "全栈: " + " + ".join(p[1] for p in parts) if parts else "全栈项目"
    return {"type": "fullstack", "desc": desc, "launch": "fullstack"}


def _detect_node_project(folder: Path, pkg: Path) -> dict:
    try:
        data = json.loads(pkg.read_text(encoding="utf-8"))
    except Exception:
        return {"type": "node", "desc": "Node.js 项目", "launch": "npm_start"}

    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    scripts = data.get("scripts", {})

    if "vite" in deps or any(f.name.startswith("vite.config") for f in folder.iterdir() if f.is_file()):
        return {"type": "vite", "desc": "Vite 前端项目", "launch": "npm_dev"}

    if "dev" in scripts:
        return {"type": "node", "desc": "Node.js 项目 (npm run dev)", "launch": "npm_dev"}

    if "start" in scripts:
        return {"type": "node", "desc": "Node.js 项目 (npm start)", "launch": "npm_start"}

    if data.get("main"):
        return {"type": "node", "desc": "Node.js 项目 (node main)", "launch": "node_main"}

    return {"type": "node", "desc": "Node.js 项目", "launch": "npm_install_dev"}


def _detect_python(folder: Path) -> dict | None:
    entry_files = ["app.py", "main.py", "run.py", "server.py", "manage.py"]
    for f in entry_files:
        if (folder / f).exists():
            return {"type": "python", "desc": f"Python 项目 (python {f})", "launch": "python_run", "entry": f}

    if (folder / "requirements.txt").exists():
        return {"type": "python", "desc": "Python 项目 (有 requirements.txt)", "launch": "python_run", "entry": None}

    for py in folder.rglob("*.py"):
        try:
            content = py.read_text(encoding="utf-8", errors="ignore")
            if "uvicorn" in content or "FastAPI" in content or "flask" in content.lower():
                return {"type": "python", "desc": f"Python Web 项目 ({py.name})", "launch": "python_run", "entry": str(py.relative_to(folder))}
        except Exception:
            continue

    return None


# ============================
# Trae 终端中执行命令
# ============================

def trae_open_terminal(folder: Path, commands: list[str], preview_urls: list[str] | None = None):
    """
    在当前 Trae 窗口中：打开终端执行命令，然后在内置浏览器中打开预览。
    """
    import time

    # 1. 在 Trae 终端面板中输入命令
    print(f"\n[1/2] 在 Trae 终端中执行命令...")
    _send_to_trae_terminal(commands)

    # 2. 等待服务启动后在内置浏览器中打开预览
    if preview_urls:
        print(f"[2/2] 等待服务启动后在内置浏览器中打开预览...")
        for url in preview_urls:
            _open_in_trae_browser(url, wait_seconds=3)
    else:
        print("[2/2] 无预览 URL，跳过内置浏览器")


def _send_to_trae_terminal(commands: list[str]):
    """通过 AppleScript + 键盘模拟在 Trae 终端中输入命令"""

    import time
    try:
        import pyautogui
        import pyperclip
    except ImportError:
        print("需要 pyautogui 和 pyperclip，正在安装...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyautogui", "pyperclip", "-q"])
        import pyautogui
        import pyperclip

    # 激活 Trae 窗口
    subprocess.run(
        ["osascript", "-e", 'tell application "Trae CN" to activate'],
        check=True
    )
    time.sleep(0.8)

    # 打开终端面板: Ctrl+` (VS Code / Trae 默认快捷键)
    pyautogui.hotkey('ctrl', '`')
    time.sleep(0.8)

    # 逐条输入命令
    for i, cmd in enumerate(commands):
        print(f"  [{i+1}/{len(commands)}] {cmd}")

        # 如果有多条命令，后续用快捷键新建终端
        if i > 0:
            # 打开新终端: Ctrl+Shift+`
            pyautogui.hotkey('ctrl', 'shift', '`')
            time.sleep(0.8)

        # 用剪贴板粘贴命令（避免键盘模拟的编码问题）
        pyperclip.copy(cmd)
        pyautogui.hotkey('command', 'v')
        time.sleep(0.3)
        pyautogui.press('enter')
        time.sleep(0.5)

    print("\n✅ 命令已发送到 Trae 终端！")


def _open_in_trae_browser(url: str, wait_seconds: int = 3):
    """在 Trae 内置浏览器 (Simple Browser) 中打开 URL

    流程: 等 wait_seconds 让服务启动 → 通过命令面板打开 Simple Browser → 粘贴 URL
    """
    import time
    try:
        import pyautogui
        import pyperclip
    except ImportError:
        import pyautogui
        import pyperclip

    print(f"  等待 {wait_seconds}s 让服务就绪...")
    time.sleep(wait_seconds)

    # 激活 Trae
    subprocess.run(
        ["osascript", "-e", 'tell application "Trae CN" to activate'],
        check=True
    )
    time.sleep(0.5)

    # 方式: 通过 URI scheme 打开 Simple Browser
    # trae-cn://workbench.action.simpleBrowser.show?url=<encoded_url>
    encoded_url = quote(url, safe='')
    uri = f"trae-cn://workbench.action.simpleBrowser.show?url={encoded_url}"

    result = subprocess.run(["open", uri], capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  ✅ 内置浏览器已打开: {url}")
    else:
        # fallback: 用命令面板手动打开
        print(f"  URI scheme 失败，尝试命令面板方式...")
        pyautogui.hotkey('command', 'shift', 'p')
        time.sleep(0.8)
        pyperclip.copy("Simple Browser: Show")
        pyautogui.hotkey('command', 'v')
        time.sleep(0.5)
        pyautogui.press('enter')
        time.sleep(1.0)
        # 在地址栏粘贴 URL
        pyautogui.hotkey('command', 'a')
        pyperclip.copy(url)
        pyautogui.hotkey('command', 'v')
        pyautogui.press('enter')
        print(f"  ✅ 内置浏览器已打开: {url}")


# ============================
# 构建启动命令
# ============================

def build_launch_commands(project_dir: Path, info: dict) -> tuple[list[str], list[str]]:
    """根据项目类型构建终端命令列表和预览 URL 列表，处理端口冲突

    返回: (commands, preview_urls)
      - commands: 在终端中执行的命令
      - preview_urls: 启动后在 Trae 内置浏览器中打开的 URL
    """

    method = info["launch"]
    commands = []
    preview_urls = []

    if method == "start_sh":
        commands.append(f'cd "{project_dir}" && bash start.sh')

    elif method == "open_html":
        # 静态 HTML: 用 python3 -m http.server 启一个本地服务器，在内置浏览器中打开
        port = ensure_port(DEFAULT_PORTS["python"])
        commands.append(f'cd "{project_dir}" && python3 -m http.server {port}')
        preview_urls.append(f"http://localhost:{port}/index.html")

    elif method == "npm_dev":
        port = extract_vite_port(project_dir)
        port = ensure_port(port)
        install = "npm install && " if not (project_dir / "node_modules").exists() else ""
        commands.append(f'cd "{project_dir}" && {install}npx vite --port {port}')
        preview_urls.append(f"http://localhost:{port}")

    elif method == "npm_start":
        if not (project_dir / "node_modules").exists():
            commands.append(f'cd "{project_dir}" && npm install && npm start')
        else:
            commands.append(f'cd "{project_dir}" && npm start')
        # npm start 的端口无法统一推断，不自动预览

    elif method == "npm_install_dev":
        if not (project_dir / "node_modules").exists():
            commands.append(f'cd "{project_dir}" && npm install && npm run dev')
        else:
            commands.append(f'cd "{project_dir}" && npm run dev')

    elif method == "node_main":
        main = json.loads((project_dir / "package.json").read_text()).get("main", "index.js")
        if not (project_dir / "node_modules").exists():
            commands.append(f'cd "{project_dir}" && npm install && node {main}')
        else:
            commands.append(f'cd "{project_dir}" && node {main}')

    elif method == "python_run":
        entry = info.get("entry")
        if entry:
            port = extract_python_port(project_dir)
            port = ensure_port(port)
            cmd = f'cd "{project_dir}" && python3 {entry}'
            try:
                content = (project_dir / entry).read_text(encoding="utf-8", errors="ignore")
                if "uvicorn" in content:
                    cmd = f'cd "{project_dir}" && uvicorn app.main:app --reload --port {port}'
                    preview_urls.append(f"http://localhost:{port}")
            except Exception:
                pass
            commands.append(cmd)
        else:
            commands.append(f'cd "{project_dir}" && python3 main.py 2>/dev/null || python3 app.py 2>/dev/null || echo "未找到入口文件"')

    elif method == "go_run":
        be_dir = project_dir
        if (project_dir / "backend" / "go.mod").exists():
            be_dir = project_dir / "backend"
        port = extract_go_port(be_dir)
        port = ensure_port(port)
        commands.append(f'cd "{be_dir}" && PORT={port} go run .')
        preview_urls.append(f"http://localhost:{port}")

    elif method == "cargo_run":
        commands.append(f'cd "{project_dir}" && cargo run')

    elif method == "fullstack":
        commands, preview_urls = _build_fullstack_commands(project_dir)

    return commands, preview_urls


def _build_fullstack_commands(project_dir: Path) -> tuple[list[str], list[str]]:
    """为全栈项目构建前后端命令，分别处理端口

    返回: (commands, preview_urls)
    """
    fe_dir = project_dir / "frontend"
    be_dir = project_dir / "backend"
    commands = []
    preview_urls = []

    # 后端
    if (be_dir / "go.mod").exists():
        port = extract_go_port(be_dir)
        port = ensure_port(port)
        commands.append(f'cd "{be_dir}" && PORT={port} go run .')
        preview_urls.append(f"http://localhost:{port}")

    elif (be_dir / "requirements.txt").exists() or (be_dir / "app" / "main.py").exists() or (be_dir / "run.py").exists():
        port = extract_python_port(be_dir)
        port = ensure_port(port)
        venv_activate = ""
        if (be_dir / "venv" / "bin" / "activate").exists():
            venv_activate = "source venv/bin/activate && "
        commands.append(f'cd "{be_dir}" && {venv_activate}uvicorn app.main:app --reload --port {port}')
        preview_urls.append(f"http://localhost:{port}")

    elif (be_dir / "package.json").exists():
        install = "npm install && " if not (be_dir / "node_modules").exists() else ""
        commands.append(f'cd "{be_dir}" && {install}npm start')

    # 前端
    if (fe_dir / "package.json").exists():
        port = extract_vite_port(fe_dir)
        port = ensure_port(port)
        install = "npm install && " if not (fe_dir / "node_modules").exists() else ""
        commands.append(f'cd "{fe_dir}" && {install}npx vite --port {port}')
        preview_urls.append(f"http://localhost:{port}")
    elif (fe_dir / "index.html").exists():
        # 全栈项目中的静态前端，也用 http.server
        port = ensure_port(DEFAULT_PORTS["python"])
        commands.append(f'cd "{fe_dir}" && python3 -m http.server {port}')
        preview_urls.append(f"http://localhost:{port}/index.html")

    return commands, preview_urls


# ============================
# 文件夹解析
# ============================

def resolve_folder(name: str) -> Path | None:
    p = Path(name)
    if p.is_dir() and p.exists():
        return p.resolve()

    p = BASE_DIR / name
    if p.is_dir():
        return p

    matches = [d for d in BASE_DIR.iterdir() if d.is_dir() and name.lower() in d.name.lower()]
    if len(matches) == 1:
        print(f"[模糊匹配] {name} → {matches[0].name}")
        return matches[0]
    elif len(matches) > 1:
        print(f"[模糊匹配] 找到多个匹配:")
        for m in matches:
            print(f"  - {m.name}")
        return None

    return None


# ============================
# 主流程
# ============================

def main():
    if len(sys.argv) < 2:
        print("用法: python3 run_project.py <项目文件夹名或路径>")
        print("      python3 run_project.py --list")
        print()
        print("示例:")
        print("  python3 run_project.py braille-ocr")
        print("  python3 run_project.py 2d-platformer-game")
        print("  python3 run_project.py --list")
        sys.exit(1)

    arg = sys.argv[1]

    if arg in ("--list", "-l"):
        list_projects()
        return

    folder = resolve_folder(arg)
    if not folder:
        print(f"错误: 找不到项目文件夹 '{arg}'")
        print(f"使用 --list 查看所有可用项目")
        sys.exit(1)

    info = detect_project(folder)
    if not info:
        print(f"错误: 无法识别项目 '{folder.name}' 的启动方式")
        print(f"该项目没有 index.html / package.json / requirements.txt / go.mod / Cargo.toml 等入口文件")
        sys.exit(1)

    print(f"\n项目: {folder.name}")
    print(f"类型: {info['desc']}")

    # 构建启动命令（含端口冲突处理）
    commands, preview_urls = build_launch_commands(folder, info)

    if not commands:
        if preview_urls:
            for url in preview_urls:
                _open_in_trae_browser(url, wait_seconds=0)
        return

    print(f"\n即将在 Trae 终端中启动，共 {len(commands)} 个服务:")
    for i, cmd in enumerate(commands, 1):
        short = cmd.replace(f'cd "{folder}", ', '').replace('cd "', '').replace('" && ', ' → ')
        print(f"  [{i}] {short}")

    if preview_urls:
        print(f"\n启动后将在 Trae 内置浏览器中打开:")
        for url in preview_urls:
            print(f"  → {url}")

    input("\n按 Enter 启动，Ctrl+C 取消...")

    # 在 Trae 中打开并发送命令
    trae_open_terminal(folder, commands, preview_urls)


if __name__ == "__main__":
    main()
