from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import Device, PLCData, DeviceStatusHistory, Alert
from .serializers import (
    DeviceSerializer, PLCDataSerializer, DeviceStatusHistorySerializer, AlertSerializer
)


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    filterset_fields = ['device_type', 'status']
    search_fields = ['device_id', 'device_name', 'location']

    @action(detail=True, methods=['get'])
    def real_time_data(self, request, pk=None):
        device = self.get_object()
        latest_plc_data = PLCData.objects.filter(device=device).order_by('-timestamp')[:50]
        serializer = PLCDataSerializer(latest_plc_data, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def status_history(self, request, pk=None):
        device = self.get_object()
        history = DeviceStatusHistory.objects.filter(device=device).order_by('-timestamp')[:100]
        serializer = DeviceStatusHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def alerts(self, request, pk=None):
        device = self.get_object()
        alerts = Alert.objects.filter(device=device, status='active').order_by('-timestamp')
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)


class PLCDataViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PLCData.objects.all()
    serializer_class = PLCDataSerializer
    filterset_fields = ['device', 'tag_name', 'quality']
    search_fields = ['tag_name', 'tag_value']

    @action(detail=False, methods=['get'])
    def real_time(self, request):
        minutes = int(request.query_params.get('minutes', 15))
        time_threshold = timezone.now() - timedelta(minutes=minutes)
        data = PLCData.objects.filter(timestamp__gte=time_threshold).order_by('-timestamp')
        serializer = self.get_serializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def ingest(self, request):
        data = request.data
        if isinstance(data, list):
            for item in data:
                serializer = self.get_serializer(data=item)
                if serializer.is_valid():
                    serializer.save()
        else:
            serializer = self.get_serializer(data=data)
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": "success"}, status=status.HTTP_201_CREATED)


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    filterset_fields = ['device', 'alert_level', 'status']
    search_fields = ['alert_code', 'alert_message']

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'acknowledged'
        alert.acknowledged_at = timezone.now()
        alert.acknowledged_by = request.query_params.get('user', 'system')
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.query_params.get('user', 'system')
        alert.resolution_notes = request.data.get('notes', '')
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        alerts = Alert.objects.filter(status='active').order_by('-timestamp')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)


class DeviceStatusHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DeviceStatusHistory.objects.all()
    serializer_class = DeviceStatusHistorySerializer
    filterset_fields = ['device', 'old_status', 'new_status']
