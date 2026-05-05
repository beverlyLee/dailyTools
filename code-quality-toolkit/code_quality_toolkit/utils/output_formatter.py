"""
输出格式化器模块
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime


class OutputFormatter:
    """
    输出格式化器类
    """
    
    COLORS = {
        'reset': '\033[0m',
        'bold': '\033[1m',
        'red': '\033[31m',
        'green': '\033[32m',
        'yellow': '\033[33m',
        'blue': '\033[34m',
        'magenta': '\033[35m',
        'cyan': '\033[36m',
        'white': '\033[37m',
        'bg_red': '\033[41m',
        'bg_green': '\033[42m',
        'bg_yellow': '\033[43m',
    }
    
    SEVERITY_COLORS = {
        'critical': 'bg_red',
        'high': 'red',
        'medium': 'yellow',
        'low': 'blue',
        'info': 'cyan'
    }
    
    def __init__(self, use_colors: bool = True):
        """
        初始化输出格式化器
        
        Args:
            use_colors: 是否使用颜色输出
        """
        self.use_colors = use_colors
    
    def colorize(self, text: str, color: str) -> str:
        """
        为文本添加颜色
        
        Args:
            text: 文本内容
            color: 颜色名称
            
        Returns:
            str: 带颜色的文本
        """
        if not self.use_colors:
            return text
        
        color_code = self.COLORS.get(color, '')
        reset_code = self.COLORS.get('reset', '')
        
        return f"{color_code}{text}{reset_code}"
    
    def format_severity(self, severity: str) -> str:
        """
        格式化严重级别
        
        Args:
            severity: 严重级别
            
        Returns:
            str: 格式化后的严重级别
        """
        color = self.SEVERITY_COLORS.get(severity, 'white')
        return self.colorize(severity.upper(), color)
    
    def format_header(self, title: str, level: int = 1) -> str:
        """
        格式化标题
        
        Args:
            title: 标题文本
            level: 标题级别（1-6）
            
        Returns:
            str: 格式化后的标题
        """
        prefix = '#' * level
        return f"\n{prefix} {title}\n"
    
    def format_list(self, items: List[str], bullet: str = '•') -> str:
        """
        格式化列表
        
        Args:
            items: 列表项
            bullet: 列表符号
            
        Returns:
            str: 格式化后的列表
        """
        lines = []
        for item in items:
            lines.append(f"  {bullet} {item}")
        return '\n'.join(lines)
    
    def format_table(self, headers: List[str], rows: List[List[str]]) -> str:
        """
        格式化表格
        
        Args:
            headers: 表头
            rows: 行数据
            
        Returns:
            str: 格式化后的表格
        """
        if not rows:
            return "无数据"
        
        col_widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                if i < len(col_widths):
                    col_widths[i] = max(col_widths[i], len(str(cell)))
        
        lines = []
        
        header_line = ' | '.join(f"{h:<{w}}" for h, w in zip(headers, col_widths))
        lines.append(header_line)
        
        separator = '-+-'.join('-' * w for w in col_widths)
        lines.append(separator)
        
        for row in rows:
            row_line = ' | '.join(f"{str(cell):<{w}}" for cell, w in zip(row, col_widths))
            lines.append(row_line)
        
        return '\n'.join(lines)
    
    def format_json(self, data: Dict[str, Any], indent: int = 2) -> str:
        """
        格式化为 JSON
        
        Args:
            data: 数据字典
            indent: 缩进级别
            
        Returns:
            str: JSON 字符串
        """
        return json.dumps(data, indent=indent, ensure_ascii=False, default=str)
    
    def format_markdown_report(self, title: str, sections: Dict[str, Any]) -> str:
        """
        格式化为 Markdown 报告
        
        Args:
            title: 报告标题
            sections: 章节内容
            
        Returns:
            str: Markdown 报告
        """
        lines = []
        
        lines.append(f"# {title}")
        lines.append(f"*生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        lines.append("")
        
        for section_title, section_content in sections.items():
            lines.append(f"## {section_title}")
            lines.append("")
            
            if isinstance(section_content, str):
                lines.append(section_content)
            elif isinstance(section_content, list):
                for item in section_content:
                    if isinstance(item, dict):
                        lines.append(f"### {item.get('title', '项')}")
                        lines.append("")
                        if 'description' in item:
                            lines.append(item['description'])
                        if 'items' in item:
                            for sub_item in item['items']:
                                lines.append(f"- {sub_item}")
                        lines.append("")
                    else:
                        lines.append(f"- {item}")
            elif isinstance(section_content, dict):
                for key, value in section_content.items():
                    lines.append(f"**{key}**: {value}")
                lines.append("")
            
            lines.append("")
        
        return '\n'.join(lines)
    
    def format_issue(self, issue: Dict[str, Any]) -> str:
        """
        格式化单个问题
        
        Args:
            issue: 问题字典
            
        Returns:
            str: 格式化后的问题
        """
        severity = issue.get('severity', 'info')
        formatted_severity = self.format_severity(severity)
        
        lines = []
        lines.append(f"[{formatted_severity}] {issue.get('message', '未知问题')}")
        
        if 'file' in issue:
            file_info = f"  文件: {issue['file']}"
            if 'line' in issue:
                file_info += f":{issue['line']}"
            lines.append(file_info)
        
        if 'suggestion' in issue:
            lines.append(f"  建议: {issue['suggestion']}")
        
        if 'code' in issue:
            lines.append(f"  相关代码: {issue['code']}")
        
        return '\n'.join(lines)
    
    def format_summary(self, summary: Dict[str, Any]) -> str:
        """
        格式化摘要
        
        Args:
            summary: 摘要数据
            
        Returns:
            str: 格式化后的摘要
        """
        lines = []
        lines.append(self.colorize("=" * 60, 'bold'))
        lines.append(self.colorize("摘要", 'bold'))
        lines.append(self.colorize("=" * 60, 'bold'))
        
        for key, value in summary.items():
            if isinstance(value, dict):
                lines.append(f"\n{key}:")
                for sub_key, sub_value in value.items():
                    lines.append(f"  {sub_key}: {sub_value}")
            else:
                lines.append(f"{key}: {value}")
        
        return '\n'.join(lines)
    
    def format_dependency_update(self, update: Dict[str, Any]) -> str:
        """
        格式化依赖更新信息
        
        Args:
            update: 更新信息
            
        Returns:
            str: 格式化后的更新信息
        """
        lines = []
        
        package = update.get('package', '未知包')
        current = update.get('current_version', '未知')
        latest = update.get('latest_version', '未知')
        update_type = update.get('update_type', 'other')
        
        type_color = {
            'major': 'red',
            'minor': 'yellow',
            'patch': 'green'
        }.get(update_type, 'white')
        
        lines.append(f"📦 {self.colorize(package, 'bold')}")
        lines.append(f"  当前版本: {current}")
        lines.append(f"  最新版本: {self.colorize(latest, type_color)}")
        lines.append(f"  更新类型: {self.colorize(update_type.upper(), type_color)}")
        
        if 'description' in update and update['description']:
            lines.append(f"  描述: {update['description']}")
        
        if 'changelog' in update and update['changelog']:
            lines.append(f"  更新日志: {update['changelog']}")
        
        if 'risk_assessment' in update:
            risk = update['risk_assessment']
            risk_level = risk.get('risk_level', 'unknown')
            risk_color = {
                'high': 'red',
                'medium': 'yellow',
                'low': 'green'
            }.get(risk_level, 'white')
            
            lines.append(f"  风险级别: {self.colorize(risk_level.upper(), risk_color)}")
            lines.append(f"  推荐: {risk.get('recommendation', '无')}")
        
        return '\n'.join(lines)
