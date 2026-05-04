import 'package:intl/intl.dart';

class Bill {
  final int id;
  final RentalContract? contract;
  final String billType;
  final String billNumber;
  final String title;
  final String? description;
  final DateTime billingPeriodStart;
  final DateTime billingPeriodEnd;
  final DateTime dueDate;
  final double totalAmount;
  final double paidAmount;
  final String status;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<BillItem>? items;
  final List<BillSplit>? splits;
  final List<PaymentRecord>? payments;

  Bill({
    required this.id,
    this.contract,
    required this.billType,
    required this.billNumber,
    required this.title,
    this.description,
    required this.billingPeriodStart,
    required this.billingPeriodEnd,
    required this.dueDate,
    required this.totalAmount,
    required this.paidAmount,
    required this.status,
    this.notes,
    this.createdAt,
    this.updatedAt,
    this.items,
    this.splits,
    this.payments,
  });

  factory Bill.fromJson(Map<String, dynamic> json) {
    return Bill(
      id: json['id'],
      contract: json['contract'] != null
          ? RentalContract.fromJson(json['contract'])
          : null,
      billType: json['bill_type'],
      billNumber: json['bill_number'],
      title: json['title'],
      description: json['description'],
      billingPeriodStart: DateTime.parse(json['billing_period_start']),
      billingPeriodEnd: DateTime.parse(json['billing_period_end']),
      dueDate: DateTime.parse(json['due_date']),
      totalAmount: (json['total_amount'] as num).toDouble(),
      paidAmount: (json['paid_amount'] as num).toDouble(),
      status: json['status'],
      notes: json['notes'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
      items: json['items'] != null
          ? (json['items'] as List).map((i) => BillItem.fromJson(i)).toList()
          : null,
      splits: json['splits'] != null
          ? (json['splits'] as List).map((s) => BillSplit.fromJson(s)).toList()
          : null,
      payments: json['payments'] != null
          ? (json['payments'] as List)
              .map((p) => PaymentRecord.fromJson(p))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'contract_id': contract?.id,
      'bill_type': billType,
      'title': title,
      'description': description,
      'billing_period_start':
          DateFormat('yyyy-MM-dd').format(billingPeriodStart),
      'billing_period_end':
          DateFormat('yyyy-MM-dd').format(billingPeriodEnd),
      'due_date': DateFormat('yyyy-MM-dd').format(dueDate),
      'total_amount': totalAmount,
      'notes': notes,
    };
  }

  double get remainingAmount {
    return totalAmount - paidAmount;
  }

  bool get isOverdue {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final due = DateTime(dueDate.year, dueDate.month, dueDate.day);
    return today.isAfter(due) && !['paid', 'cancelled'].contains(status);
  }

  String get billTypeDisplay {
    const Map<String, String> types = {
      'rent': '房租',
      'water': '水费',
      'electricity': '电费',
      'gas': '燃气费',
      'property_fee': '物业费',
      'internet': '网络费',
      'other': '其他',
    };
    return types[billType] ?? billType;
  }

  String get statusDisplay {
    const Map<String, String> statuses = {
      'pending': '待支付',
      'partially_paid': '部分支付',
      'paid': '已支付',
      'overdue': '已逾期',
      'cancelled': '已取消',
    };
    return statuses[status] ?? status;
  }

  String get formattedTotalAmount {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(totalAmount);
  }

  String get formattedPaidAmount {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(paidAmount);
  }

  String get formattedRemainingAmount {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(remainingAmount);
  }

  String get formattedDueDate {
    return DateFormat('yyyy年MM月dd日').format(dueDate);
  }

  String get billingPeriod {
    return '${DateFormat('yyyy年MM月dd日').format(billingPeriodStart)} 至 ${DateFormat('yyyy年MM月dd日').format(billingPeriodEnd)}';
  }

  double get paymentProgress {
    if (totalAmount == 0) return 0;
    return paidAmount / totalAmount;
  }

  int get daysUntilDue {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final due = DateTime(dueDate.year, dueDate.month, dueDate.day);
    return due.difference(today).inDays;
  }
}

class BillItem {
  final int id;
  final Bill? bill;
  final String name;
  final String? description;
  final double quantity;
  final String unit;
  final double unitPrice;
  final double amount;
  final String? notes;
  final DateTime? createdAt;

  BillItem({
    required this.id,
    this.bill,
    required this.name,
    this.description,
    required this.quantity,
    required this.unit,
    required this.unitPrice,
    required this.amount,
    this.notes,
    this.createdAt,
  });

  factory BillItem.fromJson(Map<String, dynamic> json) {
    return BillItem(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      quantity: (json['quantity'] as num).toDouble(),
      unit: json['unit'],
      unitPrice: (json['unit_price'] as num).toDouble(),
      amount: (json['amount'] as num).toDouble(),
      notes: json['notes'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
    );
  }

  String get formattedUnitPrice {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(unitPrice);
  }

  String get formattedAmount {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(amount);
  }
}

class BillSplit {
  final int id;
  final Bill? bill;
  final Tenant? tenant;
  final String splitMethod;
  final double proportion;
  final double amount;
  final bool isPaid;
  final DateTime? paidAt;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  BillSplit({
    required this.id,
    this.bill,
    this.tenant,
    required this.splitMethod,
    required this.proportion,
    required this.amount,
    required this.isPaid,
    this.paidAt,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory BillSplit.fromJson(Map<String, dynamic> json) {
    return BillSplit(
      id: json['id'],
      tenant: json['tenant'] != null
          ? Tenant.fromJson(json['tenant'])
          : null,
      splitMethod: json['split_method'],
      proportion: (json['proportion'] as num).toDouble(),
      amount: (json['amount'] as num).toDouble(),
      isPaid: json['is_paid'],
      paidAt: json['paid_at'] != null
          ? DateTime.parse(json['paid_at'])
          : null,
      notes: json['notes'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  String get splitMethodDisplay {
    const Map<String, String> methods = {
      'equal': '平均分摊',
      'proportion': '按比例分摊',
      'custom': '自定义分摊',
    };
    return methods[splitMethod] ?? splitMethod;
  }

  String get formattedAmount {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(amount);
  }

  String get formattedProportion {
    return NumberFormat('0.0').format(proportion) + '%';
  }
}

class PaymentRecord {
  final int id;
  final Bill? bill;
  final BillSplit? billSplit;
  final Tenant? tenant;
  final String paymentMethod;
  final double amount;
  final String? transactionId;
  final DateTime paymentDate;
  final String? receiptNumber;
  final String? notes;
  final DateTime? createdAt;

  PaymentRecord({
    required this.id,
    this.bill,
    this.billSplit,
    this.tenant,
    required this.paymentMethod,
    required this.amount,
    this.transactionId,
    required this.paymentDate,
    this.receiptNumber,
    this.notes,
    this.createdAt,
  });

  factory PaymentRecord.fromJson(Map<String, dynamic> json) {
    return PaymentRecord(
      id: json['id'],
      billSplit: json['bill_split'] != null
          ? BillSplit.fromJson(json['bill_split'])
          : null,
      tenant: json['tenant'] != null
          ? Tenant.fromJson(json['tenant'])
          : null,
      paymentMethod: json['payment_method'],
      amount: (json['amount'] as num).toDouble(),
      transactionId: json['transaction_id'],
      paymentDate: DateTime.parse(json['payment_date']),
      receiptNumber: json['receipt_number'],
      notes: json['notes'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
    );
  }

  String get paymentMethodDisplay {
    const Map<String, String> methods = {
      'cash': '现金',
      'alipay': '支付宝',
      'wechat': '微信支付',
      'bank_transfer': '银行转账',
      'other': '其他',
    };
    return methods[paymentMethod] ?? paymentMethod;
  }

  String get formattedAmount {
    return NumberFormat.currency(
      locale: 'zh_CN',
      symbol: '¥',
      decimalDigits: 2,
    ).format(amount);
  }

  String get formattedPaymentDate {
    return DateFormat('yyyy年MM月dd日').format(paymentDate);
  }
}
