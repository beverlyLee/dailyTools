"""
交互式更新器模块
"""

import os
import sys
import subprocess
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum


class UserChoice(Enum):
    """
    用户选择枚举
    """
    UPDATE = 'update'
    SKIP = 'skip'
    LATER = 'later'
    SHOW_DETAILS = 'details'
    ABORT = 'abort'


@dataclass
class UpdateOption:
    """
    更新选项数据类
    """
    package_name: str
    current_version: str
    latest_version: str
    priority: str
    update_type: str
    selected: bool = False
    details: Optional[Dict[str, Any]] = None


class InteractiveUpdater:
    """
    交互式更新器类
    """
    
    def __init__(self, project_path: str = '.'):
        """
        初始化交互式更新器
        
        Args:
            project_path: 项目路径
        """
        self.project_path = project_path
        self._setup_colors()
    
    def _setup_colors(self):
        """
        设置终端颜色
        """
        self.colors = {
            'reset': '\033[0m',
            'bold': '\033[1m',
            'red': '\033[31m',
            'green': '\033[32m',
            'yellow': '\033[33m',
            'blue': '\033[34m',
            'magenta': '\033[35m',
            'cyan': '\033[36m',
            'white': '\033[37m',
        }
    
    def _colorize(self, text: str, color: str) -> str:
        """
        给文本添加颜色
        
        Args:
            text: 文本
            color: 颜色名称
            
        Returns:
            str: 带颜色的文本
        """
        if sys.stdout.isatty():
            return f"{self.colors.get(color, '')}{text}{self.colors['reset']}"
        return text
    
    def _print_header(self, title: str):
        """
        打印标题
        
        Args:
            title: 标题
        """
        print("\n" + "=" * 60)
        print(self._colorize(f"  {title}", 'bold'))
        print("=" * 60)
    
    def _print_separator(self):
        """
        打印分隔线
        """
        print("-" * 60)
    
    def run(self, suggestions: Dict[str, Any]) -> Dict[str, Any]:
        """
        运行交互式更新
        
        Args:
            suggestions: 更新建议
            
        Returns:
            Dict[str, Any]: 更新结果
        """
        result = {
            'selected_updates': [],
            'skipped_updates': [],
            'update_results': [],
            'summary': {
                'total': suggestions['summary']['total_updates'],
                'selected': 0,
                'skipped': 0,
                'success': 0,
                'failed': 0
            }
        }
        
        self._print_header("依赖更新助手")
        print(f"\n发现 {suggestions['summary']['total_updates']} 个可更新的依赖")
        print(f"  - 紧急: {suggestions['summary']['critical_updates']}")
        print(f"  - 高优先级: {suggestions['summary']['high_updates']}")
        print(f"  - 中优先级: {suggestions['summary']['medium_updates']}")
        print(f"  - 低优先级: {suggestions['summary']['low_updates']}")
        
        self._print_separator()
        
        options = self._build_update_options(suggestions)
        
        print("\n请选择更新模式:")
        print("  1. 交互式逐个确认")
        print("  2. 按优先级批量选择")
        print("  3. 全选所有更新")
        print("  4. 退出")
        
        mode = self._get_input("请选择 (1-4): ", ['1', '2', '3', '4'])
        
        if mode == '4':
            print(self._colorize("已退出更新流程", 'yellow'))
            return result
        
        if mode == '1':
            result = self._interactive_mode(options, suggestions)
        elif mode == '2':
            result = self._batch_by_priority(options, suggestions)
        elif mode == '3':
            result = self._select_all(options, suggestions)
        
        if result['selected_updates']:
            execute = self._confirm_execution(result['selected_updates'])
            if execute:
                result = self._execute_updates(result)
            else:
                print(self._colorize("已取消更新", 'yellow'))
        
        self._print_final_summary(result)
        
        return result
    
    def _build_update_options(self, suggestions: Dict[str, Any]) -> List[UpdateOption]:
        """
        构建更新选项列表
        
        Args:
            suggestions: 更新建议
            
        Returns:
            List[UpdateOption]: 更新选项列表
        """
        options = []
        
        priority_order = ['critical', 'high', 'medium', 'low']
        
        for priority in priority_order:
            for rec in suggestions.get('recommendations', []):
                if rec.get('priority') == priority:
                    options.append(UpdateOption(
                        package_name=rec.get('package', 'unknown'),
                        current_version=rec.get('current_version', 'unknown'),
                        latest_version=rec.get('latest_version', 'unknown'),
                        priority=rec.get('priority', 'low'),
                        update_type=rec.get('update_type', 'patch'),
                        details=rec
                    ))
        
        return options
    
    def _get_input(self, prompt: str, valid_choices: Optional[List[str]] = None) -> str:
        """
        获取用户输入
        
        Args:
            prompt: 提示文本
            valid_choices: 有效选项列表
            
        Returns:
            str: 用户输入
        """
        while True:
            try:
                user_input = input(self._colorize(prompt, 'cyan')).strip().lower()
                
                if valid_choices:
                    if user_input in valid_choices:
                        return user_input
                    print(self._colorize(f"无效输入，请选择: {', '.join(valid_choices)}", 'red'))
                else:
                    return user_input
            except (KeyboardInterrupt, EOFError):
                print("\n" + self._colorize("操作已取消", 'yellow'))
                return 'abort'
    
    def _interactive_mode(self, options: List[UpdateOption], 
                          suggestions: Dict[str, Any]) -> Dict[str, Any]:
        """
        交互式模式
        
        Args:
            options: 更新选项
            suggestions: 更新建议
            
        Returns:
            Dict[str, Any]: 结果
        """
        result = {
            'selected_updates': [],
            'skipped_updates': [],
            'update_results': [],
            'summary': {
                'total': len(options),
                'selected': 0,
                'skipped': 0,
                'success': 0,
                'failed': 0
            }
        }
        
        self._print_header("交互式更新模式")
        print("\n将逐个显示每个更新选项，请选择操作:")
        print("  u/y - 更新此包")
        print("  s/n - 跳过此包")
        print("  d - 显示详细信息")
        print("  a - 全部更新剩余的")
        print("  q - 退出\n")
        
        for i, option in enumerate(options, 1):
            self._print_package_option(i, option)
            
            choice = self._get_input(
                f"[{i}/{len(options)}] 选择操作 (u/s/d/a/q): ",
                ['u', 's', 'd', 'a', 'q', 'y', 'n']
            )
            
            if choice == 'q':
                print(self._colorize("\n已退出交互式选择", 'yellow'))
                break
            
            if choice == 'a':
                for remaining in options[i-1:]:
                    remaining.selected = True
                    result['selected_updates'].append(self._option_to_dict(remaining))
                print(self._colorize(f"\n已选择剩余的 {len(options) - i + 1} 个包进行更新", 'green'))
                break
            
            if choice == 'd':
                self._show_package_details(option)
                choice = self._get_input(
                    "选择操作 (u/s/q): ",
                    ['u', 's', 'q', 'y', 'n']
                )
                
                if choice == 'q':
                    break
            
            if choice in ['u', 'y']:
                option.selected = True
                result['selected_updates'].append(self._option_to_dict(option))
                print(self._colorize(f"  ✓ 已选择更新 {option.package_name}", 'green'))
            elif choice in ['s', 'n']:
                result['skipped_updates'].append(self._option_to_dict(option))
                print(self._colorize(f"  ✗ 已跳过 {option.package_name}", 'yellow'))
        
        result['summary']['selected'] = len(result['selected_updates'])
        result['summary']['skipped'] = len(result['skipped_updates'])
        
        return result
    
    def _batch_by_priority(self, options: List[UpdateOption], 
                           suggestions: Dict[str, Any]) -> Dict[str, Any]:
        """
        按优先级批量选择
        
        Args:
            options: 更新选项
            suggestions: 更新建议
            
        Returns:
            Dict[str, Any]: 结果
        """
        result = {
            'selected_updates': [],
            'skipped_updates': [],
            'update_results': [],
            'summary': {
                'total': len(options),
                'selected': 0,
                'skipped': 0,
                'success': 0,
                'failed': 0
            }
        }
        
        self._print_header("按优先级批量选择")
        
        priorities = [
            ('critical', '紧急更新', 'red'),
            ('high', '高优先级更新', 'yellow'),
            ('medium', '中优先级更新', 'cyan'),
            ('low', '低优先级更新', 'green')
        ]
        
        for priority_key, priority_name, color in priorities:
            priority_options = [o for o in options if o.priority == priority_key]
            
            if not priority_options:
                continue
            
            print(f"\n{self._colorize(priority_name, color)} ({len(priority_options)} 个包):")
            for opt in priority_options:
                print(f"  - {opt.package_name}: {opt.current_version} -> {opt.latest_version}")
            
            choice = self._get_input(
                f"\n是否选择这些 {priority_name}? (y/n/d): ",
                ['y', 'n', 'd']
            )
            
            if choice == 'd':
                for opt in priority_options:
                    self._show_package_details(opt)
            
            if choice == 'y':
                for opt in priority_options:
                    opt.selected = True
                    result['selected_updates'].append(self._option_to_dict(opt))
                print(self._colorize(f"  ✓ 已选择 {len(priority_options)} 个包", 'green'))
            else:
                for opt in priority_options:
                    result['skipped_updates'].append(self._option_to_dict(opt))
                print(self._colorize(f"  ✗ 已跳过 {len(priority_options)} 个包", 'yellow'))
        
        result['summary']['selected'] = len(result['selected_updates'])
        result['summary']['skipped'] = len(result['skipped_updates'])
        
        return result
    
    def _select_all(self, options: List[UpdateOption], 
                    suggestions: Dict[str, Any]) -> Dict[str, Any]:
        """
        全选所有更新
        
        Args:
            options: 更新选项
            suggestions: 更新建议
            
        Returns:
            Dict[str, Any]: 结果
        """
        result = {
            'selected_updates': [],
            'skipped_updates': [],
            'update_results': [],
            'summary': {
                'total': len(options),
                'selected': len(options),
                'skipped': 0,
                'success': 0,
                'failed': 0
            }
        }
        
        self._print_header("全选模式")
        
        print(f"\n已选择所有 {len(options)} 个更新:")
        for opt in options:
            opt.selected = True
            result['selected_updates'].append(self._option_to_dict(opt))
            print(f"  - {opt.package_name}: {opt.current_version} -> {opt.latest_version}")
        
        return result
    
    def _print_package_option(self, index: int, option: UpdateOption):
        """
        打印包选项
        
        Args:
            index: 序号
            option: 选项
        """
        priority_colors = {
            'critical': 'red',
            'high': 'yellow',
            'medium': 'cyan',
            'low': 'green'
        }
        
        priority_labels = {
            'critical': '紧急',
            'high': '高',
            'medium': '中',
            'low': '低'
        }
        
        update_type_labels = {
            'major': '主版本',
            'minor': '次版本',
            'patch': '补丁',
            'other': '其他'
        }
        
        color = priority_colors.get(option.priority, 'white')
        priority_label = priority_labels.get(option.priority, '未知')
        update_type_label = update_type_labels.get(option.update_type, '未知')
        
        print(f"\n  {self._colorize(f'[{index}] {option.package_name}', 'bold')}")
        print(f"      版本: {option.current_version} -> {self._colorize(option.latest_version, 'green')}")
        print(f"      优先级: {self._colorize(priority_label, color)}")
        print(f"      更新类型: {update_type_label}")
    
    def _show_package_details(self, option: UpdateOption):
        """
        显示包详细信息
        
        Args:
            option: 选项
        """
        print(f"\n{'='*60}")
        print(self._colorize(f"  {option.package_name} 详细信息", 'bold'))
        print('='*60)
        
        details = option.details or {}
        
        print(f"\n  版本信息:")
        print(f"    当前版本: {option.current_version}")
        print(f"    最新版本: {option.latest_version}")
        
        risk = details.get('risk_assessment', {})
        print(f"\n  风险评估:")
        print(f"    风险级别: {risk.get('risk_level', 'low')}")
        
        risk_factors = risk.get('risk_factors', [])
        if risk_factors:
            print(f"    风险因素:")
            for factor in risk_factors:
                print(f"      - {factor}")
        
        breaking = details.get('breaking_changes', [])
        if breaking:
            print(f"\n  破坏性变更 ({len(breaking)} 个):")
            for change in breaking[:5]:
                severity = change.get('severity', 'medium')
                desc = change.get('description', '未知')
                print(f"    [{severity}] {desc}")
        
        affected = details.get('affected_files', [])
        if affected:
            print(f"\n  受影响文件 ({len(affected)} 个):")
            for file in affected[:10]:
                print(f"    - {file}")
        
        recs = details.get('recommendations', [])
        if recs:
            print(f"\n  建议:")
            for rec in recs[:5]:
                print(f"    {rec}")
        
        print('='*60)
    
    def _option_to_dict(self, option: UpdateOption) -> Dict[str, Any]:
        """
        将选项转换为字典
        
        Args:
            option: 选项
            
        Returns:
            Dict[str, Any]: 字典
        """
        return {
            'package': option.package_name,
            'current_version': option.current_version,
            'latest_version': option.latest_version,
            'priority': option.priority,
            'update_type': option.update_type,
            'details': option.details
        }
    
    def _confirm_execution(self, selected_updates: List[Dict[str, Any]]) -> bool:
        """
        确认执行更新
        
        Args:
            selected_updates: 选择的更新列表
            
        Returns:
            bool: 是否确认
        """
        self._print_separator()
        print(f"\n已选择 {len(selected_updates)} 个包进行更新:")
        
        for update in selected_updates:
            print(f"  - {update['package']}: {update['current_version']} -> {update['latest_version']}")
        
        print("\n" + self._colorize("警告: 更新可能引入兼容性问题", 'yellow'))
        print(self._colorize("建议先在测试环境验证", 'yellow'))
        
        choice = self._get_input("\n确认执行更新? (y/n): ", ['y', 'n'])
        
        return choice == 'y'
    
    def _execute_updates(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行更新
        
        Args:
            result: 结果字典
            
        Returns:
            Dict[str, Any]: 更新后的结果
        """
        self._print_header("执行更新")
        
        selected = result.get('selected_updates', [])
        
        for i, update in enumerate(selected, 1):
            package = update.get('package', 'unknown')
            current = update.get('current_version', 'unknown')
            latest = update.get('latest_version', 'unknown')
            
            print(f"\n[{i}/{len(selected)}] 更新 {package}...")
            print(f"  {current} -> {latest}")
            
            update_result = self._update_package(package, latest)
            
            result['update_results'].append({
                'package': package,
                'current_version': current,
                'target_version': latest,
                'success': update_result['success'],
                'message': update_result.get('message', '')
            })
            
            if update_result['success']:
                result['summary']['success'] += 1
                print(self._colorize(f"  ✓ 更新成功", 'green'))
            else:
                result['summary']['failed'] += 1
                print(self._colorize(f"  ✗ 更新失败: {update_result.get('message', '未知错误')}", 'red'))
        
        return result
    
    def _update_package(self, package_name: str, version: str) -> Dict[str, Any]:
        """
        更新单个包
        
        Args:
            package_name: 包名
            version: 版本
            
        Returns:
            Dict[str, Any]: 结果
        """
        result = {
            'success': False,
            'message': ''
        }
        
        try:
            package_spec = f"{package_name}=={version}" if version != 'latest' else package_name
            
            cmd = [
                sys.executable, '-m', 'pip', 'install',
                '--upgrade', package_spec
            ]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(timeout=300)
            
            if process.returncode == 0:
                result['success'] = True
                result['message'] = '更新成功'
            else:
                result['message'] = stderr.strip() or '更新失败'
        
        except subprocess.TimeoutExpired:
            result['message'] = '更新超时'
        except Exception as e:
            result['message'] = str(e)
        
        return result
    
    def _print_final_summary(self, result: Dict[str, Any]):
        """
        打印最终摘要
        
        Args:
            result: 结果
        """
        self._print_header("更新摘要")
        
        summary = result.get('summary', {})
        
        print(f"\n  总计: {summary.get('total', 0)} 个包")
        print(f"  选择更新: {summary.get('selected', 0)} 个")
        print(f"  跳过: {summary.get('skipped', 0)} 个")
        print(f"  更新成功: {self._colorize(str(summary.get('success', 0)), 'green')}")
        print(f"  更新失败: {self._colorize(str(summary.get('failed', 0)), 'red')}")
        
        failed = [r for r in result.get('update_results', []) if not r.get('success')]
        if failed:
            print(f"\n  失败的更新:")
            for f in failed:
                print(f"    - {f['package']}: {f.get('message', '未知错误')}")
        
        if summary.get('success', 0) > 0 and summary.get('failed', 0) == 0:
            print(f"\n{self._colorize('🎉 所有更新成功完成！', 'green')}")
        elif summary.get('success', 0) > 0:
            print(f"\n{self._colorize('⚠️ 部分更新成功，部分失败', 'yellow')}")
        elif summary.get('selected', 0) == 0:
            print(f"\n{self._colorize('📋 未选择任何更新', 'yellow')}")
        
        self._print_separator()
