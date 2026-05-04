import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:rental_contract_manager/models/rental_contract.dart';
import 'package:rental_contract_manager/providers/contract_provider.dart';
import 'package:rental_contract_manager/services/api_service.dart';

class ContractDetailScreen extends StatefulWidget {
  final int contractId;

  const ContractDetailScreen({
    super.key,
    required this.contractId,
  });

  @override
  State<ContractDetailScreen> createState() => _ContractDetailScreenState();
}

class _ContractDetailScreenState extends State<ContractDetailScreen> {
  RentalContract? _contract;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadContract();
  }

  Future<void> _loadContract() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ApiService();
      _contract = await apiService.getContract(widget.contractId);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _navigateToEdit() {
    // TODO: 导航到编辑合同页面
  }

  void _showDeleteDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除合同'),
        content: const Text('确定要删除这份合同吗？此操作不可撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await _deleteContract();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteContract() async {
    try {
      final contractProvider =
          Provider.of<ContractProvider>(context, listen: false);
      await contractProvider.deleteContract(widget.contractId);
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('删除失败: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('合同详情'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: _navigateToEdit,
            tooltip: '编辑合同',
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Colors.red),
            onPressed: _showDeleteDialog,
            tooltip: '删除合同',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('加载失败: $_errorMessage'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadContract,
                        child: const Text('重新加载'),
                      ),
                    ],
                  ),
                )
              : _contract == null
                  ? const Center(child: Text('合同不存在'))
                  : _buildContractDetail(),
    );
  }

  Widget _buildContractDetail() {
    final contract = _contract!;
    return RefreshIndicator(
      onRefresh: _loadContract,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusCard(contract),
            const SizedBox(height: 16),
            _buildBasicInfoCard(contract),
            const SizedBox(height: 16),
            _buildTenantInfoCard(contract),
            const SizedBox(height: 16),
            _buildFinancialInfoCard(contract),
            const SizedBox(height: 16),
            _buildUtilitiesInfoCard(contract),
            const SizedBox(height: 16),
            _buildQuickActionsCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(RentalContract contract) {
    final isExpiring = contract.calculatedIsExpiringSoon;
    final daysRemaining = contract.calculatedDaysRemaining;
    final isActive = contract.status == 'active';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  contract.contractNumber,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: isActive
                        ? Colors.green.withOpacity(0.1)
                        : Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    contract.statusDisplay,
                    style: TextStyle(
                      color: isActive ? Colors.green : Colors.grey,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (isActive) ...[
              Row(
                children: [
                  Icon(
                    isExpiring ? Icons.warning_amber : Icons.check_circle,
                    color: isExpiring ? Colors.orange : Colors.green,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isExpiring
                        ? '合同即将到期，剩余 $daysRemaining 天'
                        : '合同正常履行中',
                    style: TextStyle(
                      color: isExpiring ? Colors.orange : Colors.green,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              if (isExpiring) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () {
                    // TODO: 续租功能
                  },
                  icon: const Icon(Icons.refresh_outlined),
                  label: const Text('申请续租'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.orange,
                    side: const BorderSide(color: Colors.orange),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBasicInfoCard(RentalContract contract) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              '基本信息',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Divider(height: 1),
          _buildInfoRow(
            icon: Icons.home_outlined,
            label: '房屋',
            value: contract.property?.name ?? '未设置',
          ),
          _buildInfoRow(
            icon: Icons.location_on_outlined,
            label: '地址',
            value: contract.property?.address ?? '未设置',
          ),
          _buildInfoRow(
            icon: Icons.date_range_outlined,
            label: '租期',
            value:
                '${contract.formattedStartDate} 至 ${contract.formattedEndDate}',
          ),
          _buildInfoRow(
            icon: Icons.timelapse_outlined,
            label: '合同期限',
            value: contract.contractDuration,
          ),
          _buildInfoRow(
            icon: Icons.payment_outlined,
            label: '支付方式',
            value: _getPaymentMethodDisplay(contract.paymentMethod),
          ),
          _buildInfoRow(
            icon: Icons.calendar_month_outlined,
            label: '每月付款日',
            value: '${contract.paymentDay} 日',
          ),
        ],
      ),
    );
  }

  Widget _buildTenantInfoCard(RentalContract contract) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              '房客信息',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Divider(height: 1),
          if (contract.tenant != null) ...[
            _buildInfoRow(
              icon: Icons.person_outlined,
              label: '姓名',
              value: contract.tenant!.name,
            ),
            _buildInfoRow(
              icon: Icons.phone_outlined,
              label: '电话',
              value: contract.tenant!.maskedPhone,
            ),
            if (contract.tenant!.email != null)
              _buildInfoRow(
                icon: Icons.email_outlined,
                label: '邮箱',
                value: contract.tenant!.email!,
              ),
            if (contract.tenant!.idCard != null)
              _buildInfoRow(
                icon: Icons.badge_outlined,
                label: '身份证',
                value: contract.tenant!.maskedIdCard,
              ),
          ] else
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                '未设置房客信息',
                style: TextStyle(color: Colors.grey),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFinancialInfoCard(RentalContract contract) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              '费用信息',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Divider(height: 1),
          _buildInfoRow(
            icon: Icons.monetization_on_outlined,
            label: '月租金',
            value: contract.formattedMonthlyRent,
            isHighlight: true,
          ),
          _buildInfoRow(
            icon: Icons.lock_outlined,
            label: '押金',
            value: contract.formattedDeposit,
          ),
          _buildInfoRow(
            icon: Icons.water_damage_outlined,
            label: '水电燃气',
            value: contract.utilitiesIncluded ? '包含在租金内' : '单独计算',
          ),
        ],
      ),
    );
  }

  Widget _buildUtilitiesInfoCard(RentalContract contract) {
    if (contract.utilitiesIncluded) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              '水电燃气单价',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Divider(height: 1),
          _buildInfoRow(
            icon: Icons.water_outlined,
            label: '水费',
            value: NumberFormat.currency(
              locale: 'zh_CN',
              symbol: '¥',
              decimalDigits: 2,
            ).format(contract.waterPrice),
            suffix: '/吨',
          ),
          _buildInfoRow(
            icon: Icons.electrical_services_outlined,
            label: '电费',
            value: NumberFormat.currency(
              locale: 'zh_CN',
              symbol: '¥',
              decimalDigits: 2,
            ).format(contract.electricityPrice),
            suffix: '/度',
          ),
          if (contract.gasPrice != null)
            _buildInfoRow(
              icon: Icons.local_fire_department_outlined,
              label: '燃气费',
              value: NumberFormat.currency(
                locale: 'zh_CN',
                symbol: '¥',
                decimalDigits: 2,
              ).format(contract.gasPrice!),
              suffix: '/立方米',
            ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsCard() {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              '快捷操作',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: GridView.count(
              shrinkWrap: true,
              crossAxisCount: 4,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _QuickActionButton(
                  icon: Icons.receipt_long_outlined,
                  label: '新建账单',
                  color: Colors.green,
                  onTap: () {
                    // TODO: 新建账单
                  },
                ),
                _QuickActionButton(
                  icon: Icons.picture_as_pdf_outlined,
                  label: 'PDF预览',
                  color: Colors.red,
                  onTap: () {
                    // TODO: PDF预览
                  },
                ),
                _QuickActionButton(
                  icon: Icons.history_outlined,
                  label: '历史账单',
                  color: Colors.blue,
                  onTap: () {
                    // TODO: 历史账单
                  },
                ),
                _QuickActionButton(
                  icon: Icons.share_outlined,
                  label: '分享合同',
                  color: Colors.purple,
                  onTap: () {
                    // TODO: 分享合同
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    bool isHighlight = false,
    String? suffix,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: Theme.of(context).textTheme.bodySmall?.color,
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: TextStyle(
                color: Theme.of(context).textTheme.bodySmall?.color,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  value,
                  textAlign: TextAlign.end,
                  style: isHighlight
                      ? TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        )
                      : null,
                ),
                if (suffix != null)
                  Text(
                    suffix,
                    style: TextStyle(
                      color: Theme.of(context).textTheme.bodySmall?.color,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getPaymentMethodDisplay(String method) {
    const Map<String, String> methods = {
      'monthly': '月付',
      'quarterly': '季付',
      'semi_annual': '半年付',
      'annual': '年付',
      'other': '其他',
    };
    return methods[method] ?? method;
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: color,
              size: 20,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
