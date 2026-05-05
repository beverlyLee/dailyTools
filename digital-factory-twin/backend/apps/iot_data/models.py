from django.db import models
from django.utils import timezone


class Device(models.Model):
    DEVICE_STATUS_CHOICES = [
        ('running', '运行中'),
        ('stopped', '已停机'),
        ('fault', '故障'),
        ('maintenance', '维护中'),
    ]

    device_id = models.CharField(max_length=50, unique=True, verbose_name='设备编号')
    device_name = models.CharField(max_length=100, verbose_name='设备名称')
    device_type = models.CharField(max_length=50, verbose_name='设备类型')
    location = models.CharField(max_length=100, blank=True, null=True, verbose_name='位置')
    status = models.CharField(max_length=20, choices=DEVICE_STATUS_CHOICES, default='stopped', verbose_name='状态')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'device'
        verbose_name = '设备'
        verbose_name_plural = '设备管理'

    def __str__(self):
        return f"{self.device_id} - {self.device_name}"


class PLCData(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='plc_data', verbose_name='关联设备')
    timestamp = models.DateTimeField(default=timezone.now, verbose_name='时间戳')
    tag_name = models.CharField(max_length=100, verbose_name='标签名')
    tag_value = models.CharField(max_length=255, verbose_name='标签值')
    data_type = models.CharField(max_length=20, default='int', verbose_name='数据类型')
    quality = models.BooleanField(default=True, verbose_name='数据质量')

    class Meta:
        db_table = 'plc_data'
        verbose_name = 'PLC数据'
        verbose_name_plural = 'PLC数据管理'
        indexes = [
            models.Index(fields=['device', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.device.device_id} - {self.tag_name}: {self.tag_value} @ {self.timestamp}"


class DeviceStatusHistory(models.Model):
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='status_history', verbose_name='关联设备')
    old_status = models.CharField(max_length=20, verbose_name='原状态')
    new_status = models.CharField(max_length=20, verbose_name='新状态')
    timestamp = models.DateTimeField(default=timezone.now, verbose_name='时间戳')
    reason = models.CharField(max_length=200, blank=True, null=True, verbose_name='状态变更原因')

    class Meta:
        db_table = 'device_status_history'
        verbose_name = '设备状态历史'
        verbose_name_plural = '设备状态历史管理'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.device.device_id}: {self.old_status} -> {self.new_status} @ {self.timestamp}"


class Alert(models.Model):
    ALERT_LEVEL_CHOICES = [
        ('info', '信息'),
        ('warning', '警告'),
        ('error', '错误'),
        ('critical', '严重'),
    ]

    ALERT_STATUS_CHOICES = [
        ('active', '活跃'),
        ('acknowledged', '已确认'),
        ('resolved', '已解决'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='alerts', verbose_name='关联设备', null=True, blank=True)
    alert_code = models.CharField(max_length=50, verbose_name='告警代码')
    alert_message = models.TextField(verbose_name='告警信息')
    alert_level = models.CharField(max_length=20, choices=ALERT_LEVEL_CHOICES, default='warning', verbose_name='告警级别')
    status = models.CharField(max_length=20, choices=ALERT_STATUS_CHOICES, default='active', verbose_name='状态')
    timestamp = models.DateTimeField(default=timezone.now, verbose_name='发生时间')
    acknowledged_at = models.DateTimeField(null=True, blank=True, verbose_name='确认时间')
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name='解决时间')
    acknowledged_by = models.CharField(max_length=50, blank=True, null=True, verbose_name='确认人')
    resolved_by = models.CharField(max_length=50, blank=True, null=True, verbose_name='解决人')
    resolution_notes = models.TextField(blank=True, null=True, verbose_name='解决说明')

    class Meta:
        db_table = 'alert'
        verbose_name = '告警'
        verbose_name_plural = '告警管理'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.alert_code} - {self.alert_level}: {self.alert_message}"
