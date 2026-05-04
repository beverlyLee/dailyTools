import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:rental_contract_manager/models/bill.dart';
import 'package:rental_contract_manager/models/rental_contract.dart';
import 'package:rental_contract_manager/providers/bill_provider.dart';
import 'package:rental_contract_manager/providers/contract_provider.dart';
import 'package:rental_contract_manager/services/api_service.dart';

class BillsScreen extends StatefulWidget {
  const BillsScreen({super.key});

  @override
  State<BillsScreen> createState() => _BillsScreenState();
}

class _BillsScreenState extends State<BillsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = ['全部', '待支付', '已支付', '已逾期'];
  String _selectedStatus = '';
  List<Bill> _bills = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _loadBills();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadBills() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ApiService();
      List<Bill> bills;

      switch (_selectedStatus) {
        case 'pending':
          bills = await apiService.getBills(status: 'pending');
          break;
        case 'paid':
          bills = await apiService.getBills(status: 'paid');
          break;
        case 'overdue':
          bills = await apiService.getOverdueBills();
          break;
        default:
          bills = await apiService.getBills();
      }

      setState(() {
        _bills = bills;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _onTabChanged(int index) {
    setState(() {
      switch (index) {
        case 0:
          _selectedStatus = '';
          break;
        case 1:
          _selectedStatus = 'pending';
          break;
        case 2:
          _selectedStatus = 'paid';
          break;
        case 3:
          _selectedStatus = 'overdue';
          break;
      }
    });
    _loadBills();
  }

  void _navigateToCreateBill() {
    // TODO: 导航到创建账单页面
  }

  void _navigateToBillDetail(Bill bill) {
    // TODO: 导航到账单详情页面
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('账单管理'),
        bottom: TabBar(
          controller: _tabController,
          onTap: _onTabChanged,
          tabs: _tabs.map((tab) => Tab(text: tab)).toList(),
          isScrollable: true,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_outlined),
            onPressed: () {
              // TODO: 筛选功能
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSummaryCard(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadBills,
              child: _buildBillList(),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToCreateBill,
        child: const Icon(Icons.add),
        tooltip: '新建账单',
      ),
    );
  }

  Widget _buildSummaryCard() {
    final totalPending = _bills
        .where((b) => b.status == 'pending' || b.status == 'partially_paid')
        .fold<double>(0, (sum, b) => sum + b.remainingAmount);

    final totalOverdue = _bills
        .where((b) => b.isOverdue)
        .fold<double>(0, (sum, b) => sum + b.remainingAmount);

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                children: [
                  Text(
                    '待支付金额',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    NumberFormat.currency(
                      locale: 'zh_CN',
                      symbol: '¥',
                      decimalDigits: 2,
                    ).format(totalPending),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                  ),
                ],
              ),
            ),
            Container(
              height: 40,
              width: 1,
              color: Theme.of(context).dividerColor,
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    '已逾期金额',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    NumberFormat.currency(
                      locale: 'zh_CN',
                      symbol: '¥',
                      decimalDigits: 2,
                    ).format(totalOverdue),
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBillList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('加载失败: $_errorMessage'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadBills,
              child: const Text('重试'),
            ),
          ],
        ),
      );
    }

    if (_bills.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              '暂无账单',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _navigateToCreateBill,
              child: const Text('点击创建第一个账单'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _bills.length,
      itemBuilder: (context, index) {
        final bill = _bills[index];
        return _BillCard(
          bill: bill,
          onTap: () => _navigateToBillDetail(bill),
        );
      },
    );
  }
}

class _BillCard extends StatelessWidget {
  final Bill bill;
  final VoidCallback onTap;

  const _BillCard({
    required this.bill,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      bill.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ),
                  _buildStatusBadge(context),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context)
                          .colorScheme
                          .primary
                          .withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      bill.billTypeDisplay,
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    bill.billingPeriod,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.home_outlined,
                    size: 16,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      bill.contract?.property?.name ?? '未知房屋',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '总金额',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        bill.formattedTotalAmount,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                  if (bill.status != 'paid') ...[
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '剩余金额',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        Text(
                          bill.formattedRemainingAmount,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: bill.isOverdue ? Colors.red : Colors.orange,
                              ),
                        ),
                      ],
                    ),
                  ],
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '到期日',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        bill.formattedDueDate,
                        style: TextStyle(
                          fontWeight: FontWeight.w500,
                          color: bill.isOverdue
                              ? Colors.red
                              : bill.daysUntilDue <= 3
                                  ? Colors.orange
                                  : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              if (bill.status != 'paid' && bill.paidAmount > 0) ...[
                const SizedBox(height: 12),
                _buildPaymentProgress(context),
              ],
              if (bill.splits != null && bill.splits!.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildSplitInfo(context),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(BuildContext context) {
    Color backgroundColor;
    Color textColor;
    String text = bill.statusDisplay;

    switch (bill.status) {
      case 'paid':
        backgroundColor = Colors.green.withOpacity(0.1);
        textColor = Colors.green;
        break;
      case 'overdue':
      case 'partially_paid':
        backgroundColor = Colors.orange.withOpacity(0.1);
        textColor = Colors.orange;
        break;
      case 'cancelled':
        backgroundColor = Colors.grey.withOpacity(0.1);
        textColor = Colors.grey;
        break;
      default:
        backgroundColor = Theme.of(context).colorScheme.primary.withOpacity(0.1);
        textColor = Theme.of(context).colorScheme.primary;
    }

    if (bill.isOverdue) {
      text = '已逾期';
      backgroundColor = Colors.red.withOpacity(0.1);
      textColor = Colors.red;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildPaymentProgress(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '支付进度',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              '${(bill.paymentProgress * 100).toStringAsFixed(0)}%',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: bill.paymentProgress,
            minHeight: 6,
            backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
            valueColor: AlwaysStoppedAnimation<Color>(
              bill.paymentProgress >= 1 ? Colors.green : Theme.of(context).colorScheme.primary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSplitInfo(BuildContext context) {
    final splits = bill.splits!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '分摊信息 (${splits.length}人)',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: splits.map((split) {
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: split.isPaid
                    ? Colors.green.withOpacity(0.1)
                    : Theme.of(context).colorScheme.surfaceVariant,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    split.tenant?.name ?? '未知',
                    style: TextStyle(
                      fontSize: 12,
                      color: split.isPaid ? Colors.green : null,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    split.formattedAmount,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: split.isPaid ? Colors.green : null,
                    ),
                  ),
                  if (split.isPaid) ...[
                    const SizedBox(width: 4),
                    const Icon(
                      Icons.check_circle,
                      size: 12,
                      color: Colors.green,
                    ),
                  ],
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
