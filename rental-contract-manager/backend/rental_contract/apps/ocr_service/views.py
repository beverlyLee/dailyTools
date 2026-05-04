from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import OCRRequest, OCRResult, OCRTextLine, ExtractedContractField
from .serializers import (
    OCRRequestSerializer, OCRResultSerializer, OCRTextLineSerializer,
    ExtractedContractFieldSerializer, OCRUploadSerializer, VerifyFieldSerializer
)
from rental_contract.apps.contracts.models import ContractDocument
import time
import re
from decimal import Decimal, ROUND_HALF_UP


class OCRRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    OCR请求视图集（只读）
    """
    queryset = OCRRequest.objects.all()
    serializer_class = OCRRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'ocr_engine', 'language', 'document']
    search_fields = ['file_name']
    ordering_fields = ['created_at', 'started_at', 'completed_at']

    def get_queryset(self):
        return OCRRequest.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], serializer_class=OCRUploadSerializer)
    def upload(self, request):
        """
        上传文件并进行OCR识别
        """
        serializer = OCRUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        file = validated_data['file']
        document_id = validated_data.get('document_id')
        ocr_engine = validated_data.get('ocr_engine', 'paddleocr')
        language = validated_data.get('language', 'ch')
        extract_contract_fields = validated_data.get('extract_contract_fields', True)
        
        # 查找关联的文档
        document = None
        if document_id:
            try:
                document = ContractDocument.objects.get(id=document_id)
            except ContractDocument.DoesNotExist:
                pass
        
        # 创建OCR请求
        ocr_request = OCRRequest.objects.create(
            user=request.user,
            document=document,
            file=file,
            file_name=file.name,
            file_type=file.content_type if hasattr(file, 'content_type') else 'application/octet-stream',
            ocr_engine=ocr_engine,
            language=language,
            status='processing',
            started_at=timezone.now()
        )
        
        # 更新文档的OCR处理状态
        if document:
            document.ocr_processed = True
            document.save()
        
        # 异步处理OCR（在实际生产环境中应该使用Celery任务）
        # 这里为了演示，直接同步处理
        try:
            result = self._process_ocr(ocr_request, extract_contract_fields)
            return Response({
                'message': 'OCR处理完成',
                'request_id': ocr_request.id,
                'result': result
            }, status=status.HTTP_200_OK)
        except Exception as e:
            ocr_request.status = 'failed'
            ocr_request.error_message = str(e)
            ocr_request.save()
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _process_ocr(self, ocr_request, extract_contract_fields=True):
        """
        处理OCR识别
        """
        start_time = time.time()
        
        # 这里使用模拟的OCR处理
        # 在实际生产环境中，应该调用PaddleOCR或Tesseract
        raw_text = self._mock_ocr_result(ocr_request.file_name)
        
        # 处理时间
        processing_time = Decimal(time.time() - start_time).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP)
        
        # 创建OCR结果
        ocr_result = OCRResult.objects.create(
            ocr_request=ocr_request,
            raw_text=raw_text,
            processed_text=raw_text,
            confidence=Decimal('85.5'),
            processing_time=processing_time
        )
        
        # 创建文本行
        lines = raw_text.split('\n')
        for i, line in enumerate(lines):
            if line.strip():
                OCRTextLine.objects.create(
                    ocr_result=ocr_result,
                    text=line.strip(),
                    confidence=Decimal('80.0') + Decimal(i % 20),
                    line_number=i + 1,
                    page_number=1
                )
        
        # 提取合同字段
        extracted_fields = {}
        if extract_contract_fields:
            extracted_fields = self._extract_contract_fields(raw_text, ocr_result)
            ocr_result.extracted_fields = extracted_fields
            ocr_result.save()
        
        # 更新请求状态
        ocr_request.status = 'completed'
        ocr_request.completed_at = timezone.now()
        ocr_request.save()
        
        return OCRResultSerializer(ocr_result).data

    def _mock_ocr_result(self, file_name):
        """
        模拟OCR识别结果
        在实际环境中，这里应该调用真实的OCR引擎
        """
        mock_text = """租房合同
合同编号：RC-20240115001

出租方（甲方）：张三
身份证号：110101199001011234
联系电话：13800138000

承租方（乙方）：李四
身份证号：110101199202024321
联系电话：13912345678

第一条 房屋基本情况
甲方将坐落于北京市朝阳区建国路88号现代城A座1502室的房屋出租给乙方使用。
房屋建筑面积：85.5平方米
房屋用途：住宅

第二条 租赁期限
租赁期自2024年1月15日起至2025年1月14日止，共计12个月。

第三条 租金及支付方式
月租金为人民币5500元整（¥5,500.00）。
租金按月支付，乙方应于每月5日前将当月租金支付给甲方。
押金为人民币11000元整（¥11,000.00），租赁期满或合同解除后，扣除应由乙方承担的费用后，押金应如数退还乙方。

第四条 相关费用
租赁期间，水费、电费、燃气费、物业费由乙方承担。
水费单价：4.5元/吨
电费单价：0.85元/度
燃气费单价：2.8元/立方米

第五条 房屋维护及维修
甲方应保证房屋的建筑结构和设备设施符合建筑、消防、治安、卫生等方面的安全条件，不得危及人身安全。

第六条 合同的解除
经甲乙双方协商一致，可以解除本合同。

第七条 违约责任
租赁期内，甲方需提前收回房屋的，或乙方需提前退租的，应提前30日通知对方，并按月租金的100%支付违约金。

第八条 其他约定事项
本合同未尽事宜，经甲乙双方协商一致，可订立补充条款。补充条款及附件均为本合同组成部分，与本合同具有同等法律效力。

甲方（签字）：张三
日期：2024年1月15日

乙方（签字）：李四
日期：2024年1月15日
"""
        return mock_text

    def _extract_contract_fields(self, text, ocr_result):
        """
        从OCR文本中提取合同关键字段
        """
        fields = {}
        
        # 合同编号
        contract_number_match = re.search(r'合同编号[：:]\s*([\w\-]+)', text)
        if contract_number_match:
            fields['contract_number'] = contract_number_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='contract_number',
                field_name='合同编号',
                field_value=contract_number_match.group(1),
                confidence=Decimal('95.0'),
                source_text=contract_number_match.group(0)
            )
        
        # 房东信息
        landlord_name_match = re.search(r'出租方[（(]甲方[)）][：:]\s*([^\n]+)', text)
        if landlord_name_match:
            fields['landlord_name'] = landlord_name_match.group(1).strip()
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='landlord_name',
                field_name='房东姓名',
                field_value=landlord_name_match.group(1).strip(),
                confidence=Decimal('90.0'),
                source_text=landlord_name_match.group(0)
            )
        
        # 房东身份证号
        landlord_id_match = re.search(r'身份证号[：:]\s*(\d{17}[\dXx])', text)
        if landlord_id_match:
            fields['landlord_id_card'] = landlord_id_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='landlord_id_card',
                field_name='房东身份证号',
                field_value=landlord_id_match.group(1),
                confidence=Decimal('88.0'),
                source_text=landlord_id_match.group(0)
            )
        
        # 房东电话
        landlord_phone_match = re.search(r'联系电话[：:]\s*(\d{11})', text)
        if landlord_phone_match:
            fields['landlord_phone'] = landlord_phone_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='landlord_phone',
                field_name='房东电话',
                field_value=landlord_phone_match.group(1),
                confidence=Decimal('92.0'),
                source_text=landlord_phone_match.group(0)
            )
        
        # 房客信息
        tenant_name_match = re.search(r'承租方[（(]乙方[)）][：:]\s*([^\n]+)', text)
        if tenant_name_match:
            fields['tenant_name'] = tenant_name_match.group(1).strip()
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='tenant_name',
                field_name='房客姓名',
                field_value=tenant_name_match.group(1).strip(),
                confidence=Decimal('90.0'),
                source_text=tenant_name_match.group(0)
            )
        
        # 房屋地址
        address_match = re.search(r'坐落于([^\n]+)的房屋', text)
        if address_match:
            fields['property_address'] = address_match.group(1).strip()
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='property_address',
                field_name='房屋地址',
                field_value=address_match.group(1).strip(),
                confidence=Decimal('85.0'),
                source_text=address_match.group(0)
            )
        
        # 开始日期
        start_date_match = re.search(r'租赁期自(\d{4}年\d{1,2}月\d{1,2}日)起', text)
        if start_date_match:
            fields['start_date'] = start_date_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='start_date',
                field_name='开始日期',
                field_value=start_date_match.group(1),
                confidence=Decimal('87.0'),
                source_text=start_date_match.group(0)
            )
        
        # 结束日期
        end_date_match = re.search(r'至(\d{4}年\d{1,2}月\d{1,2}日)止', text)
        if end_date_match:
            fields['end_date'] = end_date_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='end_date',
                field_name='结束日期',
                field_value=end_date_match.group(1),
                confidence=Decimal('87.0'),
                source_text=end_date_match.group(0)
            )
        
        # 月租金
        rent_match = re.search(r'月租金为人民币([\d,]+)元', text)
        if rent_match:
            rent_str = rent_match.group(1).replace(',', '')
            fields['monthly_rent'] = rent_str
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='monthly_rent',
                field_name='月租金',
                field_value=rent_str,
                confidence=Decimal('93.0'),
                source_text=rent_match.group(0)
            )
        
        # 押金
        deposit_match = re.search(r'押金为人民币([\d,]+)元', text)
        if deposit_match:
            deposit_str = deposit_match.group(1).replace(',', '')
            fields['deposit'] = deposit_str
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='deposit',
                field_name='押金',
                field_value=deposit_str,
                confidence=Decimal('91.0'),
                source_text=deposit_match.group(0)
            )
        
        # 付款日
        payment_day_match = re.search(r'每月(\d+)日前', text)
        if payment_day_match:
            fields['payment_day'] = payment_day_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='payment_day',
                field_name='付款日',
                field_value=payment_day_match.group(1),
                confidence=Decimal('89.0'),
                source_text=payment_day_match.group(0)
            )
        
        # 水费单价
        water_price_match = re.search(r'水费单价[：:]\s*([\d.]+)元', text)
        if water_price_match:
            fields['water_price'] = water_price_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='water_price',
                field_name='水费单价',
                field_value=water_price_match.group(1),
                confidence=Decimal('86.0'),
                source_text=water_price_match.group(0)
            )
        
        # 电费单价
        electricity_price_match = re.search(r'电费单价[：:]\s*([\d.]+)元', text)
        if electricity_price_match:
            fields['electricity_price'] = electricity_price_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='electricity_price',
                field_name='电费单价',
                field_value=electricity_price_match.group(1),
                confidence=Decimal('86.0'),
                source_text=electricity_price_match.group(0)
            )
        
        # 燃气费单价
        gas_price_match = re.search(r'燃气费单价[：:]\s*([\d.]+)元', text)
        if gas_price_match:
            fields['gas_price'] = gas_price_match.group(1)
            ExtractedContractField.objects.create(
                ocr_result=ocr_result,
                field_type='gas_price',
                field_name='燃气费单价',
                field_value=gas_price_match.group(1),
                confidence=Decimal('86.0'),
                source_text=gas_price_match.group(0)
            )
        
        return fields


class OCRResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    OCR结果视图集（只读）
    """
    queryset = OCRResult.objects.all()
    serializer_class = OCRResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OCRResult.objects.filter(ocr_request__user=self.request.user)


class ExtractedContractFieldViewSet(viewsets.ModelViewSet):
    """
    提取的合同字段视图集
    """
    queryset = ExtractedContractField.objects.all()
    serializer_class = ExtractedContractFieldSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['field_type', 'is_verified', 'ocr_result']
    search_fields = ['field_name', 'field_value']
    ordering_fields = ['created_at', 'confidence']

    def get_queryset(self):
        return ExtractedContractField.objects.filter(ocr_result__ocr_request__user=self.request.user)

    @action(detail=True, methods=['post'], serializer_class=VerifyFieldSerializer)
    def verify(self, request, pk=None):
        """
        验证提取的字段
        """
        field = self.get_object()
        serializer = VerifyFieldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        is_verified = validated_data.get('is_verified', True)
        new_value = validated_data.get('field_value')
        
        if new_value is not None:
            field.field_value = new_value
        
        field.is_verified = is_verified
        field.verified_by = request.user
        field.verified_at = timezone.now()
        field.save()
        
        return Response(ExtractedContractFieldSerializer(field).data)
