import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  final SharedPreferences _sharedPreferences;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  StorageService(this._sharedPreferences);

  static const String _keyToken = 'auth_token';
  static const String _keyRefreshToken = 'refresh_token';
  static const String _keyUser = 'user';
  static const String _keyTheme = 'theme_mode';
  static const String _keyFirstLaunch = 'first_launch';

  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _keyToken, value: token);
  }

  Future<String?> getToken() async {
    return _secureStorage.read(key: _keyToken);
  }

  Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(key: _keyRefreshToken, value: token);
  }

  Future<String?> getRefreshToken() async {
    return _secureStorage.read(key: _keyRefreshToken);
  }

  Future<void> saveUser(Map<String, dynamic> userJson) async {
    _sharedPreferences.setString(_keyUser, jsonEncode(userJson));
  }

  Future<Map<String, dynamic>?> getUser() async {
    final userStr = _sharedPreferences.getString(_keyUser);
    if (userStr == null) return null;
    return jsonDecode(userStr) as Map<String, dynamic>;
  }

  Future<void> clearAuth() async {
    await _secureStorage.delete(key: _keyToken);
    await _secureStorage.delete(key: _keyRefreshToken);
    _sharedPreferences.remove(_keyUser);
  }

  Future<void> setThemeMode(String mode) async {
    await _sharedPreferences.setString(_keyTheme, mode);
  }

  Future<String> getThemeMode() async {
    return _sharedPreferences.getString(_keyTheme) ?? 'light';
  }

  Future<bool> isFirstLaunch() async {
    return _sharedPreferences.getBool(_keyFirstLaunch) ?? true;
  }

  Future<void> setFirstLaunchComplete() async {
    await _sharedPreferences.setBool(_keyFirstLaunch, false);
  }

  Future<void> setString(String key, String value) async {
    await _sharedPreferences.setString(key, value);
  }

  Future<String?> getString(String key) async {
    return _sharedPreferences.getString(key);
  }

  Future<void> setInt(String key, int value) async {
    await _sharedPreferences.setInt(key, value);
  }

  Future<int?> getInt(String key) async {
    return _sharedPreferences.getInt(key);
  }

  Future<void> setBool(String key, bool value) async {
    await _sharedPreferences.setBool(key, value);
  }

  Future<bool?> getBool(String key) async {
    return _sharedPreferences.getBool(key);
  }

  Future<void> remove(String key) async {
    await _sharedPreferences.remove(key);
    await _secureStorage.delete(key: key);
  }
}
