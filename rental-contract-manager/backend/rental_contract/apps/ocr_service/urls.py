from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OCRRequestViewSet, OCRResultViewSet, ExtractedContractFieldViewSet

router = DefaultRouter()
router.register(r'requests', OCRRequestViewSet, basename='ocr-request')
router.register(r'results', OCRResultViewSet, basename='ocr-result')
router.register(r'fields', ExtractedContractFieldViewSet, basename='extracted-field')

app_name = 'ocr_service'

urlpatterns = [
    path('', include(router.urls)),
]
