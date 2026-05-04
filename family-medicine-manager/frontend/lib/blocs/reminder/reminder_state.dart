import 'package:equatable/equatable.dart';
import '../../models/reminder.dart';

abstract class ReminderState extends Equatable {
  const ReminderState();

  @override
  List<Object> get props => [];
}

class ReminderInitial extends ReminderState {}

class ReminderLoading extends ReminderState {}

class ReminderLoaded extends ReminderState {
  final List<Reminder> reminders;

  const ReminderLoaded(this.reminders);

  @override
  List<Object> get props => [reminders];
}

class ReminderDetailLoaded extends ReminderState {
  final Reminder reminder;

  const ReminderDetailLoaded(this.reminder);

  @override
  List<Object> get props => [reminder];
}

class ReminderCreated extends ReminderState {
  final Reminder reminder;

  const ReminderCreated(this.reminder);

  @override
  List<Object> get props => [reminder];
}

class ReminderUpdated extends ReminderState {
  final Reminder reminder;

  const ReminderUpdated(this.reminder);

  @override
  List<Object> get props => [reminder];
}

class ReminderDeleted extends ReminderState {}

class ReminderDismissed extends ReminderState {
  final Reminder reminder;

  const ReminderDismissed(this.reminder);

  @override
  List<Object> get props => [reminder];
}

class ReminderToggled extends ReminderState {
  final Reminder reminder;

  const ReminderToggled(this.reminder);

  @override
  List<Object> get props => [reminder];
}

class ReminderUpcomingLoaded extends ReminderState {
  final List<Reminder> reminders;
  final int limit;

  const ReminderUpcomingLoaded({
    required this.reminders,
    required this.limit,
  });

  @override
  List<Object> get props => [reminders, limit];
}

class ReminderError extends ReminderState {
  final String message;

  const ReminderError(this.message);

  @override
  List<Object> get props => [message];
}
