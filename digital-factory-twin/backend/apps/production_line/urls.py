from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductionLineViewSet, ProductionLineDeviceViewSet, 
    Device3DModelViewSet, DeviceComponentViewSet, 
    DisassemblyStepViewSet, ProductionLineStatusViewSet
)

router = DefaultRouter()
router.register(r'lines', ProductionLineViewSet)
router.register(r'device-positions', ProductionLineDeviceViewSet)
router.register(r'models-3d', Device3DModelViewSet)
router.register(r'components', DeviceComponentViewSet)
router.register(r'disassembly-steps', DisassemblyStepViewSet)
router.register(r'line-status', ProductionLineStatusViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
