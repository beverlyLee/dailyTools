import 'package:intl/intl.dart';

class Reminder {
  final int id;
  final RentalContract? contract;
  final String? user;
  final String reminderType;
  final String title;
  final String? message;
  final DateTime scheduledDate;
  final DateTime scheduledTime;
  final List<String> channels;
  final bool isRecurring;
  final String? recurringPattern;
  final bool isSent;
  final DateTime? sentAt;
  final bool isRead;
  final DateTime? readAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Reminder({
    required this.id,
    this.contract,
    this.user,
    required this.reminderType,
    required this.title,
    this.message,
    required this.scheduledDate,
    required this.scheduledTime,
    required this.channels,
    required this.isRecurring,
    this.recurringPattern,
    required this.isSent,
    this.sentAt,
    required this.isRead,
    this.readAt,
    this.createdAt,
    this.updatedAt,
  });

  factory Reminder.fromJson(Map<String, dynamic> json) {
    return Reminder(
      id: json['id'],
      contract: json['contract'] != null
          ? RentalContract.fromJson(json['contract'])
          : null,
      user: json['user'],
      reminderType: json['reminder_type'],
      title: json['title'],
      message: json['message'],
      scheduledDate: DateTime.parse(json['scheduled_date']),
      scheduledTime: _parseTime(json['scheduled_time']),
      channels: List<String>.from(json['channels'] ?? []),
      isRecurring: json['is_recurring'],
      recurringPattern: json['recurring_pattern'],
      isSent: json['is_sent'],
      sentAt: json['sent_at'] != null
          ? DateTime.parse(json['sent_at'])
          : null,
      isRead: json['is_read'],
      readAt: json['read_at'] != null
          ? DateTime.parse(json['read_at'])
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  static DateTime _parseTime(String timeStr) {
    try {
      final parts = timeStr.split(':');
      final now = DateTime.now();
      return DateTime(
        now.year,
        now.month,
        now.day,
        int.parse(parts[0]),
        int.parse(parts[1]),
        parts.length > 2 ? int.parse(parts[2].split('.')[0]) : 0,
      );
    } catch (e) {
      return DateTime.now();
    }
  }

  String get reminderTypeDisplay {
    const Map<String, String> types = {
      'contract_expiry': '合同到期提醒',
      'rent_payment': '租金支付提醒',
      'billing_due': '账单到期提醒',
      'custom': '自定义提醒',
    };
    return types[reminderType] ?? reminderType;
  }

  String get formattedScheduledDate {
    return DateFormat('yyyy年MM月dd日').format(scheduledDate);
  }

  String get formattedScheduledTime {
    return DateFormat('HH:mm').format(scheduledTime);
  }

  bool get isUrgent {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final scheduled = DateTime(
      scheduledDate.year,
      scheduledDate.month,
      scheduledDate.day,
    );
    final difference = scheduled.difference(today).inDays;
    return difference <= 1;
  }

  String get timeUntilScheduled {
    final now = DateTime.now();
    final scheduled = DateTime(
      scheduledDate.year,
      scheduledDate.month,
      scheduledDate.day,
      scheduledTime.hour,
      scheduledTime.minute,
    );
    final difference = scheduled.difference(now);
    
    if (difference.isNegative) {
      return '已过期';
    }
    
    final days = difference.inDays;
    final hours = difference.inHours % 24;
    final minutes = difference.inMinutes % 60;
    
    if (days > 0) {
      return '$days天$hours小时';
    } else if (hours > 0) {
      return '$hours小时$minutes分钟';
    } else {
      return '$minutes分钟';
    }
  }
}

class ReminderLog {
  final int id;
  final Reminder? reminder;
  final String channel;
  final String status;
  final String recipient;
  final String? messageContent;
  final String? errorMessage;
  final DateTime? createdAt;
  final DateTime? processedAt;

  ReminderLog({
    required this.id,
    this.reminder,
    required this.channel,
    required this.status,
    required this.recipient,
    this.messageContent,
    this.errorMessage,
    this.createdAt,
    this.processedAt,
  });

  factory ReminderLog.fromJson(Map<String, dynamic> json) {
    return ReminderLog(
      id: json['id'],
      channel: json['channel'],
      status: json['status'],
      recipient: json['recipient'],
      messageContent: json['message_content'],
      errorMessage: json['error_message'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      processedAt: json['processed_at'] != null
          ? DateTime.parse(json['processed_at'])
          : null,
    );
  }

  String get channelDisplay {
    const Map<String, String> channels = {
      'app': '应用内通知',
      'sms': '短信',
      'email': '邮件',
    };
    return channels[channel] ?? channel;
  }

  String get statusDisplay {
    const Map<String, String> statuses = {
      'pending': '待发送',
      'sent': '已发送',
      'failed': '发送失败',
      'read': '已阅读',
    };
    return statuses[status] ?? status;
  }
}
