"""
报告生成器模块
"""

import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum


class ReportFormat(Enum):
    """
    报告格式枚举
    """
    MARKDOWN = 'markdown'
    JSON = 'json'


class ReportGenerator:
    """
    报告生成器类
    """
    
    def __init__(self):
        """
        初始化报告生成器
        """
        self._setup_templates()
    
    def _setup_templates(self):
        """
        设置报告模板
        """
        self.templates = {
            'markdown': self._generate_markdown_report,
            'json': self._generate_json_report,
        }
    
    def generate(self, review_results: Dict[str, Any], 
                 output_format: str = 'markdown',
                 output_file: Optional[str] = None) -> str:
        """
        生成报告
        
        Args:
            review_results: 审查结果
            output_format: 输出格式（markdown 或 json）
            output_file: 输出文件路径
            
        Returns:
            str: 报告内容
        """
        format_enum = ReportFormat(output_format.lower())
        
        if format_enum == ReportFormat.MARKDOWN:
            report_content = self._generate_markdown_report(review_results)
        else:
            report_content = self._generate_json_report(review_results)
        
        if output_file:
            self._save_to_file(report_content, output_file)
        
        return report_content
    
    def _generate_markdown_report(self, review_results: Dict[str, Any]) -> str:
        """
        生成 Markdown 格式报告
        
        Args:
            review_results: 审查结果
            
        Returns:
            str: Markdown 报告内容
        """
        lines = []
        
        lines.append("# 代码审查报告")
        lines.append(f"*生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        lines.append("")
        
        lines.append("## 摘要")
        lines.append("")
        
        summary = self._calculate_summary(review_results)
        
        lines.append(f"- **总文件数**: {summary['total_files']}")
        lines.append(f"- **总问题数**: {summary['total_issues']}")
        lines.append(f"- **严重级别统计**:")
        lines.append(f"  - 🔴 Critical: {summary['severity_counts']['critical']}")
        lines.append(f"  - 🟠 High: {summary['severity_counts']['high']}")
        lines.append(f"  - 🟡 Medium: {summary['severity_counts']['medium']}")
        lines.append(f"  - 🔵 Low: {summary['severity_counts']['low']}")
        lines.append(f"  - ℹ️ Info: {summary['severity_counts']['info']}")
        lines.append("")
        
        lines.append(f"- **平均代码质量分数**: {summary['average_quality_score']:.1f}/100")
        lines.append("")
        
        lines.append("## 详细分析")
        lines.append("")
        
        if 'analysis' in review_results:
            for file_path, analysis in review_results['analysis'].items():
                lines.append(f"### 📄 {file_path}")
                lines.append("")
                
                if 'code_quality' in analysis:
                    quality = analysis['code_quality']
                    score = quality.get('quality_score', 0)
                    score_color = self._get_score_color(score)
                    lines.append(f"**代码质量分数**: {score_color} **{score}/100**")
                    lines.append("")
                
                if 'potential_bugs' in analysis and analysis['potential_bugs']:
                    lines.append("#### 🐛 潜在 Bug")
                    lines.append("")
                    for bug in analysis['potential_bugs']:
                        lines.append(self._format_issue_markdown(bug, 'bug'))
                        lines.append("")
                
                if 'security_issues' in analysis and analysis['security_issues']:
                    lines.append("#### 🔒 安全问题")
                    lines.append("")
                    for issue in analysis['security_issues']:
                        lines.append(self._format_issue_markdown(issue, 'security'))
                        lines.append("")
                
                if 'code_smells' in analysis and analysis['code_smells']:
                    lines.append("#### 💡 代码异味")
                    lines.append("")
                    for smell in analysis['code_smells']:
                        lines.append(self._format_issue_markdown(smell, 'smell'))
                        lines.append("")
                
                lines.append("---")
                lines.append("")
        
        if 'dependencies' in review_results:
            lines.append("## 📦 依赖分析")
            lines.append("")
            
            deps = review_results['dependencies']
            
            if 'dependencies' in deps and deps['dependencies']:
                lines.append("### 生产依赖更新")
                lines.append("")
                lines.append("| 包名 | 当前版本 | 最新版本 | 更新类型 | 风险级别 |")
                lines.append("|------|---------|---------|---------|---------|")
                
                for dep in deps['dependencies']:
                    update_type = dep.get('update_type', 'unknown')
                    risk = dep.get('risk_assessment', {}).get('risk_level', 'unknown')
                    lines.append(f"| {dep.get('package', 'N/A')} | {dep.get('current_version', 'N/A')} | {dep.get('latest_version', 'N/A')} | {update_type} | {risk} |")
                
                lines.append("")
            
            if 'dev_dependencies' in deps and deps['dev_dependencies']:
                lines.append("### 开发依赖更新")
                lines.append("")
                lines.append("| 包名 | 当前版本 | 最新版本 | 更新类型 | 风险级别 |")
                lines.append("|------|---------|---------|---------|---------|")
                
                for dep in deps['dev_dependencies']:
                    update_type = dep.get('update_type', 'unknown')
                    risk = dep.get('risk_assessment', {}).get('risk_level', 'unknown')
                    lines.append(f"| {dep.get('package', 'N/A')} | {dep.get('current_version', 'N/A')} | {dep.get('latest_version', 'N/A')} | {update_type} | {risk} |")
                
                lines.append("")
        
        lines.append("## 📋 优化建议")
        lines.append("")
        
        suggestions = self._generate_suggestions(review_results)
        
        if suggestions['critical']:
            lines.append("### 🔴 紧急修复建议")
            lines.append("")
            for suggestion in suggestions['critical']:
                lines.append(f"- **{suggestion['title']}**")
                lines.append(f"  - 描述: {suggestion['description']}")
                lines.append(f"  - 建议: {suggestion['suggestion']}")
                lines.append("")
        
        if suggestions['performance']:
            lines.append("### ⚡ 性能优化建议")
            lines.append("")
            for suggestion in suggestions['performance']:
                lines.append(f"- **{suggestion['title']}**")
                lines.append(f"  - 描述: {suggestion['description']}")
                lines.append(f"  - 建议: {suggestion['suggestion']}")
                lines.append("")
        
        if suggestions['readability']:
            lines.append("### 📖 可读性改进建议")
            lines.append("")
            for suggestion in suggestions['readability']:
                lines.append(f"- **{suggestion['title']}**")
                lines.append(f"  - 描述: {suggestion['description']}")
                lines.append(f"  - 建议: {suggestion['suggestion']}")
                lines.append("")
        
        lines.append("---")
        lines.append("")
        lines.append("*此报告由 Code Quality Toolkit 自动生成*")
        
        return '\n'.join(lines)
    
    def _generate_json_report(self, review_results: Dict[str, Any]) -> str:
        """
        生成 JSON 格式报告
        
        Args:
            review_results: 审查结果
            
        Returns:
            str: JSON 报告内容
        """
        report = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'tool': 'Code Quality Toolkit',
                'version': '1.0.0'
            },
            'summary': self._calculate_summary(review_results),
            'analysis': review_results.get('analysis', {}),
            'dependencies': review_results.get('dependencies', {}),
            'suggestions': self._generate_suggestions(review_results)
        }
        
        return json.dumps(report, indent=2, ensure_ascii=False, default=str)
    
    def _calculate_summary(self, review_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        计算摘要信息
        
        Args:
            review_results: 审查结果
            
        Returns:
            Dict[str, Any]: 摘要信息
        """
        summary = {
            'total_files': 0,
            'total_issues': 0,
            'severity_counts': {
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0,
                'info': 0
            },
            'category_counts': {
                'bug': 0,
                'security': 0,
                'smell': 0
            },
            'quality_scores': [],
            'average_quality_score': 0.0
        }
        
        if 'analysis' in review_results:
            summary['total_files'] = len(review_results['analysis'])
            
            for file_path, analysis in review_results['analysis'].items():
                if 'code_quality' in analysis:
                    quality = analysis['code_quality']
                    if 'quality_score' in quality:
                        summary['quality_scores'].append(quality['quality_score'])
                    
                    if 'statistics' in quality:
                        stats = quality['statistics']
                        for severity, count in stats.items():
                            if severity in summary['severity_counts']:
                                summary['severity_counts'][severity] += count
                
                if 'potential_bugs' in analysis:
                    for bug in analysis['potential_bugs']:
                        summary['total_issues'] += 1
                        summary['category_counts']['bug'] += 1
                        severity = bug.get('severity', 'info')
                        if severity in summary['severity_counts']:
                            summary['severity_counts'][severity] += 1
                
                if 'security_issues' in analysis:
                    for issue in analysis['security_issues']:
                        summary['total_issues'] += 1
                        summary['category_counts']['security'] += 1
                        severity = issue.get('severity', 'info')
                        if severity in summary['severity_counts']:
                            summary['severity_counts'][severity] += 1
                
                if 'code_smells' in analysis:
                    for smell in analysis['code_smells']:
                        summary['total_issues'] += 1
                        summary['category_counts']['smell'] += 1
                        severity = smell.get('severity', 'info')
                        if severity in summary['severity_counts']:
                            summary['severity_counts'][severity] += 1
        
        if summary['quality_scores']:
            summary['average_quality_score'] = sum(summary['quality_scores']) / len(summary['quality_scores'])
        
        return summary
    
    def _generate_suggestions(self, review_results: Dict[str, Any]) -> Dict[str, List[Dict[str, str]]]:
        """
        生成优化建议
        
        Args:
            review_results: 审查结果
            
        Returns:
            Dict[str, List[Dict[str, str]]]: 建议列表
        """
        suggestions = {
            'critical': [],
            'performance': [],
            'readability': []
        }
        
        seen_suggestions = set()
        
        if 'analysis' in review_results:
            for file_path, analysis in review_results['analysis'].items():
                if 'potential_bugs' in analysis:
                    for bug in analysis['potential_bugs']:
                        severity = bug.get('severity', 'low')
                        if severity in ['critical', 'high']:
                            key = f"bug:{bug.get('message', '')}"
                            if key not in seen_suggestions:
                                seen_suggestions.add(key)
                                suggestions['critical'].append({
                                    'title': bug.get('message', '未知问题'),
                                    'description': f"在文件 {file_path}{':' + str(bug.get('line')) if bug.get('line') else ''} 发现",
                                    'suggestion': bug.get('suggestion', '请修复此问题')
                                })
                
                if 'security_issues' in analysis:
                    for issue in analysis['security_issues']:
                        severity = issue.get('severity', 'low')
                        if severity in ['critical', 'high', 'medium']:
                            key = f"security:{issue.get('message', '')}"
                            if key not in seen_suggestions:
                                seen_suggestions.add(key)
                                suggestions['critical'].append({
                                    'title': issue.get('message', '未知安全问题'),
                                    'description': f"在文件 {file_path}{':' + str(issue.get('line')) if issue.get('line') else ''} 发现",
                                    'suggestion': issue.get('suggestion', '请修复此安全问题')
                                })
                
                if 'code_smells' in analysis:
                    for smell in analysis['code_smells']:
                        category = smell.get('category', 'general')
                        
                        if category in ['performance', 'resource']:
                            key = f"performance:{smell.get('message', '')}"
                            if key not in seen_suggestions:
                                seen_suggestions.add(key)
                                suggestions['performance'].append({
                                    'title': smell.get('message', '性能问题'),
                                    'description': f"在文件 {file_path}{':' + str(smell.get('line')) if smell.get('line') else ''} 发现",
                                    'suggestion': smell.get('suggestion', '请优化此代码')
                                })
                        else:
                            key = f"readability:{smell.get('message', '')}"
                            if key not in seen_suggestions:
                                seen_suggestions.add(key)
                                suggestions['readability'].append({
                                    'title': smell.get('message', '可读性问题'),
                                    'description': f"在文件 {file_path}{':' + str(smell.get('line')) if smell.get('line') else ''} 发现",
                                    'suggestion': smell.get('suggestion', '请改进此代码')
                                })
        
        return suggestions
    
    def _format_issue_markdown(self, issue: Dict[str, Any], issue_type: str) -> str:
        """
        格式化问题为 Markdown
        
        Args:
            issue: 问题字典
            issue_type: 问题类型（bug, security, smell）
            
        Returns:
            str: Markdown 格式的问题
        """
        lines = []
        
        severity = issue.get('severity', 'info')
        severity_icon = {
            'critical': '🔴',
            'high': '🟠',
            'medium': '🟡',
            'low': '🔵',
            'info': 'ℹ️'
        }.get(severity, '⚪')
        
        message = issue.get('message', '未知问题')
        lines.append(f"**{severity_icon} {severity.upper()}**: {message}")
        
        if issue.get('line'):
            lines.append(f"  - 位置: 第 {issue['line']} 行")
        
        if issue.get('code'):
            lines.append(f"  - 代码: `{issue['code']}`")
        
        if issue.get('suggestion'):
            lines.append(f"  - 建议: {issue['suggestion']}")
        
        if issue.get('cwe_id'):
            lines.append(f"  - CWE: {issue['cwe_id']}")
        
        return '\n'.join(lines)
    
    def _get_score_color(self, score: float) -> str:
        """
        获取分数对应的颜色描述
        
        Args:
            score: 分数（0-100）
            
        Returns:
            str: 颜色描述
        """
        if score >= 90:
            return '🟢'
        elif score >= 70:
            return '🟡'
        elif score >= 50:
            return '🟠'
        else:
            return '🔴'
    
    def _save_to_file(self, content: str, file_path: str):
        """
        保存内容到文件
        
        Args:
            content: 内容
            file_path: 文件路径
        """
        try:
            dir_name = os.path.dirname(file_path)
            if dir_name and not os.path.exists(dir_name):
                os.makedirs(dir_name)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            raise IOError(f"无法保存报告到 {file_path}: {e}")
