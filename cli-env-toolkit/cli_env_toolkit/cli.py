"""
CLI Environment Toolkit 主命令行入口
"""

import click
from typing import Optional

from .history_analyzer import HistoryAnalyzer
from .alias_manager import AliasManager
from .system_info import SystemInfo
from . import __version__


CONTEXT_SETTINGS = dict(help_option_names=['-h', '--help'])


@click.group(context_settings=CONTEXT_SETTINGS)
@click.version_option(__version__, '-v', '--version')
def main():
    """
    CLI Environment Toolkit - 命令行环境工具集
    
    提供智能 Shell 别名管理和跨平台系统信息查询功能。
    """
    pass


@main.group('alias', short_help='Shell 别名管理')
def alias_group():
    """
    智能 Shell 别名管理器
    
    功能包括：
    - 分析命令历史，找出最常用的命令
    - 智能建议别名（如 git status -> gs）
    - 自动安装别名到 .zshrc 或 .bashrc
    - 生成 Tab 补全脚本
    """
    pass


@alias_group.command('list', short_help='列出已安装的别名')
def alias_list():
    """
    列出当前已安装的所有别名。
    
    扫描 .zshrc、.bashrc 和 .bash_profile 中的别名定义。
    """
    manager = AliasManager()
    aliases = manager.list_installed_aliases()
    
    if not aliases:
        click.echo("未找到已安装的别名")
        return
    
    click.echo(f"已找到 {len(aliases)} 个别名:")
    click.echo("-" * 60)
    
    for name, command in aliases:
        click.echo(f"  \033[1;32m{name}\033[0m='{command}'")


@alias_group.command('suggest', short_help='智能建议别名')
@click.option('--no-history', is_flag=True, help='不使用历史命令分析')
@click.option('--no-standard', is_flag=True, help='不包含标准别名')
@click.option('--top', '-n', type=int, default=15, help='显示前 N 个别名建议')
def alias_suggest(no_history, no_standard, top):
    """
    智能建议别名。
    
    分析命令历史，找出最常用的长命令，并为它们建议合适的别名。
    同时包含预设的标准别名（如 git status -> gs）。
    """
    use_history = not no_history
    include_standard = not no_standard
    
    manager = AliasManager()
    suggestions = manager.suggest_aliases(
        use_history=use_history, 
        include_standard=include_standard
    )
    
    if not suggestions:
        click.echo("没有可用的别名建议")
        return
    
    click.echo(f"智能别名建议 (Top {min(top, len(suggestions))}):")
    click.echo("-" * 80)
    click.echo(f"{'别名':<10} {'命令':<30} {'描述':<30} {'优先级':<8}")
    click.echo("-" * 80)
    
    for name, cmd, desc, priority in suggestions[:top]:
        click.echo(f"\033[1;32m{name:<10}\033[0m \033[1;36m{cmd:<30}\033[0m {desc:<30} {priority:<8}")


@alias_group.command('install', short_help='安装别名')
@click.argument('name', required=True)
@click.argument('command', required=True)
@click.option('--description', '-d', default='', help='别名描述')
@click.option('--shell', '-s', type=click.Choice(['zsh', 'bash']), 
              help='指定 Shell 类型（默认自动检测）')
@click.option('--yes', '-y', is_flag=True, help='自动确认安装')
def alias_install(name, command, description, shell, yes):
    """
    安装别名到 Shell 配置文件。
    
    NAME: 别名名称（如 gs）
    COMMAND: 别名对应的命令（如 'git status'）
    
    别名将被添加到 .zshrc 或 .bashrc 中。
    """
    if not yes:
        click.echo(f"即将安装别名:")
        click.echo(f"  别名: \033[1;32m{name}\033[0m")
        click.echo(f"  命令: \033[1;36m{command}\033[0m")
        if description:
            click.echo(f"  描述: {description}")
        
        confirm = click.confirm("\n确认安装？")
        if not confirm:
            click.echo("已取消安装")
            return
    
    manager = AliasManager()
    success = manager.install_alias(name, command, description, shell)
    
    if success:
        click.echo("\n\033[1;32m✓ 别名安装成功！\033[0m")
        click.echo("请运行以下命令使别名生效:")
        if shell == 'zsh' or manager.current_shell == 'zsh':
            click.echo("  source ~/.zshrc")
        else:
            click.echo("  source ~/.bashrc")


@alias_group.command('remove', short_help='移除别名')
@click.argument('name', required=True)
@click.option('--shell', '-s', type=click.Choice(['zsh', 'bash']), 
              help='指定 Shell 类型（默认自动检测）')
@click.option('--yes', '-y', is_flag=True, help='自动确认移除')
def alias_remove(name, shell, yes):
    """
    从 Shell 配置文件中移除别名。
    
    NAME: 要移除的别名名称
    """
    manager = AliasManager()
    
    installed = manager.list_installed_aliases()
    alias_exists = any(n == name for n, _ in installed)
    
    if not alias_exists:
        click.echo(f"错误: 别名 '{name}' 不存在")
        return
    
    if not yes:
        click.echo(f"即将移除别名: \033[1;31m{name}\033[0m")
        confirm = click.confirm("确认移除？")
        if not confirm:
            click.echo("已取消移除")
            return
    
    success = manager.remove_alias(name, shell)
    
    if success:
        click.echo("\033[1;32m✓ 别名已成功移除\033[0m")


@alias_group.command('history', short_help='分析命令历史')
@click.option('--top', '-n', type=int, default=10, help='显示前 N 个命令')
@click.option('--long', '-l', is_flag=True, help='只显示长命令')
@click.option('--min-length', type=int, default=15, help='长命令最小长度')
def alias_history(top, long, min_length):
    """
    分析命令历史，显示最常用的命令。
    """
    analyzer = HistoryAnalyzer()
    commands = analyzer.get_all_commands()
    
    if not commands:
        click.echo("未找到命令历史")
        return
    
    click.echo(f"总共分析了 {len(commands)} 条命令")
    click.echo("-" * 60)
    
    if long:
        top_commands = analyzer.get_long_commands(
            commands, min_length=min_length, top_n=top
        )
        click.echo(f"最常用的长命令 (长度 >= {min_length}):")
    else:
        top_commands = analyzer.get_top_commands(
            commands, top_n=top, min_length=3, min_count=1
        )
        click.echo("使用频率最高的命令:")
    
    click.echo("-" * 60)
    
    if not top_commands:
        click.echo("没有符合条件的命令")
        return
    
    for cmd, count in top_commands:
        click.echo(f"  \033[1;36m{count:<5}\033[0m 次: {cmd}")


@alias_group.command('completion', short_help='生成补全脚本')
@click.option('--shell', '-s', type=click.Choice(['zsh', 'bash']), 
              help='指定 Shell 类型（默认自动检测）')
@click.option('--output', '-o', type=click.Path(), help='输出文件路径')
def alias_completion(shell, output):
    """
    生成 Tab 补全脚本。
    
    支持 zsh 和 bash 两种 Shell 的补全脚本生成。
    """
    manager = AliasManager()
    
    if shell is None:
        shell = manager.current_shell
    
    script = manager.generate_completion_script(shell)
    
    if output:
        try:
            with open(output, 'w', encoding='utf-8') as f:
                f.write(script)
            click.echo(f"补全脚本已保存到: {output}")
            
            click.echo("\n安装说明:")
            if shell == 'zsh':
                click.echo("  1. 将文件移动到补全目录:")
                click.echo("     mkdir -p ~/.zsh/completions")
                click.echo(f"     mv {output} ~/.zsh/completions/_cet")
                click.echo("  2. 在 ~/.zshrc 中添加:")
                click.echo("     fpath=(~/.zsh/completions $fpath)")
                click.echo("     autoload -Uz compinit")
                click.echo("     compinit")
            else:
                click.echo("  1. 在 ~/.bashrc 中添加:")
                click.echo(f"     source {output}")
        except Exception as e:
            click.echo(f"写入文件时出错: {e}")
    else:
        click.echo(script)


@main.command('info', short_help='系统信息查询')
@click.option('--format', '-f', 
              type=click.Choice(['pretty', 'minimal', 'json']), 
              default='pretty',
              help='输出格式: pretty（美化）、minimal（极简）、json（JSON）')
@click.option('--no-color', is_flag=True, help='禁用颜色输出')
def system_info(format, no_color):
    """
    查询系统信息。
    
    采集并显示以下信息：
    - 操作系统信息（OS、Kernel、发行版等）
    - 硬件信息（CPU、内存、显卡等）
    - 网络信息（主机名、内网 IP 等）
    
    支持多种输出格式，默认使用美化格式。
    """
    sys_info = SystemInfo()
    
    if format == 'pretty':
        output = sys_info.format_pretty()
        if no_color:
            output = _strip_ansi_codes(output)
        click.echo(output)
    
    elif format == 'minimal':
        output = sys_info.format_minimal()
        click.echo(output)
    
    elif format == 'json':
        output = sys_info.format_json()
        click.echo(output)


@main.command('neofetch', short_help='类 neofetch 输出')
@click.option('--no-color', is_flag=True, help='禁用颜色输出')
def neofetch_style(no_color):
    """
    以类 neofetch 风格显示系统信息。
    
    这是 'info --format pretty' 的快捷方式。
    """
    sys_info = SystemInfo()
    output = sys_info.format_pretty()
    
    if no_color:
        output = _strip_ansi_codes(output)
    
    click.echo(output)


def _strip_ansi_codes(text: str) -> str:
    """
    移除 ANSI 转义码（颜色代码）
    
    Args:
        text: 包含 ANSI 转义码的文本
        
    Returns:
        str: 移除转义码后的文本
    """
    import re
    ansi_escape = re.compile(r'\x1B\[[0-?]*[ -/]*[@-~]')
    return ansi_escape.sub('', text)


if __name__ == "__main__":
    main()
