from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Property, Tenant, RentalContract, ContractDocument, MeterReading
from .serializers import (
    PropertySerializer, TenantSerializer, RentalContractSerializer,
    ContractDocumentSerializer, MeterReadingSerializer
)


class PropertyViewSet(viewsets.ModelViewSet):
    """
    房屋信息视图集
    """
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property_type']
    search_fields = ['name', 'address', 'description']
    ordering_fields = ['created_at', 'name']

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_queryset(self):
        return Property.objects.filter(owner=self.request.user)


class TenantViewSet(viewsets.ModelViewSet):
    """
    房客信息视图集
    """
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'id_card', 'email']
    ordering_fields = ['created_at', 'name']


class RentalContractViewSet(viewsets.ModelViewSet):
    """
    租房合同视图集
    """
    queryset = RentalContract.objects.all()
    serializer_class = RentalContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'property', 'tenant', 'landlord']
    search_fields = ['contract_number', 'property__name', 'tenant__name']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'monthly_rent']

    def get_queryset(self):
        user = self.request.user
        return RentalContract.objects.filter(landlord=user) | RentalContract.objects.filter(tenant__user=user)


class ContractDocumentViewSet(viewsets.ModelViewSet):
    """
    合同文档视图集
    """
    queryset = ContractDocument.objects.all()
    serializer_class = ContractDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['document_type', 'contract', 'ocr_processed']
    search_fields = ['name']
    ordering_fields = ['created_at', 'name']

    def get_queryset(self):
        user = self.request.user
        return ContractDocument.objects.filter(
            contract__landlord=user
        ) | ContractDocument.objects.filter(
            contract__tenant__user=user
        )


class MeterReadingViewSet(viewsets.ModelViewSet):
    """
    抄表记录视图集
    """
    queryset = MeterReading.objects.all()
    serializer_class = MeterReadingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['meter_type', 'contract']
    ordering_fields = ['reading_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        return MeterReading.objects.filter(
            contract__landlord=user
        ) | MeterReading.objects.filter(
            contract__tenant__user=user
        )
