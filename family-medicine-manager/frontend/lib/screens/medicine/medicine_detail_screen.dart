import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../blocs/medicine/medicine_bloc.dart';
import '../../../blocs/medicine/medicine_event.dart';
import '../../../blocs/medicine/medicine_state.dart';
import '../../../models/medicine.dart';

class MedicineDetailScreen extends StatefulWidget {
  final String medicineId;

  const MedicineDetailScreen({
    super.key,
    required this.medicineId,
  });

  @override
  State<MedicineDetailScreen> createState() => _MedicineDetailScreenState();
}

class _MedicineDetailScreenState extends State<MedicineDetailScreen> {
  double _doseQuantity = 1;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadMedicine();
  }

  void _loadMedicine() {
    context.read<MedicineBloc>().add(MedicineLoad(widget.medicineId));
  }

  IconData _getStatusIcon(MedicineStatus status) {
    switch (status) {
      case MedicineStatus.inStock:
        return Icons.check_circle;
      case MedicineStatus.lowStock:
        return Icons.inventory_2;
      case MedicineStatus.expired:
        return Icons.error;
      case MedicineStatus.usedUp:
        return Icons.remove_circle;
    }
  }

  String _getStatusText(MedicineStatus status) {
    switch (status) {
      case MedicineStatus.inStock:
        return '正常';
      case MedicineStatus.lowStock:
        return '库存不足';
      case MedicineStatus.expired:
        return '已过期';
      case MedicineStatus.usedUp:
        return '已用完';
    }
  }

  Color _getStatusColor(MedicineStatus status) {
    switch (status) {
      case MedicineStatus.inStock:
        return Colors.green;
      case MedicineStatus.lowStock:
        return Colors.orange;
      case MedicineStatus.expired:
        return Colors.red;
      case MedicineStatus.usedUp:
        return Colors.grey;
    }
  }

  String _getStorageConditionText(StorageCondition condition) {
    switch (condition) {
      case StorageCondition.roomTemp:
        return '常温保存';
      case StorageCondition.refrigerated:
        return '冷藏保存';
      case StorageCondition.frozen:
        return '冷冻保存';
      case StorageCondition.dark:
        return '避光保存';
    }
  }

  IconData _getStorageConditionIcon(StorageCondition condition) {
    switch (condition) {
      case StorageCondition.roomTemp:
        return Icons.thermostat;
      case StorageCondition.refrigerated:
        return Icons.ac_unit;
      case StorageCondition.frozen:
        return Icons.ac_unit;
      case StorageCondition.dark:
        return Icons.brightness_3;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('药品详情'),
        actions: [
          BlocBuilder<MedicineBloc, MedicineState>(
            builder: (context, state) {
              if (state is MedicineDetailLoaded) {
                return IconButton(
                  icon: Icon(
                    state.medicine.isFavorite
                        ? Icons.favorite
                        : Icons.favorite_border,
                    color: state.medicine.isFavorite ? Colors.red : null,
                  ),
                  onPressed: () {
                    context.read<MedicineBloc>().add(
                          MedicineToggleFavorite(state.medicine.id),
                        );
                  },
                );
              }
              return const SizedBox.shrink();
            },
          ),
          PopupMenuButton(
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit, size: 20),
                    SizedBox(width: 12),
                    Text('编辑'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, size: 20, color: Colors.red),
                    SizedBox(width: 12),
                    Text('删除', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'edit') {
                context.go('/add-medicine?id=${widget.medicineId}');
              } else if (value == 'delete') {
                _showDeleteConfirmDialog();
              }
            },
          ),
        ],
      ),
      body: BlocConsumer<MedicineBloc, MedicineState>(
        listener: (context, state) {
          if (state is MedicineLoading) {
            setState(() {
              _isLoading = true;
            });
          } else {
            setState(() {
              _isLoading = false;
            });
          }

          if (state is MedicineDeleted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('药品已删除')),
            );
            context.pop();
          }

          if (state is MedicineError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (_isLoading && state is! MedicineDetailLoaded) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is MedicineError) {
            return _buildErrorState(state.message);
          }

          if (state is MedicineDetailLoaded) {
            return _buildDetailContent(state.medicine);
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildDetailContent(Medicine medicine) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeaderCard(medicine),
          const SizedBox(height: 16),
          _buildQuickActions(medicine),
          const SizedBox(height: 16),
          _buildDetailSection(medicine),
          const SizedBox(height: 16),
          _buildUsageSection(medicine),
          const SizedBox(height: 16),
          _buildAdditionalInfoSection(medicine),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildHeaderCard(Medicine medicine) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _getStatusColor(medicine.status).withOpacity(0.1),
            Theme.of(context).colorScheme.primaryContainer,
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: _getStatusColor(medicine.status).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  _getStatusIcon(medicine.status),
                  size: 36,
                  color: _getStatusColor(medicine.status),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      medicine.name,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    if (medicine.genericName != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        medicine.genericName!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildChip(
                _getStatusText(medicine.status),
                _getStatusColor(medicine.status),
              ),
              if (medicine.isPrescription)
                _buildChip('处方药', Colors.orange),
              if (medicine.isFavorite)
                _buildChip('已收藏', Colors.redAccent),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildQuickActions(Medicine medicine) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.inventory,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '库存',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const Spacer(),
                  Text(
                    medicine.displayQuantity,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: medicine.isLowStock
                              ? Colors.orange
                              : Theme.of(context).colorScheme.primary,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (!medicine.isUsedUp && !medicine.isExpired) ...[
                Row(
                  children: [
                    const Text('用药数量:'),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: () {
                        if (_doseQuantity > 0.5) {
                          setState(() {
                            _doseQuantity -= 0.5;
                          });
                        }
                      },
                      icon: const Icon(Icons.remove_circle_outline),
                    ),
                    Text(
                      '${_doseQuantity.toStringAsFixed(_doseQuantity.truncateToDouble() == _doseQuantity ? 0 : 1)}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    IconButton(
                      onPressed: () {
                        setState(() {
                          _doseQuantity += 0.5;
                        });
                      },
                      icon: const Icon(Icons.add_circle_outline),
                    ),
                    const Spacer(),
                    FilledButton.icon(
                      onPressed: () {
                        _showDoseConfirmDialog(medicine);
                      },
                      icon: const Icon(Icons.check),
                      label: const Text('确认用药'),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailSection(Medicine medicine) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '基本信息',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 16),
              _buildInfoRow(
                icon: Icons.confirmation_num,
                label: '条码',
                value: medicine.barcode ?? '未记录',
              ),
              const Divider(height: 24),
              _buildInfoRow(
                icon: Icons.local_pharmacy,
                label: '品牌',
                value: medicine.brand ?? '未记录',
              ),
              const Divider(height: 24),
              _buildInfoRow(
                icon: Icons.medication,
                label: '剂型',
                value: medicine.dosageForm ?? '未记录',
              ),
              const Divider(height: 24),
              _buildInfoRow(
                icon: Icons.scale,
                label: '规格',
                value: medicine.strength ?? '未记录',
              ),
              const Divider(height: 24),
              _buildInfoRow(
                icon: Icons.tag,
                label: '批号',
                value: medicine.batchNumber ?? '未记录',
              ),
              const Divider(height: 24),
              _buildInfoRow(
                icon: _getStorageConditionIcon(medicine.storageCondition),
                label: '存储条件',
                value: _getStorageConditionText(medicine.storageCondition),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUsageSection(Medicine medicine) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '使用说明',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 16),
              if (medicine.usageInstructions != null) ...[
                _buildInfoRow(
                  icon: Icons.list_alt,
                  label: '用法用量',
                  value: medicine.usageInstructions!,
                ),
                const Divider(height: 24),
              ],
              if (medicine.indications != null) ...[
                _buildInfoRow(
                  icon: Icons.local_hospital,
                  label: '适应症',
                  value: medicine.indications!,
                ),
                const Divider(height: 24),
              ],
              if (medicine.contraindications != null) ...[
                _buildInfoRow(
                  icon: Icons.cancel,
                  label: '禁忌症',
                  value: medicine.contraindications!,
                  isWarning: true,
                ),
                const Divider(height: 24),
              ],
              if (medicine.sideEffects != null) ...[
                _buildInfoRow(
                  icon: Icons.warning,
                  label: '副作用',
                  value: medicine.sideEffects!,
                  isWarning: true,
                ),
              ],
              if (medicine.usageInstructions == null &&
                  medicine.indications == null &&
                  medicine.contraindications == null &&
                  medicine.sideEffects == null)
                Text(
                  '暂无使用说明',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAdditionalInfoSection(Medicine medicine) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '其他信息',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 16),
              if (medicine.expiryDate != null) ...[
                _buildInfoRow(
                  icon: Icons.calendar_today,
                  label: '有效期至',
                  value: DateFormat('yyyy年MM月dd日').format(medicine.expiryDate!),
                  isHighlight: medicine.daysUntilExpiry <= 30,
                ),
                const Divider(height: 24),
              ],
              if (medicine.productionDate != null) ...[
                _buildInfoRow(
                  icon: Icons.factory,
                  label: '生产日期',
                  value: DateFormat('yyyy年MM月dd日').format(medicine.productionDate!),
                ),
                const Divider(height: 24),
              ],
              if (medicine.purchaseDate != null) ...[
                _buildInfoRow(
                  icon: Icons.shopping_cart,
                  label: '购买日期',
                  value: DateFormat('yyyy年MM月dd日').format(medicine.purchaseDate!),
                ),
                const Divider(height: 24),
              ],
              if (medicine.purchaseLocation != null) ...[
                _buildInfoRow(
                  icon: Icons.location_on,
                  label: '购买地点',
                  value: medicine.purchaseLocation!,
                ),
                const Divider(height: 24),
              ],
              if (medicine.purchasePrice != null) ...[
                _buildInfoRow(
                  icon: Icons.attach_money,
                  label: '购买价格',
                  value: '¥${medicine.purchasePrice!.toStringAsFixed(2)}',
                ),
                const Divider(height: 24),
              ],
              if (medicine.prescribingDoctor != null) ...[
                _buildInfoRow(
                  icon: Icons.person,
                  label: '开方医生',
                  value: medicine.prescribingDoctor!,
                ),
                const Divider(height: 24),
              ],
              if (medicine.prescriptionNumber != null) ...[
                _buildInfoRow(
                  icon: Icons.receipt,
                  label: '处方编号',
                  value: medicine.prescriptionNumber!,
                ),
              ],
              if (medicine.notes != null) ...[
                const Divider(height: 24),
                _buildInfoRow(
                  icon: Icons.note,
                  label: '备注',
                  value: medicine.notes!,
                ),
              ],
              if (medicine.expiryDate == null &&
                  medicine.productionDate == null &&
                  medicine.purchaseDate == null &&
                  medicine.purchaseLocation == null &&
                  medicine.purchasePrice == null &&
                  medicine.prescribingDoctor == null &&
                  medicine.prescriptionNumber == null &&
                  medicine.notes == null)
                Text(
                  '暂无其他信息',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    bool isWarning = false,
    bool isHighlight = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 20,
          color: isWarning
              ? Colors.orange
              : Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isWarning
                        ? Colors.orange
                        : isHighlight
                            ? Theme.of(context).colorScheme.primary
                            : null,
                    fontWeight: isHighlight ? FontWeight.w500 : null,
                  ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.errorContainer,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              Icons.error_outline,
              size: 40,
              color: Theme.of(context).colorScheme.error,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            '加载失败',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _loadMedicine,
            icon: const Icon(Icons.refresh),
            label: const Text('重试'),
          ),
        ],
      ),
    );
  }

  void _showDoseConfirmDialog(Medicine medicine) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('确认用药'),
          content: Text(
            '确认使用 $_doseQuantity ${medicine.unit} ${medicine.name}？',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                context.read<MedicineBloc>().add(
                      MedicineDose(
                        id: medicine.id,
                        quantity: _doseQuantity,
                      ),
                    );
              },
              child: const Text('确认'),
            ),
          ],
        );
      },
    );
  }

  void _showDeleteConfirmDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('确认删除'),
          content: const Text('确定要删除这个药品吗？此操作不可恢复。'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('取消'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
              onPressed: () {
                Navigator.pop(context);
                context.read<MedicineBloc>().add(
                      MedicineDelete(widget.medicineId),
                    );
              },
              child: const Text('删除'),
            ),
          ],
        );
      },
    );
  }
}
