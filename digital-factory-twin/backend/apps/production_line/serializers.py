from rest_framework import serializers
from .models import (
    ProductionLine, ProductionLineDevice, Device3DModel, 
    DeviceComponent, DisassemblyStep, ProductionLineStatus
)
from apps.iot_data.serializers import DeviceSerializer


class ProductionLineDeviceSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_id = serializers.CharField(source='device.device_id', read_only=True)
    device_status = serializers.CharField(source='device.status', read_only=True)
    device_type = serializers.CharField(source='device.device_type', read_only=True)

    class Meta:
        model = ProductionLineDevice
        fields = ['id', 'production_line', 'device', 'device_id', 'device_name', 
                  'device_status', 'device_type', 'position_x', 'position_y', 
                  'position_z', 'rotation_x', 'rotation_y', 'rotation_z', 'order']
        read_only_fields = ['id', 'device_id', 'device_name', 'device_status', 'device_type']


class DeviceComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceComponent
        fields = ['id', 'device_3d_model', 'component_name', 'component_path', 
                  'mesh_name', 'position_x', 'position_y', 'position_z', 
                  'rotation_x', 'rotation_y', 'rotation_z', 'can_disassemble', 
                  'disassemble_order', 'status_tag', 'description']
        read_only_fields = ['id']


class Device3DModelSerializer(serializers.ModelSerializer):
    components = DeviceComponentSerializer(many=True, read_only=True)
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_id = serializers.CharField(source='device.device_id', read_only=True)

    class Meta:
        model = Device3DModel
        fields = ['id', 'device', 'device_id', 'device_name', 'model_name', 
                  'model_path', 'model_format', 'scale_factor', 
                  'default_position_x', 'default_position_y', 'default_position_z',
                  'default_rotation_x', 'default_rotation_y', 'default_rotation_z',
                  'has_internal_structure', 'description', 'components']
        read_only_fields = ['id', 'device_id', 'device_name', 'components']


class DisassemblyStepSerializer(serializers.ModelSerializer):
    components = DeviceComponentSerializer(many=True, read_only=True)

    class Meta:
        model = DisassemblyStep
        fields = ['id', 'device_3d_model', 'step_number', 'step_name', 
                  'description', 'components', 'animation_duration', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductionLineStatusSerializer(serializers.ModelSerializer):
    line_name = serializers.CharField(source='production_line.line_name', read_only=True)
    line_id = serializers.CharField(source='production_line.line_id', read_only=True)

    class Meta:
        model = ProductionLineStatus
        fields = ['id', 'production_line', 'line_id', 'line_name', 'status', 
                  'production_speed', 'daily_output', 'target_output', 
                  'efficiency', 'timestamp']
        read_only_fields = ['id', 'line_id', 'line_name', 'timestamp']


class ProductionLineSerializer(serializers.ModelSerializer):
    devices = DeviceSerializer(many=True, read_only=True)
    device_positions = ProductionLineDeviceSerializer(
        source='productionlinedevice_set', many=True, read_only=True
    )
    current_status = ProductionLineStatusSerializer(read_only=True)

    class Meta:
        model = ProductionLine
        fields = ['id', 'line_id', 'line_name', 'description', 'devices', 
                  'device_positions', 'current_status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'devices', 
                           'device_positions', 'current_status']
