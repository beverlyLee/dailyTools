import 'package:equatable/equatable.dart';
import '../../models/medicine.dart';

abstract class MedicineEvent extends Equatable {
  const MedicineEvent();

  @override
  List<Object> get props => [];
}

class MedicineLoadAll extends MedicineEvent {
  final String? status;
  final bool? isFavorite;
  final String? search;
  final String? tag;

  const MedicineLoadAll({
    this.status,
    this.isFavorite,
    this.search,
    this.tag,
  });

  @override
  List<Object> get props => [
    status ?? '',
    isFavorite ?? false,
    search ?? '',
    tag ?? '',
  ];
}

class MedicineLoad extends MedicineEvent {
  final String id;

  const MedicineLoad(this.id);

  @override
  List<Object> get props => [id];
}

class MedicineCreate extends MedicineEvent {
  final Map<String, dynamic> data;

  const MedicineCreate(this.data);

  @override
  List<Object> get props => [data];
}

class MedicineUpdate extends MedicineEvent {
  final String id;
  final Map<String, dynamic> data;

  const MedicineUpdate({
    required this.id,
    required this.data,
  });

  @override
  List<Object> get props => [id, data];
}

class MedicineDelete extends MedicineEvent {
  final String id;

  const MedicineDelete(this.id);

  @override
  List<Object> get props => [id];
}

class MedicineDose extends MedicineEvent {
  final String id;
  final double quantity;
  final String? notes;

  const MedicineDose({
    required this.id,
    required this.quantity,
    this.notes,
  });

  @override
  List<Object> get props => [id, quantity, notes ?? ''];
}

class MedicineToggleFavorite extends MedicineEvent {
  final String id;

  const MedicineToggleFavorite(this.id);

  @override
  List<Object> get props => [id];
}

class MedicineScanBarcode extends MedicineEvent {
  final String barcode;

  const MedicineScanBarcode(this.barcode);

  @override
  List<Object> get props => [barcode];
}

class MedicineRecognizeExpiry extends MedicineEvent {
  final String imageBase64;

  const MedicineRecognizeExpiry(this.imageBase64);

  @override
  List<Object> get props => [imageBase64];
}

class MedicineLoadExpiring extends MedicineEvent {
  final int days;

  const MedicineLoadExpiring({this.days = 7});

  @override
  List<Object> get props => [days];
}

class MedicineLoadLowStock extends MedicineEvent {
  final double threshold;

  const MedicineLoadLowStock({this.threshold = 0.3});

  @override
  List<Object> get props => [threshold];
}

class MedicineLoadExpired extends MedicineEvent {}
