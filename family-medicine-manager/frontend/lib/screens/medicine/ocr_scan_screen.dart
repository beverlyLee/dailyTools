import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:intl/intl.dart';

import '../../../blocs/medicine/medicine_bloc.dart';
import '../../../blocs/medicine/medicine_event.dart';
import '../../../blocs/medicine/medicine_state.dart';

class OcrScanScreen extends StatefulWidget {
  const OcrScanScreen({super.key});

  @override
  State<OcrScanScreen> createState() => _OcrScanScreenState();
}

class _OcrScanScreenState extends State<OcrScanScreen> {
  final ImagePicker _picker = ImagePicker();
  File? _selectedImage;
  bool _isProcessing = false;
  Map<String, dynamic>? _ocrResult;
  DateTime? _recognizedExpiryDate;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('拍照识别'),
      ),
      body: BlocConsumer<MedicineBloc, MedicineState>(
        listener: (context, state) {
          if (state is MedicineLoading) {
            setState(() {
              _isProcessing = true;
            });
          } else {
            setState(() {
              _isProcessing = false;
            });
          }

          if (state is MedicineExpiryRecognized) {
            setState(() {
              _ocrResult = state.result;
              _recognizedExpiryDate = state.expiryDate;
            });
          } else if (state is MedicineError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildInstructions(),
                  const SizedBox(height: 24),
                  _buildImageArea(),
                  const SizedBox(height: 24),
                  _buildActionButtons(),
                  if (_ocrResult != null) ...[
                    const SizedBox(height: 24),
                    _buildOcrResult(),
                  ],
                  if (_isProcessing) ...[
                    const SizedBox(height: 24),
                    _buildProcessingIndicator(),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInstructions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  '使用说明',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              '拍摄药品包装盒或说明书上的有效期信息，系统将自动识别有效期日期。',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            const Text('提示：'),
            const SizedBox(height: 8),
            ...[
              '确保有效期文字清晰可见',
              '包含格式如："有效期至 2025年12月31日" 或 "EXP: 2025-12-31"',
              '拍摄后可以裁剪图片',
            ].map((tip) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '• ',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          tip,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildImageArea() {
    return Container(
      height: 300,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline,
          style: BorderStyle.solid,
        ),
      ),
      child: _selectedImage != null
          ? Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.file(
                    _selectedImage!,
                    fit: BoxFit.contain,
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.error,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                    onPressed: () {
                      setState(() {
                        _selectedImage = null;
                        _ocrResult = null;
                        _recognizedExpiryDate = null;
                      });
                    },
                  ),
                ),
              ],
            )
          : Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.camera_alt,
                    size: 64,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '请选择图片',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _isProcessing ? null : () => _pickImage(ImageSource.camera),
            icon: const Icon(Icons.camera_alt),
            label: const Text('拍照'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _isProcessing ? null : () => _pickImage(ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: const Text('相册'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildProcessingIndicator() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              '正在识别有效期...',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              '这可能需要几秒钟',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOcrResult() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _recognizedExpiryDate != null
                      ? Icons.check_circle
                      : Icons.warning,
                  color: _recognizedExpiryDate != null
                      ? Colors.green
                      : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  '识别结果',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_recognizedExpiryDate != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '识别到有效期',
                      style: TextStyle(
                        color: Colors.green[700],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      DateFormat('yyyy年MM月dd日').format(_recognizedExpiryDate!),
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: Colors.green[700],
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _goToAddMedicine(),
                  icon: const Icon(Icons.add),
                  label: const Text('使用此日期添加药品'),
                ),
              ),
            ] else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '未能识别到明确的有效期',
                      style: TextStyle(
                        color: Colors.orange[700],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_ocrResult != null && _ocrResult!['expiryDates'] != null)
                      ...(_ocrResult!['expiryDates'] as List).map((date) => Text(
                            '检测到: $date',
                            style: Theme.of(context).textTheme.bodyMedium,
                          )),
                    const SizedBox(height: 8),
                    Text(
                      '您可以手动输入有效期',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _clearAndRetry(),
                      icon: const Icon(Icons.refresh),
                      label: const Text('重新识别'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _goToAddMedicine(),
                      icon: const Icon(Icons.edit),
                      label: const Text('手动添加'),
                    ),
                  ),
                ],
              ),
            ],
            if (_ocrResult != null && _ocrResult!['text'] != null) ...[
              const SizedBox(height: 16),
              ExpansionTile(
                title: const Text('查看完整识别文本'),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      _ocrResult!['text'],
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            fontFamily: 'monospace',
                          ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    final XFile? image = await _picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1080,
      imageQuality: 85,
    );

    if (image != null) {
      final CroppedFile? croppedImage = await ImageCropper().cropImage(
        sourcePath: image.path,
        aspectRatioPresets: [
          CropAspectRatioPreset.original,
          CropAspectRatioPreset.square,
          CropAspectRatioPreset.ratio3x2,
          CropAspectRatioPreset.ratio4x3,
        ],
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: '裁剪图片',
            toolbarColor: Theme.of(context).colorScheme.primary,
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.original,
            lockAspectRatio: false,
          ),
          IOSUiSettings(
            title: '裁剪图片',
          ),
        ],
      );

      if (croppedImage != null) {
        setState(() {
          _selectedImage = File(croppedImage.path);
          _ocrResult = null;
          _recognizedExpiryDate = null;
        });

        _processImage();
      } else {
        setState(() {
          _selectedImage = File(image.path);
          _ocrResult = null;
          _recognizedExpiryDate = null;
        });

        _processImage();
      }
    }
  }

  void _processImage() {
    if (_selectedImage == null) return;

    final bytes = _selectedImage!.readAsBytesSync();
    final base64Image = base64Encode(bytes);

    context.read<MedicineBloc>().add(
          MedicineRecognizeExpiry(base64Image),
        );
  }

  void _clearAndRetry() {
    setState(() {
      _selectedImage = null;
      _ocrResult = null;
      _recognizedExpiryDate = null;
    });
  }

  void _goToAddMedicine() {
    context.go('/add-medicine');
  }
}
