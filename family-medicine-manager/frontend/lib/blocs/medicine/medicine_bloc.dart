import 'package:bloc/bloc.dart';

import 'medicine_event.dart';
import 'medicine_state.dart';
import '../../repositories/medicine_repository.dart';
import '../../models/medicine.dart';

class MedicineBloc extends Bloc<MedicineEvent, MedicineState> {
  final MedicineRepository _medicineRepository;

  MedicineBloc({
    required MedicineRepository medicineRepository,
  })  : _medicineRepository = medicineRepository,
        super(MedicineInitial()) {
    on<MedicineLoadAll>(_onMedicineLoadAll);
    on<MedicineLoad>(_onMedicineLoad);
    on<MedicineCreate>(_onMedicineCreate);
    on<MedicineUpdate>(_onMedicineUpdate);
    on<MedicineDelete>(_onMedicineDelete);
    on<MedicineDose>(_onMedicineDose);
    on<MedicineToggleFavorite>(_onMedicineToggleFavorite);
    on<MedicineScanBarcode>(_onMedicineScanBarcode);
    on<MedicineRecognizeExpiry>(_onMedicineRecognizeExpiry);
    on<MedicineLoadExpiring>(_onMedicineLoadExpiring);
    on<MedicineLoadLowStock>(_onMedicineLoadLowStock);
    on<MedicineLoadExpired>(_onMedicineLoadExpired);
  }

  Future<void> _onMedicineLoadAll(
    MedicineLoadAll event,
    Emitter<MedicineState> emit,
  ) async {
    emit(MedicineLoading());
    try {
      final medicines = await _medicineRepository.getMedicines(
        status: event.status,
        isFavorite: event.isFavorite,
        search: event.search,
        tag: event.tag,
      );
      emit(MedicineLoaded(medicines));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineLoad(
    MedicineLoad event,
    Emitter<MedicineState> emit,
  ) async {
    emit(MedicineLoading());
    try {
      final medicine = await _medicineRepository.getMedicine(event.id);
      emit(MedicineDetailLoaded(medicine));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineCreate(
    MedicineCreate event,
    Emitter<MedicineState> emit,
  ) async {
    emit(MedicineLoading());
    try {
      final medicine = await _medicineRepository.createMedicine(event.data);
      emit(MedicineCreated(medicine));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineUpdate(
    MedicineUpdate event,
    Emitter<MedicineState> emit,
  ) async {
    emit(MedicineLoading());
    try {
      final medicine = await _medicineRepository.updateMedicine(
        event.id,
        event.data,
      );
      emit(MedicineUpdated(medicine));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineDelete(
    MedicineDelete event,
    Emitter<MedicineState> emit,
  ) async {
    emit(MedicineLoading());
    try {
      await _medicineRepository.deleteMedicine(event.id);
      emit(MedicineDeleted());
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineDose(
    MedicineDose event,
    Emitter<MedicineState> emit,
  ) async {
    try {
      final medicine = await _medicineRepository.doseMedicine(
        event.id,
        event.quantity,
        notes: event.notes,
      );
      emit(MedicineDosed(medicine));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineToggleFavorite(
    MedicineToggleFavorite event,
    Emitter<MedicineState> emit,
  ) async {
    try {
      final medicine = await _medicineRepository.toggleFavorite(event.id);
      emit(MedicineUpdated(medicine));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineScanBarcode(
    MedicineScanBarcode event,
    Emitter<MedicineState> emit,
  ) async {
    emit(MedicineLoading());
    try {
      final result = await _medicineRepository.scanBarcode(event.barcode);
      
      MedicineDictionary? medicineInfo;
      if (result['medicine'] != null) {
        medicineInfo = MedicineDictionary.fromJson(result['medicine']);
      }
      
      emit(MedicineBarcodeScanned(
        result: result,
        medicineInfo: medicineInfo,
      ));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineRecognizeExpiry(
    MedicineRecognizeExpiry event,
    Emitter<MedicineState> emit,
  ) async {
    emit(MedicineLoading());
    try {
      final result = await _medicineRepository.recognizeExpiryDate(
        event.imageBase64,
      );
      
      DateTime? expiryDate;
      if (result['expiryDates'] != null && result['expiryDates'].isNotEmpty) {
        final dateStr = result['expiryDates'][0];
        expiryDate = DateTime.tryParse(dateStr);
      }
      
      emit(MedicineExpiryRecognized(
        result: result,
        expiryDate: expiryDate,
      ));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineLoadExpiring(
    MedicineLoadExpiring event,
    Emitter<MedicineState> emit,
  ) async {
    try {
      final medicines = await _medicineRepository.getExpiringMedicines(
        days: event.days,
      );
      emit(MedicineExpiringLoaded(
        medicines: medicines,
        days: event.days,
      ));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineLoadLowStock(
    MedicineLoadLowStock event,
    Emitter<MedicineState> emit,
  ) async {
    try {
      final medicines = await _medicineRepository.getLowStockMedicines(
        threshold: event.threshold,
      );
      emit(MedicineLowStockLoaded(
        medicines: medicines,
        threshold: event.threshold,
      ));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onMedicineLoadExpired(
    MedicineLoadExpired event,
    Emitter<MedicineState> emit,
  ) async {
    try {
      final medicines = await _medicineRepository.getExpiredMedicines();
      emit(MedicineExpiredLoaded(medicines));
    } catch (e) {
      emit(MedicineError(e.toString().replaceAll('Exception: ', '')));
    }
  }
}
