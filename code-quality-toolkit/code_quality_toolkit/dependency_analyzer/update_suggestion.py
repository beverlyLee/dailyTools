"""
更新建议生成器模块
"""

import os
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class UpdatePriority(Enum):
    """
    更新优先级枚举
    """
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'


@dataclass
class UpdateSuggestion:
    """
    更新建议数据类
    """
    package_name: str
    current_version: str
    latest_version: str
    update_type: str
    priority: UpdatePriority
    risk_assessment: Dict[str, Any]
    recommendations: List[str]
    affected_files: List[str]
    breaking_changes: List[Dict[str, Any]]


class UpdateSuggestionGenerator:
    """
    更新建议生成器类
    """
    
    def __init__(self):
        """
        初始化更新建议生成器
        """
        self._setup_priority_rules()
    
    def _setup_priority_rules(self):
        """
        设置优先级规则
        """
        self.priority_rules = {
            'security': {
                'keywords': [
                    'security', 'vulnerability', 'cve', 'patch', 'fix',
                    '安全', '漏洞', '修复'
                ],
                'priority': UpdatePriority.CRITICAL
            },
            'critical_bug': {
                'keywords': [
                    'critical', 'severe', 'major', 'crash', 'deadlock',
                    '严重', '崩溃', '死锁'
                ],
                'priority': UpdatePriority.CRITICAL
            },
            'major_update': {
                'update_types': ['major'],
                'priority': UpdatePriority.HIGH
            },
            'minor_update': {
                'update_types': ['minor'],
                'priority': UpdatePriority.MEDIUM
            },
            'patch_update': {
                'update_types': ['patch'],
                'priority': UpdatePriority.LOW
            },
        }
    
    def generate(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成更新建议
        
        Args:
            updates: 更新检查结果
            
        Returns:
            Dict[str, Any]: 更新建议
        """
        suggestions = {
            'summary': {
                'total_updates': 0,
                'critical_updates': 0,
                'high_updates': 0,
                'medium_updates': 0,
                'low_updates': 0,
            },
            'recommendations': [],
            'by_priority': {
                'critical': [],
                'high': [],
                'medium': [],
                'low': []
            },
            'batch_suggestions': []
        }
        
        all_dependencies = updates.get('dependencies', []) + updates.get('dev_dependencies', [])
        
        for dep in all_dependencies:
            suggestion = self._generate_single_suggestion(dep)
            
            suggestions['summary']['total_updates'] += 1
            priority_key = suggestion.priority.value
            suggestions['summary'][f'{priority_key}_updates'] += 1
            suggestions['by_priority'][priority_key].append(suggestion)
            
            suggestions['recommendations'].append({
                'package': suggestion.package_name,
                'current_version': suggestion.current_version,
                'latest_version': suggestion.latest_version,
                'update_type': suggestion.update_type,
                'priority': suggestion.priority.value,
                'risk_assessment': suggestion.risk_assessment,
                'recommendations': suggestion.recommendations,
                'affected_files': suggestion.affected_files,
                'breaking_changes': suggestion.breaking_changes
            })
        
        suggestions['batch_suggestions'] = self._generate_batch_suggestions(
            suggestions['by_priority']
        )
        
        suggestions['summary']['recommended_action'] = self._get_recommended_action(
            suggestions['summary']
        )
        
        return suggestions
    
    def _generate_single_suggestion(self, dependency: Dict[str, Any]) -> UpdateSuggestion:
        """
        生成单个更新建议
        
        Args:
            dependency: 依赖信息
            
        Returns:
            UpdateSuggestion: 更新建议
        """
        package_name = dependency.get('package', 'unknown')
        current_version = dependency.get('current_version', 'unknown')
        latest_version = dependency.get('latest_version', 'unknown')
        update_type = dependency.get('update_type', 'other')
        
        priority = self._determine_priority(dependency)
        
        risk_assessment = dependency.get('risk_assessment', {
            'risk_level': 'low',
            'risk_factors': [],
            'recommendation': '可以安全升级'
        })
        
        recommendations = self._generate_recommendations(dependency, priority)
        
        affected_files = dependency.get('affected_files', [])
        
        breaking_changes = dependency.get('breaking_changes', [])
        
        return UpdateSuggestion(
            package_name=package_name,
            current_version=current_version,
            latest_version=latest_version,
            update_type=update_type,
            priority=priority,
            risk_assessment=risk_assessment,
            recommendations=recommendations,
            affected_files=affected_files,
            breaking_changes=breaking_changes
        )
    
    def _determine_priority(self, dependency: Dict[str, Any]) -> UpdatePriority:
        """
        确定更新优先级
        
        Args:
            dependency: 依赖信息
            
        Returns:
            UpdatePriority: 优先级
        """
        update_type = dependency.get('update_type', 'other')
        
        risk_level = dependency.get('risk_assessment', {}).get('risk_level', 'low')
        
        breaking_changes = dependency.get('breaking_changes', [])
        
        for change in breaking_changes:
            severity = change.get('severity', 'medium')
            if severity == 'critical':
                return UpdatePriority.CRITICAL
            elif severity == 'high':
                return UpdatePriority.HIGH
        
        if risk_level == 'high':
            return UpdatePriority.HIGH
        elif risk_level == 'medium':
            return UpdatePriority.MEDIUM
        
        if update_type == 'major':
            return UpdatePriority.HIGH
        elif update_type == 'minor':
            return UpdatePriority.MEDIUM
        elif update_type == 'patch':
            return UpdatePriority.LOW
        
        return UpdatePriority.LOW
    
    def _generate_recommendations(self, 
                                   dependency: Dict[str, Any], 
                                   priority: UpdatePriority) -> List[str]:
        """
        生成推荐操作
        
        Args:
            dependency: 依赖信息
            priority: 优先级
            
        Returns:
            List[str]: 推荐列表
        """
        recommendations = []
        
        package_name = dependency.get('package', 'unknown')
        current_version = dependency.get('current_version', 'unknown')
        latest_version = dependency.get('latest_version', 'unknown')
        
        recommendations.append(f"📦 {package_name}: {current_version} -> {latest_version}")
        
        if priority == UpdatePriority.CRITICAL:
            recommendations.extend([
                '🔴 紧急更新建议',
                '⚠️ 建议立即在测试环境验证后更新',
                '📋 请仔细阅读更新日志和安全公告',
                '🧪 进行全面的功能和安全测试',
                '🔄 准备回滚计划'
            ])
        
        elif priority == UpdatePriority.HIGH:
            recommendations.extend([
                '🟠 高优先级更新',
                '📋 建议尽快更新',
                '🧪 在测试环境充分测试',
                '📝 检查是否有破坏性变更'
            ])
        
        elif priority == UpdatePriority.MEDIUM:
            recommendations.extend([
                '🟡 中优先级更新',
                '📋 建议查看更新日志',
                '🧪 进行基本功能测试'
            ])
        
        elif priority == UpdatePriority.LOW:
            recommendations.extend([
                '🟢 低优先级更新',
                '✅ 可以安全更新',
                '🧪 建议简单验证'
            ])
        
        breaking_changes = dependency.get('breaking_changes', [])
        if breaking_changes:
            critical_changes = [c for c in breaking_changes if c.get('severity') == 'critical']
            if critical_changes:
                recommendations.append(f'🚨 发现 {len(critical_changes)} 个严重破坏性变更')
                for change in critical_changes[:3]:
                    recommendations.append(f'   - {change.get("description", "未知变更")}')
        
        risk_level = dependency.get('risk_assessment', {}).get('risk_level', 'low')
        if risk_level in ['high', 'medium']:
            risk_factors = dependency.get('risk_assessment', {}).get('risk_factors', [])
            if risk_factors:
                recommendations.append('⚠️ 风险因素:')
                for factor in risk_factors[:3]:
                    recommendations.append(f'   - {factor}')
        
        return recommendations
    
    def _generate_batch_suggestions(self, by_priority: Dict[str, List[UpdateSuggestion]]) -> List[Dict[str, Any]]:
        """
        生成批量更新建议
        
        Args:
            by_priority: 按优先级分组的建议
            
        Returns:
            List[Dict[str, Any]]: 批量更新建议
        """
        batch_suggestions = []
        
        if by_priority['critical']:
            batch_suggestions.append({
                'batch_name': '紧急更新',
                'priority': 'critical',
                'packages': [s.package_name for s in by_priority['critical']],
                'recommendation': '建议立即在测试环境验证后逐个更新',
                'strategy': '逐个更新，充分测试'
            })
        
        if by_priority['high']:
            batch_suggestions.append({
                'batch_name': '高优先级更新',
                'priority': 'high',
                'packages': [s.package_name for s in by_priority['high']],
                'recommendation': '建议在近期更新，可以分组更新',
                'strategy': '按依赖关系分组更新'
            })
        
        if by_priority['medium']:
            batch_suggestions.append({
                'batch_name': '中优先级更新',
                'priority': 'medium',
                'packages': [s.package_name for s in by_priority['medium']],
                'recommendation': '可以在下次常规维护时更新',
                'strategy': '批量更新，基本测试'
            })
        
        if by_priority['low']:
            batch_suggestions.append({
                'batch_name': '低优先级更新',
                'priority': 'low',
                'packages': [s.package_name for s in by_priority['low']],
                'recommendation': '可以安全批量更新',
                'strategy': '一键更新，简单验证'
            })
        
        return batch_suggestions
    
    def _get_recommended_action(self, summary: Dict[str, Any]) -> str:
        """
        获取推荐操作
        
        Args:
            summary: 摘要信息
            
        Returns:
            str: 推荐操作
        """
        if summary['critical_updates'] > 0:
            return f"⚠️ 发现 {summary['critical_updates']} 个紧急更新，建议立即处理"
        
        if summary['high_updates'] > 0:
            return f"📋 发现 {summary['high_updates']} 个高优先级更新，建议尽快处理"
        
        if summary['medium_updates'] > 0:
            return f"🔧 发现 {summary['medium_updates']} 个中优先级更新，建议适时处理"
        
        if summary['low_updates'] > 0:
            return f"✅ 发现 {summary['low_updates']} 个低优先级更新，可以安全更新"
        
        return "🎉 所有依赖都是最新版本"
    
    def generate_update_plan(self, suggestions: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成更新计划
        
        Args:
            suggestions: 更新建议
            
        Returns:
            Dict[str, Any]: 更新计划
        """
        plan = {
            'phases': [],
            'total_packages': suggestions['summary']['total_updates'],
            'estimated_time': self._estimate_time(suggestions['summary']),
            'risks': []
        }
        
        by_priority = suggestions.get('by_priority', {})
        
        if by_priority.get('critical'):
            plan['phases'].append({
                'phase': 'Phase 1: 紧急更新',
                'priority': 'critical',
                'packages': [s.package_name for s in by_priority['critical']],
                'actions': [
                    '1. 仔细阅读每个包的更新日志和安全公告',
                    '2. 在独立的测试环境中逐个更新',
                    '3. 运行完整的测试套件',
                    '4. 准备回滚计划',
                    '5. 在生产环境灰度发布'
                ],
                'time_estimate': f"{len(by_priority['critical']) * 2} 小时"
            })
            
            plan['risks'].append('紧急更新可能引入兼容性问题')
            plan['risks'].append('建议充分测试后再部署')
        
        if by_priority.get('high'):
            plan['phases'].append({
                'phase': 'Phase 2: 高优先级更新',
                'priority': 'high',
                'packages': [s.package_name for s in by_priority['high']],
                'actions': [
                    '1. 查看更新日志，关注破坏性变更',
                    '2. 按依赖关系分组更新',
                    '3. 运行相关测试',
                    '4. 在测试环境验证后部署'
                ],
                'time_estimate': f"{len(by_priority['high']) * 1} 小时"
            })
        
        if by_priority.get('medium'):
            plan['phases'].append({
                'phase': 'Phase 3: 中优先级更新',
                'priority': 'medium',
                'packages': [s.package_name for s in by_priority['medium']],
                'actions': [
                    '1. 简要查看更新日志',
                    '2. 可以批量更新',
                    '3. 运行基本功能测试',
                    '4. 在常规维护窗口部署'
                ],
                'time_estimate': f"{max(1, len(by_priority['medium']) // 5)} 小时"
            })
        
        if by_priority.get('low'):
            plan['phases'].append({
                'phase': 'Phase 4: 低优先级更新',
                'priority': 'low',
                'packages': [s.package_name for s in by_priority['low']],
                'actions': [
                    '1. 可以一键更新',
                    '2. 简单验证主要功能',
                    '3. 在方便时部署'
                ],
                'time_estimate': '30 分钟'
            })
        
        return plan
    
    def _estimate_time(self, summary: Dict[str, Any]) -> str:
        """
        估计更新时间
        
        Args:
            summary: 摘要信息
            
        Returns:
            str: 时间估计
        """
        total_hours = 0
        
        total_hours += summary['critical_updates'] * 2
        total_hours += summary['high_updates'] * 1
        total_hours += summary['medium_updates'] * 0.5
        total_hours += summary['low_updates'] * 0.1
        
        if total_hours < 1:
            return '不到 1 小时'
        elif total_hours < 4:
            return f'约 {int(total_hours)} 小时'
        elif total_hours < 8:
            return '约半个工作日'
        else:
            return '约一个工作日或更长'
    
    def generate_rollback_plan(self, suggestions: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成回滚计划
        
        Args:
            suggestions: 更新建议
            
        Returns:
            Dict[str, Any]: 回滚计划
        """
        rollback_plan = {
            'preparation': [
                '1. 在更新前备份当前依赖配置文件',
                '2. 记录当前所有依赖的精确版本号',
                '3. 准备虚拟环境或容器快照',
                '4. 确保可以访问旧版本的包'
            ],
            'rollback_steps': [
                '1. 立即停止受影响的服务',
                '2. 恢复到更新前的依赖版本',
                '3. 运行测试验证回滚成功',
                '4. 逐步恢复服务',
                '5. 分析更新失败的原因'
            ],
            'version_pins': []
        }
        
        all_deps = []
        for priority in ['critical', 'high', 'medium', 'low']:
            for dep in suggestions.get('by_priority', {}).get(priority, []):
                rollback_plan['version_pins'].append({
                    'package': dep.package_name,
                    'current_version': dep.current_version,
                    'rollback_command': self._get_rollback_command(dep)
                })
        
        return rollback_plan
    
    def _get_rollback_command(self, suggestion: UpdateSuggestion) -> str:
        """
        获取回滚命令
        
        Args:
            suggestion: 更新建议
            
        Returns:
            str: 回滚命令
        """
        return f"pip install {suggestion.package_name}=={suggestion.current_version}"
