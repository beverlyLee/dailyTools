"""
系统信息采集模块
提供跨平台的系统信息查询功能
"""

import os
import platform
import socket
from typing import Dict, Any, Optional, List
from datetime import datetime

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False


class SystemInfo:
    """
    系统信息采集器
    
    提供跨平台的系统信息查询，支持多种输出格式
    """
    
    def __init__(self):
        self._os_info = self._get_os_info()
        self._hardware_info = self._get_hardware_info()
        self._network_info = self._get_network_info()
    
    def _get_os_info(self) -> Dict[str, Any]:
        """
        获取操作系统信息
        
        Returns:
            Dict[str, Any]: 操作系统信息
        """
        info = {}
        
        info['system'] = platform.system()
        info['node'] = platform.node()
        info['release'] = platform.release()
        info['version'] = platform.version()
        info['machine'] = platform.machine()
        info['processor'] = platform.processor()
        
        try:
            info['architecture'] = platform.architecture()[0]
        except Exception:
            info['architecture'] = 'Unknown'
        
        if info['system'] == 'Linux':
            info = self._get_linux_specific_info(info)
        elif info['system'] == 'Darwin':
            info = self._get_macos_specific_info(info)
        elif info['system'] == 'Windows':
            info = self._get_windows_specific_info(info)
        
        return info
    
    def _get_linux_specific_info(self, info: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取 Linux 特定信息
        
        Args:
            info: 基础信息字典
            
        Returns:
            Dict[str, Any]: 更新后的信息字典
        """
        info['os_name'] = 'Linux'
        
        distro_info = {}
        
        if PSUTIL_AVAILABLE:
            try:
                boot_time = psutil.boot_time()
                info['boot_time'] = datetime.fromtimestamp(boot_time).strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                pass
        
        os_release_path = '/etc/os-release'
        if os.path.exists(os_release_path):
            try:
                with open(os_release_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if '=' in line:
                            key, value = line.split('=', 1)
                            value = value.strip('"\'')
                            distro_info[key] = value
                
                if 'PRETTY_NAME' in distro_info:
                    info['distro_name'] = distro_info['PRETTY_NAME']
                    info['os_name'] = distro_info['PRETTY_NAME']
                elif 'NAME' in distro_info:
                    info['distro_name'] = distro_info['NAME']
                    info['os_name'] = distro_info['NAME']
                    
            except Exception:
                pass
        
        if 'distro_name' not in info:
            lsb_release_path = '/etc/lsb-release'
            if os.path.exists(lsb_release_path):
                try:
                    with open(lsb_release_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if '=' in line:
                                key, value = line.split('=', 1)
                                if key == 'DISTRIB_DESCRIPTION':
                                    info['distro_name'] = value.strip('"\'')
                                    info['os_name'] = value.strip('"\'')
                except Exception:
                    pass
        
        return info
    
    def _get_macos_specific_info(self, info: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取 macOS 特定信息
        
        Args:
            info: 基础信息字典
            
        Returns:
            Dict[str, Any]: 更新后的信息字典
        """
        info['os_name'] = 'macOS'
        
        mac_version = platform.mac_ver()
        info['mac_version'] = mac_version[0]
        info['mac_release'] = mac_version[1]
        info['mac_machine'] = mac_version[2]
        
        if mac_version[0]:
            version_parts = mac_version[0].split('.')
            if len(version_parts) >= 2:
                major = int(version_parts[0])
                minor = int(version_parts[1])
                
                macos_names = {
                    (10, 15): 'Catalina',
                    (11, 0): 'Big Sur',
                    (11, 1): 'Big Sur',
                    (12, 0): 'Monterey',
                    (12, 1): 'Monterey',
                    (13, 0): 'Ventura',
                    (13, 1): 'Ventura',
                    (14, 0): 'Sonoma',
                    (14, 1): 'Sonoma',
                    (15, 0): 'Sequoia',
                    (15, 1): 'Sequoia',
                }
                
                name = macos_names.get((major, minor), '')
                if name:
                    info['os_name'] = f'macOS {name} {mac_version[0]}'
                else:
                    info['os_name'] = f'macOS {mac_version[0]}'
        
        if PSUTIL_AVAILABLE:
            try:
                boot_time = psutil.boot_time()
                info['boot_time'] = datetime.fromtimestamp(boot_time).strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                pass
        
        return info
    
    def _get_windows_specific_info(self, info: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取 Windows 特定信息
        
        Args:
            info: 基础信息字典
            
        Returns:
            Dict[str, Any]: 更新后的信息字典
        """
        info['os_name'] = 'Windows'
        
        win_version = platform.win32_ver()
        info['windows_version'] = win_version[0]
        info['windows_release'] = win_version[1]
        info['windows_csd'] = win_version[2]
        info['windows_ptype'] = win_version[3]
        
        if win_version[0]:
            version_map = {
                '10': 'Windows 10',
                '11': 'Windows 11',
                '8': 'Windows 8',
                '8.1': 'Windows 8.1',
                '7': 'Windows 7',
                'Vista': 'Windows Vista',
                'XP': 'Windows XP',
            }
            
            for key, name in version_map.items():
                if key in win_version[0]:
                    info['os_name'] = name
                    break
        
        if PSUTIL_AVAILABLE:
            try:
                boot_time = psutil.boot_time()
                info['boot_time'] = datetime.fromtimestamp(boot_time).strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                pass
        
        return info
    
    def _get_hardware_info(self) -> Dict[str, Any]:
        """
        获取硬件信息
        
        Returns:
            Dict[str, Any]: 硬件信息
        """
        info = {}
        
        info['cpu_brand'] = platform.processor()
        info['cpu_count'] = os.cpu_count() or 1
        
        if PSUTIL_AVAILABLE:
            try:
                cpu_freq = psutil.cpu_freq()
                if cpu_freq:
                    info['cpu_freq_current'] = cpu_freq.current
                    info['cpu_freq_min'] = cpu_freq.min
                    info['cpu_freq_max'] = cpu_freq.max
                    info['cpu_freq'] = f"{cpu_freq.current:.2f} MHz"
            except Exception:
                pass
            
            try:
                cpu_count_logical = psutil.cpu_count(logical=True)
                cpu_count_physical = psutil.cpu_count(logical=False)
                info['cpu_count_logical'] = cpu_count_logical
                info['cpu_count_physical'] = cpu_count_physical
                if cpu_count_physical and cpu_count_logical:
                    info['cpu_count'] = f"{cpu_count_physical} 物理核心 / {cpu_count_logical} 逻辑核心"
                elif cpu_count_logical:
                    info['cpu_count'] = f"{cpu_count_logical} 核心"
            except Exception:
                pass
            
            try:
                virtual_memory = psutil.virtual_memory()
                info['memory_total'] = virtual_memory.total
                info['memory_available'] = virtual_memory.available
                info['memory_used'] = virtual_memory.used
                info['memory_percent'] = virtual_memory.percent
                info['memory_total_human'] = self._bytes_to_human(virtual_memory.total)
                info['memory_used_human'] = self._bytes_to_human(virtual_memory.used)
                info['memory_available_human'] = self._bytes_to_human(virtual_memory.available)
            except Exception:
                pass
            
            try:
                swap = psutil.swap_memory()
                info['swap_total'] = swap.total
                info['swap_used'] = swap.used
                info['swap_percent'] = swap.percent
                info['swap_total_human'] = self._bytes_to_human(swap.total)
                info['swap_used_human'] = self._bytes_to_human(swap.used)
            except Exception:
                pass
        
        info['gpu_info'] = self._get_gpu_info()
        
        return info
    
    def _get_gpu_info(self) -> List[Dict[str, Any]]:
        """
        获取显卡信息
        
        Returns:
            List[Dict[str, Any]]: 显卡信息列表
        """
        gpus = []
        
        if PSUTIL_AVAILABLE:
            try:
                system = platform.system()
                
                if system == 'Linux':
                    gpus.extend(self._get_linux_gpu_info())
                elif system == 'Darwin':
                    gpus.extend(self._get_macos_gpu_info())
                elif system == 'Windows':
                    gpus.extend(self._get_windows_gpu_info())
                    
            except Exception:
                pass
        
        if not gpus:
            gpus.append({'name': 'Unknown', 'vendor': 'Unknown', 'memory': 'Unknown'})
        
        return gpus
    
    def _get_linux_gpu_info(self) -> List[Dict[str, Any]]:
        """
        获取 Linux 显卡信息
        
        Returns:
            List[Dict[str, Any]]: 显卡信息列表
        """
        gpus = []
        
        try:
            import subprocess
            
            result = subprocess.run(
                ['lspci'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    line_lower = line.lower()
                    if 'vga' in line_lower or '3d' in line_lower or 'display' in line_lower:
                        vendor = 'Unknown'
                        name = line
                        
                        if 'nvidia' in line_lower:
                            vendor = 'NVIDIA'
                        elif 'amd' in line_lower or 'ati' in line_lower:
                            vendor = 'AMD'
                        elif 'intel' in line_lower:
                            vendor = 'Intel'
                        
                        gpus.append({
                            'name': name,
                            'vendor': vendor,
                            'memory': 'Unknown'
                        })
                        
        except Exception:
            pass
        
        return gpus
    
    def _get_macos_gpu_info(self) -> List[Dict[str, Any]]:
        """
        获取 macOS 显卡信息
        
        Returns:
            List[Dict[str, Any]]: 显卡信息列表
        """
        gpus = []
        
        try:
            import subprocess
            
            result = subprocess.run(
                ['system_profiler', 'SPDisplaysDataType'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                current_gpu = {}
                for line in result.stdout.split('\n'):
                    line = line.strip()
                    
                    if 'Chipset Model' in line or '芯片组型号' in line:
                        if current_gpu.get('name'):
                            gpus.append(current_gpu)
                            current_gpu = {}
                        
                        name = line.split(':', 1)[1].strip() if ':' in line else line
                        current_gpu['name'] = name
                        current_gpu['vendor'] = 'Unknown'
                        
                        name_lower = name.lower()
                        if 'nvidia' in name_lower:
                            current_gpu['vendor'] = 'NVIDIA'
                        elif 'amd' in name_lower or 'radeon' in name_lower:
                            current_gpu['vendor'] = 'AMD'
                        elif 'intel' in name_lower:
                            current_gpu['vendor'] = 'Intel'
                        elif 'apple' in name_lower or 'm1' in name_lower or 'm2' in name_lower or 'm3' in name_lower:
                            current_gpu['vendor'] = 'Apple'
                    
                    if 'VRAM' in line or '显存' in line:
                        memory = line.split(':', 1)[1].strip() if ':' in line else line
                        current_gpu['memory'] = memory
                
                if current_gpu.get('name'):
                    gpus.append(current_gpu)
                    
        except Exception:
            pass
        
        return gpus
    
    def _get_windows_gpu_info(self) -> List[Dict[str, Any]]:
        """
        获取 Windows 显卡信息
        
        Returns:
            List[Dict[str, Any]]: 显卡信息列表
        """
        gpus = []
        
        try:
            import subprocess
            
            result = subprocess.run(
                ['wmic', 'path', 'win32_VideoController', 'get', 'name,adapterram'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')[1:]
                for line in lines:
                    parts = line.split()
                    if len(parts) >= 1:
                        name = ' '.join(parts[:-1]) if len(parts) > 1 else parts[0]
                        memory = parts[-1] if len(parts) > 1 else 'Unknown'
                        
                        try:
                            memory_bytes = int(memory)
                            memory = self._bytes_to_human(memory_bytes)
                        except (ValueError, TypeError):
                            pass
                        
                        vendor = 'Unknown'
                        name_lower = name.lower()
                        if 'nvidia' in name_lower:
                            vendor = 'NVIDIA'
                        elif 'amd' in name_lower or 'radeon' in name_lower:
                            vendor = 'AMD'
                        elif 'intel' in name_lower:
                            vendor = 'Intel'
                        
                        gpus.append({
                            'name': name,
                            'vendor': vendor,
                            'memory': memory
                        })
                        
        except Exception:
            pass
        
        return gpus
    
    def _get_network_info(self) -> Dict[str, Any]:
        """
        获取网络信息
        
        Returns:
            Dict[str, Any]: 网络信息
        """
        info = {}
        
        info['hostname'] = socket.gethostname()
        
        try:
            info['fqdn'] = socket.getfqdn()
        except Exception:
            info['fqdn'] = info['hostname']
        
        info['internal_ips'] = self._get_internal_ips()
        info['primary_ip'] = self._get_primary_ip()
        
        return info
    
    def _get_internal_ips(self) -> List[str]:
        """
        获取所有内网 IP 地址
        
        Returns:
            List[str]: IP 地址列表
        """
        ips = []
        
        if PSUTIL_AVAILABLE:
            try:
                for iface_name, iface_addrs in psutil.net_if_addrs().items():
                    for addr in iface_addrs:
                        if addr.family == socket.AF_INET:
                            ip = addr.address
                            if not self._is_loopback_ip(ip):
                                ips.append(ip)
            except Exception:
                pass
        
        if not ips:
            try:
                hostname = socket.gethostname()
                addr_info = socket.getaddrinfo(hostname, None)
                for addr in addr_info:
                    if addr[0] == socket.AF_INET:
                        ip = addr[4][0]
                        if not self._is_loopback_ip(ip) and ip not in ips:
                            ips.append(ip)
            except Exception:
                pass
        
        return ips
    
    def _get_primary_ip(self) -> str:
        """
        获取主要内网 IP 地址
        
        Returns:
            str: 主要 IP 地址
        """
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            pass
        
        ips = self._get_internal_ips()
        if ips:
            return ips[0]
        
        return '127.0.0.1'
    
    def _is_loopback_ip(self, ip: str) -> bool:
        """
        检查是否为回环地址
        
        Args:
            ip: IP 地址
            
        Returns:
            bool: 是否为回环地址
        """
        return ip.startswith('127.') or ip == 'localhost'
    
    def _bytes_to_human(self, bytes_size: int, decimal_places: int = 2) -> str:
        """
        将字节转换为人类可读的格式
        
        Args:
            bytes_size: 字节数
            decimal_places: 小数位数
            
        Returns:
            str: 人类可读的格式
        """
        if bytes_size == 0:
            return '0 B'
        
        for unit in ['B', 'KB', 'MB', 'GB', 'TB', 'PB']:
            if bytes_size < 1024.0:
                return f"{bytes_size:.{decimal_places}f} {unit}"
            bytes_size /= 1024.0
        
        return f"{bytes_size:.{decimal_places}f} EB"
    
    def get_all_info(self) -> Dict[str, Any]:
        """
        获取所有系统信息
        
        Returns:
            Dict[str, Any]: 完整的系统信息
        """
        return {
            'os': self._os_info,
            'hardware': self._hardware_info,
            'network': self._network_info,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def format_pretty(self, info: Optional[Dict[str, Any]] = None) -> str:
        """
        格式化为美化输出（类似 neofetch）
        
        Args:
            info: 系统信息，如果为 None 则获取最新信息
            
        Returns:
            str: 美化格式的字符串
        """
        if info is None:
            info = self.get_all_info()
        
        os_info = info.get('os', {})
        hardware = info.get('hardware', {})
        network = info.get('network', {})
        
        lines = []
        
        os_name = os_info.get('os_name', os_info.get('system', 'Unknown'))
        lines.append(f"\033[1;34mOS:\033[0m {os_name}")
        lines.append(f"\033[1;34mHost:\033[0m {network.get('hostname', 'Unknown')}")
        lines.append(f"\033[1;34mKernel:\033[0m {os_info.get('release', 'Unknown')}")
        
        if 'boot_time' in os_info:
            lines.append(f"\033[1;34mUptime:\033[0m 启动于 {os_info['boot_time']}")
        
        cpu_count = hardware.get('cpu_count', 'Unknown')
        cpu_brand = hardware.get('cpu_brand', 'Unknown')
        lines.append(f"\033[1;34mCPU:\033[0m {cpu_brand} ({cpu_count})")
        
        if 'cpu_freq' in hardware:
            lines.append(f"\033[1;34mCPU Freq:\033[0m {hardware['cpu_freq']}")
        
        memory_total = hardware.get('memory_total_human', 'Unknown')
        memory_used = hardware.get('memory_used_human', 'Unknown')
        memory_percent = hardware.get('memory_percent', 0)
        lines.append(f"\033[1;34mMemory:\033[0m {memory_used} / {memory_total} ({memory_percent}%)")
        
        if 'swap_total' in hardware:
            swap_total = hardware.get('swap_total_human', 'Unknown')
            swap_used = hardware.get('swap_used_human', 'Unknown')
            swap_percent = hardware.get('swap_percent', 0)
            lines.append(f"\033[1;34mSwap:\033[0m {swap_used} / {swap_total} ({swap_percent}%)")
        
        gpus = hardware.get('gpu_info', [])
        for i, gpu in enumerate(gpus):
            gpu_name = gpu.get('name', 'Unknown')
            gpu_vendor = gpu.get('vendor', '')
            gpu_memory = gpu.get('memory', '')
            
            gpu_str = gpu_name
            if gpu_vendor and gpu_vendor != 'Unknown':
                gpu_str = f"{gpu_vendor} {gpu_str}"
            if gpu_memory and gpu_memory != 'Unknown':
                gpu_str = f"{gpu_str} ({gpu_memory})"
            
            if len(gpus) > 1:
                lines.append(f"\033[1;34mGPU {i+1}:\033[0m {gpu_str}")
            else:
                lines.append(f"\033[1;34mGPU:\033[0m {gpu_str}")
        
        primary_ip = network.get('primary_ip', 'Unknown')
        lines.append(f"\033[1;34mIP:\033[0m {primary_ip}")
        
        internal_ips = network.get('internal_ips', [])
        if len(internal_ips) > 1:
            lines.append(f"\033[1;34mAll IPs:\033[0m {', '.join(internal_ips)}")
        
        lines.append(f"\033[1;34mArchitecture:\033[0m {os_info.get('architecture', 'Unknown')}")
        lines.append(f"\033[1;34mMachine:\033[0m {os_info.get('machine', 'Unknown')}")
        
        return '\n'.join(lines)
    
    def format_minimal(self, info: Optional[Dict[str, Any]] = None) -> str:
        """
        格式化为极简输出（键值对）
        
        Args:
            info: 系统信息，如果为 None 则获取最新信息
            
        Returns:
            str: 极简格式的字符串
        """
        if info is None:
            info = self.get_all_info()
        
        os_info = info.get('os', {})
        hardware = info.get('hardware', {})
        network = info.get('network', {})
        
        key_values = []
        
        key_values.append(f"os={os_info.get('os_name', os_info.get('system', 'Unknown'))}")
        key_values.append(f"kernel={os_info.get('release', 'Unknown')}")
        key_values.append(f"hostname={network.get('hostname', 'Unknown')}")
        key_values.append(f"ip={network.get('primary_ip', 'Unknown')}")
        
        cpu_brand = hardware.get('cpu_brand', 'Unknown')
        cpu_count = hardware.get('cpu_count_logical', hardware.get('cpu_count', 1))
        key_values.append(f"cpu={cpu_brand}")
        key_values.append(f"cpu_cores={cpu_count}")
        
        key_values.append(f"memory_total={hardware.get('memory_total', 0)}")
        key_values.append(f"memory_used={hardware.get('memory_used', 0)}")
        key_values.append(f"memory_percent={hardware.get('memory_percent', 0)}")
        
        gpus = hardware.get('gpu_info', [])
        for i, gpu in enumerate(gpus):
            if i == 0:
                key_values.append(f"gpu={gpu.get('name', 'Unknown')}")
            else:
                key_values.append(f"gpu_{i+1}={gpu.get('name', 'Unknown')}")
        
        key_values.append(f"architecture={os_info.get('architecture', 'Unknown')}")
        key_values.append(f"machine={os_info.get('machine', 'Unknown')}")
        
        return '\n'.join(key_values)
    
    def format_json(self, info: Optional[Dict[str, Any]] = None) -> str:
        """
        格式化为 JSON 输出
        
        Args:
            info: 系统信息，如果为 None 则获取最新信息
            
        Returns:
            str: JSON 格式的字符串
        """
        import json
        
        if info is None:
            info = self.get_all_info()
        
        return json.dumps(info, indent=2, ensure_ascii=False)


def test_system_info():
    """
    测试系统信息模块
    """
    sys_info = SystemInfo()
    
    print("=" * 60)
    print("美化格式输出 (Pretty Format):")
    print("=" * 60)
    print(sys_info.format_pretty())
    
    print("\n" + "=" * 60)
    print("极简格式输出 (Minimal Format):")
    print("=" * 60)
    print(sys_info.format_minimal())
    
    print("\n" + "=" * 60)
    print("JSON 格式输出 (JSON Format):")
    print("=" * 60)
    print(sys_info.format_json())


if __name__ == "__main__":
    test_system_info()
