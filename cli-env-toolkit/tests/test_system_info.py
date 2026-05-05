"""
系统信息模块测试
"""

import pytest
from unittest.mock import patch, MagicMock

from cli_env_toolkit.system_info import SystemInfo


class TestSystemInfo:
    """
    SystemInfo 测试类
    """
    
    def setup_method(self):
        """
        每个测试方法前的设置
        """
        self.sys_info = SystemInfo()
    
    def test_init(self):
        """
        测试初始化
        """
        assert hasattr(self.sys_info, '_os_info')
        assert hasattr(self.sys_info, '_hardware_info')
        assert hasattr(self.sys_info, '_network_info')
    
    def test_get_all_info(self):
        """
        测试获取所有信息
        """
        info = self.sys_info.get_all_info()
        
        assert 'os' in info
        assert 'hardware' in info
        assert 'network' in info
        assert 'timestamp' in info
        
        assert 'system' in info['os']
        assert 'node' in info['os']
        assert 'release' in info['os']
        
        assert 'hostname' in info['network']
        assert 'primary_ip' in info['network']
    
    def test_bytes_to_human(self):
        """
        测试字节转换
        """
        assert self.sys_info._bytes_to_human(0) == '0 B'
        assert self.sys_info._bytes_to_human(1024) == '1.00 KB'
        assert self.sys_info._bytes_to_human(1024 * 1024) == '1.00 MB'
        assert self.sys_info._bytes_to_human(1024 * 1024 * 1024) == '1.00 GB'
        
        assert self.sys_info._bytes_to_human(1536, decimal_places=2) == '1.50 KB'
        assert self.sys_info._bytes_to_human(1536, decimal_places=0) == '2 KB'
    
    def test_is_loopback_ip(self):
        """
        测试回环地址检测
        """
        assert self.sys_info._is_loopback_ip('127.0.0.1') == True
        assert self.sys_info._is_loopback_ip('127.0.0.255') == True
        assert self.sys_info._is_loopback_ip('localhost') == True
        
        assert self.sys_info._is_loopback_ip('192.168.1.1') == False
        assert self.sys_info._is_loopback_ip('10.0.0.1') == False
        assert self.sys_info._is_loopback_ip('8.8.8.8') == False
    
    def test_format_pretty(self):
        """
        测试美化格式输出
        """
        output = self.sys_info.format_pretty()
        
        assert 'OS:' in output
        assert 'Host:' in output
        assert 'Kernel:' in output
        assert 'CPU:' in output
        assert 'Memory:' in output
        assert 'IP:' in output
    
    def test_format_minimal(self):
        """
        测试极简格式输出
        """
        output = self.sys_info.format_minimal()
        
        lines = output.strip().split('\n')
        for line in lines:
            assert '=' in line
            
            key, value = line.split('=', 1)
            assert key
            assert value is not None
    
    def test_format_json(self):
        """
        测试 JSON 格式输出
        """
        import json
        
        output = self.sys_info.format_json()
        
        data = json.loads(output)
        assert 'os' in data
        assert 'hardware' in data
        assert 'network' in data
        assert 'timestamp' in data
    
    def test_os_info_structure(self):
        """
        测试操作系统信息结构
        """
        os_info = self.sys_info._os_info
        
        assert 'system' in os_info
        assert 'node' in os_info
        assert 'release' in os_info
        assert 'version' in os_info
        assert 'machine' in os_info
        assert 'processor' in os_info
        assert 'architecture' in os_info
        assert 'os_name' in os_info
    
    def test_network_info_structure(self):
        """
        测试网络信息结构
        """
        network_info = self.sys_info._network_info
        
        assert 'hostname' in network_info
        assert 'fqdn' in network_info
        assert 'internal_ips' in network_info
        assert 'primary_ip' in network_info
        
        assert isinstance(network_info['internal_ips'], list)
        assert isinstance(network_info['primary_ip'], str)
    
    def test_hardware_info_structure(self):
        """
        测试硬件信息结构
        """
        hardware_info = self.sys_info._hardware_info
        
        assert 'cpu_brand' in hardware_info
        assert 'cpu_count' in hardware_info
        assert 'gpu_info' in hardware_info
        
        assert isinstance(hardware_info['gpu_info'], list)
        
        if len(hardware_info['gpu_info']) > 0:
            gpu = hardware_info['gpu_info'][0]
            assert 'name' in gpu
            assert 'vendor' in gpu
            assert 'memory' in gpu


if __name__ == "__main__":
    pytest.main([__file__, '-v'])
