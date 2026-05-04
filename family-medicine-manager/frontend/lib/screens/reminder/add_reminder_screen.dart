import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../blocs/reminder/reminder_bloc.dart';
import '../../../blocs/reminder/reminder_event.dart';
import '../../../blocs/reminder/reminder_state.dart';
import '../../../models/reminder.dart';

class AddReminderScreen extends StatefulWidget {
  const AddReminderScreen({super.key});

  @override
  State<AddReminderScreen> createState() => _AddReminderScreenState();
}

class _AddReminderScreenState extends State<AddReminderScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  ReminderType _selectedType = ReminderType.custom;
  RepeatFrequency _selectedFrequency = RepeatFrequency.daily;
  TimeOfDay _selectedTime = TimeOfDay.now();
  DateTime? _selectedDate;
  int _advanceNoticeMinutes = 0;

  final List<String> _selectedWeekDays = [];

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('添加提醒'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _submitForm,
            child: const Text('保存'),
          ),
        ],
      ),
      body: BlocListener<ReminderBloc, ReminderState>(
        listener: (context, state) {
          if (state is ReminderLoading) {
            setState(() {
              _isLoading = true;
            });
          } else {
            setState(() {
              _isLoading = false;
            });
          }

          if (state is ReminderCreated) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('提醒已创建')),
            );
            context.pop();
          }

          if (state is ReminderError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildSectionHeader('基本信息'),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _titleController,
                label: '提醒标题 *',
                icon: Icons.title,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return '请输入提醒标题';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              _buildTextField(
                controller: _descriptionController,
                label: '描述 (可选)',
                icon: Icons.description,
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              _buildSectionHeader('提醒类型'),
              const SizedBox(height: 12),
              _buildTypeSelector(),
              const SizedBox(height: 16),
              _buildSectionHeader('时间设置'),
              const SizedBox(height: 12),
              _buildTimePicker(),
              const SizedBox(height: 12),
              _buildDatePicker(),
              const SizedBox(height: 16),
              _buildSectionHeader('重复设置'),
              const SizedBox(height: 12),
              _buildFrequencySelector(),
              if (_selectedFrequency == RepeatFrequency.weekly) ...[
                const SizedBox(height: 12),
                _buildWeekDaySelector(),
              ],
              const SizedBox(height: 16),
              _buildSectionHeader('高级设置'),
              const SizedBox(height: 12),
              _buildAdvanceNoticeSelector(),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _isLoading ? null : _submitForm,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          '创建提醒',
                          style: TextStyle(fontSize: 16),
                        ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.primary,
          ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? hintText,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        alignLabelWithHint: maxLines > 1,
      ),
      maxLines: maxLines,
      keyboardType: keyboardType,
      validator: validator,
      enabled: !_isLoading,
    );
  }

  Widget _buildTypeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ReminderType.values.map((type) {
            final isSelected = _selectedType == type;
            return FilterChip(
              selected: isSelected,
              label: Text(_getTypeText(type)),
              avatar: Icon(
                _getTypeIcon(type),
                size: 18,
                color: isSelected ? Colors.white : null,
              ),
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _selectedType = type;
                  });
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildTimePicker() {
    return InkWell(
      onTap: () => _selectTime(),
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: '提醒时间 *',
          prefixIcon: const Icon(Icons.access_time),
          suffixIcon: const Icon(Icons.arrow_drop_down),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          children: [
            Text(
              _selectedTime.format(context),
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDatePicker() {
    final showDate = _selectedFrequency == RepeatFrequency.once;

    if (!showDate) return const SizedBox.shrink();

    return Column(
      children: [
        const SizedBox(height: 12),
        InkWell(
          onTap: () => _selectDate(),
          borderRadius: BorderRadius.circular(12),
          child: InputDecorator(
            decoration: InputDecoration(
              labelText: '提醒日期 *',
              prefixIcon: const Icon(Icons.calendar_today),
              suffixIcon: const Icon(Icons.arrow_drop_down),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Text(
                  _selectedDate != null
                      ? DateFormat('yyyy年MM月dd日').format(_selectedDate!)
                      : '请选择日期',
                  style: TextStyle(
                    color: _selectedDate != null
                        ? Theme.of(context).textTheme.bodyLarge?.color
                        : Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFrequencySelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            RepeatFrequency.once,
            RepeatFrequency.daily,
            RepeatFrequency.weekly,
            RepeatFrequency.monthly,
          ].map((frequency) {
            final isSelected = _selectedFrequency == frequency;
            return FilterChip(
              selected: isSelected,
              label: Text(_getRepeatText(frequency)),
              avatar: Icon(
                _getRepeatIcon(frequency),
                size: 18,
                color: isSelected ? Colors.white : null,
              ),
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _selectedFrequency = frequency;
                  });
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildWeekDaySelector() {
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '选择重复日期',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(7, (index) {
            final day = (index + 1).toString();
            final isSelected = _selectedWeekDays.contains(day);

            return GestureDetector(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    _selectedWeekDays.remove(day);
                  } else {
                    _selectedWeekDays.add(day);
                  }
                });
              },
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isSelected
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.surfaceContainer,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.outline,
                  ),
                ),
                child: Center(
                  child: Text(
                    weekDays[index],
                    style: TextStyle(
                      color: isSelected
                          ? Colors.white
                          : Theme.of(context).colorScheme.onSurface,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildAdvanceNoticeSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '提前提醒',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildAdvanceChip(0, '准时'),
            _buildAdvanceChip(5, '5分钟前'),
            _buildAdvanceChip(15, '15分钟前'),
            _buildAdvanceChip(30, '30分钟前'),
            _buildAdvanceChip(60, '1小时前'),
          ],
        ),
      ],
    );
  }

  Widget _buildAdvanceChip(int minutes, String label) {
    final isSelected = _advanceNoticeMinutes == minutes;
    return FilterChip(
      selected: isSelected,
      label: Text(label),
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _advanceNoticeMinutes = minutes;
          });
        }
      },
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

  IconData _getRepeatIcon(RepeatFrequency frequency) {
    switch (frequency) {
      case RepeatFrequency.once:
        return Icons.looks_one;
      case RepeatFrequency.daily:
        return Icons.calendar_view_day;
      case RepeatFrequency.weekly:
        return Icons.calendar_view_week;
      case RepeatFrequency.monthly:
        return Icons.calendar_view_month;
      case RepeatFrequency.custom:
        return Icons.edit;
    }
  }

  Future<void> _selectTime() async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );

    if (picked != null) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime(2030),
    );

    if (picked != null) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  void _submitForm() {
    if (_formKey.currentState?.validate() ?? false) {
      if (_selectedFrequency == RepeatFrequency.once && _selectedDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('请选择提醒日期'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      final reminderTime = '${_selectedTime.hour.toString().padLeft(2, '0')}:'
          '${_selectedTime.minute.toString().padLeft(2, '0')}';

      final data = <String, dynamic>{
        'title': _titleController.text.trim(),
        if (_descriptionController.text.isNotEmpty)
          'description': _descriptionController.text.trim(),
        'type': _selectedType.name,
        'repeatFrequency': _selectedFrequency.name,
        if (_selectedFrequency == RepeatFrequency.weekly && _selectedWeekDays.isNotEmpty)
          'repeatDays': _selectedWeekDays.map(int.parse).toList(),
        'reminderTime': reminderTime,
        'advanceNoticeMinutes': _advanceNoticeMinutes,
        if (_selectedDate != null)
          'startDate': _selectedDate!.toIso8601String(),
      };

      context.read<ReminderBloc>().add(ReminderCreate(data));
    }
  }
}
