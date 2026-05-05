from django.db import models
from django.utils import timezone
from apps.production_line.models import ProductionLine, Device


class Product(models.Model):
    product_id = models.CharField(max_length=50, unique=True, verbose_name='产品编号')
    product_name = models.CharField(max_length=100, verbose_name='产品名称')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    standard_cycle_time = models.FloatField(default=1.0, verbose_name='标准周期时间（分钟）')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'product'
        verbose_name = '产品'
        verbose_name_plural = '产品管理'

    def __str__(self):
        return f"{self.product_id} - {self.product_name}"


class Order(models.Model):
    ORDER_STATUS_CHOICES = [
        ('pending', '待排程'),
        ('scheduled', '已排程'),
        ('in_progress', '进行中'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]

    order_id = models.CharField(max_length=50, unique=True, verbose_name='订单编号')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders', verbose_name='产品')
    quantity = models.IntegerField(verbose_name='订单数量')
    priority = models.IntegerField(default=5, verbose_name='优先级（1-10，越高越紧急）')
    due_date = models.DateTimeField(verbose_name='交货日期')
    order_date = models.DateTimeField(default=timezone.now, verbose_name='下单日期')
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending', verbose_name='状态')
    notes = models.TextField(blank=True, null=True, verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'order'
        verbose_name = '订单'
        verbose_name_plural = '订单管理'
        ordering = ['priority', 'due_date']

    def __str__(self):
        return f"{self.order_id} - {self.product.product_name} x {self.quantity}"


class ResourceType(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name='资源类型名称')
    description = models.TextField(blank=True, null=True, verbose_name='描述')

    class Meta:
        db_table = 'resource_type'
        verbose_name = '资源类型'
        verbose_name_plural = '资源类型管理'

    def __str__(self):
        return self.name


class Resource(models.Model):
    RESOURCE_STATUS_CHOICES = [
        ('available', '可用'),
        ('in_use', '使用中'),
        ('maintenance', '维护中'),
        ('unavailable', '不可用'),
    ]

    resource_id = models.CharField(max_length=50, unique=True, verbose_name='资源编号')
    resource_name = models.CharField(max_length=100, verbose_name='资源名称')
    resource_type = models.ForeignKey(ResourceType, on_delete=models.CASCADE, related_name='resources', verbose_name='资源类型')
    status = models.CharField(max_length=20, choices=RESOURCE_STATUS_CHOICES, default='available', verbose_name='状态')
    capacity = models.FloatField(default=1.0, verbose_name='容量/数量')
    cost_per_hour = models.FloatField(default=0.0, verbose_name='每小时成本')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'resource'
        verbose_name = '资源'
        verbose_name_plural = '资源管理'

    def __str__(self):
        return f"{self.resource_id} - {self.resource_name} ({self.resource_type.name})"


class Mold(models.Model):
    MOLD_STATUS_CHOICES = [
        ('available', '可用'),
        ('in_use', '使用中'),
        ('maintenance', '维护中'),
        ('unavailable', '不可用'),
    ]

    mold_id = models.CharField(max_length=50, unique=True, verbose_name='模具编号')
    mold_name = models.CharField(max_length=100, verbose_name='模具名称')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='molds', verbose_name='适用产品')
    status = models.CharField(max_length=20, choices=MOLD_STATUS_CHOICES, default='available', verbose_name='状态')
    remaining_life = models.FloatField(default=10000, verbose_name='剩余寿命（次数）')
    total_life = models.FloatField(default=10000, verbose_name='总寿命（次数）')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'mold'
        verbose_name = '模具'
        verbose_name_plural = '模具管理'

    def __str__(self):
        return f"{self.mold_id} - {self.mold_name}"


class Material(models.Model):
    material_id = models.CharField(max_length=50, unique=True, verbose_name='物料编号')
    material_name = models.CharField(max_length=100, verbose_name='物料名称')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    unit = models.CharField(max_length=20, default='件', verbose_name='单位')
    safety_stock = models.FloatField(default=0, verbose_name='安全库存')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'material'
        verbose_name = '物料'
        verbose_name_plural = '物料管理'

    def __str__(self):
        return f"{self.material_id} - {self.material_name}"


class ProductMaterialRequirement(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='material_requirements', verbose_name='产品')
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='product_requirements', verbose_name='物料')
    quantity_per_unit = models.FloatField(verbose_name='单位产品需求量')
    description = models.TextField(blank=True, null=True, verbose_name='描述')

    class Meta:
        db_table = 'product_material_requirement'
        verbose_name = '产品物料需求'
        verbose_name_plural = '产品物料需求管理'
        unique_together = ['product', 'material']

    def __str__(self):
        return f"{self.product.product_name} - {self.material.material_name}: {self.quantity_per_unit}"


class Inventory(models.Model):
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='inventory', verbose_name='物料')
    quantity = models.FloatField(default=0, verbose_name='库存数量')
    location = models.CharField(max_length=100, blank=True, null=True, verbose_name='库位')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='最后更新时间')

    class Meta:
        db_table = 'inventory'
        verbose_name = '库存'
        verbose_name_plural = '库存管理'

    def __str__(self):
        return f"{self.material.material_name}: {self.quantity} {self.material.unit}"


class Employee(models.Model):
    EMPLOYEE_STATUS_CHOICES = [
        ('available', '可用'),
        ('on_shift', '当班'),
        ('on_leave', '休假'),
        ('unavailable', '不可用'),
    ]

    employee_id = models.CharField(max_length=50, unique=True, verbose_name='员工编号')
    name = models.CharField(max_length=50, verbose_name='姓名')
    skill_level = models.IntegerField(default=1, verbose_name='技能等级（1-5）')
    status = models.CharField(max_length=20, choices=EMPLOYEE_STATUS_CHOICES, default='available', verbose_name='状态')
    cost_per_hour = models.FloatField(default=0.0, verbose_name='每小时成本')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'employee'
        verbose_name = '员工'
        verbose_name_plural = '员工管理'

    def __str__(self):
        return f"{self.employee_id} - {self.name}"


class WorkCenter(models.Model):
    work_center_id = models.CharField(max_length=50, unique=True, verbose_name='工作中心编号')
    work_center_name = models.CharField(max_length=100, verbose_name='工作中心名称')
    production_line = models.ForeignKey(ProductionLine, on_delete=models.SET_NULL, related_name='work_centers', null=True, blank=True, verbose_name='所属产线')
    devices = models.ManyToManyField(Device, related_name='work_centers', blank=True, verbose_name='关联设备')
    employees = models.ManyToManyField(Employee, related_name='work_centers', blank=True, verbose_name='关联员工')
    capacity = models.IntegerField(default=1, verbose_name='产能（同时处理数量）')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'work_center'
        verbose_name = '工作中心'
        verbose_name_plural = '工作中心管理'

    def __str__(self):
        return f"{self.work_center_id} - {self.work_center_name}"


class ProcessRoute(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='process_routes', verbose_name='产品')
    route_name = models.CharField(max_length=100, verbose_name='工艺路线名称')
    is_primary = models.BooleanField(default=True, verbose_name='是否为主工艺路线')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'process_route'
        verbose_name = '工艺路线'
        verbose_name_plural = '工艺路线管理'

    def __str__(self):
        return f"{self.product.product_name} - {self.route_name}"


class ProcessStep(models.Model):
    process_route = models.ForeignKey(ProcessRoute, on_delete=models.CASCADE, related_name='steps', verbose_name='工艺路线')
    step_number = models.IntegerField(verbose_name='步骤编号')
    step_name = models.CharField(max_length=100, verbose_name='步骤名称')
    work_center = models.ForeignKey(WorkCenter, on_delete=models.CASCADE, related_name='process_steps', verbose_name='工作中心')
    required_mold = models.BooleanField(default=False, verbose_name='是否需要模具')
    cycle_time = models.FloatField(default=1.0, verbose_name='周期时间（分钟）')
    setup_time = models.FloatField(default=0.0, verbose_name='换型时间（分钟）')
    employee_count = models.IntegerField(default=1, verbose_name='需要员工数量')
    resource_type = models.ForeignKey(ResourceType, on_delete=models.SET_NULL, related_name='process_steps', null=True, blank=True, verbose_name='需要资源类型')
    resource_count = models.IntegerField(default=0, verbose_name='需要资源数量')
    description = models.TextField(blank=True, null=True, verbose_name='描述')

    class Meta:
        db_table = 'process_step'
        verbose_name = '工艺步骤'
        verbose_name_plural = '工艺步骤管理'
        ordering = ['process_route', 'step_number']

    def __str__(self):
        return f"步骤 {self.step_number}: {self.step_name}"


class ScheduleRun(models.Model):
    SCHEDULE_STATUS_CHOICES = [
        ('pending', '待执行'),
        ('running', '执行中'),
        ('completed', '已完成'),
        ('failed', '失败'),
    ]

    run_id = models.CharField(max_length=50, unique=True, verbose_name='排程运行编号')
    run_name = models.CharField(max_length=100, verbose_name='排程运行名称')
    status = models.CharField(max_length=20, choices=SCHEDULE_STATUS_CHOICES, default='pending', verbose_name='状态')
    start_time = models.DateTimeField(null=True, blank=True, verbose_name='开始时间')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='结束时间')
    algorithm_name = models.CharField(max_length=50, default='genetic_algorithm', verbose_name='算法名称')
    parameters = models.TextField(blank=True, null=True, verbose_name='算法参数（JSON）')
    objective_function = models.CharField(max_length=100, default='minimize_makespan', verbose_name='目标函数')
    result_makespan = models.FloatField(null=True, blank=True, verbose_name='结果：总工期（分钟）')
    result_total_cost = models.FloatField(null=True, blank=True, verbose_name='结果：总成本')
    result_late_orders = models.IntegerField(null=True, blank=True, verbose_name='结果：延期订单数')
    result_resource_utilization = models.FloatField(null=True, blank=True, verbose_name='结果：资源利用率（%）')
    notes = models.TextField(blank=True, null=True, verbose_name='备注')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'schedule_run'
        verbose_name = '排程运行'
        verbose_name_plural = '排程运行管理'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.run_id} - {self.run_name}"


class ScheduleJob(models.Model):
    JOB_STATUS_CHOICES = [
        ('scheduled', '已排程'),
        ('in_progress', '进行中'),
        ('completed', '已完成'),
        ('delayed', '延期'),
    ]

    schedule_run = models.ForeignKey(ScheduleRun, on_delete=models.CASCADE, related_name='jobs', verbose_name='排程运行')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='schedule_jobs', verbose_name='订单')
    process_step = models.ForeignKey(ProcessStep, on_delete=models.CASCADE, related_name='schedule_jobs', verbose_name='工艺步骤')
    job_id = models.CharField(max_length=100, verbose_name='作业编号')
    work_center = models.ForeignKey(WorkCenter, on_delete=models.CASCADE, related_name='schedule_jobs', verbose_name='工作中心')
    mold = models.ForeignKey(Mold, on_delete=models.SET_NULL, related_name='schedule_jobs', null=True, blank=True, verbose_name='使用模具')
    employees = models.ManyToManyField(Employee, related_name='schedule_jobs', blank=True, verbose_name='分配员工')
    status = models.CharField(max_length=20, choices=JOB_STATUS_CHOICES, default='scheduled', verbose_name='状态')
    planned_start_time = models.DateTimeField(verbose_name='计划开始时间')
    planned_end_time = models.DateTimeField(verbose_name='计划结束时间')
    actual_start_time = models.DateTimeField(null=True, blank=True, verbose_name='实际开始时间')
    actual_end_time = models.DateTimeField(null=True, blank=True, verbose_name='实际结束时间')
    setup_time_used = models.FloatField(default=0.0, verbose_name='换型时间（分钟）')
    cycle_time_used = models.FloatField(default=0.0, verbose_name='周期时间（分钟）')
    quantity = models.IntegerField(default=1, verbose_name='加工数量')
    is_late = models.BooleanField(default=False, verbose_name='是否延期')
    priority = models.IntegerField(default=5, verbose_name='优先级')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'schedule_job'
        verbose_name = '排程作业'
        verbose_name_plural = '排程作业管理'
        ordering = ['planned_start_time']

    def __str__(self):
        return f"{self.job_id} - {self.order.order_id}"


class ResourceAllocation(models.Model):
    schedule_job = models.ForeignKey(ScheduleJob, on_delete=models.CASCADE, related_name='resource_allocations', verbose_name='排程作业')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='allocations', verbose_name='资源')
    start_time = models.DateTimeField(verbose_name='开始时间')
    end_time = models.DateTimeField(verbose_name='结束时间')
    quantity_used = models.FloatField(default=1.0, verbose_name='使用数量')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'resource_allocation'
        verbose_name = '资源分配'
        verbose_name_plural = '资源分配管理'

    def __str__(self):
        return f"{self.resource.resource_name} - {self.schedule_job.job_id}"


class MaterialCheckResult(models.Model):
    CHECK_STATUS_CHOICES = [
        ('sufficient', '齐套'),
        ('insufficient', '不齐套'),
        ('partial', '部分齐套'),
    ]

    schedule_run = models.ForeignKey(ScheduleRun, on_delete=models.CASCADE, related_name='material_checks', verbose_name='排程运行')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='material_checks', verbose_name='订单')
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='check_results', verbose_name='物料')
    required_quantity = models.FloatField(verbose_name='需求数量')
    available_quantity = models.FloatField(verbose_name='可用数量')
    status = models.CharField(max_length=20, choices=CHECK_STATUS_CHOICES, default='sufficient', verbose_name='检查状态')
    checked_at = models.DateTimeField(default=timezone.now, verbose_name='检查时间')

    class Meta:
        db_table = 'material_check_result'
        verbose_name = '物料齐套检查结果'
        verbose_name_plural = '物料齐套检查结果管理'

    def __str__(self):
        return f"{self.order.order_id} - {self.material.material_name}: {self.get_status_display()}"
