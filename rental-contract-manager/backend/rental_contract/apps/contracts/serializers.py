from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Property, Tenant, RentalContract, ContractDocument, MeterReading


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class PropertySerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    owner_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='owner',
        write_only=True
    )

    class Meta:
        model = Property
        fields = ['id', 'owner', 'owner_id', 'name', 'address', 'property_type', 
                  'area', 'rooms', 'bathrooms', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class TenantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Tenant
        fields = ['id', 'user', 'user_id', 'name', 'phone', 'id_card', 'email',
                  'emergency_contact', 'emergency_phone', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class SimplePropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ['id', 'name', 'address', 'property_type']


class SimpleTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'phone']


class RentalContractSerializer(serializers.ModelSerializer):
    property = SimplePropertySerializer(read_only=True, source='property_info')
    property_id = serializers.PrimaryKeyRelatedField(
        queryset=Property.objects.all(),
        source='property_info',
        write_only=True
    )
    landlord = UserSerializer(read_only=True)
    landlord_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='landlord',
        write_only=True
    )
    tenant = SimpleTenantSerializer(read_only=True)
    tenant_id = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        source='tenant',
        write_only=True
    )
    days_remaining = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)

    class Meta:
        model = RentalContract
        fields = ['id', 'contract_number', 'property', 'property_id', 'landlord', 
                  'landlord_id', 'tenant', 'tenant_id', 'start_date', 'end_date',
                  'monthly_rent', 'deposit', 'payment_method', 'payment_day',
                  'utilities_included', 'water_price', 'electricity_price', 'gas_price',
                  'status', 'terms', 'notes', 'days_remaining', 'is_expiring_soon',
                  'created_at', 'updated_at']
        read_only_fields = ['contract_number', 'created_at', 'updated_at']


class ContractDocumentSerializer(serializers.ModelSerializer):
    contract = RentalContractSerializer(read_only=True)
    contract_id = serializers.PrimaryKeyRelatedField(
        queryset=RentalContract.objects.all(),
        source='contract',
        write_only=True
    )

    class Meta:
        model = ContractDocument
        fields = ['id', 'contract', 'contract_id', 'name', 'document_type', 'file',
                  'file_size', 'ocr_processed', 'created_at', 'updated_at']
        read_only_fields = ['file_size', 'ocr_processed', 'created_at', 'updated_at']

    def create(self, validated_data):
        document = super().create(validated_data)
        if document.file:
            document.file_size = document.file.size
            document.save()
        return document


class MeterReadingSerializer(serializers.ModelSerializer):
    contract = RentalContractSerializer(read_only=True)
    contract_id = serializers.PrimaryKeyRelatedField(
        queryset=RentalContract.objects.all(),
        source='contract',
        write_only=True
    )

    class Meta:
        model = MeterReading
        fields = ['id', 'contract', 'contract_id', 'meter_type', 'reading_date',
                  'previous_reading', 'current_reading', 'usage', 'unit_price',
                  'total_amount', 'notes', 'created_at']
        read_only_fields = ['usage', 'total_amount', 'created_at']
