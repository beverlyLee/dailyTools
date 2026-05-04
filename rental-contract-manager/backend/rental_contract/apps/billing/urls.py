from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BillViewSet, BillItemViewSet, BillSplitViewSet, PaymentRecordViewSet
)

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')
router.register(r'items', BillItemViewSet, basename='bill-item')
router.register(r'splits', BillSplitViewSet, basename='bill-split')
router.register(r'payments', PaymentRecordViewSet, basename='payment-record')

app_name = 'billing'

urlpatterns = [
    path('', include(router.urls)),
]
