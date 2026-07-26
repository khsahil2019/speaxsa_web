import 'package:get/get.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/user_model.dart';
import '../models/chat_message_model.dart';

class ParentRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<void> linkChild(String studentCode) async {
    await _apiClient.post(ApiEndpoints.parentLinkChild, data: {'student_code': studentCode});
  }

  Future<List<UserModel>> getChildren() async {
    final response = await _apiClient.get(ApiEndpoints.parentChildren);
    return (response as List).map((e) => UserModel.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> getChildOverview(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childOverview(studentId));
    return response as Map<String, dynamic>;
  }

  Future<List<dynamic>> getChildAttendance(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childAttendance(studentId));
    return response as List;
  }

  Future<List<dynamic>> getChildAssignments(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childAssignments(studentId));
    return response as List;
  }

  Future<List<dynamic>> getChildReports(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childReports(studentId));
    return response as List;
  }

  Future<List<ChatMessageModel>> getMessages({required String teacherId, required String studentId}) async {
    final response = await _apiClient.get(
      ApiEndpoints.parentMessages,
      queryParameters: {'teacherId': teacherId, 'studentId': studentId},
    );
    return (response as List).map((e) => ChatMessageModel.fromJson(e)).toList();
  }

  Future<ChatMessageModel> sendMessage({required String teacherId, required String studentId, required String message}) async {
    final response = await _apiClient.post(
      ApiEndpoints.parentMessages,
      data: {'teacherId': teacherId, 'studentId': studentId, 'message': message},
    );
    return ChatMessageModel.fromJson(response);
  }
}
