import 'package:dio/dio.dart' as dio;
import 'package:get/get.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/batch_model.dart';
import '../models/sop_model.dart';
import '../models/wallet_model.dart';
import '../models/course_model.dart';
import '../models/live_class_model.dart';
import '../models/assignment_model.dart';
import '../models/attendance_model.dart';

class TeacherRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  // Analytics & Core
  Future<Map<String, dynamic>> getAnalytics() async {
    final response = await _apiClient.get(ApiEndpoints.teacherAnalytics);
    return response as Map<String, dynamic>;
  }

  // SOP & KYC Setup
  Future<SopModel?> getSopStatus() async {
    final response = await _apiClient.get(ApiEndpoints.teacherSop);
    if (response == null) return null;
    return SopModel.fromJson(response);
  }

  Future<void> submitSop(Map<String, dynamic> checklist) async {
    await _apiClient.post('/teacher/sop/submit', data: {'teacher_checklist': checklist});
  }

  Future<void> signAgreement(String digitalSignature) async {
    await _apiClient.post('/teacher/sop/sign-agreement', data: {'digital_signature': digitalSignature});
  }

  Future<List<dynamic>> getDocuments() async {
    final response = await _apiClient.get(ApiEndpoints.teacherDocuments);
    return response as List;
  }

  Future<void> uploadDocument(String filePath, String docType) async {
    await _apiClient.uploadFile(
      '${ApiEndpoints.teacherDocuments}/upload',
      filePath,
      fieldName: 'document',
      extraFields: {'doc_type': docType},
    );
  }

  // Courses Management
  Future<List<CourseModel>> getCourses() async {
    final response = await _apiClient.get('/teacher/courses');
    return (response as List).map((e) => CourseModel.fromJson(e)).toList();
  }

  Future<CourseModel> createCourse(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/teacher/courses', data: data);
    return CourseModel.fromJson(response['course']);
  }

  Future<CourseModel> updateCourse(String courseId, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/teacher/courses/$courseId', data: data);
    return CourseModel.fromJson(response['course'] ?? response);
  }

  Future<void> requestCourseApproval(String courseId) async {
    await _apiClient.post('/teacher/courses/$courseId/request-approval');
  }

  Future<String> uploadCourseThumbnail(String filePath) async {
    final response = await _apiClient.uploadFile(
      '/teacher/courses/upload-thumbnail',
      filePath,
      fieldName: 'thumbnail',
    );
    return response['thumbnailUrl'] as String;
  }

  // Batches Management
  Future<List<BatchModel>> getBatches() async {
    final response = await _apiClient.get(ApiEndpoints.teacherBatches);
    return (response as List).map((e) => BatchModel.fromJson(e)).toList();
  }

  Future<void> createBatch(Map<String, dynamic> data, String plannerPath, String? demoVideoPath) async {
    final fileNamePlanner = plannerPath.split('/').last;
    final formDataMap = <String, dynamic>{
      'planner': await dio.MultipartFile.fromFile(plannerPath, filename: fileNamePlanner),
    };

    if (demoVideoPath != null && demoVideoPath.isNotEmpty) {
      final fileNameVideo = demoVideoPath.split('/').last;
      formDataMap['demo_video'] = await dio.MultipartFile.fromFile(demoVideoPath, filename: fileNameVideo);
    }

    data.forEach((key, value) {
      if (value is List) {
        // Handle list of days_of_week
        for (var val in value) {
          formDataMap.addAll({'${key}[]': val});
        }
      } else {
        formDataMap[key] = value.toString();
      }
    });

    final formData = dio.FormData.fromMap(formDataMap);
    await _apiClient.dio.post('/teacher/batches', data: formData);
  }

  Future<List<dynamic>> getBatchStudents(String batchId) async {
    final response = await _apiClient.get('/teacher/batches/$batchId/students');
    return response as List;
  }

  // Live Classes Management
  Future<List<LiveClassModel>> getLiveClasses() async {
    final response = await _apiClient.get('/teacher/live-classes');
    return (response as List).map((e) => LiveClassModel.fromJson(e)).toList();
  }

  Future<void> createLiveClass(Map<String, dynamic> data) async {
    await _apiClient.post('/teacher/live-classes', data: data);
  }

  // Observations
  Future<List<dynamic>> getObservations({String? batchId}) async {
    final response = await _apiClient.get('/teacher/observations', queryParameters: batchId != null ? {'batchId': batchId} : null);
    return response as List;
  }

  Future<void> createObservation(Map<String, dynamic> data) async {
    await _apiClient.post('/teacher/observations', data: data);
  }

  // Assignments & Submissions
  Future<List<AssignmentModel>> getAssignments() async {
    final response = await _apiClient.get('/teacher/assignments');
    return (response as List).map((e) => AssignmentModel.fromJson(e)).toList();
  }

  Future<void> createAssignment(Map<String, dynamic> data, String filePath) async {
    final fileName = filePath.split('/').last;
    final formDataMap = <String, dynamic>{
      'file': await dio.MultipartFile.fromFile(filePath, filename: fileName),
    };
    data.forEach((key, value) {
      formDataMap[key] = value.toString();
    });
    final formData = dio.FormData.fromMap(formDataMap);
    await _apiClient.dio.post('/teacher/assignments', data: formData);
  }

  Future<List<dynamic>> getAssignmentSubmissions(String assignmentId) async {
    final response = await _apiClient.get('/teacher/assignments/$assignmentId/submissions');
    return response as List;
  }

  Future<void> gradeSubmission(String submissionId, double marksObtained, String feedback) async {
    await _apiClient.post('/teacher/assignments/submissions/$submissionId/grade', data: {
      'marks_obtained': marksObtained,
      'feedback': feedback,
    });
  }

  // Attendance
  Future<List<dynamic>> getAttendanceLogs({String? batchId, String? classId}) async {
    final queryParams = <String, dynamic>{};
    if (batchId != null) queryParams['batchId'] = batchId;
    if (classId != null) queryParams['classId'] = classId;
    final response = await _apiClient.get('/teacher/attendance', queryParameters: queryParams);
    return response as List;
  }

  // Study Materials (Notes)
  Future<List<dynamic>> getNotes() async {
    final response = await _apiClient.get('/teacher/notes');
    return response as List;
  }

  Future<void> uploadNote(Map<String, dynamic> data, String? filePath) async {
    final formDataMap = <String, dynamic>{};
    if (filePath != null && filePath.isNotEmpty) {
      final fileName = filePath.split('/').last;
      formDataMap['file'] = await dio.MultipartFile.fromFile(filePath, filename: fileName);
    }
    data.forEach((key, value) {
      formDataMap[key] = value.toString();
    });
    final formData = dio.FormData.fromMap(formDataMap);
    await _apiClient.dio.post('/teacher/notes', data: formData);
  }

  // Chats & Parent Connect
  Future<List<dynamic>> getConversations() async {
    final response = await _apiClient.get('/teacher/connect/conversations');
    return response as List;
  }

  Future<List<dynamic>> getMessages(String conversationId) async {
    final response = await _apiClient.get('/teacher/connect/messages', queryParameters: {'conversationId': conversationId});
    return response as List;
  }

  Future<Map<String, dynamic>> sendMessage(String conversationId, String text) async {
    final response = await _apiClient.post('/teacher/connect/messages', data: {
      'conversationId': conversationId,
      'message': text,
    });
    return response as Map<String, dynamic>;
  }

  // Referral & Rewards
  Future<Map<String, dynamic>> getReferrals() async {
    final response = await _apiClient.get('/teacher/referrals');
    return response as Map<String, dynamic>;
  }

  Future<List<dynamic>> getRewards() async {
    final response = await _apiClient.get('/teacher/rewards');
    return (response['slabs'] as List?) ?? [];
  }

  // Level & Milestones
  Future<Map<String, dynamic>> getLevelDetails() async {
    final response = await _apiClient.get('/teacher/level');
    return response as Map<String, dynamic>;
  }

  // Certificates
  Future<List<dynamic>> getCertificates() async {
    final response = await _apiClient.get('/teacher/certificates');
    return response as List;
  }

  // Wallet statements
  Future<List<dynamic>> getWalletStatement() async {
    final response = await _apiClient.get('/teacher/wallet/statement');
    return response as List;
  }

  Future<void> requestPayout(double amount) async {
    await _apiClient.post('/teacher/payouts/request', data: {'amount': amount});
  }

  Future<TeacherWalletModel> getWallet() async {
    final response = await _apiClient.get('/teacher/wallet');
    return TeacherWalletModel.fromJson(response);
  }
}
