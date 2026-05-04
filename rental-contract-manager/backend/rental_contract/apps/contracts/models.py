from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Property(models.Model):
    """
    房屋信息模型
    """
    PROPERTY_TYPES = [
        ('apartment', '公寓'),
        ('house', '住宅'),
        ('studio', '单间'),
        ('loft', 'loft'),
        ('other', '其他'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='properties')
    name = models.CharField('房屋名称', max_length=200)
    address = models.CharField('详细地址', max_length=500)
    property_type = models.CharField('房屋类型', max_length=20, choices=PROPERTY_TYPES, default='apartment')
    area = models.DecimalField('面积(㎡)', max_digits=10, decimal_places=2, null=True, blank=True)
    rooms = models.IntegerField('房间数', null=True, blank=True)
    bathrooms = models.IntegerField('卫生间数', null=True, blank=True)
    description = models.TextField('房屋描述', null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '房屋'
        verbose_name_plural = '房屋管理'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Tenant(models.Model):
    """
    房客信息模型
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tenant_profile', null=True, blank=True)
    name = models.CharField('姓名', max_length=100)
    phone = models.CharField('联系电话', max_length=20)
    id_card = models.CharField('身份证号', max_length=20, null=True, blank=True)
    email = models.EmailField('邮箱', null=True, blank=True)
    emergency_contact = models.CharField('紧急联系人', max_length=100, null=True, blank=True)
    emergency_phone = models.CharField('紧急联系电话', max_length=20, null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '房客'
        verbose_name_plural = '房客管理'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class RentalContract(models.Model):
    """
    租房合同模型
    """
    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('active', '有效'),
        ('expired', '已到期'),
        ('terminated', '已终止'),
    ]

    contract_number = models.CharField('合同编号', max_length=50, unique=True)
    property_info = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='contracts', verbose_name='房屋')
    landlord = models.ForeignKey(User, on_delete=models.CASCADE, related_name='landlord_contracts', verbose_name='房东')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_contracts', verbose_name='房客')
    
    start_date = models.DateField('开始日期')
    end_date = models.DateField('结束日期')
    
    monthly_rent = models.DecimalField('月租金(元)', max_digits=12, decimal_places=2)
    deposit = models.DecimalField('押金(元)', max_digits=12, decimal_places=2)
    payment_method = models.CharField('付款方式', max_length=50, default='月付')
    payment_day = models.IntegerField('每月付款日', default=1)
    
    utilities_included = models.BooleanField('水电费包含在房租中', default=False)
    water_price = models.DecimalField('水费单价(元/吨)', max_digits=5, decimal_places=2, default=4.5)
    electricity_price = models.DecimalField('电费单价(元/度)', max_digits=5, decimal_places=2, default=0.85)
    gas_price = models.DecimalField('燃气费单价(元/立方米)', max_digits=5, decimal_places=2, default=2.8, null=True, blank=True)
    
    status = models.CharField('合同状态', max_length=20, choices=STATUS_CHOICES, default='active')
    
    terms = models.TextField('合同条款', null=True, blank=True)
    notes = models.TextField('备注', null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '租房合同'
        verbose_name_plural = '租房合同管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.contract_number} - {self.property_info.name}"

    def save(self, *args, **kwargs):
        if not self.contract_number:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            self.contract_number = f"RC-{timestamp}"
        super().save(*args, **kwargs)

    @property
    def days_remaining(self):
        """计算合同剩余天数"""
        if self.status != 'active':
            return 0
        today = timezone.now().date()
        delta = self.end_date - today
        return max(0, delta.days)

    @property
    def is_expiring_soon(self):
        """检查合同是否即将到期（30天内）"""
        return 0 < self.days_remaining <= 30


class ContractDocument(models.Model):
    """
    合同文档模型
    """
    DOCUMENT_TYPES = [
        ('contract', '合同原件'),
        ('addendum', '补充协议'),
        ('receipt', '收据'),
        ('other', '其他'),
    ]

    contract = models.ForeignKey(RentalContract, on_delete=models.CASCADE, related_name='documents', verbose_name='合同')
    name = models.CharField('文档名称', max_length=200)
    document_type = models.CharField('文档类型', max_length=20, choices=DOCUMENT_TYPES, default='contract')
    file = models.FileField('文件', upload_to='contracts/documents/%Y/%m/')
    file_size = models.IntegerField('文件大小(字节)', null=True, blank=True)
    ocr_processed = models.BooleanField('已进行OCR处理', default=False)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '合同文档'
        verbose_name_plural = '合同文档管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.contract.contract_number}"


class MeterReading(models.Model):
    """
    抄表记录模型
    """
    METER_TYPES = [
        ('water', '水表'),
        ('electricity', '电表'),
        ('gas', '燃气表'),
    ]

    contract = models.ForeignKey(RentalContract, on_delete=models.CASCADE, related_name='meter_readings', verbose_name='合同')
    meter_type = models.CharField('表类型', max_length=20, choices=METER_TYPES)
    reading_date = models.DateField('抄表日期')
    previous_reading = models.DecimalField('上期读数', max_digits=12, decimal_places=2)
    current_reading = models.DecimalField('本期读数', max_digits=12, decimal_places=2)
    usage = models.DecimalField('用量', max_digits=12, decimal_places=2)
    unit_price = models.DecimalField('单价', max_digits=5, decimal_places=2)
    total_amount = models.DecimalField('总金额', max_digits=12, decimal_places=2)
    
    notes = models.TextField('备注', null=True, blank=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '抄表记录'
        verbose_name_plural = '抄表记录管理'
        ordering = ['-reading_date']

    def __str__(self):
        return f"{self.get_meter_type_display()} - {self.reading_date}"

    def save(self, *args, **kwargs):
        if self.current_reading and self.previous_reading:
            self.usage = self.current_reading - self.previous_reading
        if self.usage and self.unit_price:
            self.total_amount = self.usage * self.unit_price
        super().save(*args, **kwargs)
