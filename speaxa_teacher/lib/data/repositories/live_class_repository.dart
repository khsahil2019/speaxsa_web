import 'package:get/get.dart';
import '../../core/network/api_client.dart';

class LiveClassRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<Map<String, dynamic>> getClassInfo(String classId) async {
    final response = await _apiClient.get('/live-classes/$classId/info');
    return response as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> startClass(String classId) async {
    final response = await _apiClient.post('/live-classes/$classId/start');
    return response as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> joinClass(String classId) async {
    final response = await _apiClient.post('/live-classes/$classId/join');
    return response as Map<String, dynamic>;
  }

  Future<void> leaveClass(String classId) async {
    await _apiClient.post('/live-classes/$classId/leave');
  }

  Future<void> endClass(String classId) async {
    await _apiClient.post('/live-classes/$classId/end');
  }
}
