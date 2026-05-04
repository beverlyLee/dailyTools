import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../services/storage_service.dart';

class ApiService {
  late final Dio _dio;
  final StorageService _storageService;

  static const String baseUrl = 'http://localhost:3000/api';

  ApiService(this._storageService) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storageService.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          if (kDebugMode) {
            print('📡 Request: ${options.method} ${options.uri}');
            print('📋 Headers: ${options.headers}');
            if (options.data != null) {
              print('📦 Data: ${options.data}');
            }
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          if (kDebugMode) {
            print('✅ Response: ${response.statusCode}');
            print('📦 Data: ${response.data}');
          }
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          if (kDebugMode) {
            print('❌ Error: ${e.message}');
            print('📋 Response: ${e.response?.data}');
          }

          if (e.response?.statusCode == 401) {
            await _storageService.clearAuth();
          }

          return handler.next(e);
        },
      ),
    );
  }

  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.get(
      path,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.post(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.put(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.patch(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.delete(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response> multipartPost(
    String path, {
    required FormData formData,
    Map<String, dynamic>? queryParameters,
  }) async {
    return _dio.post(
      path,
      data: formData,
      queryParameters: queryParameters,
      options: Options(
        contentType: 'multipart/form-data',
      ),
    );
  }
}
