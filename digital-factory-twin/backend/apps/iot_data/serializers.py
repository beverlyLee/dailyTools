from rest_framework import serializers
from .models import Device, PLCData, DeviceStatusHistory, Alert


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ['id', 'device_id', 'device_name', 'device_type', 'location', 
                  'status', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PLCDataSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_id = serializers.CharField(source='device.device_id', read_only=True)

    class Meta:
        model = PLCData
        fields = ['id', 'device', 'device_id', 'device_name', 'timestamp', 
                  'tag_name', 'tag_value', 'data_type', 'quality']
        read_only_fields = ['id', 'timestamp', 'device_id', 'device_name']


class DeviceStatusHistorySerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_id = serializers.CharField(source='device.device_id', read_only=True)

    class Meta:
        model = DeviceStatusHistory
        fields = ['id', 'device', 'device_id', 'device_name', 'old_status', 
                  'new_status', 'timestamp', 'reason']
        read_only_fields = ['id', 'timestamp', 'device_id', 'device_name']


class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True, required=False)
    device_id = serializers.CharField(source='device.device_id', read_only=True, required=False)

    class Meta:
        model = Alert
        fields = ['id', 'device', 'device_id', 'device_name', 'alert_code', 
                  'alert_message', 'alert_level', 'status', 'timestamp', 
                  'acknowledged_at', 'resolved_at', 'acknowledged_by', 
                  'resolved_by', 'resolution_notes']
        read_only_fields = ['id', 'timestamp', 'acknowledged_at', 'resolved_at', 
                           'device_id', 'device_name']
