import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';
import '../../data/models/user_model.dart';

class StorageService extends GetxService {
  static StorageService get to => Get.find<StorageService>();

  late SharedPreferences _prefs;
  final _secureStorage = const FlutterSecureStorage();

  Future<StorageService> init() async {
    _prefs = await SharedPreferences.getInstance();
    return this;
  }

  // Token Management
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: AppConstants.keyToken, value: token);
  }

  Future<String?> getToken() async {
    return await _secureStorage.read(key: AppConstants.keyToken);
  }

  Future<void> clearToken() async {
    await _secureStorage.delete(key: AppConstants.keyToken);
  }

  // User Management
  Future<void> saveUser(UserModel user) async {
    await _prefs.setString(AppConstants.keyUser, jsonEncode(user.toJson()));
    await _prefs.setString(AppConstants.keyRole, user.role);
  }

  UserModel? getUser() {
    final userStr = _prefs.getString(AppConstants.keyUser);
    if (userStr != null && userStr.isNotEmpty) {
      try {
        return UserModel.fromJson(jsonDecode(userStr));
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  String? getUserRole() {
    return _prefs.getString(AppConstants.keyRole);
  }

  Future<void> clearUser() async {
    await _prefs.remove(AppConstants.keyUser);
    await _prefs.remove(AppConstants.keyRole);
  }

  // Theme Mode
  bool isDarkMode() {
    return _prefs.getBool(AppConstants.keyIsDarkMode) ?? false;
  }

  Future<void> setDarkMode(bool value) async {
    await _prefs.setBool(AppConstants.keyIsDarkMode, value);
  }

  // Remember Me
  Future<void> saveRememberMe({required bool remember, String? email, String? password}) async {
    await _prefs.setBool(AppConstants.keyRememberMe, remember);
    if (remember && email != null && password != null) {
      await _secureStorage.write(key: AppConstants.keySavedEmail, value: email);
      await _secureStorage.write(key: AppConstants.keySavedPassword, value: password);
    } else {
      await _secureStorage.delete(key: AppConstants.keySavedEmail);
      await _secureStorage.delete(key: AppConstants.keySavedPassword);
    }
  }

  bool getRememberMe() {
    return _prefs.getBool(AppConstants.keyRememberMe) ?? false;
  }

  Future<Map<String, String>> getSavedCredentials() async {
    final email = await _secureStorage.read(key: AppConstants.keySavedEmail);
    final password = await _secureStorage.read(key: AppConstants.keySavedPassword);
    return {'email': email ?? '', 'password': password ?? ''};
  }

  Future<void> clearAll() async {
    await clearToken();
    await clearUser();
  }
}
