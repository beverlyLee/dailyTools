import 'package:equatable/equatable.dart';
import '../../models/reminder.dart';

abstract class ReminderEvent extends Equatable {
  const ReminderEvent();

  @override
  List<Object> get props => [];
}

class ReminderLoadAll extends ReminderEvent {
  final String? status;
  final String? type;
  final String? medicineId;

  const ReminderLoadAll({
    this.status,
    this.type,
    this.medicineId,
  });

  @override
  List<Object> get props => [
    status ?? '',
    type ?? '',
    medicineId ?? '',
  ];
}

class ReminderLoad extends ReminderEvent {
  final String id;

  const ReminderLoad(this.id);

  @override
  List<Object> get props => [id];
}

class ReminderCreate extends ReminderEvent {
  final Map<String, dynamic> data;

  const ReminderCreate(this.data);

  @override
  List<Object> get props => [data];
}

class ReminderUpdate extends ReminderEvent {
  final String id;
  final Map<String, dynamic> data;

  const ReminderUpdate({
    required this.id,
    required this.data,
  });

  @override
  List<Object> get props => [id, data];
}

class ReminderDelete extends ReminderEvent {
  final String id;

  const ReminderDelete(this.id);

  @override
  List<Object> get props => [id];
}

class ReminderDismiss extends ReminderEvent {
  final String id;

  const ReminderDismiss(this.id);

  @override
  List<Object> get props => [id];
}

class ReminderToggle extends ReminderEvent {
  final String id;

  const ReminderToggle(this.id);

  @override
  List<Object> get props => [id];
}

class ReminderLoadUpcoming extends ReminderEvent {
  final int limit;

  const ReminderLoadUpcoming({this.limit = 10});

  @override
  List<Object> get props => [limit];
}
