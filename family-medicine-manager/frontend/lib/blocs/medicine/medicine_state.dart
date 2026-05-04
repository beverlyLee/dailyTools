import 'package:equatable/equatable.dart';
import '../../models/medicine.dart';

abstract class MedicineState extends Equatable {
  const MedicineState();

  @override
  List<Object> get props => [];
}

class MedicineInitial extends MedicineState {}

class MedicineLoading extends MedicineState {}

class MedicineLoaded extends MedicineState {
  final List<Medicine> medicines;

  const MedicineLoaded(this.medicines);

  @override
  List<Object> get props => [medicines];
}

class MedicineDetailLoaded extends MedicineState {
  final Medicine medicine;

  const MedicineDetailLoaded(this.medicine);

  @override
  List<Object> get props => [medicine];
}

class MedicineCreated extends MedicineState {
  final Medicine medicine;

  const MedicineCreated(this.medicine);

  @override
  List<Object> get props => [medicine];
}

class MedicineUpdated extends MedicineState {
  final Medicine medicine;

  const MedicineUpdated(this.medicine);

  @override
  List<Object> get props => [medicine];
}

class MedicineDeleted extends MedicineState {}

class MedicineDosed extends MedicineState {
  final Medicine medicine;

  const MedicineDosed(this.medicine);

  @override
  List<Object> get props => [medicine];
}

class MedicineBarcodeScanned extends MedicineState {
  final Map<String, dynamic> result;
  final MedicineDictionary? medicineInfo;

  const MedicineBarcodeScanned({
    required this.result,
    this.medicineInfo,
  });

  @override
  List<Object> get props => [result, medicineInfo ?? ''];
}

class MedicineExpiryRecognized extends MedicineState {
  final Map<String, dynamic> result;
  final DateTime? expiryDate;

  const MedicineExpiryRecognized({
    required this.result,
    this.expiryDate,
  });

  @override
  List<Object> get props => [result, expiryDate ?? ''];
}

class MedicineExpiringLoaded extends MedicineState {
  final List<Medicine> medicines;
  final int days;

  const MedicineExpiringLoaded({
    required this.medicines,
    required this.days,
  });

  @override
  List<Object> get props => [medicines, days];
}

class MedicineLowStockLoaded extends MedicineState {
  final List<Medicine> medicines;
  final double threshold;

  const MedicineLowStockLoaded({
    required this.medicines,
    required this.threshold,
  });

  @override
  List<Object> get props => [medicines, threshold];
}

class MedicineExpiredLoaded extends MedicineState {
  final List<Medicine> medicines;

  const MedicineExpiredLoaded(this.medicines);

  @override
  List<Object> get props => [medicines];
}

class MedicineError extends MedicineState {
  final String message;

  const MedicineError(this.message);

  @override
  List<Object> get props => [message];
}
