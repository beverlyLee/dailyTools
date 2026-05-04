"""
租房合同管理系统主包
"""

from .celery import app as celery_app

__all__ = ('celery_app',)
