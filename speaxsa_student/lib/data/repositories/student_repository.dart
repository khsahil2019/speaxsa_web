import 'package:get/get.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/services/auth_service.dart';
import '../models/course_model.dart';
import '../models/batch_model.dart';
import '../models/attendance_model.dart';
import '../models/assignment_model.dart';
import '../models/report_model.dart';
import '../models/live_class_model.dart';
import '../models/recording_model.dart';

class StudentRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<List<CourseModel>> getCourses({String? grade, String? board, String? subject}) async {
    final params = <String, dynamic>{};
    if (grade != null) params['grade'] = grade;
    if (board != null) params['board'] = board;
    if (subject != null) params['subject'] = subject;

    final isLoggedIn = AuthService.to.isLoggedIn.value;
    final endpoint = isLoggedIn ? ApiEndpoints.studentCourses : ApiEndpoints.publicCourses;

    final response = await _apiClient.get(endpoint, queryParameters: params);
    return (response as List).map((e) => CourseModel.fromJson(e)).toList();
  }

  Future<List<BatchModel>> getBatches({String? courseId}) async {
    final params = <String, dynamic>{};
    if (courseId != null) params['courseId'] = courseId;

    final isLoggedIn = AuthService.to.isLoggedIn.value;
    if (!isLoggedIn) {
      if (courseId != null) {
        final response = await _apiClient.get('/public/courses/$courseId/batches');
        return (response as List).map((e) => BatchModel.fromJson(e)).toList();
      }
      return [];
    }

    final response = await _apiClient.get(ApiEndpoints.studentBatches, queryParameters: params);
    return (response as List).map((e) => BatchModel.fromJson(e)).toList();
  }

  Future<List<BatchModel>> getMyBatches() async {
    final response = await _apiClient.get(ApiEndpoints.studentMyBatches);
    return (response as List).map((e) => BatchModel.fromJson(e)).toList();
  }

  Future<void> enrollInBatch(String batchId, {String? paymentId}) async {
    await _apiClient.post(ApiEndpoints.enrollBatch(batchId), data: {'paymentId': paymentId});
  }

  Future<AttendanceData> getAttendance() async {
    final response = await _apiClient.get(ApiEndpoints.studentAttendance);
    return AttendanceData.fromJson(response);
  }

  Future<List<AssignmentModel>> getAssignments() async {
    final response = await _apiClient.get(ApiEndpoints.studentAssignments);
    return (response as List).map((e) => AssignmentModel.fromJson(e)).toList();
  }

  Future<void> submitAssignment(String assignmentId, {String? filePath, String? notes}) async {
    if (filePath != null && filePath.isNotEmpty) {
      await _apiClient.uploadFile(
        ApiEndpoints.submitAssignment(assignmentId),
        filePath,
        fieldName: 'file',
        extraFields: notes != null ? {'notes': notes} : null,
      );
    } else {
      await _apiClient.post(ApiEndpoints.submitAssignment(assignmentId), data: {'notes': notes});
    }
  }

  Future<List<MonthlyReportModel>> getReports() async {
    final response = await _apiClient.get(ApiEndpoints.studentReports);
    return (response as List).map((e) => MonthlyReportModel.fromJson(e)).toList();
  }

  Future<List<dynamic>> getNotifications() async {
    final response = await _apiClient.get(ApiEndpoints.studentNotifications);
    return response as List;
  }

  Future<List<dynamic>> getParentRequests() async {
    final response = await _apiClient.get(ApiEndpoints.parentRequests);
    return response as List;
  }

  Future<void> approveParentRequest(String linkId) async {
    await _apiClient.post('${ApiEndpoints.parentRequests}/$linkId/approve');
  }

  Future<void> rejectParentRequest(String linkId) async {
    await _apiClient.post('${ApiEndpoints.parentRequests}/$linkId/reject');
  }

  Future<List<LiveClassModel>> getLiveClassesForBatch(String batchId) async {
    final response = await _apiClient.get(ApiEndpoints.studentBatchLiveClasses(batchId));
    return (response as List).map((e) => LiveClassModel.fromJson(e)).toList();
  }

  Future<List<RecordingModel>> getRecordings() async {
    final response = await _apiClient.get(ApiEndpoints.studentRecordings);
    return (response as List).map((e) => RecordingModel.fromJson(e)).toList();
  }

  Future<List<dynamic>> getBatchNotes(String batchId) async {
    final response = await _apiClient.get(ApiEndpoints.studentBatchNotes(batchId));
    return response as List;
  }

  Future<List<dynamic>> getCourseModules(String courseId) async {
    final response = await _apiClient.get(ApiEndpoints.courseModules(courseId));
    return response as List;
  }
}
