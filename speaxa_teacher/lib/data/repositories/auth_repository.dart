import 'package:get/get.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<Map<String, dynamic>> login({required String email, required String password, String? role}) async {
    final body = {
      'email': email,
      'password': password,
      if (role != null) 'role': role,
    };
    final response = await _apiClient.post(ApiEndpoints.login, data: body);
    return {
      'token': response['token'],
      'user': UserModel.fromJson(response['user']),
    };
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiEndpoints.register, data: data);
    if (response['status'] == 'otp_sent') {
      return {'status': 'otp_sent', 'message': response['message'], 'otp': response['otp']};
    }
    return {
      'token': response['token'],
      'user': UserModel.fromJson(response['user']),
    };
  }

  Future<void> sendOtp(String identifier, {String purpose = 'login'}) async {
    await _apiClient.post(ApiEndpoints.sendOtp, data: {'identifier': identifier, 'purpose': purpose});
  }

  Future<Map<String, dynamic>> verifyOtp(String identifier, String otp, {String purpose = 'login'}) async {
    final response = await _apiClient.post(ApiEndpoints.verifyOtp, data: {'identifier': identifier, 'otp': otp, 'purpose': purpose});
    return {
      'token': response['token'],
      'user': UserModel.fromJson(response['user']),
    };
  }

  Future<void> forgotPassword(String identifier) async {
    await _apiClient.post(ApiEndpoints.forgotPassword, data: {'identifier': identifier});
  }

  Future<void> resetPassword({required String identifier, required String otp, required String newPassword}) async {
    await _apiClient.post(ApiEndpoints.resetPassword, data: {'identifier': identifier, 'otp': otp, 'newPassword': newPassword});
  }

  Future<void> changePassword({required String currentPassword, required String newPassword}) async {
    await _apiClient.post(ApiEndpoints.changePassword, data: {'currentPassword': currentPassword, 'newPassword': newPassword});
  }

  Future<UserModel> fetchProfile() async {
    final response = await _apiClient.get(ApiEndpoints.profile);
    return UserModel.fromJson(response);
  }

  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    final response = await _apiClient.put(ApiEndpoints.profile, data: data);
    return UserModel.fromJson(response['user']);
  }

  Future<String> uploadAvatar(String filePath) async {
    final response = await _apiClient.uploadFile(ApiEndpoints.uploadAvatar, filePath, fieldName: 'avatar');
    return response['photoUrl'] ?? '';
  }
}
