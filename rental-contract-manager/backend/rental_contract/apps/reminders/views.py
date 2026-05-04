from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Reminder, ReminderLog
from .serializers import ReminderSerializer, ReminderLogSerializer


class ReminderViewSet(viewsets.ModelViewSet):
    """
    提醒视图集
    """
    queryset = Reminder.objects.all()
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['reminder_type', 'contract', 'is_sent', 'is_read']
    search_fields = ['title', 'message']
    ordering_fields = ['scheduled_date', 'scheduled_time', 'created_at']

    def get_queryset(self):
        return Reminder.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        标记提醒为已读
        """
        reminder = self.get_object()
        reminder.is_read = True
        reminder.read_at = timezone.now()
        reminder.save()
        return Response({'status': 'marked as read'})

    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """
        标记提醒为未读
        """
        reminder = self.get_object()
        reminder.is_read = False
        reminder.read_at = None
        reminder.save()
        return Response({'status': 'marked as unread'})

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """
        获取未读提醒
        """
        unread_reminders = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(unread_reminders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        获取即将到来的提醒（未来7天内）
        """
        from datetime import timedelta
        today = timezone.now().date()
        end_date = today + timedelta(days=7)
        
        upcoming_reminders = self.get_queryset().filter(
            scheduled_date__gte=today,
            scheduled_date__lte=end_date,
            is_sent=False
        )
        serializer = self.get_serializer(upcoming_reminders, many=True)
        return Response(serializer.data)


class ReminderLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    提醒日志视图集（只读）
    """
    queryset = ReminderLog.objects.all()
    serializer_class = ReminderLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['channel', 'status', 'reminder']
    search_fields = ['recipient', 'message_content']
    ordering_fields = ['created_at', 'processed_at']

    def get_queryset(self):
        return ReminderLog.objects.filter(reminder__user=self.request.user)
