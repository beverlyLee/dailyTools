from django.apps import AppConfig


class ProductionLineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.production_line'
    verbose_name = '产线3D监控'
