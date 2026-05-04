from rest_framework import serializers
from django.contrib.auth.models import User
from rental_contract.apps.contracts.models import RentalContract, Tenant
from .models import Bill, BillItem, BillSplit, PaymentRecord


class SimpleContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalContract
        fields = ['id', 'contract_number']


class SimpleTenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['id', 'name', 'phone']


class BillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillItem
        fields = ['id', 'bill', 'name', 'description', 'quantity', 'unit',
                  'unit_price', 'amount', 'notes', 'created_at']
        read_only_fields = ['bill', 'amount', 'created_at']


class BillSplitSerializer(serializers.ModelSerializer):
    tenant = SimpleTenantSerializer(read_only=True)
    tenant_id = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        source='tenant',
        write_only=True
    )

    class Meta:
        model = BillSplit
        fields = ['id', 'bill', 'tenant', 'tenant_id', 'split_method', 'proportion',
                  'amount', 'is_paid', 'paid_at', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['bill', 'is_paid', 'paid_at', 'created_at', 'updated_at']


class PaymentRecordSerializer(serializers.ModelSerializer):
    bill_split = BillSplitSerializer(read_only=True)
    bill_split_id = serializers.PrimaryKeyRelatedField(
        queryset=BillSplit.objects.all(),
        source='bill_split',
        write_only=True,
        required=False,
        allow_null=True
    )
    tenant = SimpleTenantSerializer(read_only=True)
    tenant_id = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        source='tenant',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = PaymentRecord
        fields = ['id', 'bill', 'bill_split', 'bill_split_id', 'tenant', 'tenant_id',
                  'payment_method', 'amount', 'transaction_id', 'payment_date',
                  'receipt_number', 'notes', 'created_at']
        read_only_fields = ['bill', 'created_at']


class BillSerializer(serializers.ModelSerializer):
    contract = SimpleContractSerializer(read_only=True)
    contract_id = serializers.PrimaryKeyRelatedField(
        queryset=RentalContract.objects.all(),
        source='contract',
        write_only=True
    )
    items = BillItemSerializer(many=True, read_only=True)
    splits = BillSplitSerializer(many=True, read_only=True)
    payments = PaymentRecordSerializer(many=True, read_only=True)
    remaining_amount = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Bill
        fields = ['id', 'contract', 'contract_id', 'bill_type', 'bill_number', 'title',
                  'description', 'billing_period_start', 'billing_period_end', 'due_date',
                  'total_amount', 'paid_amount', 'remaining_amount', 'status', 'is_overdue',
                  'notes', 'items', 'splits', 'payments', 'created_at', 'updated_at']
        read_only_fields = ['bill_number', 'paid_amount', 'remaining_amount', 'status',
                           'is_overdue', 'items', 'splits', 'payments', 'created_at', 'updated_at']


class BillSplitCreateSerializer(serializers.Serializer):
    """
    用于创建账单分摊的序列化器
    """
    split_method = serializers.ChoiceField(choices=BillSplit.SPLIT_METHODS)
    proportions = serializers.DictField(
        child=serializers.DecimalField(max_digits=5, decimal_places=2),
        required=False,
        help_text='{tenant_id: proportion} 按比例分摊时使用'
    )
    custom_amounts = serializers.DictField(
        child=serializers.DecimalField(max_digits=12, decimal_places=2),
        required=False,
        help_text='{tenant_id: amount} 自定义分摊时使用'
    )
    tenant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='参与分摊的房客ID列表（平均分摊时使用）'
    )


class BillPaymentSerializer(serializers.Serializer):
    """
    用于账单支付的序列化器
    """
    payment_method = serializers.ChoiceField(choices=PaymentRecord.PAYMENT_METHODS)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    tenant_id = serializers.IntegerField(required=False, allow_null=True)
    transaction_id = serializers.CharField(max_length=100, required=False, allow_null=True)
    payment_date = serializers.DateField()
    notes = serializers.CharField(required=False, allow_null=True)
