from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, OrderViewSet, ResourceTypeViewSet, ResourceViewSet,
    MoldViewSet, MaterialViewSet, ProductMaterialRequirementViewSet,
    InventoryViewSet, EmployeeViewSet, WorkCenterViewSet,
    ProcessRouteViewSet, ProcessStepViewSet, ScheduleRunViewSet,
    ScheduleJobViewSet, SchedulerViewSet, ResourceAllocationViewSet,
    MaterialCheckResultViewSet
)

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'resource-types', ResourceTypeViewSet)
router.register(r'resources', ResourceViewSet)
router.register(r'molds', MoldViewSet)
router.register(r'materials', MaterialViewSet)
router.register(r'material-requirements', ProductMaterialRequirementViewSet)
router.register(r'inventory', InventoryViewSet)
router.register(r'employees', EmployeeViewSet)
router.register(r'work-centers', WorkCenterViewSet)
router.register(r'process-routes', ProcessRouteViewSet)
router.register(r'process-steps', ProcessStepViewSet)
router.register(r'schedule-runs', ScheduleRunViewSet)
router.register(r'schedule-jobs', ScheduleJobViewSet)
router.register(r'resource-allocations', ResourceAllocationViewSet)
router.register(r'material-checks', MaterialCheckResultViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('scheduler/run/', SchedulerViewSet.as_view({'post': 'run_schedule'}), name='run_schedule'),
    path('scheduler/check-materials/', SchedulerViewSet.as_view({'post': 'check_materials'}), name='check_materials'),
]
