import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:badges/badges.dart' as badges;
import 'package:rental_contract_manager/providers/auth_provider.dart';
import 'package:rental_contract_manager/providers/contract_provider.dart';
import 'package:rental_contract_manager/providers/bill_provider.dart';
import 'package:rental_contract_manager/constants/app_constants.dart';
import 'package:rental_contract_manager/screens/contract_form_screen.dart';
import 'package:rental_contract_manager/screens/contract_detail_screen.dart';
import 'package:rental_contract_manager/screens/bills_screen.dart';
import 'package:rental_contract_manager/screens/ocr_scan_screen.dart';
import 'package:rental_contract_manager/screens/pdf_preview_screen.dart';
import 'package:rental_contract_manager/screens/notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final contractProvider = Provider.of<ContractProvider>(context, listen: false);
    await contractProvider.fetchProperties();
    await contractProvider.fetchTenants();
    await contractProvider.fetchContracts();
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_getAppBarTitle()),
        actions: [
          IconButton(
            icon: const badges.Badge(
              badgeContent: Text(
                '3',
                style: TextStyle(color: Colors.white, fontSize: 10),
              ),
              child: Icon(Icons.notifications_outlined),
            ),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const NotificationsScreen()),
              );
            },
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') {
                _showLogoutDialog();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'profile',
                child: ListTile(
                  leading: Icon(Icons.person_outline),
                  title: Text('个人信息'),
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: ListTile(
                  leading: Icon(Icons.settings_outlined),
                  title: Text('设置'),
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: ListTile(
                  leading: Icon(Icons.logout_outlined, color: Colors.red),
                  title: Text('退出登录', style: TextStyle(color: Colors.red)),
                ),
              ),
            ],
          ),
        ],
      ),
      body: _getBody(),
      floatingActionButton: _selectedIndex == 1
          ? FloatingActionButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context) => const ContractFormScreen()),
                );
              },
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: _onItemTapped,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: '首页',
          ),
          NavigationDestination(
            icon: Icon(Icons.description_outlined),
            selectedIcon: Icon(Icons.description),
            label: '合同',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: '账单',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: '我的',
          ),
        ],
      ),
    );
  }

  String _getAppBarTitle() {
    switch (_selectedIndex) {
      case 0:
        return AppConstants.appName;
      case 1:
        return '合同管理';
      case 2:
        return '账单管理';
      case 3:
        return '我的';
      default:
        return AppConstants.appName;
    }
  }

  Widget _getBody() {
    switch (_selectedIndex) {
      case 0:
        return const _HomeTab();
      case 1:
        return const _ContractsTab();
      case 2:
        return const _BillsTab();
      case 3:
        return const _ProfileTab();
      default:
        return const _HomeTab();
    }
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确定要退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Provider.of<AuthProvider>(context, listen: false).logout();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('退出'),
          ),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  const _HomeTab();

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        final contractProvider = Provider.of<ContractProvider>(context, listen: false);
        await contractProvider.fetchContracts();
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Consumer<AuthProvider>(
              builder: (context, authProvider, child) {
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 32,
                          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                          child: Text(
                            authProvider.currentUser?.fullName[0] ?? 'U',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '欢迎回来',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              Text(
                                authProvider.currentUser?.fullName ?? '用户',
                                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            Text(
              '快捷操作',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            GridView.count(
              shrinkWrap: true,
              crossAxisCount: 4,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                _QuickActionCard(
                  icon: Icons.description_outlined,
                  label: '新建合同',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const ContractFormScreen()),
                    );
                  },
                  color: Colors.blue,
                ),
                _QuickActionCard(
                  icon: Icons.receipt_long_outlined,
                  label: '新建账单',
                  onTap: () {
                    // TODO: 新建账单表单页面
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('新建账单功能开发中')),
                    );
                  },
                  color: Colors.green,
                ),
                _QuickActionCard(
                  icon: Icons.document_scanner_outlined,
                  label: 'OCR扫描',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const OCRScanScreen()),
                    );
                  },
                  color: Colors.orange,
                ),
                _QuickActionCard(
                  icon: Icons.picture_as_pdf_outlined,
                  label: 'PDF预览',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('请选择合同文档进行预览')),
                    );
                  },
                  color: Colors.red,
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '即将到期',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('查看全部'),
                ),
              ],
            ),
            Consumer<ContractProvider>(
              builder: (context, contractProvider, child) {
                if (contractProvider.isLoading) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                if (contractProvider.expiringContracts.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Column(
                        children: [
                          Icon(
                            Icons.check_circle_outline,
                            size: 48,
                            color: Colors.green,
                          ),
                          SizedBox(height: 12),
                          Text('暂无即将到期的合同'),
                        ],
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: contractProvider.expiringContracts.length,
                  itemBuilder: (context, index) {
                    final contract = contractProvider.expiringContracts[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        leading: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.orange.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            Icons.warning_amber_outlined,
                            color: Colors.orange,
                          ),
                        ),
                        title: Text(contract.property?.name ?? '房屋'),
                        subtitle: Text(
                          '剩余 ${contract.calculatedDaysRemaining} 天到期',
                          style: const TextStyle(color: Colors.orange),
                        ),
                        trailing: Icon(Icons.chevron_right),
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => ContractDetailScreen(
                                contractId: contract.id,
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                );
              },
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '统计概览',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Consumer<ContractProvider>(
              builder: (context, contractProvider, child) {
                return GridView.count(
                  shrinkWrap: true,
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _StatCard(
                      title: '有效合同',
                      value: '${contractProvider.activeContractsCount}',
                      icon: Icons.description_outlined,
                      color: Colors.blue,
                    ),
                    _StatCard(
                      title: '即将到期',
                      value: '${contractProvider.expiringContractsCount}',
                      icon: Icons.warning_amber_outlined,
                      color: Colors.orange,
                    ),
                    _StatCard(
                      title: '待收租金',
                      value: '¥0',
                      icon: Icons.money_outlined,
                      color: Colors.green,
                    ),
                    _StatCard(
                      title: '待处理提醒',
                      value: '0',
                      icon: Icons.notifications_outlined,
                      color: Colors.purple,
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ContractsTab extends StatelessWidget {
  const _ContractsTab();

  @override
  Widget build(BuildContext context) {
    return Consumer<ContractProvider>(
      builder: (context, contractProvider, child) {
        if (contractProvider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (contractProvider.contracts.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.description_outlined,
                  size: 64,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  '暂无合同',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (context) => const ContractFormScreen()),
                    );
                  },
                  child: const Text('点击添加第一个合同'),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: contractProvider.contracts.length,
          itemBuilder: (context, index) {
            final contract = contractProvider.contracts[index];
            return Card(
              margin: const EdgeInsets.symmetric(vertical: 8),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => ContractDetailScreen(
                        contractId: contract.id,
                      ),
                    ),
                  );
                },
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
                              contract.property?.name ?? '房屋',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: contract.status == 'active'
                                  ? Colors.green.withOpacity(0.1)
                                  : contract.calculatedIsExpiringSoon
                                      ? Colors.orange.withOpacity(0.1)
                                      : Colors.grey.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              contract.statusDisplay,
                              style: TextStyle(
                                color: contract.status == 'active'
                                    ? Colors.green
                                    : contract.calculatedIsExpiringSoon
                                        ? Colors.orange
                                        : Colors.grey,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        contract.tenant?.name ?? '房客',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today_outlined,
                            size: 16,
                            color: Theme.of(context).textTheme.bodySmall?.color,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${contract.formattedStartDate} - ${contract.formattedEndDate}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '月租金: ${contract.formattedMonthlyRent}',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.edit_outlined),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => ContractFormScreen(
                                        existingContract: contract,
                                      ),
                                    ),
                                  );
                                },
                                visualDensity: VisualDensity.compact,
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.red),
                                onPressed: () {
                                  _showDeleteContractDialog(context, contractProvider, contract);
                                },
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _showDeleteContractDialog(
    BuildContext context,
    ContractProvider contractProvider,
    RentalContract contract,
  ) {
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
              try {
                await contractProvider.deleteContract(contract.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('合同已删除')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('删除失败: $e')),
                  );
                }
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('删除'),
          ),
        ],
      ),
    );
  }
}

class _BillsTab extends StatelessWidget {
  const _BillsTab();

  @override
  Widget build(BuildContext context) {
    return const BillsScreen();
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                      child: Text(
                        authProvider.currentUser?.fullName[0] ?? 'U',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            authProvider.currentUser?.fullName ?? '用户',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            authProvider.currentUser?.email ?? '',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 16),
        const Card(
          child: Column(
            children: [
              ListTile(
                leading: Icon(Icons.person_outline),
                title: Text('个人信息'),
                trailing: Icon(Icons.chevron_right),
              ),
              Divider(height: 1),
              ListTile(
                leading: Icon(Icons.description_outlined),
                title: Text('我的合同'),
                trailing: Icon(Icons.chevron_right),
              ),
              Divider(height: 1),
              ListTile(
                leading: Icon(Icons.receipt_long_outlined),
                title: Text('我的账单'),
                trailing: Icon(Icons.chevron_right),
              ),
              Divider(height: 1),
              ListTile(
                leading: Icon(Icons.notifications_outlined),
                title: Text('消息通知'),
                trailing: Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Card(
          child: Column(
            children: [
              ListTile(
                leading: Icon(Icons.settings_outlined),
                title: Text('系统设置'),
                trailing: Icon(Icons.chevron_right),
              ),
              Divider(height: 1),
              ListTile(
                leading: Icon(Icons.help_outline),
                title: Text('帮助与反馈'),
                trailing: Icon(Icons.chevron_right),
              ),
              Divider(height: 1),
              ListTile(
                leading: Icon(Icons.info_outline),
                title: Text('关于我们'),
                trailing: Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            return OutlinedButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('退出登录'),
                    content: const Text('确定要退出登录吗？'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('取消'),
                      ),
                      TextButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                          authProvider.logout();
                        },
                        style: TextButton.styleFrom(foregroundColor: Colors.red),
                        child: const Text('退出'),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.logout_outlined),
              label: const Text('退出登录'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
              ),
            );
          },
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            '版本 ${AppConstants.appVersion}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.color,
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
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: color,
              size: 28,
            ),
          ),
          const SizedBox(height: 8),
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

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    color: color,
                    size: 20,
                  ),
                ),
              ],
            ),
            const Spacer(),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
