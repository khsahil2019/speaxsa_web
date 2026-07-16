import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/fcm_service.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/user_model.dart';
import '../../../data/models/attendance_model.dart';
import '../../../data/models/assignment_model.dart';
import '../../../data/models/report_model.dart';
import '../../../data/models/live_class_model.dart';
import '../../../data/models/recording_model.dart';
import '../../../data/repositories/student_repository.dart';
import '../../../data/repositories/auth_repository.dart';

class StudentDashboardController extends GetxController with WidgetsBindingObserver {
  final StudentRepository _studentRepository = StudentRepository();
  final AuthRepository _authRepository = AuthRepository();

  final RxInt selectedIndex = 0.obs;
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  final RxList<BatchModel> myBatches = <BatchModel>[].obs;
  final RxList<CourseModel> courses = <CourseModel>[].obs;
  final RxList<BatchModel> availableBatches = <BatchModel>[].obs;
  final Rx<AttendanceData?> attendanceData = Rx<AttendanceData?>(null);
  final RxList<AssignmentModel> assignments = <AssignmentModel>[].obs;
  final RxList<MonthlyReportModel> reports = <MonthlyReportModel>[].obs;
  final RxList<dynamic> parentRequests = <dynamic>[].obs;
  final RxList<LiveClassModel> upcomingClasses = <LiveClassModel>[].obs;
  final RxList<RecordingModel> recordings = <RecordingModel>[].obs;

  @override
  void onInit() {
    super.onInit();
    WidgetsBinding.instance.addObserver(this);
    loadDashboardData();
  }

  @override
  void onClose() {
    WidgetsBinding.instance.removeObserver(this);
    super.onClose();
  }

  /// Auto-refresh data when the app returns to the foreground
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      loadDashboardData();
    }
  }

  Future<void> loadDashboardData() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      // Fetch each endpoint individually with try-catch to be fully resilient to hotspot concurrent connection drops
      try {
        final res = await _studentRepository.getMyBatches();
        myBatches.value = res;
      } catch (e) {
        debugPrint('[Dashboard] Error loading myBatches: $e');
      }

      try {
        final res = await _studentRepository.getAttendance();
        attendanceData.value = res;
      } catch (e) {
        debugPrint('[Dashboard] Error loading attendance: $e');
      }

      try {
        final res = await _studentRepository.getAssignments();
        assignments.value = res;
      } catch (e) {
        debugPrint('[Dashboard] Error loading assignments: $e');
      }

      try {
        final res = await _studentRepository.getReports();
        reports.value = res;
      } catch (e) {
        debugPrint('[Dashboard] Error loading reports: $e');
      }

      try {
        final res = await _studentRepository.getParentRequests();
        parentRequests.value = res.where((element) => element['status'] == 'pending').toList();
      } catch (e) {
        debugPrint('[Dashboard] Error loading parentRequests: $e');
      }

      try {
        final res = await _studentRepository.getBatches();
        availableBatches.value = res;
      } catch (e) {
        debugPrint('[Dashboard] Error loading availableBatches: $e');
      }

      try {
        final res = await _studentRepository.getRecordings();
        recordings.value = res;
      } catch (e) {
        debugPrint('[Dashboard] Error loading recordings: $e');
      }

      try {
        final res = await _studentRepository.getCourses();
        courses.value = res;
      } catch (e) {
        debugPrint('[Dashboard] Error loading courses: $e');
      }

      try {
        final updatedUser = await _authRepository.fetchProfile();
        AuthService.to.updateUserProfile(updatedUser);
      } catch (e) {
        debugPrint('[Dashboard] Error loading profile: $e');
      }

      debugPrint('[Dashboard] Loaded ${myBatches.length} enrolled batches, ${courses.length} courses, ${availableBatches.length} available batches');

      // Dynamically fetch live/scheduled classes for all enrolled batches sequentially to prevent port socket drops
      final upcomingClassesList = <LiveClassModel>[];
      if (myBatches.isNotEmpty) {
        for (final batch in myBatches) {
          try {
            final classes = await _studentRepository.getLiveClassesForBatch(batch.id);
            for (final c in classes) {
              if (c.status == 'scheduled' || c.status == 'live') {
                upcomingClassesList.add(LiveClassModel(
                  id: c.id,
                  batchId: c.batchId,
                  teacherId: c.teacherId,
                  title: c.title,
                  classDate: c.classDate,
                  classTime: c.classTime,
                  status: c.status,
                  agoraChannel: c.agoraChannel,
                  teacherName: c.teacherName ?? batch.teacherName,
                  batchName: batch.batchName,
                ));
              }
            }
          } catch (e) {
            debugPrint('[Dashboard] Error loading live classes for batch ${batch.id}: $e');
          }
        }
      }

      // Sort by scheduled date and time
      upcomingClassesList.sort((a, b) {
        final aDateStr = a.classDate?.split('T').first ?? '1970-01-01';
        final aTimeStr = a.classTime ?? '00:00:00';
        final aDateTime = DateTime.tryParse('${aDateStr}T$aTimeStr') ?? DateTime.fromMillisecondsSinceEpoch(0);

        final bDateStr = b.classDate?.split('T').first ?? '1970-01-01';
        final bTimeStr = b.classTime ?? '00:00:00';
        final bDateTime = DateTime.tryParse('${bDateStr}T$bTimeStr') ?? DateTime.fromMillisecondsSinceEpoch(0);

        return aDateTime.compareTo(bDateTime);
      });

      upcomingClasses.value = upcomingClassesList;

    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> enrollInBatch(String batchId, {String? paymentId}) async {
    try {
      await _studentRepository.enrollInBatch(batchId, paymentId: paymentId);
      Get.snackbar('Enrolled', 'Successfully enrolled in batch!', backgroundColor: Get.theme.primaryColor, colorText: Get.theme.colorScheme.onPrimary);
      loadDashboardData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    }
  }

  Future<void> approveParentRequest(String linkId) async {
    try {
      await _studentRepository.approveParentRequest(linkId);
      Get.snackbar('Success', 'Parent connection approved');
      try {
        Get.find<FcmService>().showLocalNotification(
          "Parent Linked Successfully 🔗",
          "Your parent's account is now connected. They can track your learning streak!"
        );
      } catch (e) {
        debugPrint('[Notification] Parent link notification failed: $e');
      }
      loadDashboardData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    }
  }

  Future<void> rejectParentRequest(String linkId) async {
    try {
      await _studentRepository.rejectParentRequest(linkId);
      Get.snackbar('Info', 'Parent connection request rejected');
      try {
        Get.find<FcmService>().showLocalNotification(
          "Connection Request Declined 🛑",
          "The parent connection request has been rejected."
        );
      } catch (e) {
        debugPrint('[Notification] Parent reject notification failed: $e');
      }
      loadDashboardData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    }
  }

  Future<void> submitAssignment(String assignmentId, String filePath) async {
    try {
      isLoading.value = true;
      await _studentRepository.submitAssignment(assignmentId, filePath: filePath);
      Get.snackbar(
        'Success',
        'Assignment submitted successfully!',
        backgroundColor: const Color(0xFF3CBDB0),
        colorText: Colors.white,
      );
      try {
        Get.find<FcmService>().showLocalNotification(
          "Assignment Submitted 📝",
          "Your solution was uploaded successfully! Keep up the good work."
        );
      } catch (e) {
        debugPrint('[Notification] Assignment notification failed: $e');
      }
      await loadDashboardData();
    } catch (e) {
      Get.snackbar(
        'Error',
        'Failed to submit assignment: $e',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      rethrow;
    } finally {
      isLoading.value = false;
    }
  }
}
