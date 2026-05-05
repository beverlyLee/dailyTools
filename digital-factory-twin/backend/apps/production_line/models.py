from django.db import models
from django.utils import timezone
from apps.iot_data.models import Device


class ProductionLine(models.Model):
    line_id = models.CharField(max_length=50, unique=True, verbose_name='产线编号')
    line_name = models.CharField(max_length=100, verbose_name='产线名称')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    devices = models.ManyToManyField(Device, through='ProductionLineDevice', verbose_name='关联设备')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'production_line'
        verbose_name = '产线'
        verbose_name_plural = '产线管理'

    def __str__(self):
        return f"{self.line_id} - {self.line_name}"


class ProductionLineDevice(models.Model):
    production_line = models.ForeignKey(ProductionLine, on_delete=models.CASCADE, verbose_name='产线')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, verbose_name='设备')
    position_x = models.FloatField(default=0, verbose_name='X坐标')
    position_y = models.FloatField(default=0, verbose_name='Y坐标')
    position_z = models.FloatField(default=0, verbose_name='Z坐标')
    rotation_x = models.FloatField(default=0, verbose_name='X旋转')
    rotation_y = models.FloatField(default=0, verbose_name='Y旋转')
    rotation_z = models.FloatField(default=0, verbose_name='Z旋转')
    order = models.IntegerField(default=0, verbose_name='显示顺序')

    class Meta:
        db_table = 'production_line_device'
        verbose_name = '产线设备'
        verbose_name_plural = '产线设备管理'
        unique_together = ['production_line', 'device']

    def __str__(self):
        return f"{self.production_line.line_name} - {self.device.device_name}"


class Device3DModel(models.Model):
    device = models.OneToOneField(Device, on_delete=models.CASCADE, related_name='model_3d', verbose_name='关联设备')
    model_name = models.CharField(max_length=100, verbose_name='模型名称')
    model_path = models.CharField(max_length=255, verbose_name='模型文件路径')
    model_format = models.CharField(max_length=20, default='glb', verbose_name='模型格式')
    scale_factor = models.FloatField(default=1.0, verbose_name='缩放因子')
    default_position_x = models.FloatField(default=0, verbose_name='默认X坐标')
    default_position_y = models.FloatField(default=0, verbose_name='默认Y坐标')
    default_position_z = models.FloatField(default=0, verbose_name='默认Z坐标')
    default_rotation_x = models.FloatField(default=0, verbose_name='默认X旋转')
    default_rotation_y = models.FloatField(default=0, verbose_name='默认Y旋转')
    default_rotation_z = models.FloatField(default=0, verbose_name='默认Z旋转')
    has_internal_structure = models.BooleanField(default=False, verbose_name='是否有内部结构')
    description = models.TextField(blank=True, null=True, verbose_name='描述')

    class Meta:
        db_table = 'device_3d_model'
        verbose_name = '设备3D模型'
        verbose_name_plural = '设备3D模型管理'

    def __str__(self):
        return f"{self.device.device_name} - {self.model_name}"


class DeviceComponent(models.Model):
    device_3d_model = models.ForeignKey(Device3DModel, on_delete=models.CASCADE, related_name='components', verbose_name='所属3D模型')
    component_name = models.CharField(max_length=100, verbose_name='组件名称')
    component_path = models.CharField(max_length=255, blank=True, null=True, verbose_name='组件模型路径')
    mesh_name = models.CharField(max_length=100, blank=True, null=True, verbose_name='网格名称')
    position_x = models.FloatField(default=0, verbose_name='X坐标')
    position_y = models.FloatField(default=0, verbose_name='Y坐标')
    position_z = models.FloatField(default=0, verbose_name='Z坐标')
    rotation_x = models.FloatField(default=0, verbose_name='X旋转')
    rotation_y = models.FloatField(default=0, verbose_name='Y旋转')
    rotation_z = models.FloatField(default=0, verbose_name='Z旋转')
    can_disassemble = models.BooleanField(default=True, verbose_name='是否可拆解')
    disassemble_order = models.IntegerField(default=0, verbose_name='拆解顺序')
    status_tag = models.CharField(max_length=100, blank=True, null=True, verbose_name='状态标签（PLC标签名）')
    description = models.TextField(blank=True, null=True, verbose_name='描述')

    class Meta:
        db_table = 'device_component'
        verbose_name = '设备组件'
        verbose_name_plural = '设备组件管理'

    def __str__(self):
        return f"{self.component_name} ({self.device_3d_model.device.device_name})"


class DisassemblyStep(models.Model):
    device_3d_model = models.ForeignKey(Device3DModel, on_delete=models.CASCADE, related_name='disassembly_steps', verbose_name='所属3D模型')
    step_number = models.IntegerField(verbose_name='步骤编号')
    step_name = models.CharField(max_length=100, verbose_name='步骤名称')
    description = models.TextField(verbose_name='步骤描述')
    components = models.ManyToManyField(DeviceComponent, verbose_name='涉及组件')
    animation_duration = models.FloatField(default=1.0, verbose_name='动画时长（秒）')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'disassembly_step'
        verbose_name = '拆解步骤'
        verbose_name_plural = '拆解步骤管理'
        ordering = ['step_number']

    def __str__(self):
        return f"步骤 {self.step_number}: {self.step_name}"


class ProductionLineStatus(models.Model):
    STATUS_CHOICES = [
        ('running', '运行中'),
        ('stopped', '已停机'),
        ('fault', '故障'),
        ('maintenance', '维护中'),
    ]

    production_line = models.OneToOneField(ProductionLine, on_delete=models.CASCADE, related_name='current_status', verbose_name='产线')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='stopped', verbose_name='状态')
    production_speed = models.FloatField(default=0, verbose_name='生产速度（件/分钟）')
    daily_output = models.IntegerField(default=0, verbose_name='当日产量')
    target_output = models.IntegerField(default=0, verbose_name='目标产量')
    efficiency = models.FloatField(default=0, verbose_name='效率（%）')
    timestamp = models.DateTimeField(default=timezone.now, verbose_name='时间戳')

    class Meta:
        db_table = 'production_line_status'
        verbose_name = '产线状态'
        verbose_name_plural = '产线状态管理'

    def __str__(self):
        return f"{self.production_line.line_name} - {self.get_status_display()}"
