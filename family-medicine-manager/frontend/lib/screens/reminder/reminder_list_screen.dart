import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../blocs/reminder/reminder_bloc.dart';
import '../../../blocs/reminder/reminder_event.dart';
import '../../../blocs/reminder/reminder_state.dart';
import '../../../models/reminder.dart';

class ReminderListScreen extends StatefulWidget {
  const ReminderListScreen({super.key});

  @override
  State<ReminderListScreen> createState() => _ReminderListScreenState();
}

class _ReminderListScreenState extends State<ReminderListScreen> {
  String _selectedFilter = 'active';

  @override
  void initState() {
    super.initState();
    _loadReminders();
  }

  void _loadReminders() {
    String? status;
    switch (_selectedFilter) {
      case 'active':
        status = 'active';
        break;
      case 'triggered':
        status = 'triggered';
        break;
      case 'dismissed':
        status = 'dismissed';
        break;
      case 'disabled':
        status = 'disabled';
        break;
    }

    if (status != null) {
      context.read<ReminderBloc>().add(
            ReminderLoadAll(status: status),
          );
    } else {
      context.read<ReminderBloc>().add(
            const ReminderLoadUpcoming(limit: 10),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('提醒中心'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadReminders,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          context.go('/reminders/add');
        },
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          _buildFilterChips(),
          Expanded(
            child: BlocBuilder<ReminderBloc, ReminderState>(
              builder: (context, state) {
                if (state is ReminderLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is ReminderError) {
                  return _buildErrorState(state.message);
                }

                List<Reminder> reminders = [];

                if (state is ReminderLoaded) {
                  reminders = state.reminders;
                } else if (state is ReminderUpcomingLoaded) {
                  reminders = state.reminders;
                }

                if (reminders.isEmpty) {
                  return _buildEmptyState();
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    _loadReminders();
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: reminders.length,
                    itemBuilder: (context, index) {
                      return _buildReminderCard(reminders[index]);
                    },
                  ),
                );
              },
            ),
          ),
        ],
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
            _buildFilterChip('active', '进行中', Icons.alarm),
            const SizedBox(width: 8),
            _buildFilterChip('triggered', '已触发', Icons.check_circle),
            const SizedBox(width: 8),
            _buildFilterChip('dismissed', '已忽略', Icons.done),
            const SizedBox(width: 8),
            _buildFilterChip('disabled', '已禁用', Icons.notifications_off),
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
        if (selected) {
          setState(() {
            _selectedFilter = value;
          });
          _loadReminders();
        }
      },
    );
  }

  Widget _buildReminderCard(Reminder reminder) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: () {
          _showReminderActions(reminder);
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getTypeColor(reminder.type).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getTypeIcon(reminder.type),
                  color: _getTypeColor(reminder.type),
                  size: 24,
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
                            reminder.title,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ),
                        _buildStatusBadge(reminder),
                      ],
                    ),
                    if (reminder.description != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        reminder.description!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(
                          Icons.access_time,
                          size: 14,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          reminder.reminderTime,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        if (reminder.isRepeating) ...[
                          const SizedBox(width: 8),
                          Icon(
                            Icons.repeat,
                            size: 14,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _getRepeatText(reminder.repeatFrequency),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                        const Spacer(),
                        IconButton(
                          icon: Icon(
                            reminder.isActive
                                ? Icons.notifications_active
                                : Icons.notifications_off,
                            size: 20,
                            color: reminder.isActive
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                          onPressed: () {
                            context.read<ReminderBloc>().add(
                                  ReminderToggle(reminder.id),
                                );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(Reminder reminder) {
    final statusText = _getStatusText(reminder.status);
    final statusColor = _getStatusColor(reminder.status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        statusText,
        style: TextStyle(
          fontSize: 11,
          color: statusColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  IconData _getTypeIcon(ReminderType type) {
    switch (type) {
      case ReminderType.dosage:
        return Icons.medication;
      case ReminderType.expiry:
        return Icons.warning;
      case ReminderType.lowStock:
        return Icons.inventory_2;
      case ReminderType.custom:
        return Icons.edit;
    }
  }

  String _getTypeText(ReminderType type) {
    switch (type) {
      case ReminderType.dosage:
        return '用药提醒';
      case ReminderType.expiry:
        return '过期提醒';
      case ReminderType.lowStock:
        return '库存提醒';
      case ReminderType.custom:
        return '自定义';
    }
  }

  Color _getTypeColor(ReminderType type) {
    switch (type) {
      case ReminderType.dosage:
        return Colors.blue;
      case ReminderType.expiry:
        return Colors.orange;
      case ReminderType.lowStock:
        return Colors.purple;
      case ReminderType.custom:
        return Colors.green;
    }
  }

  String _getStatusText(ReminderStatus status) {
    switch (status) {
      case ReminderStatus.pending:
        return '待激活';
      case ReminderStatus.active:
        return '进行中';
      case ReminderStatus.triggered:
        return '已触发';
      case ReminderStatus.dismissed:
        return '已忽略';
      case ReminderStatus.disabled:
        return '已禁用';
    }
  }

  Color _getStatusColor(ReminderStatus status) {
    switch (status) {
      case ReminderStatus.pending:
        return Colors.grey;
      case ReminderStatus.active:
        return Colors.green;
      case ReminderStatus.triggered:
        return Colors.blue;
      case ReminderStatus.dismissed:
        return Colors.grey;
      case ReminderStatus.disabled:
        return Colors.red;
    }
  }

  String _getRepeatText(RepeatFrequency frequency) {
    switch (frequency) {
      case RepeatFrequency.once:
        return '一次性';
      case RepeatFrequency.daily:
        return '每天';
      case RepeatFrequency.weekly:
        return '每周';
      case RepeatFrequency.monthly:
        return '每月';
      case RepeatFrequency.custom:
        return '自定义';
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
              Icons.notifications_none,
              size: 40,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            '暂无提醒',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            '点击下方 + 按钮添加提醒',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () {
              context.go('/reminders/add');
            },
            icon: const Icon(Icons.add),
            label: const Text('添加提醒'),
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
            onPressed: _loadReminders,
            icon: const Icon(Icons.refresh),
            label: const Text('重试'),
          ),
        ],
      ),
    );
  }

  void _showReminderActions(Reminder reminder) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
                margin: const EdgeInsets.symmetric(vertical: 16),
              ),
              ListTile(
                leading: const Icon(Icons.edit),
                title: const Text('编辑提醒'),
                onTap: () {
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: Icon(
                  reminder.status == ReminderStatus.dismissed
                      ? Icons.restore
                      : Icons.done,
                ),
                title: Text(
                  reminder.status == ReminderStatus.dismissed
                      ? '重新激活'
                      : '标记已处理',
                ),
                onTap: () {
                  Navigator.pop(context);
                  if (reminder.status != ReminderStatus.dismissed) {
                    context.read<ReminderBloc>().add(
                          ReminderDismiss(reminder.id),
                        );
                  }
                },
              ),
              ListTile(
                leading: Icon(
                  reminder.isActive ? Icons.notifications_off : Icons.notifications,
                ),
                title: Text(
                  reminder.isActive ? '禁用提醒' : '启用提醒',
                ),
                onTap: () {
                  Navigator.pop(context);
                  context.read<ReminderBloc>().add(
                        ReminderToggle(reminder.id),
                      );
                },
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: const Text(
                  '删除提醒',
                  style: TextStyle(color: Colors.red),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _showDeleteConfirmDialog(reminder);
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showDeleteConfirmDialog(Reminder reminder) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('确认删除'),
          content: const Text('确定要删除这个提醒吗？此操作不可恢复。'),
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
                context.read<ReminderBloc>().add(
                      ReminderDelete(reminder.id),
                    );
                _loadReminders();
              },
              child: const Text('删除'),
            ),
          ],
        );
      },
    );
  }
}
