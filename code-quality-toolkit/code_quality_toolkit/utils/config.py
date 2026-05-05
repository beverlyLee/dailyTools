"""
配置管理模块
"""

import os
import json
from typing import Dict, Any, Optional


class Config:
    """
    配置管理类
    """
    
    DEFAULT_CONFIG = {
        'code_review': {
            'enabled_checks': [
                'bug_detection',
                'security_scan',
                'code_smell_detection',
                'performance_analysis'
            ],
            'severity_levels': {
                'critical': True,
                'high': True,
                'medium': True,
                'low': True,
                'info': True
            },
            'exclude_patterns': [
                '*.min.js',
                '*.min.css',
                'node_modules/',
                '__pycache__/',
                '.git/',
                'dist/',
                'build/'
            ]
        },
        'dependency_analysis': {
            'check_dev_dependencies': False,
            'auto_update_threshold': 'patch',
            'risk_assessment': {
                'major_version_risk': 'high',
                'minor_version_risk': 'medium',
                'patch_version_risk': 'low'
            }
        },
        'reporting': {
            'default_format': 'markdown',
            'include_suggestions': True,
            'include_statistics': True
        }
    }
    
    def __init__(self, config_path: Optional[str] = None):
        """
        初始化配置管理器
        
        Args:
            config_path: 配置文件路径，默认为 None
        """
        self.config_path = config_path
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """
        加载配置文件
        
        Returns:
            Dict[str, Any]: 配置内容
        """
        config = self.DEFAULT_CONFIG.copy()
        
        if self.config_path and os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    config = self._deep_update(config, user_config)
            except Exception as e:
                print(f"警告: 无法加载配置文件 {self.config_path}: {e}")
        
        return config
    
    def _deep_update(self, base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
        """
        深度更新字典
        
        Args:
            base: 基础字典
            update: 更新字典
            
        Returns:
            Dict[str, Any]: 更新后的字典
        """
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                base[key] = self._deep_update(base[key], value)
            else:
                base[key] = value
        return base
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        获取配置值
        
        Args:
            key: 配置键，支持点分隔符（如 'code_review.enabled_checks'）
            default: 默认值
            
        Returns:
            Any: 配置值
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value: Any):
        """
        设置配置值
        
        Args:
            key: 配置键，支持点分隔符
            value: 配置值
        """
        keys = key.split('.')
        config = self.config
        
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        config[keys[-1]] = value
    
    def save(self, path: Optional[str] = None):
        """
        保存配置到文件
        
        Args:
            path: 保存路径，默认为初始化时的路径
        """
        save_path = path or self.config_path
        
        if not save_path:
            raise ValueError("未指定配置文件路径")
        
        try:
            with open(save_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            raise IOError(f"无法保存配置文件: {e}")
    
    def is_check_enabled(self, check_name: str) -> bool:
        """
        检查指定的代码检查是否启用
        
        Args:
            check_name: 检查名称
            
        Returns:
            bool: 是否启用
        """
        enabled_checks = self.get('code_review.enabled_checks', [])
        return check_name in enabled_checks
    
    def is_severity_enabled(self, severity: str) -> bool:
        """
        检查指定的严重级别是否启用
        
        Args:
            severity: 严重级别（critical, high, medium, low, info）
            
        Returns:
            bool: 是否启用
        """
        levels = self.get('code_review.severity_levels', {})
        return levels.get(severity, False)
    
    def should_exclude(self, file_path: str) -> bool:
        """
        检查文件路径是否应该被排除
        
        Args:
            file_path: 文件路径
            
        Returns:
            bool: 是否应该排除
        """
        exclude_patterns = self.get('code_review.exclude_patterns', [])
        
        for pattern in exclude_patterns:
            if pattern.endswith('/'):
                if pattern in file_path:
                    return True
            elif pattern.startswith('*'):
                if file_path.endswith(pattern[1:]):
                    return True
            elif pattern in file_path:
                return True
        
        return False
    
    def get_risk_level(self, update_type: str) -> str:
        """
        获取更新类型对应的风险级别
        
        Args:
            update_type: 更新类型（major, minor, patch）
            
        Returns:
            str: 风险级别
        """
        risk_map = {
            'major': 'high',
            'minor': 'medium',
            'patch': 'low'
        }
        
        return risk_map.get(update_type, 'medium')
