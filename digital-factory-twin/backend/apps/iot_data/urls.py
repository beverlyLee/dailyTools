from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, PLCDataViewSet, AlertViewSet, DeviceStatusHistoryViewSet

router = DefaultRouter()
router.register(r'devices', DeviceViewSet)
router.register(r'plc-data', PLCDataViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'status-history', DeviceStatusHistoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
