import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:rental_contract_manager/constants/app_constants.dart';
import 'package:rental_contract_manager/models/user.dart';
import 'package:rental_contract_manager/models/property.dart';
import 'package:rental_contract_manager/models/tenant.dart';
import 'package:rental_contract_manager/models/rental_contract.dart';
import 'package:rental_contract_manager/models/bill.dart';
import 'package:rental_contract_manager/models/reminder.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio _dio;
  String? _authToken;

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: Duration(milliseconds: AppConstants.connectTimeout),
        receiveTimeout: Duration(milliseconds: AppConstants.receiveTimeout),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      LogInterceptor(
        requestHeader: kDebugMode,
        requestBody: kDebugMode,
        responseHeader: kDebugMode,
        responseBody: kDebugMode,
        error: kDebugMode,
      ),
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_authToken != null) {
            options.headers['Authorization'] = 'Token $_authToken';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) {
          if (e.response?.statusCode == 401) {
            _handleUnauthorized();
          }
          return handler.next(e);
        },
      ),
    ]);
  }

  void setAuthToken(String token) {
    _authToken = token;
  }

  void clearAuthToken() {
    _authToken = null;
  }

  void _handleUnauthorized() {
    clearAuthToken();
  }

  // ==================== 认证相关 ====================

  Future<Response> login(String username, String password) async {
    try {
      final response = await _dio.post(
        '/auth/login/',
        data: {
          'username': username,
          'password': password,
        },
      );
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response> logout() async {
    try {
      final response = await _dio.post('/auth/logout/');
      clearAuthToken();
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<User?> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/user/');
      if (response.statusCode == 200) {
        return User.fromJson(response.data);
      }
      return null;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ==================== 房屋管理 ====================

  Future<List<Property>> getProperties() async {
    try {
      final response = await _dio.get('/contracts/properties/');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        return data.map((item) => Property.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Property> createProperty(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/contracts/properties/', data: data);
      if (response.statusCode == 201) {
        return Property.fromJson(response.data);
      }
      throw Exception('创建失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Property> updateProperty(int id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/contracts/properties/$id/', data: data);
      if (response.statusCode == 200) {
        return Property.fromJson(response.data);
      }
      throw Exception('更新失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<void> deleteProperty(int id) async {
    try {
      await _dio.delete('/contracts/properties/$id/');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ==================== 房客管理 ====================

  Future<List<Tenant>> getTenants() async {
    try {
      final response = await _dio.get('/contracts/tenants/');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        return data.map((item) => Tenant.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Tenant> createTenant(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/contracts/tenants/', data: data);
      if (response.statusCode == 201) {
        return Tenant.fromJson(response.data);
      }
      throw Exception('创建失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Tenant> updateTenant(int id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/contracts/tenants/$id/', data: data);
      if (response.statusCode == 200) {
        return Tenant.fromJson(response.data);
      }
      throw Exception('更新失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<void> deleteTenant(int id) async {
    try {
      await _dio.delete('/contracts/tenants/$id/');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ==================== 合同管理 ====================

  Future<List<RentalContract>> getContracts({
    String? status,
    int? page,
    int? pageSize,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (page != null) queryParams['page'] = page;
      if (pageSize != null) queryParams['page_size'] = pageSize;

      final response = await _dio.get(
        '/contracts/contracts/',
        queryParameters: queryParams,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        return data.map((item) => RentalContract.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<RentalContract> getContract(int id) async {
    try {
      final response = await _dio.get('/contracts/contracts/$id/');
      if (response.statusCode == 200) {
        return RentalContract.fromJson(response.data);
      }
      throw Exception('获取失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<RentalContract> createContract(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/contracts/contracts/', data: data);
      if (response.statusCode == 201) {
        return RentalContract.fromJson(response.data);
      }
      throw Exception('创建失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<RentalContract> updateContract(int id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/contracts/contracts/$id/', data: data);
      if (response.statusCode == 200) {
        return RentalContract.fromJson(response.data);
      }
      throw Exception('更新失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<void> deleteContract(int id) async {
    try {
      await _dio.delete('/contracts/contracts/$id/');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ==================== 账单管理 ====================

  Future<List<Bill>> getBills({
    String? status,
    String? billType,
    int? contractId,
    int? page,
    int? pageSize,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (billType != null) queryParams['bill_type'] = billType;
      if (contractId != null) queryParams['contract'] = contractId;
      if (page != null) queryParams['page'] = page;
      if (pageSize != null) queryParams['page_size'] = pageSize;

      final response = await _dio.get(
        '/billing/bills/',
        queryParameters: queryParams,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        return data.map((item) => Bill.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Bill> getBill(int id) async {
    try {
      final response = await _dio.get('/billing/bills/$id/');
      if (response.statusCode == 200) {
        return Bill.fromJson(response.data);
      }
      throw Exception('获取失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Bill> createBill(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/billing/bills/', data: data);
      if (response.statusCode == 201) {
        return Bill.fromJson(response.data);
      }
      throw Exception('创建失败');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response> createBillSplits(int billId, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(
        '/billing/bills/$billId/create_splits/',
        data: data,
      );
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response> makePayment(int billId, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(
        '/billing/bills/$billId/make_payment/',
        data: data,
      );
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<List<Bill>> getOverdueBills() async {
    try {
      final response = await _dio.get('/billing/bills/overdue/');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data is List
            ? response.data
            : response.data['results'] ?? [];
        return data.map((item) => Bill.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<List<Bill>> getUpcomingBills() async {
    try {
      final response = await _dio.get('/billing/bills/upcoming_due/');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data is List
            ? response.data
            : response.data['results'] ?? [];
        return data.map((item) => Bill.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ==================== 提醒管理 ====================

  Future<List<Reminder>> getReminders({
    bool? isRead,
    bool? isSent,
    String? reminderType,
    int? page,
    int? pageSize,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (isRead != null) queryParams['is_read'] = isRead;
      if (isSent != null) queryParams['is_sent'] = isSent;
      if (reminderType != null) queryParams['reminder_type'] = reminderType;
      if (page != null) queryParams['page'] = page;
      if (pageSize != null) queryParams['page_size'] = pageSize;

      final response = await _dio.get(
        '/reminders/reminders/',
        queryParameters: queryParams,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        return data.map((item) => Reminder.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<List<Reminder>> getUnreadReminders() async {
    try {
      final response = await _dio.get('/reminders/reminders/unread/');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data is List
            ? response.data
            : response.data['results'] ?? [];
        return data.map((item) => Reminder.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<List<Reminder>> getUpcomingReminders() async {
    try {
      final response = await _dio.get('/reminders/reminders/upcoming/');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data is List
            ? response.data
            : response.data['results'] ?? [];
        return data.map((item) => Reminder.fromJson(item)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response> markReminderAsRead(int id) async {
    try {
      final response = await _dio.post('/reminders/reminders/$id/mark_as_read/');
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response> markReminderAsUnread(int id) async {
    try {
      final response = await _dio.post('/reminders/reminders/$id/mark_as_unread/');
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ==================== OCR服务 ====================

  Future<Response> uploadOCRFile({
    required MultipartFile file,
    int? documentId,
    String ocrEngine = 'paddleocr',
    String language = 'ch',
    bool extractContractFields = true,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': file,
        if (documentId != null) 'document_id': documentId,
        'ocr_engine': ocrEngine,
        'language': language,
        'extract_contract_fields': extractContractFields,
      });

      final response = await _dio.post(
        '/ocr/requests/upload/',
        data: formData,
      );
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response> getOCRRequest(int id) async {
    try {
      final response = await _dio.get('/ocr/requests/$id/');
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  Future<Response> verifyExtractedField(int fieldId, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(
        '/ocr/fields/$fieldId/verify/',
        data: data,
      );
      return response;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  // ==================== 错误处理 ====================

  Exception _handleDioError(DioException e) {
    String errorMessage;
    
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        errorMessage = '连接超时，请检查网络连接';
        break;
      case DioExceptionType.sendTimeout:
        errorMessage = '发送超时，请重试';
        break;
      case DioExceptionType.receiveTimeout:
        errorMessage = '接收超时，请重试';
        break;
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode;
        final data = e.response?.data;
        if (data is Map && data.containsKey('detail')) {
          errorMessage = data['detail'];
        } else if (data is Map && data.containsKey('non_field_errors')) {
          errorMessage = (data['non_field_errors'] as List).join('\n');
        } else {
          errorMessage = '请求失败: $statusCode';
        }
        break;
      case DioExceptionType.cancel:
        errorMessage = '请求已取消';
        break;
      case DioExceptionType.connectionError:
        errorMessage = '网络连接错误，请检查网络设置';
        break;
      default:
        errorMessage = e.message ?? '未知错误';
    }

    return ApiException(errorMessage, e.response?.statusCode);
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}
