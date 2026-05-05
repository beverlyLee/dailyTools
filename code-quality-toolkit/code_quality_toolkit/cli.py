"""
代码质量管理工具集命令行入口
"""

import argparse
import json
import os
import sys
from typing import Dict, Any, Optional

from .code_review import (
    GitIntegration, CodeAnalyzer, BugDetector, 
    SecurityScanner, CodeSmellDetector, ReportGenerator
)
from .dependency_analyzer import DependencyAnalyzer
from .utils import Config, OutputFormatter


class CLI:
    """
    命令行接口主类
    """
    
    def __init__(self):
        """
        初始化 CLI
        """
        self.config = Config()
        self.formatter = OutputFormatter()
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
            'cyan': '\033[36m',
        }
    
    def _colorize(self, text: str, color: str) -> str:
        """
        给文本添加颜色
        
        Args:
            text: 文本
            color: 颜色
            
        Returns:
            str: 带颜色的文本
        """
        if sys.stdout.isatty():
            return f"{self.colors.get(color, '')}{text}{self.colors['reset']}"
        return text
    
    def run(self):
        """
        运行 CLI
        """
        parser = argparse.ArgumentParser(
            prog='code-quality-toolkit',
            description='代码质量管理工具集 - 智能代码审查和依赖更新分析',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog='''
示例:
  # 代码审查
  code-quality review --commit HEAD
  code-quality review --branch main --target develop
  code-quality review --staged
  
  # 依赖分析
  code-quality dependency check
  code-quality dependency analyze --package requests
  code-quality dependency update --interactive
            '''
        )
        
        parser.add_argument(
            '--version', '-v',
            action='version',
            version=f'code-quality-toolkit {self.config.version}'
        )
        
        parser.add_argument(
            '--config', '-c',
            type=str,
            help='配置文件路径'
        )
        
        subparsers = parser.add_subparsers(
            dest='command',
            help='可用命令'
        )
        
        self._add_review_subparser(subparsers)
        self._add_dependency_subparser(subparsers)
        
        args = parser.parse_args()
        
        if args.config:
            self.config.load_from_file(args.config)
        
        if not args.command:
            parser.print_help()
            return
        
        if args.command == 'review':
            self._handle_review(args)
        elif args.command == 'dependency':
            self._handle_dependency(args)
    
    def _add_review_subparser(self, subparsers):
        """
        添加代码审查子命令
        
        Args:
            subparsers: 子解析器
        """
        review_parser = subparsers.add_parser(
            'review',
            help='智能代码审查',
            description='自动分析 Git 提交或合并请求的代码变更'
        )
        
        review_group = review_parser.add_mutually_exclusive_group(required=True)
        review_group.add_argument(
            '--commit',
            type=str,
            help='指定提交哈希 (如 HEAD, abc123)'
        )
        review_group.add_argument(
            '--branch',
            type=str,
            help='源分支名称'
        )
        review_group.add_argument(
            '--staged',
            action='store_true',
            help='分析暂存区的变更'
        )
        
        review_parser.add_argument(
            '--target',
            type=str,
            help='目标分支名称 (与 --branch 配合使用)'
        )
        
        review_parser.add_argument(
            '--path', '-p',
            type=str,
            default='.',
            help='项目路径 (默认: 当前目录)'
        )
        
        review_parser.add_argument(
            '--output', '-o',
            type=str,
            help='输出文件路径'
        )
        
        review_parser.add_argument(
            '--format', '-f',
            choices=['markdown', 'json', 'console'],
            default='console',
            help='输出格式 (默认: console)'
        )
        
        review_parser.add_argument(
            '--severity', '-s',
            choices=['critical', 'high', 'medium', 'low', 'info', 'all'],
            default='all',
            help='显示的严重级别 (默认: all)'
        )
        
        review_parser.add_argument(
            '--no-bug',
            action='store_true',
            help='跳过 Bug 检测'
        )
        
        review_parser.add_argument(
            '--no-security',
            action='store_true',
            help='跳过安全扫描'
        )
        
        review_parser.add_argument(
            '--no-smell',
            action='store_true',
            help='跳过代码异味检测'
        )
    
    def _add_dependency_subparser(self, subparsers):
        """
        添加依赖分析子命令
        
        Args:
            subparsers: 子解析器
        """
        dep_parser = subparsers.add_parser(
            'dependency',
            help='依赖更新分析',
            description='检查依赖更新分析，包括版本检查、影响分析和交互式更新'
        )
        
        dep_subparsers = dep_parser.add_subparsers(
            dest='dep_command',
            help='依赖分析子命令'
        )
        
        check_parser = dep_subparsers.add_parser(
            'check',
            help='检查依赖更新'
        )
        check_parser.add_argument(
            '--path', '-p',
            type=str,
            default='.',
            help='项目路径 (默认: 当前目录)'
        )
        check_parser.add_argument(
            '--include-dev',
            action='store_true',
            help='包含开发依赖'
        )
        check_parser.add_argument(
            '--output', '-o',
            type=str,
            help='输出文件路径'
        )
        check_parser.add_argument(
            '--format', '-f',
            choices=['markdown', 'json', 'console'],
            default='console',
            help='输出格式 (默认: console)'
        )
        
        analyze_parser = dep_subparsers.add_parser(
            'analyze',
            help='分析特定依赖的更新影响'
        )
        analyze_parser.add_argument(
            'package',
            type=str,
            help='包名'
        )
        analyze_parser.add_argument(
            '--current-version',
            type=str,
            help='当前版本'
        )
        analyze_parser.add_argument(
            '--target-version',
            type=str,
            help='目标版本'
        )
        analyze_parser.add_argument(
            '--path', '-p',
            type=str,
            default='.',
            help='项目路径 (默认: 当前目录)'
        )
        
        update_parser = dep_subparsers.add_parser(
            'update',
            help='更新依赖'
        )
        update_parser.add_argument(
            '--path', '-p',
            type=str,
            default='.',
            help='项目路径 (默认: 当前目录)'
        )
        update_parser.add_argument(
            '--include-dev',
            action='store_true',
            help='包含开发依赖'
        )
        update_parser.add_argument(
            '--interactive', '-i',
            action='store_true',
            help='交互式更新模式'
        )
        update_parser.add_argument(
            '--all', '-a',
            action='store_true',
            help='更新所有可更新的依赖'
        )
        update_parser.add_argument(
            '--package',
            type=str,
            action='append',
            help='指定要更新的包 (可多次使用)'
        )
        
        plan_parser = dep_subparsers.add_parser(
            'plan',
            help='生成更新计划'
        )
        plan_parser.add_argument(
            '--path', '-p',
            type=str,
            default='.',
            help='项目路径 (默认: 当前目录)'
        )
        plan_parser.add_argument(
            '--include-dev',
            action='store_true',
            help='包含开发依赖'
        )
        plan_parser.add_argument(
            '--output', '-o',
            type=str,
            help='输出文件路径'
        )
    
    def _handle_review(self, args):
        """
        处理代码审查命令
        
        Args:
            args: 命令行参数
        """
        print(self._colorize("\n" + "=" * 70, 'blue'))
        print(self._colorize("  智能代码审查助手", 'bold'))
        print(self._colorize("=" * 70, 'blue')))
        
        git = GitIntegration(args.path)
        
        if args.commit:
            print(f"\n分析提交: {args.commit}")
            changes = git.get_changes(args.commit)
        elif args.branch:
            target = args.target or 'main'
            print(f"\n分析分支差异: {args.branch} -> {target}")
            changes = git.get_branch_diff(args.branch, target)
        elif args.staged:
            print(f"\n分析暂存区变更")
            changes = git.get_staged_changes()
        
        if not changes:
            print(self._colorize("没有发现任何代码变更", 'yellow'))
            return
        
        print(f"发现 {len(changes)} 个变更文件")
        
        analyzer = CodeAnalyzer()
        bug_detector = BugDetector()
        security_scanner = SecurityScanner()
        code_smell_detector = CodeSmellDetector()
        
        all_issues = {
            'bugs': [],
            'security': [],
            'code_smells': []
        }
        
        for change in changes:
            file_path = change.get('file', 'unknown')
            content = change.get('content', '')
            language = change.get('language', 'unknown')
            
            print(f"\n分析: {file_path}")
            
            if not args.no_bug:
                bugs = bug_detector.detect(content, language)
                for bug in bugs:
                    bug['file'] = file_path
                    all_issues['bugs'].append(bug)
            
            if not args.no_security:
                security_issues = security_scanner.scan(content, language)
                for issue in security_issues:
                    issue['file'] = file_path
                    all_issues['security'].append(issue)
            
            if not args.no_smell:
                smells = code_smell_detector.detect(content, language)
                for smell in smells:
                    smell['file'] = file_path
                    all_issues['code_smells'].append(smell)
        
        all_issues = self._filter_by_severity(all_issues, args.severity)
        
        report_generator = ReportGenerator()
        analysis_summary = analyzer.analyze_changes(changes)
        
        report = report_generator.generate(
            analysis_summary=analysis_summary,
            bugs=all_issues['bugs'],
            security_issues=all_issues['security'],
            code_smells=all_issues['code_smells'],
            format_type=args.format
        )
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"\n报告已保存到: {args.output}")
        else:
            print("\n" + report)
        
        self._print_review_summary(all_issues)
    
    def _filter_by_severity(self, issues: Dict[str, Any], severity: str) -> Dict[str, Any]:
        """
        按严重级别过滤问题
        
        Args:
            issues: 问题列表
            severity: 严重级别
            
        Returns:
            Dict[str, Any]: 过滤后的问题
        """
        if severity == 'all':
            return issues
        
        severity_order = ['info', 'low', 'medium', 'high', 'critical']
        min_index = severity_order.index(severity)
        
        filtered = {
            'bugs': [],
            'security': [],
            'code_smells': []
        }
        
        for issue_type, issue_list in issues.items():
            for issue in issue_list:
                issue_severity = issue.get('severity', 'info').lower()
                if issue_severity in severity_order:
                    issue_index = severity_order.index(issue_severity)
                    if issue_index >= min_index:
                        filtered[issue_type].append(issue)
        
        return filtered
    
    def _print_review_summary(self, issues: Dict[str, Any]):
        """
        打印代码审查摘要
        
        Args:
            issues: 问题列表
        """
        print(self._colorize("\n" + "-" * 70, 'cyan'))
        print(self._colorize("  审查摘要", 'bold'))
        print(self._colorize("-" * 70, 'cyan'))
        
        total_bugs = len(issues['bugs'])
        total_security = len(issues['security'])
        total_smells = len(issues['code_smells'])
        
        print(f"\n  Bug 检测: {self._colorize(str(total_bugs), 'red' if total_bugs > 0 else 'green')}")
        print(f"  安全问题: {self._colorize(str(total_security), 'red' if total_security > 0 else 'green')}")
        print(f"  代码异味: {self._colorize(str(total_smells), 'yellow' if total_smells > 0 else 'green')}")
        
        total = total_bugs + total_security + total_smells
        if total == 0:
            print(f"\n{self._colorize('✅ 代码质量良好，未发现问题！', 'green')}")
        else:
            print(f"\n{self._colorize(f'⚠️ 共发现 {total} 个问题需要关注', 'yellow')}")
    
    def _handle_dependency(self, args):
        """
        处理依赖分析命令
        
        Args:
            args: 命令行参数
        """
        if not args.dep_command:
            print(self._colorize("请指定依赖分析子命令", 'yellow'))
            print("可用命令: check, analyze, update, plan")
            return
        
        if args.dep_command == 'check':
            self._handle_dependency_check(args)
        elif args.dep_command == 'analyze':
            self._handle_dependency_analyze(args)
        elif args.dep_command == 'update':
            self._handle_dependency_update(args)
        elif args.dep_command == 'plan':
            self._handle_dependency_plan(args)
    
    def _handle_dependency_check(self, args):
        """
        处理依赖检查命令
        
        Args:
            args: 命令行参数
        """
        print(self._colorize("\n" + "=" * 70, 'blue'))
        print(self._colorize("  依赖更新检查", 'bold'))
        print(self._colorize("=" * 70, 'blue'))
        
        analyzer = DependencyAnalyzer(args.path)
        
        print(f"\n检查项目依赖更新...")
        if args.include_dev:
            print("包含开发依赖")
        
        updates = analyzer.check_updates(include_dev=args.include_dev)
        
        total = updates['summary']['total']
        
        if total == 0:
            print(self._colorize("\n✅ 所有依赖都是最新版本！", 'green'))
            return
        
        print(f"\n发现 {total} 个可更新的依赖:")
        print(f"  - 主版本更新: {updates['summary']['major_updates']}")
        print(f"  - 次版本更新: {updates['summary']['minor_updates']}")
        print(f"  - 补丁更新: {updates['summary']['patch_updates']}")
        
        for dep in updates['dependencies']:
            priority_color = {
                'critical': 'red',
                'high': 'yellow',
                'medium': 'cyan',
                'low': 'green'
            }.get(dep.get('update_type', 'low'), 'white')
            
            print(f"\n  {self._colorize(dep['package'], 'bold')}")
            print(f"    版本: {dep['current_version']} -> {self._colorize(dep['latest_version'], 'green')}")
            print(f"    类型: {self._colorize(dep['update_type'], priority_color)}")
        
        if args.format == 'json':
            output = json.dumps(updates, indent=2, ensure_ascii=False)
        else:
            output = self._generate_dependency_markdown(updates)
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"\n报告已保存到: {args.output}")
        elif args.format != 'console':
            print("\n" + output)
    
    def _handle_dependency_analyze(self, args):
        """
        处理依赖分析命令
        
        Args:
            args: 命令行参数
        """
        print(self._colorize("\n" + "=" * 70, 'blue'))
        print(self._colorize("  依赖更新影响分析", 'bold'))
        print(self._colorize("=" * 70, 'blue'))
        
        analyzer = DependencyAnalyzer(args.path)
        
        print(f"\n分析包: {args.package}")
        
        current_version = args.current_version
        target_version = args.target_version
        
        if not current_version:
            current_version = analyzer.version_checker.get_installed_version(args.package)
            if current_version:
                print(f"当前版本: {current_version}")
        
        if not target_version:
            target_version = analyzer.version_checker.get_latest_version(args.package)
            if target_version:
                print(f"最新版本: {target_version}")
        
        if not current_version or not target_version:
            print(self._colorize("无法获取版本信息", 'red'))
            return
        
        impact = analyzer.analyze_impact({
            'package': args.package,
            'current_version': current_version,
            'latest_version': target_version
        })
        
        print(f"\n影响级别: {self._colorize(impact['code_impact'].get('impact_level', 'unknown'), 'yellow')}")
        
        if impact['breaking_changes']:
            print(f"\n破坏性变更 ({len(impact['breaking_changes'])} 个):")
            for change in impact['breaking_changes']:
                print(f"  - [{change.get('severity', 'medium')}] {change.get('description', '未知')}")
        
        affected = impact['code_impact'].get('affected_files', [])
        if affected:
            print(f"\n受影响文件 ({len(affected)} 个):")
            for file in affected[:10]:
                print(f"  - {file}")
        
        risk = impact.get('risk_assessment', {})
        print(f"\n风险评估:")
        print(f"  风险级别: {risk.get('risk_level', 'low')}")
        for factor in risk.get('risk_factors', []):
            print(f"  - {factor}")
        
        for rec in impact['code_impact'].get('recommendations', []):
            print(f"\n  {rec}")
    
    def _handle_dependency_update(self, args):
        """
        处理依赖更新命令
        
        Args:
            args: 命令行参数
        """
        print(self._colorize("\n" + "=" * 70, 'blue'))
        print(self._colorize("  依赖更新", 'bold'))
        print(self._colorize("=" * 70, 'blue'))
        
        analyzer = DependencyAnalyzer(args.path)
        
        updates = analyzer.check_updates(include_dev=args.include_dev)
        
        if updates['summary']['total'] == 0:
            print(self._colorize("\n✅ 所有依赖都是最新版本！", 'green'))
            return
        
        suggestions = analyzer.generate_update_suggestions(updates)
        
        if args.interactive:
            print(f"\n启动交互式更新模式...")
            result = analyzer.interactive_update(suggestions)
        elif args.all:
            print(f"\n更新所有可更新的依赖...")
            for dep in suggestions.get('recommendations', []):
                dep['selected'] = True
            result = analyzer.interactive_update(suggestions)
        elif args.package:
            print(f"\n更新指定的依赖: {', '.join(args.package)}")
            for dep in suggestions.get('recommendations', []):
                if dep.get('package') in args.package:
                    dep['selected'] = True
            result = analyzer.interactive_update(suggestions)
        else:
            print(self._colorize("\n请指定更新模式: --interactive, --all, 或 --package", 'yellow'))
            print("示例:")
            print("  code-quality dependency update --interactive")
            print("  code-quality dependency update --all")
            print("  code-quality dependency update --package requests --package numpy")
            return
        
        return result
    
    def _handle_dependency_plan(self, args):
        """
        处理依赖更新计划命令
        
        Args:
            args: 命令行参数
        """
        print(self._colorize("\n" + "=" * 70, 'blue'))
        print(self._colorize("  生成更新计划", 'bold'))
        print(self._colorize("=" * 70, 'blue'))
        
        analyzer = DependencyAnalyzer(args.path)
        
        updates = analyzer.check_updates(include_dev=args.include_dev)
        
        if updates['summary']['total'] == 0:
            print(self._colorize("\n✅ 所有依赖都是最新版本！", 'green'))
            return
        
        suggestions = analyzer.generate_update_suggestions(updates)
        
        plan = {
            'summary': suggestions['summary'],
            'phases': [],
            'rollback_plan': {}
        }
        
        by_priority = suggestions.get('by_priority', {})
        
        priority_order = ['critical', 'high', 'medium', 'low']
        priority_names = {
            'critical': 'Phase 1: 紧急更新',
            'high': 'Phase 2: 高优先级更新',
            'medium': 'Phase 3: 中优先级更新',
            'low': 'Phase 4: 低优先级更新'
        }
        
        for priority in priority_order:
            if by_priority.get(priority):
                phase = {
                    'phase': priority_names[priority],
                    'priority': priority,
                    'packages': [s.package_name for s in by_priority[priority]],
                    'count': len(by_priority[priority])
                }
                plan['phases'].append(phase)
        
        print(f"\n更新计划:")
        for phase in plan['phases']:
            print(f"\n  {self._colorize(phase['phase'], 'bold')}")
            print(f"    包数量: {phase['count']}")
            print(f"    包列表: {', '.join(phase['packages'])}")
        
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(plan, f, indent=2, ensure_ascii=False)
            print(f"\n计划已保存到: {args.output}")
        
        return plan
    
    def _generate_dependency_markdown(self, updates: Dict[str, Any]) -> str:
        """
        生成依赖更新的 Markdown 报告
        
        Args:
            updates: 更新信息
            
        Returns:
            str: Markdown 文本
        """
        lines = []
        
        lines.append("# 依赖更新报告")
        lines.append("")
        lines.append("## 摘要")
        lines.append("")
        lines.append(f"- **总更新: {updates['summary']['total']}")
        lines.append(f"- **主版本更新**: {updates['summary']['major_updates']}")
        lines.append(f"- **次版本更新**: {updates['summary']['minor_updates']}")
        lines.append(f"- **补丁更新**: {updates['summary']['patch_updates']}")
        lines.append("")
        
        if updates['dependencies']:
            lines.append("## 生产依赖更新")
            lines.append("")
            lines.append("| 包名 | 当前版本 | 最新版本 | 更新类型 |")
            lines.append("|------|----------|----------|----------|")
            for dep in updates['dependencies']:
                lines.append(f"| {dep['package']} | {dep['current_version']} | {dep['latest_version']} | {dep['update_type']} |")
            lines.append("")
        
        if updates.get('dev_dependencies'):
            lines.append("## 开发依赖更新")
            lines.append("")
            lines.append("| 包名 | 当前版本 | 最新版本 | 更新类型 |")
            lines.append("|------|----------|----------|----------|")
            for dep in updates['dev_dependencies']:
                lines.append(f"| {dep['package']} | {dep['current_version']} | {dep['latest_version']} | {dep['update_type']} |")
            lines.append("")
        
        return "\n".join(lines)


def main():
    """
    主函数
    """
    cli = CLI()
    cli.run()


if __name__ == '__main__':
    main()
