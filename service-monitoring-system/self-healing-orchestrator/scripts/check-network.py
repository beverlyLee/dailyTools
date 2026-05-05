#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
网络连接检查脚本
用法: python3 check-network.py [--verbose]
"""

import sys
import os
import socket
import subprocess
import argparse
import platform
from datetime import datetime
from typing import List, Dict, Any


class NetworkChecker:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: List[Dict[str, Any]] = []
        
    def log(self, level: str, message: str):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] [{level.upper()}] {message}")
        
    def check_dns_resolution(self, hostname: str = "www.baidu.com") -> Dict[str, Any]:
        result = {
            "check": "dns_resolution",
            "hostname": hostname,
            "success": False,
            "error": None,
            "ip": None,
            "duration_ms": 0
        }
        
        start_time = datetime.now()
        try:
            if self.verbose:
                self.log("info", f"检查 DNS 解析: {hostname}")
            
            ip = socket.gethostbyname(hostname)
            result["ip"] = ip
            result["success"] = True
            
            if self.verbose:
                self.log("info", f"DNS 解析成功: {hostname} -> {ip}")
                
        except socket.gaierror as e:
            result["error"] = f"DNS 解析失败: {str(e)}"
            self.log("error", result["error"])
        except Exception as e:
            result["error"] = f"未知错误: {str(e)}"
            self.log("error", result["error"])
            
        result["duration_ms"] = int((datetime.now() - start_time).total_seconds() * 1000)
        return result
    
    def check_ping(self, host: str = "8.8.8.8", count: int = 3) -> Dict[str, Any]:
        result = {
            "check": "ping",
            "host": host,
            "success": False,
            "error": None,
            "packet_loss": 100.0,
            "avg_latency_ms": 0,
            "duration_ms": 0
        }
        
        start_time = datetime.now()
        
        try:
            if self.verbose:
                self.log("info", f"检查 ping 连通性: {host}")
            
            system = platform.system().lower()
            
            if system == "windows":
                cmd = ["ping", "-n", str(count), "-w", "1000", host]
            elif system == "darwin":
                cmd = ["ping", "-c", str(count), "-W", "1", host]
            else:
                cmd = ["ping", "-c", str(count), "-W", "1", host]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate(timeout=count * 2 + 5)
            
            if process.returncode == 0:
                result["success"] = True
                
                if system == "windows":
                    if "丢失 = 0" in stdout:
                        result["packet_loss"] = 0.0
                    else:
                        result["packet_loss"] = 100.0
                else:
                    if "0% packet loss" in stdout or "0.0% packet loss" in stdout:
                        result["packet_loss"] = 0.0
                    else:
                        for line in stdout.split('\n'):
                            if "packet loss" in line:
                                import re
                                match = re.search(r'(\d+\.?\d*)% packet loss', line)
                                if match:
                                    result["packet_loss"] = float(match.group(1))
                                    break
                
                if self.verbose:
                    self.log("info", f"Ping 成功，丢包率: {result['packet_loss']}%")
            else:
                result["error"] = f"Ping 失败，返回码: {process.returncode}"
                if self.verbose:
                    self.log("warn", result["error"])
                    
        except subprocess.TimeoutExpired:
            result["error"] = "Ping 超时"
            self.log("error", result["error"])
        except Exception as e:
            result["error"] = f"执行错误: {str(e)}"
            self.log("error", result["error"])
            
        result["duration_ms"] = int((datetime.now() - start_time).total_seconds() * 1000)
        return result
    
    def check_http_connection(self, url: str = "https://www.baidu.com", timeout: int = 10) -> Dict[str, Any]:
        import urllib.request
        import urllib.error
        
        result = {
            "check": "http_connection",
            "url": url,
            "success": False,
            "error": None,
            "status_code": None,
            "response_time_ms": 0,
            "duration_ms": 0
        }
        
        start_time = datetime.now()
        
        try:
            if self.verbose:
                self.log("info", f"检查 HTTP 连接: {url}")
            
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Network Checker)'}
            )
            
            resp_start = datetime.now()
            with urllib.request.urlopen(req, timeout=timeout) as response:
                result["status_code"] = response.status
                result["success"] = response.status == 200
                
            result["response_time_ms"] = int((datetime.now() - resp_start).total_seconds() * 1000)
            
            if self.verbose:
                if result["success"]:
                    self.log("info", f"HTTP 连接成功，状态码: {result['status_code']}, 响应时间: {result['response_time_ms']}ms")
                else:
                    self.log("warn", f"HTTP 连接返回非 200 状态码: {result['status_code']}")
                    
        except urllib.error.HTTPError as e:
            result["status_code"] = e.code
            result["error"] = f"HTTP 错误: {e.code}"
            self.log("error", result["error"])
        except urllib.error.URLError as e:
            result["error"] = f"URL 错误: {str(e.reason)}"
            self.log("error", result["error"])
        except socket.timeout:
            result["error"] = "HTTP 连接超时"
            self.log("error", result["error"])
        except Exception as e:
            result["error"] = f"未知错误: {str(e)}"
            self.log("error", result["error"])
            
        result["duration_ms"] = int((datetime.now() - start_time).total_seconds() * 1000)
        return result
    
    def check_port_connection(self, host: str = "www.baidu.com", port: int = 443, timeout: int = 5) -> Dict[str, Any]:
        result = {
            "check": "port_connection",
            "host": host,
            "port": port,
            "success": False,
            "error": None,
            "duration_ms": 0
        }
        
        start_time = datetime.now()
        
        try:
            if self.verbose:
                self.log("info", f"检查端口连接: {host}:{port}")
            
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            
            result_start = datetime.now()
            sock.connect((host, port))
            sock.close()
            
            result["success"] = True
            
            if self.verbose:
                self.log("info", f"端口连接成功: {host}:{port}")
                
        except socket.timeout:
            result["error"] = f"连接超时: {host}:{port}"
            self.log("error", result["error"])
        except ConnectionRefusedError:
            result["error"] = f"连接被拒绝: {host}:{port}"
            self.log("error", result["error"])
        except socket.gaierror:
            result["error"] = f"无法解析主机: {host}"
            self.log("error", result["error"])
        except Exception as e:
            result["error"] = f"连接错误: {str(e)}"
            self.log("error", result["error"])
            
        result["duration_ms"] = int((datetime.now() - start_time).total_seconds() * 1000)
        return result
    
    def run_all_checks(self) -> Dict[str, Any]:
        self.log("info", "========================================")
        self.log("info", "  网络连接检查")
        self.log("info", "========================================")
        self.log("info", f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.log("info", f"系统: {platform.system()} {platform.release()}")
        self.log("info", "")
        
        all_checks = []
        
        self.log("info", "--- DNS 解析检查 ---")
        all_checks.append(self.check_dns_resolution("www.baidu.com"))
        all_checks.append(self.check_dns_resolution("www.google.com"))
        self.log("info", "")
        
        self.log("info", "--- Ping 连通性检查 ---")
        all_checks.append(self.check_ping("8.8.8.8"))
        all_checks.append(self.check_ping("114.114.114.114"))
        self.log("info", "")
        
        self.log("info", "--- HTTP 连接检查 ---")
        all_checks.append(self.check_http_connection("https://www.baidu.com"))
        all_checks.append(self.check_http_connection("https://www.github.com"))
        self.log("info", "")
        
        self.log("info", "--- 端口连接检查 ---")
        all_checks.append(self.check_port_connection("www.baidu.com", 443))
        all_checks.append(self.check_port_connection("www.baidu.com", 80))
        self.log("info", "")
        
        passed = sum(1 for c in all_checks if c["success"])
        total = len(all_checks)
        
        self.log("info", "========================================")
        self.log("info", "  检查结果汇总")
        self.log("info", "========================================")
        self.log("info", f"总检查数: {total}")
        self.log("info", f"通过: {passed}")
        self.log("info", f"失败: {total - passed}")
        self.log("info", f"通过率: {passed * 100 / total:.1f}%")
        self.log("info", "")
        
        for check in all_checks:
            status = "✓" if check["success"] else "✗"
            self.log("info", f"  {status} {check['check']}: {check.get('hostname') or check.get('host') or check.get('url') or check.get('port')}")
            
            if not check["success"] and check["error"]:
                self.log("error", f"      错误: {check['error']}")
        
        self.log("info", "")
        self.log("info", f"完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return {
            "timestamp": datetime.now().isoformat(),
            "system": {
                "platform": platform.system(),
                "release": platform.release(),
                "node": platform.node()
            },
            "summary": {
                "total": total,
                "passed": passed,
                "failed": total - passed,
                "success_rate": passed / total if total > 0 else 0
            },
            "checks": all_checks
        }


def main():
    parser = argparse.ArgumentParser(description="网络连接检查脚本")
    parser.add_argument("--verbose", "-v", action="store_true", help="显示详细输出")
    parser.add_argument("--output", "-o", type=str, help="输出 JSON 文件路径")
    
    args = parser.parse_args()
    
    checker = NetworkChecker(verbose=args.verbose)
    result = checker.run_all_checks()
    
    if args.output:
        import json
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        checker.log("info", f"结果已保存到: {args.output}")
    
    if result["summary"]["passed"] < result["summary"]["total"]:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
