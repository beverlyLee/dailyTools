import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:rental_contract_manager/models/reminder.dart';
import 'package:rental_contract_manager/services/api_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _tabs = ['全部', '未读', '合同提醒', '账单提醒'];

  List<Reminder> _reminders = [];
  List<Reminder> _unreadReminders = [];
  List<Reminder> _contractReminders = [];
  List<Reminder> _billingReminders = [];

  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _loadReminders();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadReminders() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = ApiService();

      _reminders = await apiService.getReminders();
      _unreadReminders = await apiService.getUnreadReminders();

      _contractReminders = _reminders
          .where((r) =>
              r.reminderType == 'contract_expiry' ||
              r.reminderType == 'rent_payment')
          .toList();

      _billingReminders = _reminders
          .where((r) => r.reminderType == 'billing_due')
          .toList();
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

  Future<void> _markAsRead(Reminder reminder) async {
    if (reminder.isRead) return;

    try {
      final apiService = ApiService();
      await apiService.markReminderAsRead(reminder.id);

      setState(() {
        _unreadReminders.removeWhere((r) => r.id == reminder.id);
        final index = _reminders.indexWhere((r) => r.id == reminder.id);
        if (index != -1) {
          _reminders[index] = Reminder(
            id: reminder.id,
            contract: reminder.contract,
            user: reminder.user,
            reminderType: reminder.reminderType,
            title: reminder.title,
            message: reminder.message,
            scheduledDate: reminder.scheduledDate,
            scheduledTime: reminder.scheduledTime,
            channels: reminder.channels,
            isRecurring: reminder.isRecurring,
            recurringPattern: reminder.recurringPattern,
            isSent: reminder.isSent,
            sentAt: reminder.sentAt,
            isRead: true,
            readAt: DateTime.now(),
            createdAt: reminder.createdAt,
            updatedAt: reminder.updatedAt,
          );
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已标记为已读')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('操作失败: $e')),
        );
      }
    }
  }

  Future<void> _markAllAsRead() async {
    if (_unreadReminders.isEmpty) return;

    try {
      final apiService = ApiService();
      for (final reminder in _unreadReminders) {
        await apiService.markReminderAsRead(reminder.id);
      }

      setState(() {
        _unreadReminders.clear();
        for (int i = 0; i < _reminders.length; i++) {
          if (!_reminders[i].isRead) {
            _reminders[i] = Reminder(
              id: _reminders[i].id,
              contract: _reminders[i].contract,
              user: _reminders[i].user,
              reminderType: _reminders[i].reminderType,
              title: _reminders[i].title,
              message: _reminders[i].message,
              scheduledDate: _reminders[i].scheduledDate,
              scheduledTime: _reminders[i].scheduledTime,
              channels: _reminders[i].channels,
              isRecurring: _reminders[i].isRecurring,
              recurringPattern: _reminders[i].recurringPattern,
              isSent: _reminders[i].isSent,
              sentAt: _reminders[i].sentAt,
              isRead: true,
              readAt: DateTime.now(),
              createdAt: _reminders[i].createdAt,
              updatedAt: _reminders[i].updatedAt,
            );
          }
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已全部标记为已读')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('操作失败: $e')),
        );
      }
    }
  }

  void _onReminderTap(Reminder reminder) {
    _markAsRead(reminder);
    // TODO: 导航到相关页面
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('消息通知'),
        actions: [
          if (_unreadReminders.isNotEmpty)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text('全部已读'),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: _loadReminders,
            tooltip: '刷新',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: _tabs.map((tab) {
            int count = 0;
            if (tab == '未读') {
              count = _unreadReminders.length;
            }
            return Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(tab),
                  if (count > 0) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 18,
                        minHeight: 18,
                      ),
                      child: Text(
                        count.toString(),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.white,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ],
              ),
            );
          }).toList(),
          isScrollable: true,
        ),
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
                        onPressed: _loadReminders,
                        child: const Text('重试'),
                      ),
                    ],
                  ),
                )
              : _buildTabContent(),
    );
  }

  Widget _buildTabContent() {
    return TabBarView(
      controller: _tabController,
      children: [
        _buildReminderList(_reminders),
        _buildReminderList(_unreadReminders),
        _buildReminderList(_contractReminders),
        _buildReminderList(_billingReminders),
      ],
    );
  }

  Widget _buildReminderList(List<Reminder> reminders) {
    if (reminders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              '暂无通知',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadReminders,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: reminders.length,
        itemBuilder: (context, index) {
          final reminder = reminders[index];
          return _ReminderCard(
            reminder: reminder,
            onTap: () => _onReminderTap(reminder),
          );
        },
      ),
    );
  }
}

class _ReminderCard extends StatelessWidget {
  final Reminder reminder;
  final VoidCallback onTap;

  const _ReminderCard({
    required this.reminder,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: reminder.isRead ? 0 : 2,
      color: reminder.isRead
          ? Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3)
          : null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildTypeIcon(context),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            reminder.title,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  fontWeight: reminder.isRead
                                      ? FontWeight.normal
                                      : FontWeight.bold,
                                ),
                          ),
                        ),
                        if (!reminder.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    if (reminder.message != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        reminder.message!,
                        style: Theme.of(context).textTheme.bodyMedium,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildTypeBadge(context),
                        const Spacer(),
                        Text(
                          _formatDateTime(reminder.scheduledDate),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    if (reminder.contract != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.home_outlined,
                            size: 14,
                            color: Theme.of(context).textTheme.bodySmall?.color,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            reminder.contract!.property?.name ?? '未知合同',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ],
                    if (reminder.isUrgent) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.warning_amber,
                              size: 14,
                              color: Colors.red,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '紧急: ${reminder.timeUntilScheduled}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.red,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeIcon(BuildContext context) {
    IconData icon;
    Color color;

    switch (reminder.reminderType) {
      case 'contract_expiry':
        icon = Icons.description_outlined;
        color = Colors.orange;
        break;
      case 'rent_payment':
        icon = Icons.payment_outlined;
        color = Colors.green;
        break;
      case 'billing_due':
        icon = Icons.receipt_long_outlined;
        color = Colors.blue;
        break;
      default:
        icon = Icons.notifications_outlined;
        color = Theme.of(context).colorScheme.primary;
    }

    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        icon,
        color: color,
        size: 24,
      ),
    );
  }

  Widget _buildTypeBadge(BuildContext context) {
    String label = reminder.reminderTypeDisplay;
    Color color;

    switch (reminder.reminderType) {
      case 'contract_expiry':
        color = Colors.orange;
        break;
      case 'rent_payment':
        color = Colors.green;
        break;
      case 'billing_due':
        color = Colors.blue;
        break;
      default:
        color = Theme.of(context).colorScheme.primary;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          color: color,
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dateTime.year, dateTime.month, dateTime.day);

    if (date == today) {
      return '今天 ${DateFormat('HH:mm').format(dateTime)}';
    } else if (date == today.add(const Duration(days: 1))) {
      return '明天 ${DateFormat('HH:mm').format(dateTime)}';
    } else if (date == today.subtract(const Duration(days: 1))) {
      return '昨天 ${DateFormat('HH:mm').format(dateTime)}';
    } else if (date.difference(today).inDays < 7 &&
        date.difference(today).inDays > -7) {
      final weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      return '${weekdays[date.weekday - 1]} ${DateFormat('HH:mm').format(dateTime)}';
    } else {
      return DateFormat('yyyy-MM-dd HH:mm').format(dateTime);
    }
  }
}
