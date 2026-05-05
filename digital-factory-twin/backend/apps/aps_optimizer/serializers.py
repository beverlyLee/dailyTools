from rest_framework import serializers
from .models import (
    Product, Order, ResourceType, Resource, Mold, Material,
    ProductMaterialRequirement, Inventory, Employee, WorkCenter,
    ProcessRoute, ProcessStep, ScheduleRun, ScheduleJob,
    ResourceAllocation, MaterialCheckResult
)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'product_id', 'product_name', 'description', 
                  'standard_cycle_time', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    product_id = serializers.CharField(source='product.product_id', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'product', 'product_id', 'product_name', 
                  'quantity', 'priority', 'due_date', 'order_date', 'status', 
                  'notes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'product_id', 'product_name', 'created_at', 'updated_at']


class ResourceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceType
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']


class ResourceSerializer(serializers.ModelSerializer):
    resource_type_name = serializers.CharField(source='resource_type.name', read_only=True)

    class Meta:
        model = Resource
        fields = ['id', 'resource_id', 'resource_name', 'resource_type', 
                  'resource_type_name', 'status', 'capacity', 'cost_per_hour', 
                  'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'resource_type_name', 'created_at', 'updated_at']


class MoldSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)

    class Meta:
        model = Mold
        fields = ['id', 'mold_id', 'mold_name', 'product', 'product_name', 
                  'status', 'remaining_life', 'total_life', 'description', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'product_name', 'created_at', 'updated_at']


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ['id', 'material_id', 'material_name', 'description', 
                  'unit', 'safety_stock', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductMaterialRequirementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    material_name = serializers.CharField(source='material.material_name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)

    class Meta:
        model = ProductMaterialRequirement
        fields = ['id', 'product', 'product_name', 'material', 'material_name', 
                  'material_unit', 'quantity_per_unit', 'description']
        read_only_fields = ['id', 'product_name', 'material_name', 'material_unit']


class InventorySerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.material_name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)

    class Meta:
        model = Inventory
        fields = ['id', 'material', 'material_name', 'material_unit', 
                  'quantity', 'location', 'last_updated']
        read_only_fields = ['id', 'material_name', 'material_unit', 'last_updated']


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'employee_id', 'name', 'skill_level', 'status', 
                  'cost_per_hour', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkCenterSerializer(serializers.ModelSerializer):
    production_line_name = serializers.CharField(source='production_line.line_name', read_only=True, required=False)

    class Meta:
        model = WorkCenter
        fields = ['id', 'work_center_id', 'work_center_name', 'production_line', 
                  'production_line_name', 'devices', 'employees', 'capacity', 
                  'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'production_line_name', 'created_at', 'updated_at']


class ProcessStepSerializer(serializers.ModelSerializer):
    work_center_name = serializers.CharField(source='work_center.work_center_name', read_only=True)
    resource_type_name = serializers.CharField(source='resource_type.name', read_only=True, required=False)

    class Meta:
        model = ProcessStep
        fields = ['id', 'process_route', 'step_number', 'step_name', 'work_center', 
                  'work_center_name', 'required_mold', 'cycle_time', 'setup_time', 
                  'employee_count', 'resource_type', 'resource_type_name', 
                  'resource_count', 'description']
        read_only_fields = ['id', 'work_center_name', 'resource_type_name']


class ProcessRouteSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.product_name', read_only=True)
    steps = ProcessStepSerializer(many=True, read_only=True)

    class Meta:
        model = ProcessRoute
        fields = ['id', 'product', 'product_name', 'route_name', 'is_primary', 
                  'description', 'steps', 'created_at', 'updated_at']
        read_only_fields = ['id', 'product_name', 'steps', 'created_at', 'updated_at']


class ScheduleRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleRun
        fields = ['id', 'run_id', 'run_name', 'status', 'start_time', 'end_time', 
                  'algorithm_name', 'parameters', 'objective_function', 
                  'result_makespan', 'result_total_cost', 'result_late_orders', 
                  'result_resource_utilization', 'notes', 'created_at']
        read_only_fields = ['id', 'start_time', 'end_time', 'result_makespan', 
                           'result_total_cost', 'result_late_orders', 
                           'result_resource_utilization', 'created_at']


class ScheduleJobSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source='order.order_id', read_only=True)
    step_name = serializers.CharField(source='process_step.step_name', read_only=True)
    work_center_name = serializers.CharField(source='work_center.work_center_name', read_only=True)
    mold_name = serializers.CharField(source='mold.mold_name', read_only=True, required=False)

    class Meta:
        model = ScheduleJob
        fields = ['id', 'schedule_run', 'order', 'order_id', 'process_step', 
                  'step_name', 'job_id', 'work_center', 'work_center_name', 
                  'mold', 'mold_name', 'employees', 'status', 'planned_start_time', 
                  'planned_end_time', 'actual_start_time', 'actual_end_time', 
                  'setup_time_used', 'cycle_time_used', 'quantity', 'is_late', 
                  'priority', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order_id', 'step_name', 'work_center_name', 
                           'mold_name', 'created_at', 'updated_at']


class ResourceAllocationSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.resource_name', read_only=True)
    resource_id = serializers.CharField(source='resource.resource_id', read_only=True)
    job_id = serializers.CharField(source='schedule_job.job_id', read_only=True)

    class Meta:
        model = ResourceAllocation
        fields = ['id', 'schedule_job', 'job_id', 'resource', 'resource_id', 
                  'resource_name', 'start_time', 'end_time', 'quantity_used', 'created_at']
        read_only_fields = ['id', 'job_id', 'resource_id', 'resource_name', 'created_at']


class MaterialCheckResultSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source='order.order_id', read_only=True)
    material_name = serializers.CharField(source='material.material_name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)

    class Meta:
        model = MaterialCheckResult
        fields = ['id', 'schedule_run', 'order', 'order_id', 'material', 
                  'material_name', 'material_unit', 'required_quantity', 
                  'available_quantity', 'status', 'checked_at']
        read_only_fields = ['id', 'order_id', 'material_name', 'material_unit', 'checked_at']
