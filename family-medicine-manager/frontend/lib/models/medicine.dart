import 'package:json_annotation/json_annotation.dart';

part 'medicine.g.dart';

enum MedicineStatus {
  @JsonValue('in_stock')
  inStock,
  @JsonValue('low_stock')
  lowStock,
  @JsonValue('expired')
  expired,
  @JsonValue('used_up')
  usedUp,
}

enum StorageCondition {
  @JsonValue('room_temp')
  roomTemp,
  @JsonValue('refrigerated')
  refrigerated,
  @JsonValue('frozen')
  frozen,
  @JsonValue('dark')
  dark,
}

@JsonSerializable()
class Medicine {
  final String id;
  final String name;
  final String? genericName;
  final String? brand;
  final String? barcode;
  final String? dosageForm;
  final String? strength;
  final double quantity;
  final String unit;
  final double? totalQuantity;
  final double? remainingQuantity;
  final DateTime? productionDate;
  final DateTime? expiryDate;
  final String? batchNumber;
  final StorageCondition storageCondition;
  final MedicineStatus status;
  final String? usageInstructions;
  final String? indications;
  final String? contraindications;
  final String? sideEffects;
  final String? notes;
  final String? purchaseLocation;
  final DateTime? purchaseDate;
  final double? purchasePrice;
  final bool isPrescription;
  final String? prescribingDoctor;
  final String? prescriptionNumber;
  final List<String>? tags;
  final List<String>? images;
  final bool isFavorite;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String userId;

  Medicine({
    required this.id,
    required this.name,
    this.genericName,
    this.brand,
    this.barcode,
    this.dosageForm,
    this.strength,
    this.quantity = 1.0,
    this.unit = '盒',
    this.totalQuantity,
    this.remainingQuantity,
    this.productionDate,
    this.expiryDate,
    this.batchNumber,
    this.storageCondition = StorageCondition.roomTemp,
    this.status = MedicineStatus.inStock,
    this.usageInstructions,
    this.indications,
    this.contraindications,
    this.sideEffects,
    this.notes,
    this.purchaseLocation,
    this.purchaseDate,
    this.purchasePrice,
    this.isPrescription = false,
    this.prescribingDoctor,
    this.prescriptionNumber,
    this.tags,
    this.images,
    this.isFavorite = false,
    this.createdAt,
    this.updatedAt,
    required this.userId,
  });

  String get displayQuantity => '${remainingQuantity ?? quantity} $unit';

  int get daysUntilExpiry {
    if (expiryDate == null) return -1;
    return expiryDate!.difference(DateTime.now()).inDays;
  }

  bool get isExpired => status == MedicineStatus.expired;
  bool get isLowStock => status == MedicineStatus.lowStock;
  bool get isUsedUp => status == MedicineStatus.usedUp;

  factory Medicine.fromJson(Map<String, dynamic> json) => _$MedicineFromJson(json);

  Map<String, dynamic> toJson() => _$MedicineToJson(this);
}

@JsonSerializable()
class MedicineDictionary {
  final String id;
  final String barcode;
  final String name;
  final String? genericName;
  final String? brand;
  final String? dosageForm;
  final String? strength;
  final String? manufacturer;
  final String? approvalNumber;
  final String? usageInstructions;
  final String? indications;
  final String? contraindications;
  final String? sideEffects;
  final String? precautions;
  final List<String>? categories;
  final String? imageUrl;
  final bool isVerified;
  final String? source;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  MedicineDictionary({
    required this.id,
    required this.barcode,
    required this.name,
    this.genericName,
    this.brand,
    this.dosageForm,
    this.strength,
    this.manufacturer,
    this.approvalNumber,
    this.usageInstructions,
    this.indications,
    this.contraindications,
    this.sideEffects,
    this.precautions,
    this.categories,
    this.imageUrl,
    this.isVerified = true,
    this.source,
    this.createdAt,
    this.updatedAt,
  });

  factory MedicineDictionary.fromJson(Map<String, dynamic> json) =>
      _$MedicineDictionaryFromJson(json);

  Map<String, dynamic> toJson() => _$MedicineDictionaryToJson(this);
}
