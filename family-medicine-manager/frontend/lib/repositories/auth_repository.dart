import 'package:dio/dio.dart';

import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthRepository {
  final ApiService _apiService;
  final StorageService _storageService;

  AuthRepository(this._apiService, this._storageService);

  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final response = await _apiService.post(
        '/auth/login',
        data: {
          'username': username,
          'password': password,
        },
      );

      final data = response.data;
      final token = data['access_token'] as String;
      final userJson = data['user'] as Map<String, dynamic>;

      await _storageService.saveToken(token);
      await _storageService.saveUser(userJson);

      return {
        'token': token,
        'user': User.fromJson(userJson),
      };
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<User> register({
    required String username,
    required String email,
    required String password,
    String? nickname,
  }) async {
    try {
      final response = await _apiService.post(
        '/auth/register',
        data: {
          'username': username,
          'email': email,
          'password': password,
          if (nickname != null) 'nickname': nickname,
        },
      );

      return User.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<User> getCurrentUser() async {
    try {
      final response = await _apiService.get('/auth/me');
      return User.fromJson(response.data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> logout() async {
    await _storageService.clearAuth();
  }

  Future<bool> isAuthenticated() async {
    final token = await _storageService.getToken();
    return token != null;
  }

  Future<User?> getSavedUser() async {
    final userJson = await _storageService.getUser();
    if (userJson == null) return null;
    return User.fromJson(userJson);
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
      case 409:
        return Exception('资源冲突: $message');
      case 500:
        return Exception('服务器错误: $message');
      default:
        return Exception('网络错误: $message');
    }
  }
}
