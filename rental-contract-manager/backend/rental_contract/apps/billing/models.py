from django.db import models
from django.contrib.auth.models import User
from rental_contract.apps.contracts.models import RentalContract, Tenant


class Bill(models.Model):
    """
    账单模型
    """
    BILL_TYPES = [
        ('rent', '房租'),
        ('water', '水费'),
        ('electricity', '电费'),
        ('gas', '燃气费'),
        ('property_fee', '物业费'),
        ('internet', '网络费'),
        ('other', '其他'),
    ]

    STATUS_CHOICES = [
        ('pending', '待支付'),
        ('partially_paid', '部分支付'),
        ('paid', '已支付'),
        ('overdue', '已逾期'),
        ('cancelled', '已取消'),
    ]

    contract = models.ForeignKey(RentalContract, on_delete=models.CASCADE, related_name='bills', verbose_name='合同')
    bill_type = models.CharField('账单类型', max_length=20, choices=BILL_TYPES)
    
    bill_number = models.CharField('账单编号', max_length=50, unique=True)
    title = models.CharField('账单标题', max_length=200)
    description = models.TextField('账单描述', null=True, blank=True)
    
    billing_period_start = models.DateField('计费周期开始')
    billing_period_end = models.DateField('计费周期结束')
    due_date = models.DateField('到期日期')
    
    total_amount = models.DecimalField('总金额(元)', max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField('已支付金额(元)', max_digits=12, decimal_places=2, default=0)
    
    status = models.CharField('账单状态', max_length=20, choices=STATUS_CHOICES, default='pending')
    
    notes = models.TextField('备注', null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '账单'
        verbose_name_plural = '账单管理'
        ordering = ['-due_date']

    def __str__(self):
        return f"{self.bill_number} - {self.get_bill_type_display()}"

    def save(self, *args, **kwargs):
        if not self.bill_number:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            self.bill_number = f"BL-{self.bill_type.upper()}-{timestamp}"
        super().save(*args, **kwargs)

    @property
    def remaining_amount(self):
        """计算剩余未支付金额"""
        return self.total_amount - self.paid_amount

    @property
    def is_overdue(self):
        """检查是否逾期"""
        from django.utils import timezone
        today = timezone.now().date()
        return self.due_date < today and self.status not in ['paid', 'cancelled']


class BillItem(models.Model):
    """
    账单明细项目模型
    """
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items', verbose_name='账单')
    name = models.CharField('项目名称', max_length=200)
    description = models.TextField('项目描述', null=True, blank=True)
    
    quantity = models.DecimalField('数量', max_digits=10, decimal_places=2, default=1)
    unit = models.CharField('单位', max_length=20, default='项')
    unit_price = models.DecimalField('单价(元)', max_digits=10, decimal_places=2)
    amount = models.DecimalField('金额(元)', max_digits=12, decimal_places=2)
    
    notes = models.TextField('备注', null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '账单明细'
        verbose_name_plural = '账单明细管理'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.name} - {self.amount}元"

    def save(self, *args, **kwargs):
        if self.quantity and self.unit_price:
            self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class BillSplit(models.Model):
    """
    账单分摊模型
    """
    SPLIT_METHODS = [
        ('equal', '平均分摊'),
        ('proportion', '按比例分摊'),
        ('custom', '自定义分摊'),
    ]

    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='splits', verbose_name='账单')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='bill_splits', verbose_name='房客')
    
    split_method = models.CharField('分摊方式', max_length=20, choices=SPLIT_METHODS)
    proportion = models.DecimalField('分摊比例(%)', max_digits=5, decimal_places=2, default=0)
    amount = models.DecimalField('分摊金额(元)', max_digits=12, decimal_places=2)
    
    is_paid = models.BooleanField('是否已支付', default=False)
    paid_at = models.DateTimeField('支付时间', null=True, blank=True)
    
    notes = models.TextField('备注', null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '账单分摊'
        verbose_name_plural = '账单分摊管理'
        ordering = ['created_at']
        unique_together = ['bill', 'tenant']

    def __str__(self):
        return f"{self.tenant.name} - {self.amount}元 ({self.proportion}%)"


class PaymentRecord(models.Model):
    """
    支付记录模型
    """
    PAYMENT_METHODS = [
        ('cash', '现金'),
        ('alipay', '支付宝'),
        ('wechat', '微信支付'),
        ('bank_transfer', '银行转账'),
        ('other', '其他'),
    ]

    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='payments', verbose_name='账单')
    bill_split = models.ForeignKey(BillSplit, on_delete=models.SET_NULL, related_name='payments', verbose_name='账单分摊', null=True, blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.SET_NULL, related_name='payments', verbose_name='房客', null=True, blank=True)
    
    payment_method = models.CharField('支付方式', max_length=20, choices=PAYMENT_METHODS)
    amount = models.DecimalField('支付金额(元)', max_digits=12, decimal_places=2)
    
    transaction_id = models.CharField('交易单号', max_length=100, null=True, blank=True)
    payment_date = models.DateField('支付日期')
    
    receipt_number = models.CharField('收据编号', max_length=50, null=True, blank=True)
    notes = models.TextField('备注', null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '支付记录'
        verbose_name_plural = '支付记录管理'
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.get_payment_method_display()} - {self.amount}元"
