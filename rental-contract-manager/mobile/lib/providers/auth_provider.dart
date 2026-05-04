import 'package:flutter/foundation.dart';
import 'package:rental_contract_manager/models/user.dart';
import 'package:rental_contract_manager/services/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:rental_contract_manager/constants/app_constants.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  User? _currentUser;
  String? _token;
  bool _isLoading = false;
  String? _errorMessage;

  User? get currentUser => _currentUser;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _token != null && _currentUser != null;

  AuthProvider() {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    if (token != null) {
      _token = token;
      _apiService.setAuthToken(token);
      await _fetchCurrentUser();
    }
    notifyListeners();
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.login(username, password);
      if (response.statusCode == 200) {
        final token = response.data['token'];
        if (token != null) {
          _token = token;
          _apiService.setAuthToken(token);
          
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(AppConstants.tokenKey, token);
          
          await _fetchCurrentUser();
          
          _isLoading = false;
          notifyListeners();
          return true;
        }
      }
      _errorMessage = '登录失败，请检查用户名和密码';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _apiService.logout();
    } catch (e) {
      // 忽略登出时的网络错误
    }
    
    _token = null;
    _currentUser = null;
    _apiService.clearAuthToken();
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    
    notifyListeners();
  }

  Future<void> _fetchCurrentUser() async {
    try {
      final user = await _apiService.getCurrentUser();
      _currentUser = user;
    } catch (e) {
      _errorMessage = e.toString();
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
