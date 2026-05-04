from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PropertyViewSet, TenantViewSet, RentalContractViewSet,
    ContractDocumentViewSet, MeterReadingViewSet
)

router = DefaultRouter()
router.register(r'properties', PropertyViewSet, basename='property')
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'contracts', RentalContractViewSet, basename='contract')
router.register(r'documents', ContractDocumentViewSet, basename='document')
router.register(r'meter-readings', MeterReadingViewSet, basename='meter-reading')

app_name = 'contracts'

urlpatterns = [
    path('', include(router.urls)),
]
