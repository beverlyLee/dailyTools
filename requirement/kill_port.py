#!/usr/bin/env python3
"""
端口清除工具：可批量清除指定端口，可范围清除

用法:
    python3 kill_port.py 8080
    python3 kill_port.py 8080 8081 8082
    python3 kill_port.py 8080,8081,8082
    python3 kill_port.py 3000-3010
    python3 kill_port.py 8080 3000-3010 9000,9001
"""

import argparse
import os
import signal
import subprocess
import sys


def get_pids_on_port(port: int) -> list[int]:
    try:
        out = subprocess.check_output(
            ["lsof", "-nP", "-i", f"TCP:{port}", "-t"],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return [int(x) for x in out.splitlines() if x.strip().isdigit()]
    except subprocess.CalledProcessError:
        return []


def get_process_info(pid: int) -> str:
    try:
        out = subprocess.check_output(
            ["ps", "-p", str(pid), "-o", "pid=,comm="],
            stderr=subprocess.DEVNULL
        ).decode().strip()
        return out
    except subprocess.CalledProcessError:
        return f"{pid} (已不存在)"


def parse_port_inputs(inputs: list[str]) -> list[int]:
    ports = set()

    for item in inputs:
        item = item.strip()
        if not item:
            continue

        if "-" in item and "," not in item:
            try:
                start, end = item.split("-")
                start_port = int(start.strip())
                end_port = int(end.strip())
                if start_port > end_port:
                    start_port, end_port = end_port, start_port
                for p in range(start_port, end_port + 1):
                    ports.add(p)
                continue
            except ValueError:
                pass

        if "," in item:
            for part in item.split(","):
                part = part.strip()
                if part:
                    try:
                        ports.add(int(part))
                    except ValueError:
                        print(f"⚠️  忽略无效端口: {part}")
            continue

        try:
            ports.add(int(item))
        except ValueError:
            print(f"⚠️  忽略无效端口: {item}")

    return sorted(ports)


def kill_process(pid: int, force: bool = False) -> bool:
    sig = signal.SIGKILL if force else signal.SIGTERM
    try:
        os.kill(pid, sig)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        try:
            cmd = ["sudo", "kill", "-9", str(pid)] if force else ["sudo", "kill", str(pid)]
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False


def main():
    parser = argparse.ArgumentParser(
        description="端口清除工具：支持单个、批量、范围清除",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python3 kill_port.py 8080              清除单个端口
  python3 kill_port.py 8080 8081         清除多个端口
  python3 kill_port.py 8080,8081,8082    逗号分隔批量清除
  python3 kill_port.py 3000-3010         清除范围端口
  python3 kill_port.py 8080 3000-3010    混合模式
  python3 kill_port.py 8080 -y           直接清除，不确认
  python3 kill_port.py 8080 -f           强制 kill (-9)
        """
    )
    parser.add_argument(
        "ports",
        nargs="+",
        help="端口号（支持单个、多个、逗号分隔、范围）"
    )
    parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="直接清除，不询问确认"
    )
    parser.add_argument(
        "-f", "--force",
        action="store_true",
        help="强制终止进程 (SIGKILL / kill -9)"
    )
    parser.add_argument(
        "-l", "--list",
        action="store_true",
        help="仅列出占用进程，不清除"
    )

    args = parser.parse_args()

    target_ports = parse_port_inputs(args.ports)
    if not target_ports:
        print("❌ 未找到有效的端口号")
        sys.exit(1)

    print(f"🔍 检查端口: {', '.join(str(p) for p in target_ports)}")
    print("-" * 60)

    port_info = []
    for port in target_ports:
        pids = get_pids_on_port(port)
        if pids:
            for pid in pids:
                info = get_process_info(pid)
                port_info.append((port, pid, info))
                print(f"  端口 {port:<5} → PID {info}")
        else:
            print(f"  端口 {port:<5} → 未占用")

    if not port_info:
        print("\n✅ 所有目标端口均未被占用")
        sys.exit(0)

    if args.list:
        return

    if not args.yes:
        print("-" * 60)
        confirm = input(f"\n确认终止以上 {len(port_info)} 个进程? [y/N]: ").strip().lower()
        if confirm not in ("y", "yes"):
            print("已取消")
            sys.exit(0)

    sig_name = "SIGKILL (-9)" if args.force else "SIGTERM"
    print(f"\n🔪 正在使用 {sig_name} 终止进程...")

    success = 0
    failed = 0
    for port, pid, info in port_info:
        if kill_process(pid, force=args.force):
            print(f"  ✅ 端口 {port}: PID {pid} 已终止")
            success += 1
        else:
            print(f"  ❌ 端口 {port}: PID {pid} 终止失败")
            failed += 1

    print("\n" + "=" * 40)
    print(f"完成: 成功 {success}, 失败 {failed}")
    if failed > 0:
        print("提示: 可尝试使用 -f 参数强制终止，或使用 sudo")


if __name__ == "__main__":
    main()
