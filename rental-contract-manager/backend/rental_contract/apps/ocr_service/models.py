from django.db import models
from django.contrib.auth.models import User
from rental_contract.apps.contracts.models import ContractDocument


class OCRRequest(models.Model):
    """
    OCR请求模型
    """
    STATUS_CHOICES = [
        ('pending', '待处理'),
        ('processing', '处理中'),
        ('completed', '已完成'),
        ('failed', '处理失败'),
    ]

    OCR_ENGINES = [
        ('paddleocr', 'PaddleOCR'),
        ('tesseract', 'Tesseract'),
    ]

    document = models.ForeignKey(ContractDocument, on_delete=models.CASCADE, related_name='ocr_requests', verbose_name='合同文档', null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ocr_requests', verbose_name='用户')
    
    file = models.FileField('上传文件', upload_to='ocr/requests/%Y/%m/')
    file_name = models.CharField('文件名', max_length=200)
    file_type = models.CharField('文件类型', max_length=50)
    
    ocr_engine = models.CharField('OCR引擎', max_length=20, choices=OCR_ENGINES, default='paddleocr')
    language = models.CharField('识别语言', max_length=20, default='ch')
    
    status = models.CharField('处理状态', max_length=20, choices=STATUS_CHOICES, default='pending')
    
    error_message = models.TextField('错误信息', null=True, blank=True)
    
    started_at = models.DateTimeField('开始处理时间', null=True, blank=True)
    completed_at = models.DateTimeField('完成时间', null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = 'OCR请求'
        verbose_name_plural = 'OCR请求管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file_name} - {self.get_status_display()}"


class OCRResult(models.Model):
    """
    OCR识别结果模型
    """
    ocr_request = models.OneToOneField(OCRRequest, on_delete=models.CASCADE, related_name='result', verbose_name='OCR请求')
    
    raw_text = models.TextField('原始识别文本', null=True, blank=True)
    processed_text = models.TextField('处理后文本', null=True, blank=True)
    
    confidence = models.DecimalField('置信度', max_digits=5, decimal_places=2, null=True, blank=True)
    processing_time = models.DecimalField('处理时间(秒)', max_digits=10, decimal_places=3, null=True, blank=True)
    
    extracted_fields = models.JSONField('提取的字段', default=dict, null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = 'OCR结果'
        verbose_name_plural = 'OCR结果管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"OCR结果 - {self.ocr_request.file_name}"


class OCRTextLine(models.Model):
    """
    OCR识别的文本行模型
    """
    ocr_result = models.ForeignKey(OCRResult, on_delete=models.CASCADE, related_name='text_lines', verbose_name='OCR结果')
    
    text = models.TextField('识别文本')
    confidence = models.DecimalField('置信度', max_digits=5, decimal_places=2, default=0)
    
    bbox = models.JSONField('边界框坐标', default=list)
    
    line_number = models.IntegerField('行号', default=0)
    page_number = models.IntegerField('页码', default=1)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = 'OCR文本行'
        verbose_name_plural = 'OCR文本行管理'
        ordering = ['page_number', 'line_number']

    def __str__(self):
        return f"第{self.page_number}页 第{self.line_number}行: {self.text[:50]}..."


class ExtractedContractField(models.Model):
    """
    从合同中提取的关键字段模型
    """
    FIELD_TYPES = [
        ('contract_number', '合同编号'),
        ('landlord_name', '房东姓名'),
        ('landlord_phone', '房东电话'),
        ('landlord_id_card', '房东身份证号'),
        ('tenant_name', '房客姓名'),
        ('tenant_phone', '房客电话'),
        ('tenant_id_card', '房客身份证号'),
        ('property_address', '房屋地址'),
        ('start_date', '开始日期'),
        ('end_date', '结束日期'),
        ('monthly_rent', '月租金'),
        ('deposit', '押金'),
        ('payment_method', '付款方式'),
        ('payment_day', '付款日'),
        ('water_price', '水费单价'),
        ('electricity_price', '电费单价'),
        ('gas_price', '燃气费单价'),
        ('other', '其他'),
    ]

    ocr_result = models.ForeignKey(OCRResult, on_delete=models.CASCADE, related_name='contract_fields', verbose_name='OCR结果')
    
    field_type = models.CharField('字段类型', max_length=30, choices=FIELD_TYPES)
    field_name = models.CharField('字段名称', max_length=100)
    field_value = models.TextField('字段值')
    
    confidence = models.DecimalField('置信度', max_digits=5, decimal_places=2, default=0)
    source_text = models.TextField('源文本', null=True, blank=True)
    
    is_verified = models.BooleanField('是否已验证', default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='verified_fields', verbose_name='验证人', null=True, blank=True)
    verified_at = models.DateTimeField('验证时间', null=True, blank=True)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '提取的合同字段'
        verbose_name_plural = '提取的合同字段管理'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_field_type_display()}: {self.field_value}"
