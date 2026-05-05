from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import (
    ProductionLine, ProductionLineDevice, Device3DModel, 
    DeviceComponent, DisassemblyStep, ProductionLineStatus
)
from .serializers import (
    ProductionLineSerializer, ProductionLineDeviceSerializer, 
    Device3DModelSerializer, DeviceComponentSerializer, 
    DisassemblyStepSerializer, ProductionLineStatusSerializer
)
from apps.iot_data.models import Device, PLCData


class ProductionLineViewSet(viewsets.ModelViewSet):
    queryset = ProductionLine.objects.all()
    serializer_class = ProductionLineSerializer
    search_fields = ['line_id', 'line_name']

    @action(detail=True, methods=['get'])
    def real_time_status(self, request, pk=None):
        production_line = self.get_object()
        status, created = ProductionLineStatus.objects.get_or_create(
            production_line=production_line
        )
        
        devices = production_line.devices.all()
        running_count = devices.filter(status='running').count()
        total_count = devices.count()
        
        if total_count > 0:
            status.efficiency = (running_count / total_count) * 100
        else:
            status.efficiency = 0
        
        status.timestamp = timezone.now()
        status.save()
        
        serializer = ProductionLineStatusSerializer(status)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def device_positions(self, request, pk=None):
        production_line = self.get_object()
        positions = ProductionLineDevice.objects.filter(
            production_line=production_line
        ).order_by('order')
        serializer = ProductionLineDeviceSerializer(positions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def real_time_plc_data(self, request, pk=None):
        production_line = self.get_object()
        minutes = int(request.query_params.get('minutes', 10))
        time_threshold = timezone.now() - timedelta(minutes=minutes)
        
        devices = production_line.devices.all()
        plc_data = PLCData.objects.filter(
            device__in=devices,
            timestamp__gte=time_threshold
        ).order_by('-timestamp')
        
        from apps.iot_data.serializers import PLCDataSerializer
        serializer = PLCDataSerializer(plc_data, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_device(self, request, pk=None):
        production_line = self.get_object()
        device_id = request.data.get('device_id')
        
        try:
            device = Device.objects.get(device_id=device_id)
        except Device.DoesNotExist:
            return Response(
                {"error": f"设备 {device_id} 不存在"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        position_data = {
            'production_line': production_line.id,
            'device': device.id,
            'position_x': request.data.get('position_x', 0),
            'position_y': request.data.get('position_y', 0),
            'position_z': request.data.get('position_z', 0),
            'rotation_x': request.data.get('rotation_x', 0),
            'rotation_y': request.data.get('rotation_y', 0),
            'rotation_z': request.data.get('rotation_z', 0),
            'order': request.data.get('order', 0),
        }
        
        serializer = ProductionLineDeviceSerializer(data=position_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductionLineDeviceViewSet(viewsets.ModelViewSet):
    queryset = ProductionLineDevice.objects.all()
    serializer_class = ProductionLineDeviceSerializer
    filterset_fields = ['production_line', 'device']


class Device3DModelViewSet(viewsets.ModelViewSet):
    queryset = Device3DModel.objects.all()
    serializer_class = Device3DModelSerializer
    filterset_fields = ['device', 'has_internal_structure']
    search_fields = ['model_name', 'device__device_name', 'device__device_id']

    @action(detail=True, methods=['get'])
    def disassembly_steps(self, request, pk=None):
        model_3d = self.get_object()
        steps = DisassemblyStep.objects.filter(device_3d_model=model_3d).order_by('step_number')
        serializer = DisassemblyStepSerializer(steps, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def components_status(self, request, pk=None):
        model_3d = self.get_object()
        components = DeviceComponent.objects.filter(device_3d_model=model_3d)
        
        components_data = []
        for component in components:
            component_info = {
                'id': component.id,
                'component_name': component.component_name,
                'can_disassemble': component.can_disassemble,
                'disassemble_order': component.disassemble_order,
                'status': 'normal',
            }
            
            if component.status_tag:
                latest_plc = PLCData.objects.filter(
                    device=model_3d.device,
                    tag_name=component.status_tag
                ).order_by('-timestamp').first()
                
                if latest_plc:
                    component_info['status_value'] = latest_plc.tag_value
                    component_info['status_quality'] = latest_plc.quality
                    component_info['status_timestamp'] = latest_plc.timestamp
                    
                    try:
                        value = int(latest_plc.tag_value)
                        if value > 0:
                            component_info['status'] = 'warning'
                        if value > 100:
                            component_info['status'] = 'fault'
                    except ValueError:
                        if latest_plc.tag_value.lower() in ['fault', 'error', 'stop']:
                            component_info['status'] = 'fault'
                        elif latest_plc.tag_value.lower() in ['warning', 'alarm']:
                            component_info['status'] = 'warning'
            
            components_data.append(component_info)
        
        return Response(components_data)


class DeviceComponentViewSet(viewsets.ModelViewSet):
    queryset = DeviceComponent.objects.all()
    serializer_class = DeviceComponentSerializer
    filterset_fields = ['device_3d_model', 'can_disassemble']
    search_fields = ['component_name', 'mesh_name', 'status_tag']


class DisassemblyStepViewSet(viewsets.ModelViewSet):
    queryset = DisassemblyStep.objects.all()
    serializer_class = DisassemblyStepSerializer
    filterset_fields = ['device_3d_model']
    search_fields = ['step_name', 'description']


class ProductionLineStatusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductionLineStatus.objects.all()
    serializer_class = ProductionLineStatusSerializer
    filterset_fields = ['production_line', 'status']
