class AppConstants {
  static const String appName = '租房合同管理';
  static const String appVersion = '1.0.0';
  
  // API 配置
  static const String baseUrl = 'http://localhost:8000';
  static const String apiBaseUrl = '$baseUrl/api';
  
  // 超时时间
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  
  // 分页
  static const int defaultPageSize = 20;
  
  // 日期格式
  static const String dateFormat = 'yyyy-MM-dd';
  static const String dateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
  static const String displayDateFormat = 'yyyy年MM月dd日';
  
  // 货币格式
  static const String currencySymbol = '¥';
  
  // 提醒天数
  static const List<int> reminderDaysBeforeExpiry = [7, 3, 1];
  
  // 合同状态
  static const Map<String, String> contractStatuses = {
    'draft': '草稿',
    'active': '有效',
    'expired': '已到期',
    'terminated': '已终止',
  };
  
  // 账单状态
  static const Map<String, String> billStatuses = {
    'pending': '待支付',
    'partially_paid': '部分支付',
    'paid': '已支付',
    'overdue': '已逾期',
    'cancelled': '已取消',
  };
  
  // 账单类型
  static const Map<String, String> billTypes = {
    'rent': '房租',
    'water': '水费',
    'electricity': '电费',
    'gas': '燃气费',
    'property_fee': '物业费',
    'internet': '网络费',
    'other': '其他',
  };
  
  // 分摊方式
  static const Map<String, String> splitMethods = {
    'equal': '平均分摊',
    'proportion': '按比例分摊',
    'custom': '自定义分摊',
  };
  
  // 支付方式
  static const Map<String, String> paymentMethods = {
    'cash': '现金',
    'alipay': '支付宝',
    'wechat': '微信支付',
    'bank_transfer': '银行转账',
    'other': '其他',
  };
  
  // 提醒类型
  static const Map<String, String> reminderTypes = {
    'contract_expiry': '合同到期提醒',
    'rent_payment': '租金支付提醒',
    'billing_due': '账单到期提醒',
    'custom': '自定义提醒',
  };
  
  // 房屋类型
  static const Map<String, String> propertyTypes = {
    'apartment': '公寓',
    'house': '住宅',
    'studio': '单间',
    'loft': 'loft',
    'other': '其他',
  };
  
  // OCR引擎
  static const Map<String, String> ocrEngines = {
    'paddleocr': 'PaddleOCR',
    'tesseract': 'Tesseract',
  };
  
  // 存储键名
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  static const String themeKey = 'theme_mode';
  static const String languageKey = 'language';
}
