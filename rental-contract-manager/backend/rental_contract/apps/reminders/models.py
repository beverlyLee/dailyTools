from django.db import models
from django.contrib.auth.models import User
from rental_contract.apps.contracts.models import RentalContract


class Reminder(models.Model):
    """
    提醒模型
    """
    REMINDER_TYPES = [
        ('contract_expiry', '合同到期提醒'),
        ('rent_payment', '租金支付提醒'),
        ('billing_due', '账单到期提醒'),
        ('custom', '自定义提醒'),
    ]

    REMINDER_CHANNELS = [
        ('app', '应用内通知'),
        ('sms', '短信'),
        ('email', '邮件'),
    ]

    contract = models.ForeignKey(RentalContract, on_delete=models.CASCADE, related_name='reminders', verbose_name='合同', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reminders', verbose_name='用户')
    
    reminder_type = models.CharField('提醒类型', max_length=30, choices=REMINDER_TYPES)
    title = models.CharField('提醒标题', max_length=200)
    message = models.TextField('提醒内容')
    
    scheduled_date = models.DateField('预定提醒日期')
    scheduled_time = models.TimeField('预定提醒时间', default='09:00:00')
    
    channels = models.JSONField('提醒渠道', default=list)
    
    is_recurring = models.BooleanField('是否重复提醒', default=False)
    recurring_pattern = models.CharField('重复模式', max_length=50, null=True, blank=True)
    
    is_sent = models.BooleanField('是否已发送', default=False)
    sent_at = models.DateTimeField('发送时间', null=True, blank=True)
    
    is_read = models.BooleanField('是否已读', default=False)
    read_at = models.DateTimeField('阅读时间', null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '提醒'
        verbose_name_plural = '提醒管理'
        ordering = ['-scheduled_date', '-scheduled_time']

    def __str__(self):
        return f"{self.get_reminder_type_display()} - {self.title}"


class ReminderLog(models.Model):
    """
    提醒日志模型
    """
    STATUS_CHOICES = [
        ('pending', '待发送'),
        ('sent', '已发送'),
        ('failed', '发送失败'),
        ('read', '已阅读'),
    ]

    reminder = models.ForeignKey(Reminder, on_delete=models.CASCADE, related_name='logs', verbose_name='提醒')
    channel = models.CharField('发送渠道', max_length=20, choices=Reminder.REMINDER_CHANNELS)
    status = models.CharField('状态', max_length=20, choices=STATUS_CHOICES, default='pending')
    
    recipient = models.CharField('接收者', max_length=200)
    message_content = models.TextField('消息内容', null=True, blank=True)
    
    error_message = models.TextField('错误信息', null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    processed_at = models.DateTimeField('处理时间', null=True, blank=True)

    class Meta:
        verbose_name = '提醒日志'
        verbose_name_plural = '提醒日志管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reminder.title} - {self.get_channel_display()}"
