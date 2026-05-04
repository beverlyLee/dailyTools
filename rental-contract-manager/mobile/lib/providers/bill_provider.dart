import 'package:flutter/foundation.dart';
import 'package:rental_contract_manager/models/bill.dart';
import 'package:rental_contract_manager/services/api_service.dart';

class BillProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Bill> _bills = [];
  List<Bill> _pendingBills = [];
  List<Bill> _paidBills = [];
  List<Bill> _overdueBills = [];
  List<Bill> _upcomingBills = [];

  bool _isLoading = false;
  String? _errorMessage;

  List<Bill> get bills => List.unmodifiable(_bills);
  List<Bill> get pendingBills => List.unmodifiable(_pendingBills);
  List<Bill> get paidBills => List.unmodifiable(_paidBills);
  List<Bill> get overdueBills => List.unmodifiable(_overdueBills);
  List<Bill> get upcomingBills => List.unmodifiable(_upcomingBills);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  double get totalPendingAmount {
    return _pendingBills.fold<double>(0, (sum, bill) => sum + bill.remainingAmount);
  }

  double get totalOverdueAmount {
    return _overdueBills.fold<double>(0, (sum, bill) => sum + bill.remainingAmount);
  }

  int get pendingCount => _pendingBills.length;
  int get overdueCount => _overdueBills.length;
  int get upcomingCount => _upcomingBills.length;

  Future<void> fetchBills({
    String? status,
    String? billType,
    int? contractId,
    int? page,
    int? pageSize,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _bills = await _apiService.getBills(
        status: status,
        billType: billType,
        contractId: contractId,
        page: page,
        pageSize: pageSize,
      );
      _categorizeBills();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchOverdueBills() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _overdueBills = await _apiService.getOverdueBills();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchUpcomingBills() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _upcomingBills = await _apiService.getUpcomingBills();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Bill?> fetchBill(int id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final bill = await _apiService.getBill(id);
      _isLoading = false;
      notifyListeners();
      return bill;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<Bill?> createBill(Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final bill = await _apiService.createBill(data);
      _bills.insert(0, bill);
      _categorizeBills();
      _isLoading = false;
      notifyListeners();
      return bill;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> createSplits(int billId, Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.createBillSplits(billId, data);
      await fetchBills();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> makePayment(int billId, Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.makePayment(billId, data);
      await fetchBills();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  void _categorizeBills() {
    _pendingBills = _bills
        .where((bill) =>
            bill.status == 'pending' || bill.status == 'partially_paid')
        .toList();

    _paidBills = _bills.where((bill) => bill.status == 'paid').toList();

    _overdueBills = _bills.where((bill) => bill.isOverdue).toList();

    _upcomingBills = _bills
        .where((bill) =>
            bill.status != 'paid' &&
            bill.status != 'cancelled' &&
            bill.daysUntilDue >= 0 &&
            bill.daysUntilDue <= 7)
        .toList();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

class BillSplitCalculator {
  static List<BillSplitResult> calculateEqualSplit({
    required double totalAmount,
    required int tenantCount,
  }) {
    if (tenantCount <= 0) return [];

    final baseAmount = (totalAmount / tenantCount).floorToDouble();
    final remainder = totalAmount - baseAmount * tenantCount;

    final List<BillSplitResult> results = [];
    for (int i = 0; i < tenantCount; i++) {
      final amount = baseAmount + (i < remainder ? 1 : 0);
      results.add(BillSplitResult(
        index: i,
        amount: amount,
        proportion: (100 / tenantCount),
        splitMethod: 'equal',
      ));
    }

    return results;
  }

  static List<BillSplitResult> calculateProportionalSplit({
    required double totalAmount,
    required List<double> proportions,
  }) {
    final totalProportion = proportions.fold<double>(0, (sum, p) => sum + p);
    if (totalProportion == 0) return [];

    final List<BillSplitResult> results = [];
    double distributedAmount = 0;

    for (int i = 0; i < proportions.length; i++) {
      final proportion = proportions[i];
      final percentage = (proportion / totalProportion) * 100;
      final amount = (totalAmount * proportion) / totalProportion;

      if (i == proportions.length - 1) {
        final remaining = totalAmount - distributedAmount;
        results.add(BillSplitResult(
          index: i,
          amount: remaining,
          proportion: percentage,
          splitMethod: 'proportion',
        ));
      } else {
        distributedAmount += amount;
        results.add(BillSplitResult(
          index: i,
          amount: amount,
          proportion: percentage,
          splitMethod: 'proportion',
        ));
      }
    }

    return results;
  }

  static List<BillSplitResult> calculateCustomSplit({
    required List<double> amounts,
    required double totalAmount,
  }) {
    final sum = amounts.fold<double>(0, (total, amount) => total + amount);
    
    if ((sum - totalAmount).abs() > 0.01) {
      throw ArgumentError('分摊金额之和不等于总金额');
    }

    final List<BillSplitResult> results = [];
    for (int i = 0; i < amounts.length; i++) {
      results.add(BillSplitResult(
        index: i,
        amount: amounts[i],
        proportion: totalAmount > 0 ? (amounts[i] / totalAmount) * 100 : 0,
        splitMethod: 'custom',
      ));
    }

    return results;
  }

  static double calculateUtilityBill({
    required double previousReading,
    required double currentReading,
    required double unitPrice,
    double? fixedFee,
  }) {
    if (currentReading < previousReading) {
      throw ArgumentError('当前读数不能小于上期读数');
    }

    final usage = currentReading - previousReading;
    final usageCost = usage * unitPrice;
    final totalCost = usageCost + (fixedFee ?? 0);

    return totalCost;
  }
}

class BillSplitResult {
  final int index;
  final double amount;
  final double proportion;
  final String splitMethod;
  int? tenantId;
  String? tenantName;

  BillSplitResult({
    required this.index,
    required this.amount,
    required this.proportion,
    required this.splitMethod,
    this.tenantId,
    this.tenantName,
  });

  String get formattedAmount {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(amount);
  }

  String get formattedProportion {
    return '${proportion.toStringAsFixed(1)}%';
  }

  String get splitMethodDisplay {
    const Map<String, String> methods = {
      'equal': '平均分摊',
      'proportion': '按比例分摊',
      'custom': '自定义分摊',
    };
    return methods[splitMethod] ?? splitMethod;
  }
}
