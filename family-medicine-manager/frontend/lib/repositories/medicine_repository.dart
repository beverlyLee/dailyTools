import 'package:dio/dio.dart';

import '../models/medicine.dart';
import '../services/api_service.dart';

class MedicineRepository {
  final ApiService _apiService;

  MedicineRepository(this._apiService);

  Future<List<Medicine>> getMedicines({
    String? status,
    bool? isFavorite,
    String? tag,
    String? search,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (isFavorite != null) queryParams['isFavorite'] = isFavorite.toString();
      if (tag != null) queryParams['tag'] = tag;
      if (search != null && search.isNotEmpty) queryParams['search'] = search;

      final response = await _apiService.get(
        '/medicines',
        queryParameters: queryParams,
      );

      return (response.data as List)
          .map((json) => Medicine.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Medicine> getMedicine(String id) async {
    try {
      final response = await _apiService.get('/medicines/$id');
      return Medicine.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Medicine> createMedicine(Map<String, dynamic> data) async {
    try {
      final response = await _apiService.post(
        '/medicines',
        data: data,
      );
      return Medicine.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Medicine> updateMedicine(String id, Map<String, dynamic> data) async {
    try {
      final response = await _apiService.patch(
        '/medicines/$id',
        data: data,
      );
      return Medicine.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> deleteMedicine(String id) async {
    try {
      await _apiService.delete('/medicines/$id');
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Medicine> doseMedicine(String id, double quantity, {String? notes}) async {
    try {
      final response = await _apiService.post(
        '/medicines/$id/dose',
        data: {
          'quantity': quantity,
          if (notes != null) 'notes': notes,
        },
      );
      return Medicine.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Medicine> toggleFavorite(String id) async {
    try {
      final response = await _apiService.post('/medicines/$id/toggle-favorite');
      return Medicine.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Medicine>> getExpiringMedicines({int days = 7}) async {
    try {
      final response = await _apiService.get(
        '/medicines/expiring',
        queryParameters: {'days': days.toString()},
      );

      return (response.data as List)
          .map((json) => Medicine.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Medicine>> getLowStockMedicines({double threshold = 0.3}) async {
    try {
      final response = await _apiService.get(
        '/medicines/low-stock',
        queryParameters: {'threshold': threshold.toString()},
      );

      return (response.data as List)
          .map((json) => Medicine.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Medicine>> getExpiredMedicines() async {
    try {
      final response = await _apiService.get('/medicines/expired');

      return (response.data as List)
          .map((json) => Medicine.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> scanBarcode(String barcode) async {
    try {
      final response = await _apiService.get('/scanner/barcode/$barcode');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> recognizeExpiryDate(String imageBase64) async {
    try {
      final response = await _apiService.post(
        '/ocr/recognize-and-parse',
        data: {'imageBase64': imageBase64},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Medicine>> findByBarcode(String barcode) async {
    try {
      final response = await _apiService.get('/medicines/barcode/$barcode');

      return (response.data as List)
          .map((json) => Medicine.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Exception _handleError(DioException e) {
    final message = e.response?.data?['message'] ?? e.message ?? '未知错误';
    
    switch (e.response?.statusCode) {
      case 400:
        return Exception('请求参数错误: $message');
      case 401:
        return Exception('认证失败: $message');
      case 403:
        return Exception('权限不足: $message');
      case 404:
        return Exception('资源不存在: $message');
      case 500:
        return Exception('服务器错误: $message');
      default:
        return Exception('网络错误: $message');
    }
  }
}
