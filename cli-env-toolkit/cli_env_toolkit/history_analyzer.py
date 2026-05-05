"""
命令历史分析模块
支持 zsh 和 bash 历史文件的解析和命令频率分析
"""

import os
import re
from collections import Counter
from typing import List, Dict, Tuple, Optional


class HistoryAnalyzer:
    """
    命令历史分析器
    
    支持解析 zsh 和 bash 历史文件，统计命令使用频率
    """
    
    def __init__(self):
        self.history_files = {
            'zsh': os.path.expanduser('~/.zsh_history'),
            'bash': os.path.expanduser('~/.bash_history'),
        }
        self.current_shell = self._detect_current_shell()
    
    def _detect_current_shell(self) -> str:
        """
        检测当前使用的 Shell
        
        Returns:
            str: 'zsh' 或 'bash'
        """
        shell = os.environ.get('SHELL', '').lower()
        
        if 'zsh' in shell:
            return 'zsh'
        elif 'bash' in shell:
            return 'bash'
        
        if os.path.exists(self.history_files['zsh']):
            return 'zsh'
        elif os.path.exists(self.history_files['bash']):
            return 'bash'
        
        return 'bash'
    
    def parse_zsh_history(self, filepath: str) -> List[str]:
        """
        解析 zsh 历史文件
        
        zsh 历史格式: :时间戳:耗时;命令
        或者: 时间戳:命令
        
        Args:
            filepath: 历史文件路径
            
        Returns:
            List[str]: 命令列表
        """
        commands = []
        
        if not os.path.exists(filepath):
            return commands
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    if line.startswith(':'):
                        match = re.match(r':\d+:\d+;(.*)', line)
                        if match:
                            cmd = match.group(1).strip()
                            if cmd:
                                commands.append(cmd)
                        else:
                            match = re.match(r':\d+;(.*)', line)
                            if match:
                                cmd = match.group(1).strip()
                                if cmd:
                                    commands.append(cmd)
                    else:
                        parts = line.split(';', 1)
                        if len(parts) == 2:
                            cmd = parts[1].strip()
                            if cmd:
                                commands.append(cmd)
                        else:
                            cmd = line.strip()
                            if cmd:
                                commands.append(cmd)
        except Exception as e:
            print(f"解析 zsh 历史文件出错: {e}")
        
        return commands
    
    def parse_bash_history(self, filepath: str) -> List[str]:
        """
        解析 bash 历史文件
        
        bash 历史格式通常是每行一个命令
        
        Args:
            filepath: 历史文件路径
            
        Returns:
            List[str]: 命令列表
        """
        commands = []
        
        if not os.path.exists(filepath):
            return commands
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        commands.append(line)
        except Exception as e:
            print(f"解析 bash 历史文件出错: {e}")
        
        return commands
    
    def get_commands(self, shell_type: Optional[str] = None) -> List[str]:
        """
        获取所有命令
        
        Args:
            shell_type: Shell 类型，'zsh' 或 'bash'，如果为 None 则使用自动检测的 Shell
            
        Returns:
            List[str]: 命令列表
        """
        if shell_type is None:
            shell_type = self.current_shell
        
        if shell_type == 'zsh':
            return self.parse_zsh_history(self.history_files['zsh'])
        else:
            return self.parse_bash_history(self.history_files['bash'])
    
    def get_all_commands(self) -> List[str]:
        """
        获取所有 Shell 的命令（zsh + bash）
        
        Returns:
            List[str]: 所有命令列表
        """
        commands = []
        
        zsh_commands = self.parse_zsh_history(self.history_files['zsh'])
        bash_commands = self.parse_bash_history(self.history_files['bash'])
        
        commands.extend(zsh_commands)
        commands.extend(bash_commands)
        
        return commands
    
    def analyze_command_frequency(self, commands: List[str], 
                                   min_length: int = 3,
                                   min_count: int = 5) -> Dict[str, int]:
        """
        分析命令使用频率
        
        Args:
            commands: 命令列表
            min_length: 命令最小长度（排除太短的命令如 ls, cd 等）
            min_count: 最小出现次数
            
        Returns:
            Dict[str, int]: 命令到使用次数的映射，按使用次数降序排列
        """
        if not commands:
            return {}
        
        base_commands = []
        
        for cmd in commands:
            base_cmd = self._extract_base_command(cmd)
            if base_cmd and len(base_cmd) >= min_length:
                base_commands.append(base_cmd)
        
        counter = Counter(base_commands)
        
        filtered = {cmd: count for cmd, count in counter.items() 
                    if count >= min_count}
        
        sorted_commands = dict(sorted(filtered.items(), 
                                       key=lambda x: x[1], 
                                       reverse=True))
        
        return sorted_commands
    
    def _extract_base_command(self, command: str) -> str:
        """
        提取命令的基础部分（去掉参数和选项）
        
        Args:
            command: 完整的命令行
            
        Returns:
            str: 基础命令
        """
        if not command:
            return ''
        
        command = command.strip()
        
        if command.startswith('sudo '):
            command = command[5:].strip()
        
        parts = command.split()
        if not parts:
            return ''
        
        base_cmd = parts[0]
        
        if base_cmd == 'git' and len(parts) >= 2:
            subcmd = parts[1]
            if not subcmd.startswith('-'):
                return f'git {subcmd}'
        
        if base_cmd == 'docker' and len(parts) >= 2:
            subcmd = parts[1]
            if not subcmd.startswith('-'):
                return f'docker {subcmd}'
        
        if base_cmd == 'kubectl' and len(parts) >= 2:
            subcmd = parts[1]
            if not subcmd.startswith('-'):
                return f'kubectl {subcmd}'
        
        if base_cmd == 'npm' and len(parts) >= 2:
            subcmd = parts[1]
            if not subcmd.startswith('-'):
                return f'npm {subcmd}'
        
        if base_cmd == 'ls':
            if '-la' in parts or '-l' in parts or '-a' in parts:
                flags = []
                if '-l' in parts:
                    flags.append('l')
                if '-a' in parts:
                    flags.append('a')
                if '-h' in parts:
                    flags.append('h')
                if flags:
                    return f'ls -{"".join(flags)}'
            return 'ls'
        
        return base_cmd
    
    def get_top_commands(self, commands: List[str], 
                         top_n: int = 20,
                         min_length: int = 3,
                         min_count: int = 5) -> List[Tuple[str, int]]:
        """
        获取使用频率最高的命令
        
        Args:
            commands: 命令列表
            top_n: 返回前 N 个
            min_length: 命令最小长度
            min_count: 最小出现次数
            
        Returns:
            List[Tuple[str, int]]: (命令, 次数) 列表
        """
        frequency = self.analyze_command_frequency(commands, min_length, min_count)
        return list(frequency.items())[:top_n]
    
    def get_long_commands(self, commands: List[str], 
                          min_length: int = 15,
                          top_n: int = 10) -> List[Tuple[str, int]]:
        """
        获取最常用的长命令（适合创建别名）
        
        Args:
            commands: 命令列表
            min_length: 命令最小长度
            top_n: 返回前 N 个
            
        Returns:
            List[Tuple[str, int]]: (命令, 次数) 列表
        """
        frequency = self.analyze_command_frequency(commands, min_length=min_length, min_count=3)
        
        long_commands = [(cmd, count) for cmd, count in frequency.items() 
                         if len(cmd) >= min_length]
        
        return sorted(long_commands, key=lambda x: x[1], reverse=True)[:top_n]


def test_history_analyzer():
    """
    测试历史分析器
    """
    analyzer = HistoryAnalyzer()
    print(f"当前检测到的 Shell: {analyzer.current_shell}")
    print(f"zsh 历史文件: {analyzer.history_files['zsh']}")
    print(f"bash 历史文件: {analyzer.history_files['bash']}")
    
    commands = analyzer.get_all_commands()
    print(f"\n总共找到 {len(commands)} 条命令")
    
    if commands:
        top_commands = analyzer.get_top_commands(commands, top_n=10)
        print("\n使用频率最高的命令:")
        for cmd, count in top_commands:
            print(f"  {count}次: {cmd}")
        
        long_commands = analyzer.get_long_commands(commands, top_n=10)
        print("\n最常用的长命令（适合创建别名）:")
        for cmd, count in long_commands:
            print(f"  {count}次: {cmd}")


if __name__ == "__main__":
    test_history_analyzer()
