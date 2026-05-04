import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../blocs/medicine/medicine_bloc.dart';
import '../../../blocs/medicine/medicine_event.dart';
import '../../../blocs/medicine/medicine_state.dart';
import '../../../models/medicine.dart';

class MedicineListScreen extends StatefulWidget {
  const MedicineListScreen({super.key});

  @override
  State<MedicineListScreen> createState() => _MedicineListScreenState();
}

class _MedicineListScreenState extends State<MedicineListScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'all';
  DateTime? _lastRefreshTime;

  @override
  void initState() {
    super.initState();
    _loadMedicines();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _loadMedicines() {
    String? status;
    bool? isFavorite;

    switch (_selectedFilter) {
      case 'expiring':
        context.read<MedicineBloc>().add(const MedicineLoadExpiring(days: 7));
        return;
      case 'low_stock':
        context.read<MedicineBloc>().add(const MedicineLoadLowStock(threshold: 0.3));
        return;
      case 'expired':
        context.read<MedicineBloc>().add(MedicineLoadExpired());
        return;
      case 'favorites':
        isFavorite = true;
        break;
    }

    context.read<MedicineBloc>().add(MedicineLoadAll(
      status: status,
      isFavorite: isFavorite,
      search: _searchController.text.isNotEmpty ? _searchController.text : null,
    ));
  }

  Future<void> _onRefresh() async {
    _loadMedicines();
    _lastRefreshTime = DateTime.now();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的药品'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              _showSearchDialog();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        child: Column(
          children: [
            _buildFilterChips(),
            Expanded(
              child: BlocBuilder<MedicineBloc, MedicineState>(
                builder: (context, state) {
                  if (state is MedicineLoading) {
                    return const Center(
                      child: CircularProgressIndicator(),
                    );
                  }

                  if (state is MedicineError) {
                    return _buildErrorState(state.message);
                  }

                  List<Medicine> medicines = [];

                  if (state is MedicineLoaded) {
                    medicines = state.medicines;
                  } else if (state is MedicineExpiringLoaded) {
                    medicines = state.medicines;
                  } else if (state is MedicineLowStockLoaded) {
                    medicines = state.medicines;
                  } else if (state is MedicineExpiredLoaded) {
                    medicines = state.medicines;
                  }

                  if (medicines.isEmpty) {
                    return _buildEmptyState();
                  }

                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: medicines.length,
                    itemBuilder: (context, index) {
                      return _buildMedicineCard(medicines[index]);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildFilterChip('all', '全部', Icons.list),
            const SizedBox(width: 8),
            _buildFilterChip('expiring', '即将过期', Icons.warning),
            const SizedBox(width: 8),
            _buildFilterChip('low_stock', '库存不足', Icons.inventory_2),
            const SizedBox(width: 8),
            _buildFilterChip('expired', '已过期', Icons.close),
            const SizedBox(width: 8),
            _buildFilterChip('favorites', '收藏', Icons.favorite),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, IconData icon) {
    final isSelected = _selectedFilter == value;
    return FilterChip(
      selected: isSelected,
      label: Text(label),
      avatar: Icon(
        icon,
        size: 18,
        color: isSelected ? Colors.white : null,
      ),
      onSelected: (selected) {
        setState(() {
          _selectedFilter = value;
        });
        _loadMedicines();
      },
    );
  }

  Widget _buildMedicineCard(Medicine medicine) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () {
          context.go('/medicine/${medicine.id}');
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: _getStatusColor(medicine.status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getStatusIcon(medicine.status),
                  color: _getStatusColor(medicine.status),
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            medicine.name,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (medicine.isFavorite)
                          const Icon(
                            Icons.favorite,
                            size: 16,
                            color: Colors.red,
                          ),
                      ],
                    ),
                    if (medicine.genericName != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        medicine.genericName!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildStatusBadge(medicine),
                        const Spacer(),
                        Text(
                          '剩余: ${medicine.displayQuantity}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    if (medicine.expiryDate != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today,
                            size: 14,
                            color: medicine.daysUntilExpiry <= 30
                                ? Colors.orange
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '有效期至: ${DateFormat('yyyy-MM-dd').format(medicine.expiryDate!)}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: medicine.daysUntilExpiry <= 30
                                      ? Colors.orange
                                      : Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                          ),
                          if (medicine.daysUntilExpiry > 0) ...[
                            const SizedBox(width: 8),
                            Text(
                              '(${medicine.daysUntilExpiry}天后)',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: medicine.daysUntilExpiry <= 7
                                        ? Colors.red
                                        : Colors.orange,
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                          ],
                          if (medicine.daysUntilExpiry <= 0) ...[
                            const SizedBox(width: 8),
                            Text(
                              '(已过期)',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.red,
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(Medicine medicine) {
    final statusText = _getStatusText(medicine.status);
    final statusColor = _getStatusColor(medicine.status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        statusText,
        style: TextStyle(
          fontSize: 12,
          color: statusColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
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

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              Icons.local_pharmacy,
              size: 40,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            '暂无药品',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            '点击下方 + 按钮添加您的第一个药品',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
        ],
      ),
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
            onPressed: _loadMedicines,
            icon: const Icon(Icons.refresh),
            label: const Text('重试'),
          ),
        ],
      ),
    );
  }

  void _showSearchDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('搜索药品'),
          content: TextField(
            controller: _searchController,
            decoration: const InputDecoration(
              hintText: '输入药品名称或条码',
              prefixIcon: Icon(Icons.search),
            ),
            autofocus: true,
            onSubmitted: (value) {
              Navigator.pop(context);
              _loadMedicines();
            },
          ),
          actions: [
            TextButton(
              onPressed: () {
                _searchController.clear();
                Navigator.pop(context);
                _loadMedicines();
              },
              child: const Text('清除'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                _loadMedicines();
              },
              child: const Text('搜索'),
            ),
          ],
        );
      },
    );
  }
}
