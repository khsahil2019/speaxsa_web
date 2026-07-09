import '../../core/network/api_client.dart';
import '../../core/constants/api_endpoints.dart';

class PublicRepository {
  final ApiClient _apiClient = ApiClient();

  Future<Map<String, dynamic>> getAdminSettings() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicAdminSettings);
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<List<dynamic>> getPublicCourses() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicCourses);
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getPublicTeachers() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicTeachers);
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> getPublicStats() async {
    try {
      final response = await _apiClient.get(ApiEndpoints.publicStats);
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {};
    } catch (e) {
      return {};
    }
  }
}
