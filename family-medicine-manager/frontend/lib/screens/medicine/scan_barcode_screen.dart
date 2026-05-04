import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../blocs/medicine/medicine_bloc.dart';
import '../../../blocs/medicine/medicine_event.dart';
import '../../../blocs/medicine/medicine_state.dart';
import '../../../models/medicine.dart';

class ScanBarcodeScreen extends StatefulWidget {
  const ScanBarcodeScreen({super.key});

  @override
  State<ScanBarcodeScreen> createState() => _ScanBarcodeScreenState();
}

class _ScanBarcodeScreenState extends State<ScanBarcodeScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );

  bool _isScanning = true;
  String? _lastScannedCode;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('扫码添加'),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () {
              _controller.toggleTorch();
            },
          ),
          IconButton(
            icon: const Icon(Icons.switch_camera),
            onPressed: () {
              _controller.switchCamera();
            },
          ),
        ],
      ),
      body: BlocConsumer<MedicineBloc, MedicineState>(
        listener: (context, state) {
          if (state is MedicineBarcodeScanned) {
            _showScanResultDialog(state.result, state.medicineInfo);
          } else if (state is MedicineError) {
            _showErrorDialog(state.message);
          }
        },
        builder: (context, state) {
          return Stack(
            children: [
              MobileScanner(
                controller: _controller,
                onDetect: (capture) {
                  final List<Barcode> barcodes = capture.barcodes;
                  for (final barcode in barcodes) {
                    if (barcode.rawValue != null && _isScanning) {
                      _handleBarcode(barcode.rawValue!);
                    }
                  }
                },
              ),
              _buildScanOverlay(),
              if (state is MedicineLoading)
                const Center(
                  child: CircularProgressIndicator(),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildScanOverlay() {
    return Center(
      child: Container(
        width: 250,
        height: 100,
        decoration: BoxDecoration(
          border: Border.all(
            color: Theme.of(context).colorScheme.primary,
            width: 3,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Stack(
          children: [
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: Container(
                height: 2,
                color: Theme.of(context).colorScheme.primary,
                child: AnimatedContainer(
                  duration: const Duration(seconds: 1),
                  curve: Curves.linear,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleBarcode(String barcode) {
    if (barcode == _lastScannedCode) return;

    setState(() {
      _lastScannedCode = barcode;
      _isScanning = false;
    });

    _controller.stop();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          title: const Text('检测到条码'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('条码: $barcode'),
              const SizedBox(height: 16),
              const Text('正在查询药品信息...'),
            ],
          ),
        );
      },
    );

    context.read<MedicineBloc>().add(MedicineScanBarcode(barcode));
  }

  void _showScanResultDialog(
    Map<String, dynamic> result,
    MedicineDictionary? medicineInfo,
  ) {
    Navigator.pop(context);

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Row(
            children: [
              Icon(
                medicineInfo != null
                    ? Icons.check_circle
                    : Icons.info_outline,
                color: medicineInfo != null ? Colors.green : Colors.blue,
              ),
              const SizedBox(width: 8),
              const Text('扫描结果'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (medicineInfo != null) ...[
                  Text(
                    medicineInfo.name,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  if (medicineInfo.genericName != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      medicineInfo.genericName!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  if (medicineInfo.brand != null)
                    _buildResultRow('品牌', medicineInfo.brand!),
                  if (medicineInfo.dosageForm != null)
                    _buildResultRow('剂型', medicineInfo.dosageForm!),
                  if (medicineInfo.strength != null)
                    _buildResultRow('规格', medicineInfo.strength!),
                  if (medicineInfo.manufacturer != null)
                    _buildResultRow('生产厂家', medicineInfo.manufacturer!),
                  if (medicineInfo.approvalNumber != null)
                    _buildResultRow('批准文号', medicineInfo.approvalNumber!),
                ] else ...[
                  const Text(
                    '未找到该药品的详细信息',
                    style: TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '您可以手动添加该药品的信息',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _resumeScanning();
              },
              child: const Text('重新扫描'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _goToAddMedicine(medicineInfo);
              },
              child: Text(medicineInfo != null ? '添加药品' : '手动添加'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                context.pop();
              },
              child: const Text('完成'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildResultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label: ',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    Navigator.pop(context);

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.error_outline, color: Colors.red),
              SizedBox(width: 8),
              Text('查询失败'),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _resumeScanning();
              },
              child: const Text('重新扫描'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _goToAddMedicine(null);
              },
              child: const Text('手动添加'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                context.pop();
              },
              child: const Text('取消'),
            ),
          ],
        );
      },
    );
  }

  void _resumeScanning() {
    setState(() {
      _isScanning = true;
      _lastScannedCode = null;
    });
    _controller.start();
  }

  void _goToAddMedicine(MedicineDictionary? medicineInfo) {
    final params = <String, dynamic>{};

    if (medicineInfo != null) {
      params['name'] = medicineInfo.name;
      if (medicineInfo.genericName != null) {
        params['genericName'] = medicineInfo.genericName!;
      }
      if (medicineInfo.brand != null) {
        params['brand'] = medicineInfo.brand!;
      }
      if (medicineInfo.dosageForm != null) {
        params['dosageForm'] = medicineInfo.dosageForm!;
      }
      if (medicineInfo.strength != null) {
        params['strength'] = medicineInfo.strength!;
      }
      if (medicineInfo.manufacturer != null) {
        params['manufacturer'] = medicineInfo.manufacturer!;
      }
    }

    if (_lastScannedCode != null) {
      params['barcode'] = _lastScannedCode!;
    }

    context.go('/add-medicine');
  }
}
