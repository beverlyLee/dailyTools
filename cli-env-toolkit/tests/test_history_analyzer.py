"""
命令历史分析模块测试
"""

import os
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from cli_env_toolkit.history_analyzer import HistoryAnalyzer


class TestHistoryAnalyzer:
    """
    HistoryAnalyzer 测试类
    """
    
    def setup_method(self):
        """
        每个测试方法前的设置
        """
        self.analyzer = HistoryAnalyzer()
    
    def test_init(self):
        """
        测试初始化
        """
        assert self.analyzer.current_shell in ['zsh', 'bash']
        assert 'zsh' in self.analyzer.history_files
        assert 'bash' in self.analyzer.history_files
    
    def test_detect_current_shell(self):
        """
        测试 Shell 检测
        """
        with patch.dict(os.environ, {'SHELL': '/bin/zsh'}):
            analyzer = HistoryAnalyzer()
            assert analyzer._detect_current_shell() == 'zsh'
        
        with patch.dict(os.environ, {'SHELL': '/bin/bash'}):
            analyzer = HistoryAnalyzer()
            assert analyzer._detect_current_shell() == 'bash'
    
    def test_parse_zsh_history(self):
        """
        测试 zsh 历史文件解析
        """
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(": 1714987200:0;git status\n")
            f.write(": 1714987201:1;ls -la\n")
            f.write(": 1714987202:0;docker ps\n")
            temp_path = f.name
        
        try:
            commands = self.analyzer.parse_zsh_history(temp_path)
            
            assert len(commands) == 3
            assert 'git status' in commands
            assert 'ls -la' in commands
            assert 'docker ps' in commands
        finally:
            os.unlink(temp_path)
    
    def test_parse_bash_history(self):
        """
        测试 bash 历史文件解析
        """
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("git status\n")
            f.write("ls -la\n")
            f.write("docker ps\n")
            f.write("# This is a comment\n")
            temp_path = f.name
        
        try:
            commands = self.analyzer.parse_bash_history(temp_path)
            
            assert len(commands) == 3
            assert 'git status' in commands
            assert 'ls -la' in commands
            assert 'docker ps' in commands
        finally:
            os.unlink(temp_path)
    
    def test_extract_base_command_git(self):
        """
        测试 Git 命令提取
        """
        assert self.analyzer._extract_base_command('git status') == 'git status'
        assert self.analyzer._extract_base_command('git add .') == 'git add'
        assert self.analyzer._extract_base_command('git commit -m "test"') == 'git commit'
        assert self.analyzer._extract_base_command('git checkout main') == 'git checkout'
    
    def test_extract_base_command_docker(self):
        """
        测试 Docker 命令提取
        """
        assert self.analyzer._extract_base_command('docker ps') == 'docker ps'
        assert self.analyzer._extract_base_command('docker images') == 'docker images'
        assert self.analyzer._extract_base_command('docker exec -it container bash') == 'docker exec'
    
    def test_extract_base_command_ls(self):
        """
        测试 ls 命令提取
        """
        assert self.analyzer._extract_base_command('ls -la') == 'ls -la'
        assert self.analyzer._extract_base_command('ls -l') == 'ls -l'
        assert self.analyzer._extract_base_command('ls -a') == 'ls -a'
        assert self.analyzer._extract_base_command('ls -lh') == 'ls -lh'
        assert self.analyzer._extract_base_command('ls') == 'ls'
    
    def test_extract_base_command_sudo(self):
        """
        测试 sudo 命令提取
        """
        assert self.analyzer._extract_base_command('sudo apt update') == 'apt'
        assert self.analyzer._extract_base_command('sudo git status') == 'git status'
    
    def test_analyze_command_frequency(self):
        """
        测试命令频率分析
        """
        commands = [
            'git status',
            'git status',
            'git status',
            'ls -la',
            'ls -la',
            'docker ps',
            'git add .',
            'git add .',
            'git add .',
            'git add .',
        ]
        
        frequency = self.analyzer.analyze_command_frequency(
            commands, min_length=3, min_count=1
        )
        
        assert 'git add' in frequency
        assert frequency['git add'] == 4
        assert 'git status' in frequency
        assert frequency['git status'] == 3
        assert 'ls -la' in frequency
        assert frequency['ls -la'] == 2
    
    def test_get_top_commands(self):
        """
        测试获取高频命令
        """
        commands = [
            'git status', 'git status', 'git status',
            'git add', 'git add',
            'docker ps',
        ]
        
        top = self.analyzer.get_top_commands(commands, top_n=2, min_count=1)
        
        assert len(top) == 2
        assert top[0][0] == 'git status'
        assert top[0][1] == 3
        assert top[1][0] == 'git add'
        assert top[1][1] == 2
    
    def test_get_long_commands(self):
        """
        测试获取长命令
        """
        commands = [
            'git status',  # 短命令
            'git status',
            'docker-compose up -d --build',  # 长命令
            'docker-compose up -d --build',
            'docker-compose up -d --build',
            'kubectl get pods --namespace default',  # 长命令
            'kubectl get pods --namespace default',
        ]
        
        long_commands = self.analyzer.get_long_commands(
            commands, min_length=15, top_n=10
        )
        
        for cmd, count in long_commands:
            assert len(cmd) >= 15


if __name__ == "__main__":
    pytest.main([__file__, '-v'])
