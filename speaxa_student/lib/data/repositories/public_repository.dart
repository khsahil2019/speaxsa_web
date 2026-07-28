import 'package:get/get.dart';
import '../../core/network/api_client.dart';
import '../../core/constants/api_endpoints.dart';
import '../models/admin_public_settings_model.dart';
import '../models/course_model.dart';
import '../models/user_model.dart';
import '../models/public_stats_model.dart';

class PublicRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<AdminPublicSettingsModel> getAdminSettings() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicAdminSettings);
      if (response is Map<String, dynamic>) {
        return AdminPublicSettingsModel.fromJson(response);
      }
      return AdminPublicSettingsModel();
    } catch (e) {
      return AdminPublicSettingsModel();
    }
  }

  Future<List<CourseModel>> getPublicCourses() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicCourses);
      if (response is List) {
        return response.map((e) => CourseModel.fromJson(e)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<UserModel>> getPublicTeachers() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicTeachers);
      if (response is List) {
        return response.map((e) => UserModel.fromJson(e)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<PublicStatsModel> getPublicStats() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicStats);
      if (response is Map<String, dynamic>) {
        return PublicStatsModel.fromJson(response);
      }
      return PublicStatsModel();
    } catch (e) {
      return PublicStatsModel();
    }
  }
}
