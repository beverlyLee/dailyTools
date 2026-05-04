import 'package:intl/intl.dart';

class RentalContract {
  final int id;
  final String contractNumber;
  final Property? property;
  final User? landlord;
  final Tenant? tenant;
  final DateTime startDate;
  final DateTime endDate;
  final double monthlyRent;
  final double deposit;
  final String paymentMethod;
  final int paymentDay;
  final bool utilitiesIncluded;
  final double waterPrice;
  final double electricityPrice;
  final double? gasPrice;
  final String status;
  final String? terms;
  final String? notes;
  final int? daysRemaining;
  final bool? isExpiringSoon;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  RentalContract({
    required this.id,
    required this.contractNumber,
    this.property,
    this.landlord,
    this.tenant,
    required this.startDate,
    required this.endDate,
    required this.monthlyRent,
    required this.deposit,
    required this.paymentMethod,
    required this.paymentDay,
    required this.utilitiesIncluded,
    required this.waterPrice,
    required this.electricityPrice,
    this.gasPrice,
    required this.status,
    this.terms,
    this.notes,
    this.daysRemaining,
    this.isExpiringSoon,
    this.createdAt,
    this.updatedAt,
  });

  factory RentalContract.fromJson(Map<String, dynamic> json) {
    return RentalContract(
      id: json['id'],
      contractNumber: json['contract_number'],
      property: json['property'] != null
          ? Property.fromJson(json['property'])
          : null,
      landlord: json['landlord'] != null
          ? User.fromJson(json['landlord'])
          : null,
      tenant: json['tenant'] != null
          ? Tenant.fromJson(json['tenant'])
          : null,
      startDate: DateTime.parse(json['start_date']),
      endDate: DateTime.parse(json['end_date']),
      monthlyRent: (json['monthly_rent'] as num).toDouble(),
      deposit: (json['deposit'] as num).toDouble(),
      paymentMethod: json['payment_method'],
      paymentDay: json['payment_day'],
      utilitiesIncluded: json['utilities_included'],
      waterPrice: (json['water_price'] as num).toDouble(),
      electricityPrice: (json['electricity_price'] as num).toDouble(),
      gasPrice: json['gas_price'] != null
          ? (json['gas_price'] as num).toDouble()
          : null,
      status: json['status'],
      terms: json['terms'],
      notes: json['notes'],
      daysRemaining: json['days_remaining'],
      isExpiringSoon: json['is_expiring_soon'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'property_id': property?.id,
      'landlord_id': landlord?.id,
      'tenant_id': tenant?.id,
      'start_date': DateFormat('yyyy-MM-dd').format(startDate),
      'end_date': DateFormat('yyyy-MM-dd').format(endDate),
      'monthly_rent': monthlyRent,
      'deposit': deposit,
      'payment_method': paymentMethod,
      'payment_day': paymentDay,
      'utilities_included': utilitiesIncluded,
      'water_price': waterPrice,
      'electricity_price': electricityPrice,
      'gas_price': gasPrice,
      'status': status,
      'terms': terms,
      'notes': notes,
    };
  }

  String get statusDisplay {
    const Map<String, String> statuses = {
      'draft': '草稿',
      'active': '有效',
      'expired': '已到期',
      'terminated': '已终止',
    };
    return statuses[status] ?? status;
  }

  String get displayText {
    return '$contractNumber - ${property?.name ?? ''}';
  }

  String get formattedStartDate {
    return DateFormat('yyyy年MM月dd日').format(startDate);
  }

  String get formattedEndDate {
    return DateFormat('yyyy年MM月dd日').format(endDate);
  }

  String get formattedMonthlyRent {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(monthlyRent);
  }

  String get formattedDeposit {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(deposit);
  }

  int get calculatedDaysRemaining {
    if (daysRemaining != null) {
      return daysRemaining!;
    }
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final end = DateTime(endDate.year, endDate.month, endDate.day);
    final difference = end.difference(today).inDays;
    return difference > 0 ? difference : 0;
  }

  bool get calculatedIsExpiringSoon {
    if (isExpiringSoon != null) {
      return isExpiringSoon!;
    }
    return status == 'active' && calculatedDaysRemaining <= 30;
  }

  String get contractDuration {
    final difference = endDate.difference(startDate);
    final months = (difference.inDays / 30).round();
    return '$months个月';
  }
}
