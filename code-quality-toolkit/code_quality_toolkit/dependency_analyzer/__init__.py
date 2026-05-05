"""
依赖分析模块
"""

from .version_checker import VersionChecker
from .breaking_change_detector import BreakingChangeDetector
from .impact_analyzer import ImpactAnalyzer
from .update_suggestion import UpdateSuggestionGenerator, UpdateSuggestion
from .interactive_updater import InteractiveUpdater


class DependencyAnalyzer:
    """
    依赖分析主类
    """
    
    def __init__(self, project_path=None):
        """
        初始化依赖分析器
        
        Args:
            project_path: 项目路径，默认为当前目录
        """
        self.project_path = project_path or '.'
        self.version_checker = VersionChecker(self.project_path)
        self.breaking_change_detector = BreakingChangeDetector()
        self.impact_analyzer = ImpactAnalyzer(self.project_path)
        self.update_suggestion_generator = UpdateSuggestionGenerator()
        self.interactive_updater = InteractiveUpdater(self.project_path)
    
    def check_updates(self, include_dev=False):
        """
        检查依赖更新
        
        Args:
            include_dev: 是否包含开发依赖
            
        Returns:
            dict: 更新检查结果
        """
        dependencies = self.version_checker.get_current_dependencies(include_dev)
        
        updates = {
            'dependencies': [],
            'dev_dependencies': [],
            'summary': {
                'total': 0,
                'major_updates': 0,
                'minor_updates': 0,
                'patch_updates': 0
            }
        }
        
        for dep_name, current_version in dependencies['production'].items():
            latest_version = self.version_checker.get_latest_version(dep_name)
            
            if latest_version and latest_version != current_version:
                update_info = self._analyze_update(dep_name, current_version, latest_version)
                updates['dependencies'].append(update_info)
                
                updates['summary']['total'] += 1
                if update_info['update_type'] == 'major':
                    updates['summary']['major_updates'] += 1
                elif update_info['update_type'] == 'minor':
                    updates['summary']['minor_updates'] += 1
                else:
                    updates['summary']['patch_updates'] += 1
        
        if include_dev:
            for dep_name, current_version in dependencies['development'].items():
                latest_version = self.version_checker.get_latest_version(dep_name)
                
                if latest_version and latest_version != current_version:
                    update_info = self._analyze_update(dep_name, current_version, latest_version)
                    updates['dev_dependencies'].append(update_info)
        
        return updates
    
    def analyze_impact(self, update_info):
        """
        分析依赖更新的影响
        
        Args:
            update_info: 更新信息
            
        Returns:
            dict: 影响分析结果
        """
        impact = {
            'breaking_changes': self.breaking_change_detector.detect(
                update_info['package'],
                update_info['current_version'],
                update_info['latest_version']
            ),
            'code_impact': self.impact_analyzer.analyze(
                update_info['package'],
                update_info['current_version'],
                update_info['latest_version']
            ),
            'risk_assessment': self._assess_risk(update_info)
        }
        
        return impact
    
    def generate_update_suggestions(self, updates):
        """
        生成更新建议
        
        Args:
            updates: 更新检查结果
            
        Returns:
            dict: 更新建议
        """
        return self.update_suggestion_generator.generate(updates)
    
    def interactive_update(self, updates):
        """
        交互式更新依赖
        
        Args:
            updates: 更新检查结果
            
        Returns:
            dict: 更新结果
        """
        return self.interactive_updater.run(updates)
    
    def _analyze_update(self, package, current_version, latest_version):
        """
        分析单个依赖的更新
        
        Args:
            package: 包名
            current_version: 当前版本
            latest_version: 最新版本
            
        Returns:
            dict: 更新分析
        """
        update_type = self._determine_update_type(current_version, latest_version)
        
        return {
            'package': package,
            'current_version': current_version,
            'latest_version': latest_version,
            'update_type': update_type,
            'description': self.version_checker.get_package_description(package),
            'changelog': self.version_checker.get_changelog(package, latest_version)
        }
    
    def _determine_update_type(self, current_version, latest_version):
        """
        确定更新类型（major, minor, patch）
        
        Args:
            current_version: 当前版本
            latest_version: 最新版本
            
        Returns:
            str: 更新类型
        """
        try:
            current_parts = self._parse_version(current_version)
            latest_parts = self._parse_version(latest_version)
            
            if latest_parts[0] > current_parts[0]:
                return 'major'
            elif latest_parts[1] > current_parts[1]:
                return 'minor'
            elif latest_parts[2] > current_parts[2]:
                return 'patch'
            else:
                return 'other'
        except:
            return 'other'
    
    def _parse_version(self, version):
        """
        解析版本号
        
        Args:
            version: 版本字符串
            
        Returns:
            tuple: (major, minor, patch)
        """
        version = version.lstrip('^~>=<')
        parts = version.split('.')
        
        major = int(parts[0]) if len(parts) > 0 else 0
        minor = int(parts[1]) if len(parts) > 1 else 0
        patch = int(parts[2]) if len(parts) > 2 else 0
        
        return (major, minor, patch)
    
    def _assess_risk(self, update_info):
        """
        评估更新风险
        
        Args:
            update_info: 更新信息
            
        Returns:
            dict: 风险评估
        """
        risk_level = 'low'
        risk_factors = []
        
        if update_info['update_type'] == 'major':
            risk_level = 'high'
            risk_factors.append('主版本更新，可能包含破坏性变更')
        
        if update_info['update_type'] == 'minor':
            risk_level = 'medium'
            risk_factors.append('次版本更新，可能包含新功能')
        
        breaking_changes = self.breaking_change_detector.detect(
            update_info['package'],
            update_info['current_version'],
            update_info['latest_version']
        )
        
        if breaking_changes:
            risk_level = 'high'
            risk_factors.append(f'检测到 {len(breaking_changes)} 个破坏性变更')
        
        return {
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'recommendation': self._get_recommendation(risk_level)
        }
    
    def _get_recommendation(self, risk_level):
        """
        获取推荐操作
        
        Args:
            risk_level: 风险级别
            
        Returns:
            str: 推荐操作
        """
        if risk_level == 'low':
            return '建议立即更新，风险较低'
        elif risk_level == 'medium':
            return '建议先在测试环境验证后再更新'
        else:
            return '建议谨慎更新，需要详细评估破坏性变更的影响'
