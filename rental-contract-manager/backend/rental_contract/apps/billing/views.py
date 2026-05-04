from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from .models import Bill, BillItem, BillSplit, PaymentRecord
from .serializers import (
    BillSerializer, BillItemSerializer, BillSplitSerializer, 
    PaymentRecordSerializer, BillSplitCreateSerializer, BillPaymentSerializer
)
from rental_contract.apps.contracts.models import RentalContract, Tenant


class BillViewSet(viewsets.ModelViewSet):
    """
    账单视图集
    """
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill_type', 'status', 'contract']
    search_fields = ['bill_number', 'title', 'description']
    ordering_fields = ['due_date', 'billing_period_start', 'created_at', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        return Bill.objects.filter(
            contract__landlord=user
        ) | Bill.objects.filter(
            contract__tenant__user=user
        )

    @action(detail=True, methods=['post'], serializer_class=BillSplitCreateSerializer)
    def create_splits(self, request, pk=None):
        """
        创建账单分摊
        支持三种分摊方式：平均分摊、按比例分摊、自定义分摊
        """
        bill = self.get_object()
        serializer = BillSplitCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        split_method = serializer.validated_data['split_method']
        total_amount = bill.total_amount
        
        # 删除现有的分摊记录
        BillSplit.objects.filter(bill=bill).delete()
        
        splits = []
        
        if split_method == 'equal':
            # 平均分摊
            tenant_ids = serializer.validated_data.get('tenant_ids', [])
            if not tenant_ids:
                # 如果没有指定房客，使用合同中的房客
                contract = bill.contract
                tenant_ids = [contract.tenant.id]
            
            num_tenants = len(tenant_ids)
            if num_tenants == 0:
                return Response(
                    {'error': '没有指定参与分摊的房客'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            equal_share = total_amount / Decimal(num_tenants)
            proportion = Decimal(100) / Decimal(num_tenants)
            
            for tenant_id in tenant_ids:
                try:
                    tenant = Tenant.objects.get(id=tenant_id)
                    split = BillSplit.objects.create(
                        bill=bill,
                        tenant=tenant,
                        split_method='equal',
                        proportion=proportion,
                        amount=equal_share
                    )
                    splits.append(split)
                except Tenant.DoesNotExist:
                    continue
        
        elif split_method == 'proportion':
            # 按比例分摊
            proportions = serializer.validated_data.get('proportions', {})
            if not proportions:
                return Response(
                    {'error': '按比例分摊需要提供比例数据'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            total_proportion = sum(proportions.values())
            if total_proportion != Decimal(100):
                return Response(
                    {'error': f'比例之和必须为100%，当前为{total_proportion}%'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            for tenant_id_str, proportion in proportions.items():
                try:
                    tenant_id = int(tenant_id_str)
                    tenant = Tenant.objects.get(id=tenant_id)
                    amount = (total_amount * proportion) / Decimal(100)
                    split = BillSplit.objects.create(
                        bill=bill,
                        tenant=tenant,
                        split_method='proportion',
                        proportion=proportion,
                        amount=amount
                    )
                    splits.append(split)
                except (ValueError, Tenant.DoesNotExist):
                    continue
        
        elif split_method == 'custom':
            # 自定义分摊
            custom_amounts = serializer.validated_data.get('custom_amounts', {})
            if not custom_amounts:
                return Response(
                    {'error': '自定义分摊需要提供金额数据'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            total_custom_amount = sum(custom_amounts.values())
            if total_custom_amount != total_amount:
                return Response(
                    {'error': f'自定义金额之和必须等于账单总额{total_amount}元，当前为{total_custom_amount}元'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            for tenant_id_str, amount in custom_amounts.items():
                try:
                    tenant_id = int(tenant_id_str)
                    tenant = Tenant.objects.get(id=tenant_id)
                    proportion = (amount / total_amount) * Decimal(100)
                    split = BillSplit.objects.create(
                        bill=bill,
                        tenant=tenant,
                        split_method='custom',
                        proportion=proportion,
                        amount=amount
                    )
                    splits.append(split)
                except (ValueError, Tenant.DoesNotExist):
                    continue
        
        return Response({
            'message': f'成功创建{len(splits)}条分摊记录',
            'splits': BillSplitSerializer(splits, many=True).data
        })

    @action(detail=True, methods=['post'], serializer_class=BillPaymentSerializer)
    def make_payment(self, request, pk=None):
        """
        支付账单
        """
        bill = self.get_object()
        serializer = BillPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        amount = validated_data['amount']
        tenant_id = validated_data.get('tenant_id')
        tenant = None
        
        if tenant_id:
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {'error': '指定的房客不存在'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if amount <= 0:
            return Response(
                {'error': '支付金额必须大于0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if amount > bill.remaining_amount:
            return Response(
                {'error': f'支付金额不能超过剩余未支付金额{bill.remaining_amount}元'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # 创建支付记录
            payment = PaymentRecord.objects.create(
                bill=bill,
                tenant=tenant,
                payment_method=validated_data['payment_method'],
                amount=amount,
                transaction_id=validated_data.get('transaction_id'),
                payment_date=validated_data['payment_date'],
                notes=validated_data.get('notes')
            )
            
            # 更新账单已支付金额
            bill.paid_amount += amount
            bill.save()
            
            # 更新账单状态
            if bill.paid_amount >= bill.total_amount:
                bill.status = 'paid'
                bill.save()
            elif bill.paid_amount > 0:
                bill.status = 'partially_paid'
                bill.save()
            
            # 如果有指定房客，更新对应的分摊记录
            if tenant:
                try:
                    bill_split = BillSplit.objects.get(bill=bill, tenant=tenant)
                    if not bill_split.is_paid:
                        # 检查是否支付了全部金额
                        if payment.amount >= bill_split.amount:
                            bill_split.is_paid = True
                            bill_split.paid_at = timezone.now()
                            bill_split.save()
                except BillSplit.DoesNotExist:
                    pass
        
        return Response({
            'message': '支付成功',
            'payment': PaymentRecordSerializer(payment).data,
            'bill': BillSerializer(bill).data
        })

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        获取逾期账单
        """
        today = timezone.now().date()
        overdue_bills = self.get_queryset().filter(
            due_date__lt=today,
            status__in=['pending', 'partially_paid']
        )
        serializer = self.get_serializer(overdue_bills, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming_due(self, request):
        """
        获取即将到期的账单（未来7天内）
        """
        from datetime import timedelta
        today = timezone.now().date()
        end_date = today + timedelta(days=7)
        
        upcoming_bills = self.get_queryset().filter(
            due_date__gte=today,
            due_date__lte=end_date,
            status__in=['pending', 'partially_paid']
        )
        serializer = self.get_serializer(upcoming_bills, many=True)
        return Response(serializer.data)


class BillItemViewSet(viewsets.ModelViewSet):
    """
    账单明细视图集
    """
    queryset = BillItem.objects.all()
    serializer_class = BillItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'amount']

    def get_queryset(self):
        user = self.request.user
        return BillItem.objects.filter(
            bill__contract__landlord=user
        ) | BillItem.objects.filter(
            bill__contract__tenant__user=user
        )


class BillSplitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    账单分摊视图集（只读）
    """
    queryset = BillSplit.objects.all()
    serializer_class = BillSplitSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill', 'tenant', 'split_method', 'is_paid']
    search_fields = ['tenant__name']
    ordering_fields = ['created_at', 'amount', 'proportion']

    def get_queryset(self):
        user = self.request.user
        return BillSplit.objects.filter(
            bill__contract__landlord=user
        ) | BillSplit.objects.filter(
            tenant__user=user
        )


class PaymentRecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    支付记录视图集（只读）
    """
    queryset = PaymentRecord.objects.all()
    serializer_class = PaymentRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill', 'payment_method', 'tenant']
    search_fields = ['transaction_id', 'receipt_number']
    ordering_fields = ['payment_date', 'created_at', 'amount']

    def get_queryset(self):
        user = self.request.user
        return PaymentRecord.objects.filter(
            bill__contract__landlord=user
        ) | PaymentRecord.objects.filter(
            tenant__user=user
        )
