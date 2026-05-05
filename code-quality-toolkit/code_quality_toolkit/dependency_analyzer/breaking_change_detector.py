"""
重大变更检测器模块
"""

import re
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class BreakingChangeSeverity(Enum):
    """
    重大变更严重级别
    """
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'


@dataclass
class BreakingChange:
    """
    重大变更数据类
    """
    description: str
    severity: BreakingChangeSeverity
    category: str
    affected_apis: List[str]
    migration_guide: Optional[str] = None


class BreakingChangeDetector:
    """
    重大变更检测器类
    """
    
    def __init__(self):
        """
        初始化重大变更检测器
        """
        self._setup_patterns()
        self._setup_common_breaking_changes()
    
    def _setup_patterns(self):
        """
        设置正则表达式模式
        """
        self.patterns = {
            'removed_api': re.compile(
                r'(?:remove|deprecat|discontinu|obsolet)',
                re.IGNORECASE
            ),
            'renamed_api': re.compile(
                r'(?:rename|chang|mov)\s+\w+\s+(?:to|into)',
                re.IGNORECASE
            ),
            'signature_change': re.compile(
                r'(?:signatur|parameter|argument).*?(?:chang|modif|remov|add)',
                re.IGNORECASE
            ),
            'behavior_change': re.compile(
                r'(?:behavior|behaviour).*?(?:chang|modif|differ)',
                re.IGNORECASE
            ),
            'dependency_update': re.compile(
                r'(?:dependenc|requir).*?(?:updat|chang|increas|decreas)',
                re.IGNORECASE
            ),
            'security_change': re.compile(
                r'(?:secur|authent|authoriz|permiss).*?(?:chang|updat|tighten|restrict)',
                re.IGNORECASE
            ),
            'type_change': re.compile(
                r'(?:type|return).*?(?:chang|modif)',
                re.IGNORECASE
            ),
            'default_change': re.compile(
                r'(?:default).*?(?:chang|modif)',
                re.IGNORECASE
            ),
        }
    
    def _setup_common_breaking_changes(self):
        """
        设置常见的重大变更
        """
        self.common_breaking_changes = {
            'python': [
                {
                    'pattern': r'(?:asyncio|aiohttp|fastapi|django|flask)\s+[2-9]',
                    'description': '主要框架版本升级',
                    'severity': BreakingChangeSeverity.CRITICAL,
                    'category': 'framework'
                },
                {
                    'pattern': r'Python\s+[2-9]\.(?:\d+)',
                    'description': 'Python 版本要求变更',
                    'severity': BreakingChangeSeverity.HIGH,
                    'category': 'environment'
                },
                {
                    'pattern': r'(?:removed|deprecated).*?(?:method|function|class|attribute)',
                    'description': 'API 移除或废弃',
                    'severity': BreakingChangeSeverity.HIGH,
                    'category': 'api'
                },
                {
                    'pattern': r'(?:type|typing).*?(?:hint|annot).*?(?:chang|requir)',
                    'description': '类型注解变更',
                    'severity': BreakingChangeSeverity.MEDIUM,
                    'category': 'api'
                },
            ],
            'javascript': [
                {
                    'pattern': r'(?:React|Vue|Angular|Next\.js|Nuxt\.js)\s+[2-9]',
                    'description': '主要框架版本升级',
                    'severity': BreakingChangeSeverity.CRITICAL,
                    'category': 'framework'
                },
                {
                    'pattern': r'(?:Node\.js|node)\s+[1-9][0-9]',
                    'description': 'Node.js 版本要求变更',
                    'severity': BreakingChangeSeverity.HIGH,
                    'category': 'environment'
                },
                {
                    'pattern': r'(?:ESLint|Babel|Webpack|Vite)\s+[2-9]',
                    'description': '构建工具版本升级',
                    'severity': BreakingChangeSeverity.MEDIUM,
                    'category': 'tooling'
                },
                {
                    'pattern': r'(?:hooks|lifecycle|context|provider).*?(?:chang|remov|deprecat)',
                    'description': 'React/Vue Hooks 或生命周期变更',
                    'severity': BreakingChangeSeverity.HIGH,
                    'category': 'api'
                },
            ],
            'general': [
                {
                    'pattern': r'(?:major|break)\s*(?:version|chang|updat)',
                    'description': '主版本更新说明',
                    'severity': BreakingChangeSeverity.CRITICAL,
                    'category': 'version'
                },
                {
                    'pattern': r'(?:incompat|not\s+backward).*?(?:compat|chang)',
                    'description': '不兼容变更说明',
                    'severity': BreakingChangeSeverity.HIGH,
                    'category': 'compatibility'
                },
                {
                    'pattern': r'(?:migrat|upgrad).*?(?:guid|step|process)',
                    'description': '迁移指南',
                    'severity': BreakingChangeSeverity.MEDIUM,
                    'category': 'documentation'
                },
                {
                    'pattern': r'(?:configur|setup|options).*?(?:chang|structur)',
                    'description': '配置结构变更',
                    'severity': BreakingChangeSeverity.MEDIUM,
                    'category': 'configuration'
                },
            ]
        }
    
    def detect(self, package_name: str, current_version: str, latest_version: str) -> List[Dict[str, Any]]:
        """
        检测重大变更
        
        Args:
            package_name: 包名
            current_version: 当前版本
            latest_version: 最新版本
            
        Returns:
            List[Dict[str, Any]]: 重大变更列表
        """
        breaking_changes: List[BreakingChange] = []
        
        version_diff = self._analyze_version_diff(current_version, latest_version)
        breaking_changes.extend(version_diff)
        
        changelog_changes = self._analyze_changelog(package_name, current_version, latest_version)
        breaking_changes.extend(changelog_changes)
        
        package_type = self._detect_package_type(package_name)
        common_changes = self._check_common_breaking_changes(package_name, latest_version, package_type)
        breaking_changes.extend(common_changes)
        
        return [self._change_to_dict(bc) for bc in breaking_changes]
    
    def _analyze_version_diff(self, current_version: str, latest_version: str) -> List[BreakingChange]:
        """
        分析版本差异
        
        Args:
            current_version: 当前版本
            latest_version: 最新版本
            
        Returns:
            List[BreakingChange]: 重大变更列表
        """
        changes: List[BreakingChange] = []
        
        def parse_semver(version: str) -> List[int]:
            version = version.lstrip('v^~>=<')
            match = re.match(r'(\d+)\.(\d+)\.(\d+)', version)
            if match:
                return [int(match.group(1)), int(match.group(2)), int(match.group(3))]
            return [0, 0, 0]
        
        current = parse_semver(current_version)
        latest = parse_semver(latest_version)
        
        if latest[0] > current[0]:
            changes.append(BreakingChange(
                description=f"主版本更新: {current_version} -> {latest_version}",
                severity=BreakingChangeSeverity.CRITICAL,
                category='version',
                affected_apis=['可能涉及多个 API 的变更'],
                migration_guide='建议查阅官方迁移指南，逐步升级'
            ))
        
        elif latest[1] > current[1]:
            changes.append(BreakingChange(
                description=f"次版本更新: {current_version} -> {latest_version}",
                severity=BreakingChangeSeverity.MEDIUM,
                category='version',
                affected_apis=['可能添加新功能，通常向后兼容'],
                migration_guide='建议检查是否有废弃的 API 使用'
            ))
        
        elif latest[2] > current[2]:
            changes.append(BreakingChange(
                description=f"补丁版本更新: {current_version} -> {latest_version}",
                severity=BreakingChangeSeverity.LOW,
                category='version',
                affected_apis=['通常为 Bug 修复，向后兼容'],
                migration_guide='通常可以安全升级，建议测试后部署'
            ))
        
        return changes
    
    def _analyze_changelog(self, package_name: str, current_version: str, latest_version: str) -> List[BreakingChange]:
        """
        分析变更日志
        
        Args:
            package_name: 包名
            current_version: 当前版本
            latest_version: 最新版本
            
        Returns:
            List[BreakingChange]: 重大变更列表
        """
        changes: List[BreakingChange] = []
        
        changelog_content = self._try_get_changelog(package_name)
        
        if changelog_content:
            for pattern_name, pattern in self.patterns.items():
                matches = pattern.findall(changelog_content)
                if matches:
                    category = self._get_category_from_pattern(pattern_name)
                    severity = self._get_severity_from_pattern(pattern_name)
                    
                    changes.append(BreakingChange(
                        description=f"变更日志中检测到 {pattern_name} 相关变更",
                        severity=severity,
                        category=category,
                        affected_apis=[],
                        migration_guide='建议查阅详细变更日志'
                    ))
        
        return changes
    
    def _try_get_changelog(self, package_name: str) -> Optional[str]:
        """
        尝试获取变更日志
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[str]: 变更日志内容
        """
        changelog_files = [
            'CHANGELOG.md',
            'CHANGELOG.rst',
            'CHANGELOG.txt',
            'changelog.md',
            'Changelog.md',
            'RELEASES.md',
            'HISTORY.md',
        ]
        
        for filename in changelog_files:
            filepath = os.path.join(os.getcwd(), filename)
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        return f.read()
                except:
                    pass
        
        return None
    
    def _detect_package_type(self, package_name: str) -> str:
        """
        检测包类型
        
        Args:
            package_name: 包名
            
        Returns:
            str: 包类型
        """
        python_frameworks = [
            'django', 'flask', 'fastapi', 'starlette', 'tornado',
            'aiohttp', 'sanic', 'quart', 'falcon', 'bottle'
        ]
        
        js_frameworks = [
            'react', 'vue', 'angular', 'next', 'nuxt', 'svelte',
            'webpack', 'vite', 'rollup', 'esbuild', 'parcel'
        ]
        
        name_lower = package_name.lower()
        
        for fw in python_frameworks:
            if fw in name_lower:
                return 'python'
        
        for fw in js_frameworks:
            if fw in name_lower:
                return 'javascript'
        
        return 'general'
    
    def _check_common_breaking_changes(self, package_name: str, version: str, package_type: str) -> List[BreakingChange]:
        """
        检查常见的重大变更
        
        Args:
            package_name: 包名
            version: 版本号
            package_type: 包类型
            
        Returns:
            List[BreakingChange]: 重大变更列表
        """
        changes: List[BreakingChange] = []
        
        if package_type in self.common_breaking_changes:
            for rule in self.common_breaking_changes[package_type]:
                if re.search(rule['pattern'], f"{package_name} {version}", re.IGNORECASE):
                    changes.append(BreakingChange(
                        description=rule['description'],
                        severity=rule['severity'],
                        category=rule['category'],
                        affected_apis=[],
                        migration_guide='建议查阅官方文档'
                    ))
        
        for rule in self.common_breaking_changes['general']:
            if re.search(rule['pattern'], version, re.IGNORECASE):
                changes.append(BreakingChange(
                    description=rule['description'],
                    severity=rule['severity'],
                    category=rule['category'],
                    affected_apis=[],
                    migration_guide='建议查阅官方文档'
                ))
        
        return changes
    
    def _get_category_from_pattern(self, pattern_name: str) -> str:
        """
        从模式名获取类别
        
        Args:
            pattern_name: 模式名
            
        Returns:
            str: 类别
        """
        category_map = {
            'removed_api': 'api',
            'renamed_api': 'api',
            'signature_change': 'api',
            'behavior_change': 'behavior',
            'dependency_update': 'dependency',
            'security_change': 'security',
            'type_change': 'type',
            'default_change': 'behavior',
        }
        return category_map.get(pattern_name, 'general')
    
    def _get_severity_from_pattern(self, pattern_name: str) -> BreakingChangeSeverity:
        """
        从模式名获取严重级别
        
        Args:
            pattern_name: 模式名
            
        Returns:
            BreakingChangeSeverity: 严重级别
        """
        severity_map = {
            'removed_api': BreakingChangeSeverity.CRITICAL,
            'renamed_api': BreakingChangeSeverity.HIGH,
            'signature_change': BreakingChangeSeverity.HIGH,
            'behavior_change': BreakingChangeSeverity.MEDIUM,
            'dependency_update': BreakingChangeSeverity.MEDIUM,
            'security_change': BreakingChangeSeverity.HIGH,
            'type_change': BreakingChangeSeverity.MEDIUM,
            'default_change': BreakingChangeSeverity.LOW,
        }
        return severity_map.get(pattern_name, BreakingChangeSeverity.MEDIUM)
    
    def _change_to_dict(self, change: BreakingChange) -> Dict[str, Any]:
        """
        将重大变更转换为字典
        
        Args:
            change: 重大变更对象
            
        Returns:
            Dict[str, Any]: 变更字典
        """
        return {
            'description': change.description,
            'severity': change.severity.value,
            'category': change.category,
            'affected_apis': change.affected_apis,
            'migration_guide': change.migration_guide
        }
    
    def analyze_impact_risk(self, breaking_changes: List[Dict[str, Any]], project_code: Optional[str] = None) -> Dict[str, Any]:
        """
        分析影响风险
        
        Args:
            breaking_changes: 重大变更列表
            project_code: 项目代码（可选）
            
        Returns:
            Dict[str, Any]: 风险分析结果
        """
        risk_level = 'low'
        risk_factors = []
        critical_count = 0
        high_count = 0
        medium_count = 0
        
        for change in breaking_changes:
            severity = change.get('severity', 'medium')
            
            if severity == 'critical':
                critical_count += 1
                risk_factors.append(f"[CRITICAL] {change.get('description', '未知变更')}")
            elif severity == 'high':
                high_count += 1
                risk_factors.append(f"[HIGH] {change.get('description', '未知变更')}")
            elif severity == 'medium':
                medium_count += 1
        
        if critical_count > 0:
            risk_level = 'high'
        elif high_count > 0:
            risk_level = 'medium'
        
        if project_code:
            code_impact = self._analyze_code_impact(breaking_changes, project_code)
            if code_impact['has_impact']:
                risk_level = 'high'
                risk_factors.extend(code_impact['details'])
        
        return {
            'risk_level': risk_level,
            'critical_count': critical_count,
            'high_count': high_count,
            'medium_count': medium_count,
            'risk_factors': risk_factors,
            'recommendation': self._get_recommendation(risk_level)
        }
    
    def _analyze_code_impact(self, breaking_changes: List[Dict[str, Any]], project_code: str) -> Dict[str, Any]:
        """
        分析代码影响
        
        Args:
            breaking_changes: 重大变更列表
            project_code: 项目代码
            
        Returns:
            Dict[str, Any]: 影响分析结果
        """
        has_impact = False
        details = []
        
        for change in breaking_changes:
            category = change.get('category', 'general')
            
            if category == 'api':
                api_patterns = [
                    r'\.(\w+)\s*\(',
                    r'from\s+\w+\s+import\s+(\w+)',
                    r'import\s+(\w+)',
                ]
                
                for pattern in api_patterns:
                    matches = re.findall(pattern, project_code)
                    if matches:
                        has_impact = True
                        details.append(f"代码中可能使用了受影响的 API: {', '.join(matches[:5])}")
                        break
        
        return {
            'has_impact': has_impact,
            'details': details
        }
    
    def _get_recommendation(self, risk_level: str) -> str:
        """
        获取推荐操作
        
        Args:
            risk_level: 风险级别
            
        Returns:
            str: 推荐操作
        """
        recommendations = {
            'high': '高风险：建议详细阅读迁移指南，在测试环境充分验证后再升级',
            'medium': '中风险：建议检查相关 API 使用，在测试环境验证',
            'low': '低风险：建议在测试环境验证后可安全升级'
        }
        return recommendations.get(risk_level, '建议在测试环境验证')
