from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReminderViewSet, ReminderLogViewSet

router = DefaultRouter()
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'logs', ReminderLogViewSet, basename='reminder-log')

app_name = 'reminders'

urlpatterns = [
    path('', include(router.urls)),
]
