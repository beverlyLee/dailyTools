"""
别名管理器模块
提供智能别名建议、自动安装和 Tab 补全支持
"""

import os
import re
from typing import List, Dict, Tuple, Optional, Set
from collections import namedtuple

from .history_analyzer import HistoryAnalyzer


Alias = namedtuple('Alias', ['name', 'command', 'description'])


class AliasManager:
    """
    别名管理器
    
    提供智能别名建议、自动安装到 Shell 配置文件，以及 Tab 补全支持
    """
    
    STANDARD_ALIASES = [
        Alias('gs', 'git status', 'Git 状态检查'),
        Alias('ga', 'git add', 'Git 添加文件'),
        Alias('gc', 'git commit', 'Git 提交'),
        Alias('gco', 'git checkout', 'Git 切换分支'),
        Alias('gb', 'git branch', 'Git 分支管理'),
        Alias('gl', 'git log', 'Git 日志查看'),
        Alias('gp', 'git push', 'Git 推送'),
        Alias('gpl', 'git pull', 'Git 拉取'),
        Alias('gdiff', 'git diff', 'Git 差异对比'),
        Alias('gcl', 'git clone', 'Git 克隆仓库'),
        
        Alias('dps', 'docker ps', 'Docker 查看运行中的容器'),
        Alias('dpsa', 'docker ps -a', 'Docker 查看所有容器'),
        Alias('dim', 'docker images', 'Docker 查看镜像'),
        Alias('drm', 'docker rm', 'Docker 删除容器'),
        Alias('drmi', 'docker rmi', 'Docker 删除镜像'),
        Alias('dexec', 'docker exec', 'Docker 执行容器命令'),
        Alias('dlogs', 'docker logs', 'Docker 查看容器日志'),
        
        Alias('ll', 'ls -la', '列出所有文件（含隐藏）'),
        Alias('la', 'ls -a', '列出隐藏文件'),
        Alias('lh', 'ls -lh', '以人类可读格式列出文件'),
        Alias('lt', 'ls -lt', '按时间排序列出文件'),
        
        Alias('..', 'cd ..', '返回上一级目录'),
        Alias('...', 'cd ../..', '返回上两级目录'),
        Alias('....', 'cd ../../..', '返回上三级目录'),
        
        Alias('cls', 'clear', '清屏'),
        Alias('h', 'history', '查看命令历史'),
        Alias('c', 'clear', '清屏'),
        Alias('e', 'exit', '退出终端'),
    ]
    
    def __init__(self):
        self.history_analyzer = HistoryAnalyzer()
        self.shell_configs = {
            'zsh': os.path.expanduser('~/.zshrc'),
            'bash': os.path.expanduser('~/.bashrc'),
            'bash_profile': os.path.expanduser('~/.bash_profile'),
        }
        self.current_shell = self.history_analyzer.current_shell
        self.installed_aliases = self._get_installed_aliases()
    
    def _get_installed_aliases(self) -> Set[str]:
        """
        获取已安装的别名
        
        Returns:
            Set[str]: 已安装的别名名称集合
        """
        installed = set()
        
        for config_path in self.shell_configs.values():
            if os.path.exists(config_path):
                try:
                    with open(config_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith('alias '):
                                match = re.match(r'alias\s+(\w+)=', line)
                                if match:
                                    installed.add(match.group(1))
                except Exception:
                    continue
        
        return installed
    
    def suggest_aliases(self, use_history: bool = True, 
                         include_standard: bool = True) -> List[Tuple[str, str, str, int]]:
        """
        智能建议别名
        
        Args:
            use_history: 是否使用历史命令分析
            include_standard: 是否包含标准别名
            
        Returns:
            List[Tuple[str, str, str, int]]: [(别名, 命令, 描述, 优先级)]
        """
        suggestions = []
        added_commands = set()
        
        if include_standard:
            for alias in self.STANDARD_ALIASES:
                if alias.name not in self.installed_aliases:
                    suggestions.append((alias.name, alias.command, alias.description, 100))
                    added_commands.add(alias.command)
        
        if use_history:
            history_suggestions = self._analyze_history_for_aliases()
            for alias_name, command, description, priority in history_suggestions:
                if (alias_name not in self.installed_aliases and 
                    command not in added_commands and
                    not self._is_conflicting_alias(alias_name)):
                    suggestions.append((alias_name, command, description, priority))
                    added_commands.add(command)
        
        suggestions.sort(key=lambda x: x[3], reverse=True)
        
        return suggestions
    
    def _analyze_history_for_aliases(self) -> List[Tuple[str, str, str, int]]:
        """
        分析历史命令，生成别名建议
        
        Returns:
            List[Tuple[str, str, str, int]]: [(别名, 命令, 描述, 优先级)]
        """
        suggestions = []
        
        commands = self.history_analyzer.get_all_commands()
        if not commands:
            return suggestions
        
        top_commands = self.history_analyzer.get_top_commands(
            commands, top_n=20, min_length=5, min_count=3
        )
        
        for command, count in top_commands:
            alias_name = self._generate_alias_name(command)
            if alias_name:
                description = f"常用命令 (使用 {count} 次)"
                priority = min(count * 10, 90)
                suggestions.append((alias_name, command, description, priority))
        
        long_commands = self.history_analyzer.get_long_commands(
            commands, min_length=20, top_n=10
        )
        
        for command, count in long_commands:
            alias_name = self._generate_alias_name(command)
            if alias_name:
                description = f"长命令 (使用 {count} 次)"
                priority = min(count * 10 + 20, 95)
                suggestions.append((alias_name, command, description, priority))
        
        return suggestions
    
    def _generate_alias_name(self, command: str) -> Optional[str]:
        """
        为命令生成别名
        
        Args:
            command: 命令字符串
            
        Returns:
            Optional[str]: 别名名称，如果无法生成则返回 None
        """
        command = command.strip()
        if not command:
            return None
        
        if command.startswith('git '):
            subcmd = command[4:].strip().split()[0] if len(command.split()) > 1 else ''
            if subcmd:
                if subcmd == 'status':
                    return 'gs'
                elif subcmd == 'add':
                    return 'ga'
                elif subcmd == 'commit':
                    return 'gc'
                elif subcmd == 'checkout':
                    return 'gco'
                elif subcmd == 'branch':
                    return 'gb'
                elif subcmd == 'log':
                    return 'gl'
                elif subcmd == 'push':
                    return 'gp'
                elif subcmd == 'pull':
                    return 'gpl'
                else:
                    return f'g{subcmd[:2]}'
        
        if command.startswith('docker '):
            subcmd = command[7:].strip().split()[0] if len(command.split()) > 1 else ''
            if subcmd:
                if subcmd == 'ps':
                    return 'dps'
                elif subcmd == 'images':
                    return 'dim'
                elif subcmd == 'exec':
                    return 'dexec'
                elif subcmd == 'logs':
                    return 'dlogs'
                else:
                    return f'd{subcmd[:2]}'
        
        if command.startswith('ls '):
            if '-la' in command:
                return 'll'
            elif '-l' in command:
                return 'll'
            elif '-a' in command:
                return 'la'
        
        words = command.split()
        if words:
            first_word = words[0]
            if len(first_word) > 2:
                alias_candidate = first_word[:2]
                if not self._is_conflicting_alias(alias_candidate):
                    return alias_candidate
                
                alias_candidate = first_word[:3]
                if not self._is_conflicting_alias(alias_candidate):
                    return alias_candidate
        
        return None
    
    def _is_conflicting_alias(self, alias_name: str) -> bool:
        """
        检查别名是否冲突
        
        Args:
            alias_name: 别名名称
            
        Returns:
            bool: 是否冲突
        """
        if alias_name in self.installed_aliases:
            return True
        
        common_commands = {'ls', 'cd', 'pwd', 'cat', 'echo', 'grep', 'find', 
                           'rm', 'cp', 'mv', 'mkdir', 'rmdir', 'chmod', 'chown',
                           'ps', 'top', 'kill', 'ssh', 'scp', 'curl', 'wget',
                           'python', 'python3', 'pip', 'npm', 'node', 'go',
                           'git', 'docker', 'kubectl', 'vim', 'vi', 'nano',
                           'code', 'open', 'start', 'man', 'help', 'history',
                           'clear', 'exit', 'alias', 'unalias', 'source', '.',
                           'export', 'set', 'unset', 'env', 'printenv',
                           'true', 'false', 'test', '['}
        
        if alias_name in common_commands:
            return True
        
        return False
    
    def install_alias(self, alias_name: str, command: str, 
                       description: str = '',
                       shell_type: Optional[str] = None) -> bool:
        """
        安装别名到 Shell 配置文件
        
        Args:
            alias_name: 别名名称
            command: 别名对应的命令
            description: 别名描述
            shell_type: Shell 类型，'zsh' 或 'bash'，如果为 None 则使用自动检测的 Shell
            
        Returns:
            bool: 是否安装成功
        """
        if self._is_conflicting_alias(alias_name):
            print(f"错误: 别名 '{alias_name}' 已存在或与系统命令冲突")
            return False
        
        if shell_type is None:
            shell_type = self.current_shell
        
        config_path = self._get_config_path(shell_type)
        
        if not config_path:
            print(f"错误: 无法找到 {shell_type} 的配置文件")
            return False
        
        alias_line = f"alias {alias_name}='{command}'"
        
        if description:
            comment_line = f"# {description}"
            content_to_add = f"\n{comment_line}\n{alias_line}\n"
        else:
            content_to_add = f"\n{alias_line}\n"
        
        try:
            with open(config_path, 'a', encoding='utf-8') as f:
                f.write(content_to_add)
            
            self.installed_aliases.add(alias_name)
            
            print(f"成功安装别名: {alias_name}='{command}'")
            print(f"已添加到: {config_path}")
            print("请运行 'source ~/.zshrc' 或重新打开终端以生效")
            
            return True
            
        except Exception as e:
            print(f"安装别名时出错: {e}")
            return False
    
    def _get_config_path(self, shell_type: str) -> Optional[str]:
        """
        获取 Shell 配置文件路径
        
        Args:
            shell_type: Shell 类型
            
        Returns:
            Optional[str]: 配置文件路径
        """
        if shell_type == 'zsh':
            if os.path.exists(self.shell_configs['zsh']):
                return self.shell_configs['zsh']
            return None
        
        if os.path.exists(self.shell_configs['bash_profile']):
            return self.shell_configs['bash_profile']
        
        if os.path.exists(self.shell_configs['bash']):
            return self.shell_configs['bash']
        
        return self.shell_configs['bash']
    
    def install_aliases_batch(self, aliases: List[Tuple[str, str, str]],
                               shell_type: Optional[str] = None) -> Dict[str, bool]:
        """
        批量安装别名
        
        Args:
            aliases: 别名列表 [(别名, 命令, 描述)]
            shell_type: Shell 类型
            
        Returns:
            Dict[str, bool]: 安装结果 {别名: 是否成功}
        """
        results = {}
        
        for alias_name, command, description in aliases:
            success = self.install_alias(alias_name, command, description, shell_type)
            results[alias_name] = success
        
        return results
    
    def generate_completion_script(self, shell_type: Optional[str] = None) -> str:
        """
        生成 Tab 补全脚本
        
        Args:
            shell_type: Shell 类型
            
        Returns:
            str: 补全脚本内容
        """
        if shell_type is None:
            shell_type = self.current_shell
        
        if shell_type == 'zsh':
            return self._generate_zsh_completion()
        else:
            return self._generate_bash_completion()
    
    def _generate_zsh_completion(self) -> str:
        """
        生成 zsh 补全脚本
        
        Returns:
            str: zsh 补全脚本
        """
        all_aliases = []
        
        for alias in self.STANDARD_ALIASES:
            all_aliases.append((alias.name, alias.command, alias.description))
        
        script = """# CLI Environment Toolkit - Alias Completion for zsh
# 安装方法: 将此文件保存到 ~/.zsh/completions/_cet 或添加到 ~/.zshrc

# 别名列表
_cet_aliases=(
"""
        
        for name, cmd, desc in all_aliases:
            script += f'    "{name}:{desc}"\n'
        
        script += """)

# 补全函数
_cet() {
    local curcontext="$curcontext" state line
    typeset -A opt_args

    _arguments -C \
        '1: :->command' \
        '*: :->args'

    case $state in
        command)
            _describe 'command' _cet_aliases
            ;;
    esac
}

compdef _cet cet
compdef _cet cli-env-toolkit

# 为安装的别名添加补全（如果需要）
# 你可以在这里为特定别名添加自定义补全
"""
        
        return script
    
    def _generate_bash_completion(self) -> str:
        """
        生成 bash 补全脚本
        
        Returns:
            str: bash 补全脚本
        """
        all_aliases = []
        
        for alias in self.STANDARD_ALIASES:
            all_aliases.append((alias.name, alias.command, alias.description))
        
        alias_names = ' '.join([name for name, _, _ in all_aliases])
        
        script = f"""# CLI Environment Toolkit - Alias Completion for bash
# 安装方法: 将此文件保存到 /etc/bash_completion.d/cet 或 source 到 ~/.bashrc

# 别名列表
CET_ALIASES="{alias_names}"

# 补全函数
_cet() {{
    local cur prev opts
    COMPREPLY=()
    cur="${{COMP_WORDS[COMP_CWORD]}}"
    prev="${{COMP_WORDS[COMP_CWORD-1]}}"

    case "${{prev}}" in
        cet|cli-env-toolkit)
            COMPREPLY=( $(compgen -W "${{CET_ALIASES}}" -- ${{cur}}) )
            return 0
            ;;
    esac
}}

complete -F _cet cet
complete -F _cet cli-env-toolkit
"""
        
        return script
    
    def list_installed_aliases(self) -> List[Tuple[str, str]]:
        """
        列出已安装的别名
        
        Returns:
            List[Tuple[str, str]]: [(别名, 命令)]
        """
        aliases = []
        
        for config_path in self.shell_configs.values():
            if os.path.exists(config_path):
                try:
                    with open(config_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith('alias '):
                                match = re.match(r'alias\s+(\w+)=(.+)', line)
                                if match:
                                    name = match.group(1)
                                    command = match.group(2).strip('\'"')
                                    aliases.append((name, command))
                except Exception:
                    continue
        
        return aliases
    
    def remove_alias(self, alias_name: str, 
                      shell_type: Optional[str] = None) -> bool:
        """
        移除已安装的别名
        
        Args:
            alias_name: 别名名称
            shell_type: Shell 类型
            
        Returns:
            bool: 是否成功移除
        """
        if shell_type is None:
            shell_type = self.current_shell
        
        config_path = self._get_config_path(shell_type)
        
        if not config_path or not os.path.exists(config_path):
            print(f"错误: 无法找到配置文件")
            return False
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            new_lines = []
            removed = False
            i = 0
            
            while i < len(lines):
                line = lines[i]
                
                if line.strip().startswith(f'alias {alias_name}='):
                    removed = True
                    i += 1
                    
                    if i > 0 and lines[i-1].strip().startswith('#'):
                        if new_lines:
                            new_lines.pop()
                    
                    continue
                
                new_lines.append(line)
                i += 1
            
            if removed:
                with open(config_path, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                
                if alias_name in self.installed_aliases:
                    self.installed_aliases.remove(alias_name)
                
                print(f"成功移除别名: {alias_name}")
                return True
            else:
                print(f"未找到别名: {alias_name}")
                return False
                
        except Exception as e:
            print(f"移除别名时出错: {e}")
            return False


def test_alias_manager():
    """
    测试别名管理器
    """
    manager = AliasManager()
    
    print(f"当前 Shell: {manager.current_shell}")
    print(f"已安装的别名: {len(manager.installed_aliases)} 个")
    
    print("\n智能别名建议:")
    suggestions = manager.suggest_aliases()
    for name, cmd, desc, priority in suggestions[:10]:
        print(f"  {name}='{cmd}' - {desc} (优先级: {priority})")
    
    print("\n标准别名列表:")
    for alias in manager.STANDARD_ALIASES[:10]:
        print(f"  {alias.name}='{alias.command}' - {alias.description}")
    
    installed = manager.list_installed_aliases()
    if installed:
        print(f"\n已安装的别名 ({len(installed)} 个):")
        for name, cmd in installed[:10]:
            print(f"  {name}='{cmd}'")


if __name__ == "__main__":
    test_alias_manager()
