"""
影响分析器模块
"""

import os
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class ImpactLevel(Enum):
    """
    影响级别枚举
    """
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'
    NONE = 'none'


@dataclass
class ImpactResult:
    """
    影响分析结果数据类
    """
    package_name: str
    impact_level: ImpactLevel
    affected_files: List[str]
    affected_apis: List[str]
    risk_assessment: Dict[str, Any]
    recommendations: List[str]


class ImpactAnalyzer:
    """
    影响分析器类
    """
    
    def __init__(self, project_path: str = '.'):
        """
        初始化影响分析器
        
        Args:
            project_path: 项目路径
        """
        self.project_path = project_path
        self._setup_patterns()
    
    def _setup_patterns(self):
        """
        设置正则表达式模式
        """
        self.import_patterns = {
            'python': [
                r'import\s+(\w+)',
                r'from\s+(\w+)\s+import',
                r'from\s+(\w+)\.',
            ],
            'javascript': [
                r'import\s+.*?from\s+["\']([^"\']+)["\']',
                r'require\s*\(\s*["\']([^"\']+)["\']\s*\)',
                r'import\s*\(\s*["\']([^"\']+)["\']\s*\)',
            ],
            'typescript': [
                r'import\s+.*?from\s+["\']([^"\']+)["\']',
                r'require\s*\(\s*["\']([^"\']+)["\']\s*\)',
                r'import\s+type\s+.*?from\s+["\']([^"\']+)["\']',
            ],
            'go': [
                r'import\s+["\']([^"\']+)["\']',
                r'import\s*\(\s*["\']([^"\']+)["\']',
            ],
            'java': [
                r'import\s+([\w.]+)',
                r'import\s+static\s+([\w.]+)',
            ],
        }
        
        self.api_usage_patterns = {
            'python': [
                r'\.(\w+)\s*\(',
                r'\.(\w+)\s*=',
                r'from\s+\w+\s+import\s+(\w+)',
            ],
            'javascript': [
                r'\.(\w+)\s*\(',
                r'\.(\w+)\s*=',
                r'\[(\w+)\]\s*=',
            ],
        }
    
    def analyze(self, package_name: str, 
                current_version: str, 
                latest_version: str,
                breaking_changes: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        分析依赖更新的影响
        
        Args:
            package_name: 包名
            current_version: 当前版本
            latest_version: 最新版本
            breaking_changes: 重大变更列表（可选）
            
        Returns:
            Dict[str, Any]: 影响分析结果
        """
        result = {
            'package_name': package_name,
            'current_version': current_version,
            'latest_version': latest_version,
            'impact_level': 'none',
            'affected_files': [],
            'affected_apis': [],
            'risk_assessment': {},
            'recommendations': [],
            'static_analysis': {},
            'test_impact': {}
        }
        
        import_info = self._find_package_imports(package_name)
        result['affected_files'] = import_info['files']
        result['static_analysis']['import_locations'] = import_info
        
        if import_info['files']:
            api_usage = self._analyze_api_usage(package_name, import_info['files'])
            result['affected_apis'] = api_usage
            result['static_analysis']['api_usage'] = api_usage
        
        update_type = self._determine_update_type(current_version, latest_version)
        result['static_analysis']['update_type'] = update_type
        
        impact_level = self._calculate_impact_level(
            len(import_info['files']),
            len(result['affected_apis']),
            update_type,
            breaking_changes
        )
        result['impact_level'] = impact_level.value
        
        risk_assessment = self._perform_risk_assessment(
            impact_level,
            import_info['files'],
            result['affected_apis'],
            breaking_changes
        )
        result['risk_assessment'] = risk_assessment
        
        recommendations = self._generate_recommendations(
            impact_level,
            import_info['files'],
            result['affected_apis'],
            breaking_changes
        )
        result['recommendations'] = recommendations
        
        test_impact = self._analyze_test_impact(package_name)
        result['test_impact'] = test_impact
        
        return result
    
    def _find_package_imports(self, package_name: str) -> Dict[str, Any]:
        """
        查找包的导入位置
        
        Args:
            package_name: 包名
            
        Returns:
            Dict[str, Any]: 导入信息
        """
        result = {
            'files': [],
            'import_details': []
        }
        
        file_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.go': 'go',
            '.java': 'java',
        }
        
        for root, dirs, files in os.walk(self.project_path):
            dirs[:] = [d for d in dirs if d not in [
                'node_modules', '__pycache__', '.git', 'dist', 'build',
                'venv', '.venv', 'env', '.env', 'target', 'bin', 'obj'
            ]]
            
            for file in files:
                file_path = os.path.join(root, file)
                ext = os.path.splitext(file)[1]
                
                if ext in file_extensions:
                    language = file_extensions[ext]
                    patterns = self.import_patterns.get(language, [])
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        
                        for pattern in patterns:
                            matches = re.findall(pattern, content)
                            for match in matches:
                                if self._is_package_match(match, package_name):
                                    rel_path = os.path.relpath(file_path, self.project_path)
                                    if rel_path not in result['files']:
                                        result['files'].append(rel_path)
                                    
                                    result['import_details'].append({
                                        'file': rel_path,
                                        'import_statement': match,
                                        'language': language
                                    })
                    
                    except Exception:
                        pass
        
        return result
    
    def _is_package_match(self, import_path: str, package_name: str) -> bool:
        """
        检查导入路径是否匹配包名
        
        Args:
            import_path: 导入路径
            package_name: 包名
            
        Returns:
            bool: 是否匹配
        """
        package_name_lower = package_name.lower().replace('-', '_').replace('.', '_')
        import_path_lower = import_path.lower().replace('-', '_').replace('.', '_')
        
        return (package_name_lower in import_path_lower or 
                import_path_lower.startswith(package_name_lower) or
                package_name_lower.startswith(import_path_lower))
    
    def _analyze_api_usage(self, package_name: str, files: List[str]) -> List[str]:
        """
        分析 API 使用情况
        
        Args:
            package_name: 包名
            files: 相关文件列表
            
        Returns:
            List[str]: 使用的 API 列表
        """
        apis = set()
        
        for file in files:
            full_path = os.path.join(self.project_path, file)
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                ext = os.path.splitext(file)[1]
                language = self._get_language_from_extension(ext)
                
                patterns = self.api_usage_patterns.get(language, [])
                for pattern in patterns:
                    matches = re.findall(pattern, content)
                    for match in matches:
                        if isinstance(match, str) and len(match) > 1 and not match.startswith('_'):
                            apis.add(match)
            
            except Exception:
                pass
        
        return sorted(list(apis))
    
    def _get_language_from_extension(self, ext: str) -> str:
        """
        从扩展名获取语言
        
        Args:
            ext: 扩展名
            
        Returns:
            str: 语言
        """
        ext_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.go': 'go',
            '.java': 'java',
        }
        return ext_map.get(ext, 'python')
    
    def _determine_update_type(self, current_version: str, latest_version: str) -> str:
        """
        确定更新类型
        
        Args:
            current_version: 当前版本
            latest_version: 最新版本
            
        Returns:
            str: 更新类型
        """
        def parse_version(version: str) -> Tuple[int, int, int]:
            version = version.lstrip('v^~>=<')
            match = re.match(r'(\d+)\.(\d+)\.(\d+)', version)
            if match:
                return (int(match.group(1)), int(match.group(2)), int(match.group(3)))
            return (0, 0, 0)
        
        current = parse_version(current_version)
        latest = parse_version(latest_version)
        
        if latest[0] > current[0]:
            return 'major'
        elif latest[1] > current[1]:
            return 'minor'
        elif latest[2] > current[2]:
            return 'patch'
        else:
            return 'other'
    
    def _calculate_impact_level(self, 
                                 file_count: int, 
                                 api_count: int, 
                                 update_type: str,
                                 breaking_changes: Optional[List[Dict[str, Any]]] = None) -> ImpactLevel:
        """
        计算影响级别
        
        Args:
            file_count: 受影响文件数
            api_count: 受影响 API 数
            update_type: 更新类型
            breaking_changes: 重大变更列表
            
        Returns:
            ImpactLevel: 影响级别
        """
        score = 0
        
        if update_type == 'major':
            score += 40
        elif update_type == 'minor':
            score += 20
        elif update_type == 'patch':
            score += 5
        
        if file_count >= 10:
            score += 30
        elif file_count >= 5:
            score += 20
        elif file_count >= 1:
            score += 10
        
        if api_count >= 10:
            score += 30
        elif api_count >= 5:
            score += 20
        elif api_count >= 1:
            score += 10
        
        if breaking_changes:
            for change in breaking_changes:
                severity = change.get('severity', 'medium')
                if severity == 'critical':
                    score += 25
                elif severity == 'high':
                    score += 15
                elif severity == 'medium':
                    score += 8
                elif severity == 'low':
                    score += 3
        
        if score >= 70:
            return ImpactLevel.CRITICAL
        elif score >= 50:
            return ImpactLevel.HIGH
        elif score >= 30:
            return ImpactLevel.MEDIUM
        elif score >= 10:
            return ImpactLevel.LOW
        else:
            return ImpactLevel.NONE
    
    def _perform_risk_assessment(self,
                                   impact_level: ImpactLevel,
                                   files: List[str],
                                   apis: List[str],
                                   breaking_changes: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        执行风险评估
        
        Args:
            impact_level: 影响级别
            files: 受影响文件
            apis: 受影响 API
            breaking_changes: 重大变更列表
            
        Returns:
            Dict[str, Any]: 风险评估结果
        """
        risk_factors = []
        
        if impact_level in [ImpactLevel.CRITICAL, ImpactLevel.HIGH]:
            risk_factors.append('高影响级别更新')
        
        if len(files) >= 5:
            risk_factors.append(f'影响 {len(files)} 个文件')
        
        if len(apis) >= 5:
            risk_factors.append(f'使用了 {len(apis)} 个 API')
        
        if breaking_changes:
            critical_count = sum(1 for c in breaking_changes if c.get('severity') == 'critical')
            high_count = sum(1 for c in breaking_changes if c.get('severity') == 'high')
            
            if critical_count > 0:
                risk_factors.append(f'包含 {critical_count} 个严重破坏性变更')
            if high_count > 0:
                risk_factors.append(f'包含 {high_count} 个高度破坏性变更')
        
        risk_level = 'low'
        if impact_level in [ImpactLevel.CRITICAL, ImpactLevel.HIGH]:
            risk_level = 'high'
        elif impact_level == ImpactLevel.MEDIUM:
            risk_level = 'medium'
        
        return {
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'impact_score': self._get_impact_score(impact_level),
            'recommendation_priority': self._get_recommendation_priority(impact_level)
        }
    
    def _get_impact_score(self, impact_level: ImpactLevel) -> int:
        """
        获取影响分数
        
        Args:
            impact_level: 影响级别
            
        Returns:
            int: 影响分数
        """
        scores = {
            ImpactLevel.CRITICAL: 100,
            ImpactLevel.HIGH: 75,
            ImpactLevel.MEDIUM: 50,
            ImpactLevel.LOW: 25,
            ImpactLevel.NONE: 0
        }
        return scores.get(impact_level, 0)
    
    def _get_recommendation_priority(self, impact_level: ImpactLevel) -> str:
        """
        获取推荐优先级
        
        Args:
            impact_level: 影响级别
            
        Returns:
            str: 优先级
        """
        priorities = {
            ImpactLevel.CRITICAL: '立即处理',
            ImpactLevel.HIGH: '高优先级',
            ImpactLevel.MEDIUM: '中优先级',
            ImpactLevel.LOW: '低优先级',
            ImpactLevel.NONE: '无优先级'
        }
        return priorities.get(impact_level, '无优先级')
    
    def _generate_recommendations(self,
                                    impact_level: ImpactLevel,
                                    files: List[str],
                                    apis: List[str],
                                    breaking_changes: Optional[List[Dict[str, Any]]] = None) -> List[str]:
        """
        生成推荐操作
        
        Args:
            impact_level: 影响级别
            files: 受影响文件
            apis: 受影响 API
            breaking_changes: 重大变更列表
            
        Returns:
            List[str]: 推荐列表
        """
        recommendations = []
        
        if impact_level == ImpactLevel.CRITICAL:
            recommendations.extend([
                '⚠️ 这是一个高影响级别的更新，建议详细评估后再升级',
                '📋 请仔细阅读官方迁移指南',
                '🧪 在独立的测试环境中进行充分测试',
                '🔄 考虑逐步升级，先升级到中间版本',
                '📝 准备回滚计划，以防出现问题'
            ])
        
        elif impact_level == ImpactLevel.HIGH:
            recommendations.extend([
                '⚠️ 这是一个中等高影响级别的更新',
                '📋 建议阅读更新日志和迁移指南',
                '🧪 在测试环境中进行测试',
                '📝 检查受影响的 API 使用情况'
            ])
        
        elif impact_level == ImpactLevel.MEDIUM:
            recommendations.extend([
                '📋 建议查看更新日志',
                '🧪 进行基本的功能测试',
                '📝 关注是否有废弃的 API'
            ])
        
        elif impact_level == ImpactLevel.LOW:
            recommendations.extend([
                '✅ 这是一个低影响级别的更新',
                '🧪 建议进行简单的回归测试',
                '📝 可以安全升级，但建议先在测试环境验证'
            ])
        
        else:
            recommendations.extend([
                '✅ 影响级别很低',
                '📝 可以安全升级'
            ])
        
        if files:
            recommendations.append(f'📁 受影响的文件数: {len(files)}')
            if len(files) <= 5:
                recommendations.append(f'   具体文件: {", ".join(files)}')
        
        if apis:
            recommendations.append(f'🔧 使用的 API 数: {len(apis)}')
            if len(apis) <= 10:
                recommendations.append(f'   具体 API: {", ".join(apis)}')
        
        if breaking_changes:
            critical = [c for c in breaking_changes if c.get('severity') == 'critical']
            if critical:
                recommendations.append(f'🚨 发现 {len(critical)} 个严重破坏性变更')
                for c in critical[:3]:
                    recommendations.append(f'   - {c.get("description", "未知变更")}')
        
        return recommendations
    
    def _analyze_test_impact(self, package_name: str) -> Dict[str, Any]:
        """
        分析测试影响
        
        Args:
            package_name: 包名
            
        Returns:
            Dict[str, Any]: 测试影响分析
        """
        test_patterns = [
            r'test_.*\.py',
            r'.*_test\.py',
            r'.*\.test\.js',
            r'.*\.spec\.js',
            r'.*Test\.java',
            r'.*_test\.go',
        ]
        
        test_files = []
        
        for root, dirs, files in os.walk(self.project_path):
            dirs[:] = [d for d in dirs if d not in [
                'node_modules', '__pycache__', '.git', 'dist', 'build',
                'venv', '.venv', 'env', '.env', 'target', 'bin', 'obj'
            ]]
            
            for file in files:
                for pattern in test_patterns:
                    if re.match(pattern, file):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                            
                            if package_name.lower() in content.lower():
                                rel_path = os.path.relpath(file_path, self.project_path)
                                test_files.append(rel_path)
                        except Exception:
                            pass
                        break
        
        return {
            'test_files_count': len(test_files),
            'test_files': test_files[:10],
            'has_test_coverage': len(test_files) > 0,
            'recommendation': f'建议运行 {len(test_files)} 个相关测试' if test_files else '建议添加相关测试'
        }
