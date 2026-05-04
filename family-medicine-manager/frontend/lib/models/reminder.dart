import 'package:json_annotation/json_annotation.dart';

part 'reminder.g.dart';

enum ReminderType {
  @JsonValue('dosage')
  dosage,
  @JsonValue('expiry')
  expiry,
  @JsonValue('low_stock')
  lowStock,
  @JsonValue('custom')
  custom,
}

enum ReminderStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('active')
  active,
  @JsonValue('triggered')
  triggered,
  @JsonValue('dismissed')
  dismissed,
  @JsonValue('disabled')
  disabled,
}

enum RepeatFrequency {
  @JsonValue('once')
  once,
  @JsonValue('daily')
  daily,
  @JsonValue('weekly')
  weekly,
  @JsonValue('monthly')
  monthly,
  @JsonValue('custom')
  custom,
}

@JsonSerializable()
class Reminder {
  final String id;
  final String title;
  final String? description;
  final ReminderType type;
  final ReminderStatus status;
  final RepeatFrequency repeatFrequency;
  final List<int>? repeatDays;
  final DateTime startDate;
  final DateTime? endDate;
  final String reminderTime;
  final List<String>? additionalTimes;
  final int advanceNoticeMinutes;
  final List<String>? notificationChannels;
  final Map<String, dynamic>? payload;
  final DateTime? lastTriggeredAt;
  final DateTime? nextTriggerAt;
  final int triggerCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String userId;
  final String? medicineId;

  Reminder({
    required this.id,
    required this.title,
    this.description,
    this.type = ReminderType.dosage,
    this.status = ReminderStatus.active,
    this.repeatFrequency = RepeatFrequency.once,
    this.repeatDays,
    required this.startDate,
    this.endDate,
    required this.reminderTime,
    this.additionalTimes,
    this.advanceNoticeMinutes = 0,
    this.notificationChannels,
    this.payload,
    this.lastTriggeredAt,
    this.nextTriggerAt,
    this.triggerCount = 0,
    this.createdAt,
    this.updatedAt,
    required this.userId,
    this.medicineId,
  });

  bool get isActive => status == ReminderStatus.active;
  bool get isRepeating => repeatFrequency != RepeatFrequency.once;

  factory Reminder.fromJson(Map<String, dynamic> json) => _$ReminderFromJson(json);

  Map<String, dynamic> toJson() => _$ReminderToJson(this);
}
