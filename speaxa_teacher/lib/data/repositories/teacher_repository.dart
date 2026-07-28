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

  // Wallet & Earnings Sync (1:1 Web Panel Integration)
  Future<TeacherWalletModel> getWallet() async {
    final response = await _apiClient.get('/teacher/earnings');
    if (response is Map && response['wallet'] != null) {
      return TeacherWalletModel.fromJson(response['wallet']);
    }
    return TeacherWalletModel.fromJson(response);
  }

  Future<List<dynamic>> getWalletStatement() async {
    try {
      final response = await _apiClient.get('/teacher/earnings');
      if (response is Map) {
        final ledger = response['ledger'] ?? response['history'] ?? [];
        if (ledger is List) return ledger;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> getBankDetails() async {
    try {
      final response = await _apiClient.get('/teacher/earnings');
      if (response is Map && response['bank_details'] != null) {
        return Map<String, dynamic>.from(response['bank_details']);
      }
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<void> saveBankDetails(Map<String, dynamic> data) async {
    final payload = {
      'bank_account_name': data['bank_account_name'] ?? data['account_holder_name'] ?? '',
      'bank_name': data['bank_name'] ?? '',
      'bank_account_number': data['bank_account_number'] ?? data['account_number'] ?? '',
      'bank_ifsc_code': data['bank_ifsc_code'] ?? data['ifsc_code'] ?? '',
      'upi_id': data['upi_id'] ?? '',
    };
    await _apiClient.post('/teacher/bank-details', data: payload);
  }

  // Payout Requests History (1:1 Web Panel Integration)
  Future<List<dynamic>> getPayoutRequests() async {
    try {
      final response = await _apiClient.get('/teacher/earnings');
      if (response is Map) {
        final history = response['history'] ?? response['payouts'] ?? [];
        if (history is List) return history;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<void> requestPayout(double amount, {Map<String, dynamic>? bankDetails}) async {
    await _apiClient.post('/teacher/payouts/request', data: {
      'amount': amount,
      if (bankDetails != null) 'bankDetails': bankDetails,
    });
  }

  Future<Map<String, dynamic>> emailPassbookStatement() async {
    final response = await _apiClient.post(ApiEndpoints.emailPassbookStatement);
    return response as Map<String, dynamic>;
  }
}
