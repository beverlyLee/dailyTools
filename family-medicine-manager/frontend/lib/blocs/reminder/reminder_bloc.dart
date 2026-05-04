import 'package:bloc/bloc.dart';

import 'reminder_event.dart';
import 'reminder_state.dart';
import '../../repositories/reminder_repository.dart';

class ReminderBloc extends Bloc<ReminderEvent, ReminderState> {
  final ReminderRepository _reminderRepository;

  ReminderBloc({
    required ReminderRepository reminderRepository,
  })  : _reminderRepository = reminderRepository,
        super(ReminderInitial()) {
    on<ReminderLoadAll>(_onReminderLoadAll);
    on<ReminderLoad>(_onReminderLoad);
    on<ReminderCreate>(_onReminderCreate);
    on<ReminderUpdate>(_onReminderUpdate);
    on<ReminderDelete>(_onReminderDelete);
    on<ReminderDismiss>(_onReminderDismiss);
    on<ReminderToggle>(_onReminderToggle);
    on<ReminderLoadUpcoming>(_onReminderLoadUpcoming);
  }

  Future<void> _onReminderLoadAll(
    ReminderLoadAll event,
    Emitter<ReminderState> emit,
  ) async {
    emit(ReminderLoading());
    try {
      final reminders = await _reminderRepository.getReminders(
        status: event.status,
        type: event.type,
        medicineId: event.medicineId,
      );
      emit(ReminderLoaded(reminders));
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onReminderLoad(
    ReminderLoad event,
    Emitter<ReminderState> emit,
  ) async {
    emit(ReminderLoading());
    try {
      final reminder = await _reminderRepository.getReminder(event.id);
      emit(ReminderDetailLoaded(reminder));
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onReminderCreate(
    ReminderCreate event,
    Emitter<ReminderState> emit,
  ) async {
    emit(ReminderLoading());
    try {
      final reminder = await _reminderRepository.createReminder(event.data);
      emit(ReminderCreated(reminder));
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onReminderUpdate(
    ReminderUpdate event,
    Emitter<ReminderState> emit,
  ) async {
    emit(ReminderLoading());
    try {
      final reminder = await _reminderRepository.updateReminder(
        event.id,
        event.data,
      );
      emit(ReminderUpdated(reminder));
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onReminderDelete(
    ReminderDelete event,
    Emitter<ReminderState> emit,
  ) async {
    emit(ReminderLoading());
    try {
      await _reminderRepository.deleteReminder(event.id);
      emit(ReminderDeleted());
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onReminderDismiss(
    ReminderDismiss event,
    Emitter<ReminderState> emit,
  ) async {
    try {
      final reminder = await _reminderRepository.dismissReminder(event.id);
      emit(ReminderDismissed(reminder));
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onReminderToggle(
    ReminderToggle event,
    Emitter<ReminderState> emit,
  ) async {
    try {
      final reminder = await _reminderRepository.toggleReminder(event.id);
      emit(ReminderToggled(reminder));
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onReminderLoadUpcoming(
    ReminderLoadUpcoming event,
    Emitter<ReminderState> emit,
  ) async {
    try {
      final reminders = await _reminderRepository.getUpcomingReminders(
        limit: event.limit,
      );
      emit(ReminderUpcomingLoaded(
        reminders: reminders,
        limit: event.limit,
      ));
    } catch (e) {
      emit(ReminderError(e.toString().replaceAll('Exception: ', '')));
    }
  }
}
