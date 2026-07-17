import 'package:get/get.dart';
import '../../core/network/api_client.dart';
import '../../core/constants/api_endpoints.dart';

class PublicRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<Map<String, dynamic>> getAdminSettings() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicAdminSettings);
      if (response is Map<String, dynamic>) {
        return response;
      }
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<List<dynamic>> getPublicCourses() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicCourses);
      if (response is List) {
        return response;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getPublicTeachers() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicTeachers);
      if (response is List) {
        return response;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> getPublicStats() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicStats);
      if (response is Map<String, dynamic>) {
        return response;
      }
      return {};
    } catch (e) {
      return {};
    }
  }
}
