import psutil
import platform
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


class SystemMonitor:
    def __init__(self):
        self._last_disk_io = psutil.disk_io_counters()
        self._last_network_io = psutil.net_io_counters()
        self._last_disk_time = datetime.now()
        self._last_network_time = datetime.now()
    
    def get_cpu_info(self) -> Dict[str, Any]:
        cpu_count = psutil.cpu_count(logical=False)
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_percent_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
        
        cpu_freq_current = None
        cpu_freq_min = None
        cpu_freq_max = None
        
        try:
            cpu_freq = psutil.cpu_freq()
            if cpu_freq:
                cpu_freq_current = cpu_freq.current
                cpu_freq_min = cpu_freq.min
                cpu_freq_max = cpu_freq.max
        except Exception:
            pass
        
        return {
            'physical_cores': cpu_count,
            'logical_cores': cpu_count_logical,
            'total_usage': cpu_percent,
            'per_core_usage': cpu_percent_per_core,
            'current_freq': cpu_freq_current,
            'min_freq': cpu_freq_min,
            'max_freq': cpu_freq_max
        }
    
    def get_memory_info(self) -> Dict[str, Any]:
        virtual_mem = psutil.virtual_memory()
        swap_mem = psutil.swap_memory()
        
        return {
            'total': virtual_mem.total,
            'available': virtual_mem.available,
            'used': virtual_mem.used,
            'free': virtual_mem.free,
            'percent': virtual_mem.percent,
            'swap_total': swap_mem.total,
            'swap_used': swap_mem.used,
            'swap_free': swap_mem.free,
            'swap_percent': swap_mem.percent
        }
    
    def get_disk_info(self) -> Dict[str, Any]:
        partitions = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                partitions.append({
                    'device': partition.device,
                    'mountpoint': partition.mountpoint,
                    'fstype': partition.fstype,
                    'total': usage.total,
                    'used': usage.used,
                    'free': usage.free,
                    'percent': usage.percent
                })
            except PermissionError:
                continue
        
        current_disk_io = psutil.disk_io_counters()
        current_time = datetime.now()
        time_diff = (current_time - self._last_disk_time).total_seconds()
        
        read_bytes_per_sec = 0
        write_bytes_per_sec = 0
        
        if time_diff > 0 and self._last_disk_io:
            read_bytes_per_sec = (current_disk_io.read_bytes - self._last_disk_io.read_bytes) / time_diff
            write_bytes_per_sec = (current_disk_io.write_bytes - self._last_disk_io.write_bytes) / time_diff
        
        self._last_disk_io = current_disk_io
        self._last_disk_time = current_time
        
        return {
            'partitions': partitions,
            'total_read_bytes': current_disk_io.read_bytes,
            'total_write_bytes': current_disk_io.write_bytes,
            'read_bytes_per_sec': read_bytes_per_sec,
            'write_bytes_per_sec': write_bytes_per_sec,
            'total_read_count': current_disk_io.read_count,
            'total_write_count': current_disk_io.write_count
        }
    
    def get_network_info(self) -> Dict[str, Any]:
        current_network_io = psutil.net_io_counters()
        current_time = datetime.now()
        time_diff = (current_time - self._last_network_time).total_seconds()
        
        bytes_sent_per_sec = 0
        bytes_recv_per_sec = 0
        
        if time_diff > 0 and self._last_network_io:
            bytes_sent_per_sec = (current_network_io.bytes_sent - self._last_network_io.bytes_sent) / time_diff
            bytes_recv_per_sec = (current_network_io.bytes_recv - self._last_network_io.bytes_recv) / time_diff
        
        self._last_network_io = current_network_io
        self._last_network_time = current_time
        
        return {
            'bytes_sent': current_network_io.bytes_sent,
            'bytes_recv': current_network_io.bytes_recv,
            'packets_sent': current_network_io.packets_sent,
            'packets_recv': current_network_io.packets_recv,
            'bytes_sent_per_sec': bytes_sent_per_sec,
            'bytes_recv_per_sec': bytes_recv_per_sec
        }
    
    def get_gpu_info(self) -> Dict[str, Any]:
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            
            if gpus:
                gpu = gpus[0]
                return {
                    'available': True,
                    'name': gpu.name,
                    'usage': gpu.load * 100,
                    'memory_used': gpu.memoryUsed,
                    'memory_total': gpu.memoryTotal,
                    'memory_percent': (gpu.memoryUsed / gpu.memoryTotal) * 100,
                    'temperature': gpu.temperature
                }
        except ImportError:
            pass
        
        return {
            'available': False,
            'name': 'N/A',
            'usage': 0,
            'memory_used': 0,
            'memory_total': 0,
            'memory_percent': 0,
            'temperature': 0
        }
    
    def get_process_list(self, sort_by: str = 'cpu_percent', ascending: bool = False) -> List[Dict[str, Any]]:
        processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status', 'create_time']):
            try:
                proc_info = proc.info
                if proc_info['cpu_percent'] is None:
                    proc_info['cpu_percent'] = 0
                if proc_info['memory_percent'] is None:
                    proc_info['memory_percent'] = 0
                
                processes.append(proc_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        if sort_by in processes[0] if processes else []:
            processes.sort(key=lambda x: x[sort_by], reverse=not ascending)
        
        return processes
    
    def kill_process(self, pid: int) -> bool:
        try:
            proc = psutil.Process(pid)
            proc.terminate()
            return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return False
    
    def get_system_info(self) -> Dict[str, Any]:
        return {
            'platform': platform.system(),
            'platform_release': platform.release(),
            'platform_version': platform.version(),
            'architecture': platform.machine(),
            'hostname': platform.node(),
            'processor': platform.processor()
        }
