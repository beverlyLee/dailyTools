from rest_framework import serializers
from django.contrib.auth.models import User
from rental_contract.apps.contracts.models import ContractDocument
from .models import OCRRequest, OCRResult, OCRTextLine, ExtractedContractField


class SimpleDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractDocument
        fields = ['id', 'name', 'document_type']


class OCRTextLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = OCRTextLine
        fields = ['id', 'ocr_result', 'text', 'confidence', 'bbox',
                  'line_number', 'page_number', 'created_at']
        read_only_fields = ['ocr_result', 'created_at']


class ExtractedContractFieldSerializer(serializers.ModelSerializer):
    verified_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ExtractedContractField
        fields = ['id', 'ocr_result', 'field_type', 'field_name', 'field_value',
                  'confidence', 'source_text', 'is_verified', 'verified_by',
                  'verified_at', 'created_at']
        read_only_fields = ['ocr_result', 'is_verified', 'verified_by', 
                           'verified_at', 'created_at']


class OCRResultSerializer(serializers.ModelSerializer):
    ocr_request = serializers.StringRelatedField(read_only=True)
    text_lines = OCRTextLineSerializer(many=True, read_only=True)
    contract_fields = ExtractedContractFieldSerializer(many=True, read_only=True)

    class Meta:
        model = OCRResult
        fields = ['id', 'ocr_request', 'raw_text', 'processed_text',
                  'confidence', 'processing_time', 'extracted_fields',
                  'text_lines', 'contract_fields', 'created_at']
        read_only_fields = ['ocr_request', 'text_lines', 'contract_fields', 'created_at']


class OCRRequestSerializer(serializers.ModelSerializer):
    document = SimpleDocumentSerializer(read_only=True)
    document_id = serializers.PrimaryKeyRelatedField(
        queryset=ContractDocument.objects.all(),
        source='document',
        write_only=True,
        required=False,
        allow_null=True
    )
    user = serializers.StringRelatedField(read_only=True)
    result = OCRResultSerializer(read_only=True)

    class Meta:
        model = OCRRequest
        fields = ['id', 'document', 'document_id', 'user', 'file', 'file_name',
                  'file_type', 'ocr_engine', 'language', 'status', 'error_message',
                  'started_at', 'completed_at', 'created_at', 'updated_at', 'result']
        read_only_fields = ['user', 'file_name', 'file_type', 'status', 'error_message',
                           'started_at', 'completed_at', 'created_at', 'updated_at', 'result']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        file = validated_data.get('file')
        if file:
            validated_data['file_name'] = file.name
            validated_data['file_type'] = file.content_type if hasattr(file, 'content_type') else 'application/octet-stream'
        return super().create(validated_data)


class OCRUploadSerializer(serializers.Serializer):
    """
    OCR上传序列化器
    """
    file = serializers.FileField()
    document_id = serializers.IntegerField(required=False, allow_null=True)
    ocr_engine = serializers.ChoiceField(
        choices=OCRRequest.OCR_ENGINES,
        default='paddleocr'
    )
    language = serializers.CharField(default='ch')
    extract_contract_fields = serializers.BooleanField(default=True)


class VerifyFieldSerializer(serializers.Serializer):
    """
    验证提取字段的序列化器
    """
    field_value = serializers.CharField(required=False, allow_null=True)
    is_verified = serializers.BooleanField(default=True)
