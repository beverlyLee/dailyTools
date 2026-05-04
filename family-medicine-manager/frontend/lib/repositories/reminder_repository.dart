import 'package:dio/dio.dart';

import '../models/reminder.dart';
import '../services/api_service.dart';

class ReminderRepository {
  final ApiService _apiService;

  ReminderRepository(this._apiService);

  Future<List<Reminder>> getReminders({
    String? status,
    String? type,
    String? medicineId,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null) queryParams['status'] = status;
      if (type != null) queryParams['type'] = type;
      if (medicineId != null) queryParams['medicineId'] = medicineId;

      final response = await _apiService.get(
        '/reminders',
        queryParameters: queryParams,
      );

      return (response.data as List)
          .map((json) => Reminder.fromJson(json))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Reminder> getReminder(String id) async {
    try {
      final response = await _apiService.get('/reminders/$id');
      return Reminder.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Reminder> createReminder(Map<String, dynamic> data) async {
    try {
      final response = await _apiService.post(
        '/reminders',
        data: data,
      );
      return Reminder.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Reminder> updateReminder(String id, Map<String, dynamic> data) async {
    try {
      final response = await _apiService.patch(
        '/reminders/$id',
        data: data,
      );
      return Reminder.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> deleteReminder(String id) async {
    try {
      await _apiService.delete('/reminders/$id');
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Reminder> dismissReminder(String id) async {
    try {
      final response = await _apiService.post('/reminders/$id/dismiss');
      return Reminder.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Reminder> toggleReminder(String id) async {
    try {
      final response = await _apiService.post('/reminders/$id/toggle');
      return Reminder.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Reminder>> getUpcomingReminders({int limit = 10}) async {
    try {
      final response = await _apiService.get(
        '/reminders/upcoming',
        queryParameters: {'limit': limit.toString()},
      );

      return (response.data as List)
          .map((json) => Reminder.fromJson(json))
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
