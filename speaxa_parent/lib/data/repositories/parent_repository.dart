import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/user_model.dart';
import '../models/chat_message_model.dart';

class ParentRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<void> linkChild(String codeOrEmail) async {
    await _apiClient.post('/parent/link-child', data: {
      'student_identifier': codeOrEmail,
      'student_code': codeOrEmail,
      'email': codeOrEmail,
    });
  }

  Future<void> resendLinkEmail(String linkId) async {
    await _apiClient.post('/parent/link-child/resend-email', data: {'link_id': linkId});
  }

  Future<List<UserModel>> getChildren() async {
    final response = await _apiClient.get('/parent/children');
    List<dynamic> list = [];
    if (response is List) {
      list = response;
    } else if (response is Map && response['children'] is List) {
      list = List<dynamic>.from(response['children']);
    }
    return list.map((e) => UserModel.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  Future<Map<String, dynamic>> getChildOverview(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childOverview(studentId));
    if (response is Map<String, dynamic>) return response;
    return {};
  }

  Future<List<dynamic>> getChildAttendance(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childAttendance(studentId));
    if (response is List) return response;
    if (response is Map && response['attendance'] is List) return List<dynamic>.from(response['attendance']);
    return [];
  }

  Future<List<dynamic>> getChildAssignments(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childAssignments(studentId));
    if (response is List) return response;
    if (response is Map && response['assignments'] is List) return List<dynamic>.from(response['assignments']);
    return [];
  }

  Future<List<dynamic>> getChildReports(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childReports(studentId));
    if (response is List) return response;
    if (response is Map && response['reports'] is List) return List<dynamic>.from(response['reports']);
    return [];
  }

  Future<List<dynamic>> getChildObservations(String studentId) async {
    final response = await _apiClient.get(ApiEndpoints.childObservations(studentId));
    if (response is List) return response;
    if (response is Map && response['observations'] is List) return List<dynamic>.from(response['observations']);
    return [];
  }

  Future<List<Map<String, dynamic>>> getTeachers() async {
    try {
      final response = await _apiClient.get('/parent/teachers');
      List<dynamic> list = [];
      if (response is List) {
        list = response;
      } else if (response is Map && response['teachers'] is List) {
        list = List<dynamic>.from(response['teachers']);
      }
      return list.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (e) {
      debugPrint('[ParentRepository] Error fetching teachers: $e');
      return [];
    }
  }

  Future<List<ChatMessageModel>> getMessages({required String teacherId, String? studentId}) async {
    final response = await _apiClient.get(
      '/parent/connect/messages',
      queryParameters: {
        'teacherId': teacherId,
        if (studentId != null && studentId.isNotEmpty) 'studentId': studentId,
      },
    );
    List<dynamic> list = [];
    if (response is List) {
      list = response;
    } else if (response is Map && response['messages'] is List) {
      list = List<dynamic>.from(response['messages']);
    }
    return list.map((e) => ChatMessageModel.fromJson(Map<String, dynamic>.from(e))).toList();
  }

  Future<ChatMessageModel> sendMessage({required String teacherId, String? studentId, required String message}) async {
    final response = await _apiClient.post(
      '/parent/connect/messages',
      data: {
        'teacherId': teacherId,
        if (studentId != null && studentId.isNotEmpty) 'studentId': studentId,
        'message': message,
      },
    );
    if (response is Map<String, dynamic>) {
      return ChatMessageModel.fromJson(response);
    }
    return ChatMessageModel(
      id: DateTime.now().millisecondsSinceEpoch,
      parentId: '',
      teacherId: teacherId,
      studentId: studentId ?? '',
      senderId: '',
      message: message,
      createdAt: DateTime.now().toIso8601String(),
    );
  }

  Future<void> rateTeacher({required String teacherId, required double rating, required String comment}) async {
    await _apiClient.post('/parent/connect/ratings', data: {
      'teacher_id': teacherId,
      'rating': rating,
      'comment': comment,
    });
  }
}
