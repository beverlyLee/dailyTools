"""
Code Quality Toolkit - 代码质量管理工具集

提供智能代码审查和依赖更新分析功能。
"""

from . import __version__
from .code_review import CodeReviewer
from .dependency_analyzer import DependencyAnalyzer
from .cli import main

__all__ = ['CodeReviewer', 'DependencyAnalyzer', 'main', '__version__']
