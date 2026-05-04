import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:rental_contract_manager/services/api_service.dart';
import 'package:rental_contract_manager/providers/contract_provider.dart';

class OCRScanScreen extends StatefulWidget {
  const OCRScanScreen({super.key});

  @override
  State<OCRScanScreen> createState() => _OCRScanScreenState();
}

class _OCRScanScreenState extends State<OCRScanScreen>
    with SingleTickerProviderStateMixin {
  final ImagePicker _picker = ImagePicker();
  XFile? _selectedImage;
  File? _selectedPDF;
  bool _isScanning = false;
  double _scanProgress = 0.0;
  String? _scanStatus;
  OCRResult? _ocrResult;
  bool _showResult = false;

  String _selectedEngine = 'paddleocr';
  String _selectedLanguage = 'ch';
  bool _extractFields = true;

  final List<String> _engines = [
    {'value': 'paddleocr', 'label': 'PaddleOCR (推荐)'},
    {'value': 'tesseract', 'label': 'Tesseract'},
  ];

  final List<String> _languages = [
    {'value': 'ch', 'label': '中文'},
    {'value': 'ch_en', 'label': '中英文混合'},
    {'value': 'en', 'label': '英文'},
  ];

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _pickImageFromCamera() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 90,
    );
    if (image != null) {
      setState(() {
        _selectedImage = image;
        _selectedPDF = null;
        _ocrResult = null;
        _showResult = false;
      });
    }
  }

  Future<void> _pickImageFromGallery() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 90,
    );
    if (image != null) {
      setState(() {
        _selectedImage = image;
        _selectedPDF = null;
        _ocrResult = null;
        _showResult = false;
      });
    }
  }

  Future<void> _pickPDFFile() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );

    if (result != null) {
      setState(() {
        _selectedPDF = File(result.files.single.path!);
        _selectedImage = null;
        _ocrResult = null;
        _showResult = false;
      });
    }
  }

  Future<void> _startOCR() async {
    if (_selectedImage == null && _selectedPDF == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请先选择图片或PDF文件')),
      );
      return;
    }

    setState(() {
      _isScanning = true;
      _scanProgress = 0.0;
      _scanStatus = '正在上传文件...';
      _showResult = false;
    });

    try {
      final apiService = ApiService();

      MultipartFile file;
      if (_selectedImage != null) {
        file = await MultipartFile.fromFile(
          _selectedImage!.path,
          filename: _selectedImage!.name,
        );
      } else {
        file = await MultipartFile.fromFile(
          _selectedPDF!.path,
          filename: _selectedPDF!.path.split('/').last,
        );
      }

      setState(() {
        _scanProgress = 0.3;
        _scanStatus = '正在进行OCR识别...';
      });

      final response = await apiService.uploadOCRFile(
        file: file,
        ocrEngine: _selectedEngine,
        language: _selectedLanguage,
        extractContractFields: _extractFields,
      );

      setState(() {
        _scanProgress = 0.8;
        _scanStatus = '正在解析识别结果...';
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        _ocrResult = OCRResult.fromJson(response.data);
        setState(() {
          _scanProgress = 1.0;
          _scanStatus = '识别完成';
          _showResult = true;
        });
      } else {
        throw Exception('OCR识别失败: ${response.statusMessage}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('OCR识别失败: $e')),
        );
      }
    } finally {
      setState(() {
        _isScanning = false;
      });
    }
  }

  void _clearSelection() {
    setState(() {
      _selectedImage = null;
      _selectedPDF = null;
      _ocrResult = null;
      _showResult = false;
      _scanProgress = 0.0;
      _scanStatus = null;
    });
  }

  void _useExtractedFields() {
    if (_ocrResult == null || _ocrResult!.extractedFields.isEmpty) return;
    // TODO: 导航到合同创建页面并填充提取的字段
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('字段已提取，可用于创建合同')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OCR识别'),
        actions: [
          if (_selectedImage != null || _selectedPDF != null)
            IconButton(
              icon: const Icon(Icons.refresh_outlined),
              onPressed: _clearSelection,
              tooltip: '重新选择',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildOCRTipsCard(),
            const SizedBox(height: 16),
            _buildFileSelectionArea(),
            const SizedBox(height: 16),
            if ((_selectedImage != null || _selectedPDF != null) && !_isScanning) ...[
              _buildSettingsCard(),
              const SizedBox(height: 16),
              _buildStartScanButton(),
            ],
            if (_isScanning) _buildScanningProgress(),
            if (_showResult && _ocrResult != null) ...[
              const SizedBox(height: 16),
              _buildOCRResultCard(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOCRTipsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.lightbulb_outline,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  '识别提示',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              '为获得最佳识别效果，请确保：',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            ...[
              '合同图片清晰，文字无模糊',
              '光线充足，避免阴影和反光',
              '拍摄时保持合同平整',
              '支持 JPG、PNG、PDF 格式',
            ].map((tip) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(
                        Icons.check_circle,
                        size: 16,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(tip),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildFileSelectionArea() {
    return Card(
      child: Column(
        children: [
          if (_selectedImage != null)
            _buildImagePreview()
          else if (_selectedPDF != null)
            _buildPDFPreview()
          else
            _buildEmptySelection(),
        ],
      ),
    );
  }

  Widget _buildEmptySelection() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(
            Icons.add_photo_alternate_outlined,
            size: 64,
            color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            '请选择要识别的文件',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            '支持图片或PDF格式的合同文件',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickImageFromCamera,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('拍照'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickImageFromGallery,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('相册'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: TextButton.icon(
              onPressed: _pickPDFFile,
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: const Text('从文件选择PDF'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImagePreview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Image.file(
          File(_selectedImage!.path),
          fit: BoxFit.contain,
          height: 300,
          width: double.infinity,
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '已选择图片: ${_selectedImage!.name}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickImageFromCamera,
                      icon: const Icon(Icons.camera_alt_outlined),
                      label: const Text('重新拍照'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickImageFromGallery,
                      icon: const Icon(Icons.photo_library_outlined),
                      label: const Text('更换图片'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPDFPreview() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.picture_as_pdf,
              size: 48,
              color: Colors.red,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _selectedPDF!.path.split('/').last,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'PDF文件',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: _pickPDFFile,
            icon: const Icon(Icons.file_present_outlined),
            label: const Text('更换PDF文件'),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '识别设置',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(
                labelText: 'OCR引擎',
                border: OutlineInputBorder(),
              ),
              value: _selectedEngine,
              items: _engines.map((engine) {
                return DropdownMenuItem(
                  value: engine['value'],
                  child: Text(engine['label']!),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _selectedEngine = value;
                  });
                }
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(
                labelText: '识别语言',
                border: OutlineInputBorder(),
              ),
              value: _selectedLanguage,
              items: _languages.map((lang) {
                return DropdownMenuItem(
                  value: lang['value'],
                  child: Text(lang['label']!),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _selectedLanguage = value;
                  });
                }
              },
            ),
            const SizedBox(height: 16),
            SwitchListTile.adaptive(
              title: const Text('自动提取合同字段'),
              subtitle: const Text('识别后自动提取合同编号、金额、日期等字段'),
              value: _extractFields,
              onChanged: (value) {
                setState(() {
                  _extractFields = value;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStartScanButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _startOCR,
        icon: const Icon(Icons.document_scanner_outlined),
        label: const Text('开始识别'),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16),
          textStyle: const TextStyle(fontSize: 16),
        ),
      ),
    );
  }

  Widget _buildScanningProgress() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            SizedBox(
              width: 64,
              height: 64,
              child: CircularProgressIndicator(
                value: _scanProgress,
                strokeWidth: 4,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              _scanStatus ?? '正在识别中...',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              '${(_scanProgress * 100).toStringAsFixed(0)}%',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: _scanProgress,
              minHeight: 6,
              borderRadius: BorderRadius.circular(3),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOCRResultCard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          color: Colors.green.withOpacity(0.1),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(
                  Icons.check_circle,
                  color: Colors.green,
                  size: 32,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '识别成功',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                      ),
                      Text(
                        '识别引擎: ${_ocrResult?.engine == "paddleocr" ? "PaddleOCR" : "Tesseract"}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_ocrResult!.extractedFields.isNotEmpty) ...[
          const SizedBox(height: 16),
          _buildExtractedFieldsCard(),
        ],
        const SizedBox(height: 16),
        _buildOCRTextCard(),
      ],
    );
  }

  Widget _buildExtractedFieldsCard() {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '提取的合同字段',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                OutlinedButton.icon(
                  onPressed: _useExtractedFields,
                  icon: const Icon(Icons.content_paste_outlined),
                  label: const Text('使用字段'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ..._ocrResult!.extractedFields.map((field) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      field.fieldLabel,
                      style: TextStyle(
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      field.fieldValue,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                  if (field.confidence != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: field.confidence! > 0.8
                            ? Colors.green.withOpacity(0.1)
                            : Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${(field.confidence! * 100).toStringAsFixed(0)}%',
                        style: TextStyle(
                          fontSize: 12,
                          color: field.confidence! > 0.8 ? Colors.green : Colors.orange,
                        ),
                      ),
                    ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildOCRTextCard() {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              '识别文本内容',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SelectableText(
              _ocrResult?.fullText ?? '无识别结果',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class OCRResult {
  final String? requestId;
  final String? status;
  final String? engine;
  final String? language;
  final String? fullText;
  final List<ExtractedField> extractedFields;
  final DateTime? processedAt;
  final double? processingTime;

  OCRResult({
    this.requestId,
    this.status,
    this.engine,
    this.language,
    this.fullText,
    this.extractedFields = const [],
    this.processedAt,
    this.processingTime,
  });

  factory OCRResult.fromJson(Map<String, dynamic> json) {
    final fieldsJson = json['extracted_fields'] as List? ?? [];
    final fields = fieldsJson.map((f) => ExtractedField.fromJson(f)).toList();

    return OCRResult(
      requestId: json['request_id']?.toString(),
      status: json['status'],
      engine: json['ocr_engine'],
      language: json['language'],
      fullText: json['full_text'],
      extractedFields: fields,
      processedAt: json['processed_at'] != null
          ? DateTime.parse(json['processed_at'])
          : null,
      processingTime: json['processing_time'] != null
          ? (json['processing_time'] as num).toDouble()
          : null,
    );
  }
}

class ExtractedField {
  final String fieldName;
  final String fieldValue;
  final double? confidence;
  final int? page;
  final String? bbox;

  ExtractedField({
    required this.fieldName,
    required this.fieldValue,
    this.confidence,
    this.page,
    this.bbox,
  });

  factory ExtractedField.fromJson(Map<String, dynamic> json) {
    return ExtractedField(
      fieldName: json['field_name'] ?? json['name'] ?? '',
      fieldValue: json['field_value'] ?? json['value'] ?? '',
      confidence: json['confidence'] != null
          ? (json['confidence'] as num).toDouble()
          : null,
      page: json['page'],
      bbox: json['bbox'],
    );
  }

  String get fieldLabel {
    const Map<String, String> labels = {
      'contract_number': '合同编号',
      'monthly_rent': '月租金',
      'deposit': '押金',
      'start_date': '开始日期',
      'end_date': '结束日期',
      'landlord_name': '房东姓名',
      'landlord_id': '房东身份证',
      'tenant_name': '房客姓名',
      'tenant_id': '房客身份证',
      'property_address': '房屋地址',
      'payment_method': '支付方式',
      'terms': '合同条款',
    };
    return labels[fieldName] ?? fieldName;
  }
}
