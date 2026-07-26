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
import '../../../core/network/api_client.dart';
import '../../shared/widgets/razorpay_checkout_sheet.dart';

class StudentDashboardController extends GetxController with WidgetsBindingObserver {
  final StudentRepository _studentRepository = StudentRepository();
  final AuthRepository _authRepository = AuthRepository();

  // Dynamic stats from speaxa.in database
  final RxInt statStudents = 0.obs;
  final RxInt statTeachers = 0.obs;
  final RxInt statCourses = 0.obs;
  final RxInt statClasses = 0.obs;

  // Course search and filter fields
  final RxString courseSearchQuery = ''.obs;
  final RxString courseSelectedSubject = 'All'.obs;

  // Enquiry form controllers
  final enquiryNameController = TextEditingController();
  final enquiryEmailController = TextEditingController();
  final enquiryPhoneController = TextEditingController();
  final enquiryMessageController = TextEditingController();
  final RxBool isSubmittingEnquiry = false.obs;

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
    enquiryNameController.dispose();
    enquiryEmailController.dispose();
    enquiryPhoneController.dispose();
    enquiryMessageController.dispose();
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

      final isLoggedIn = AuthService.to.isLoggedIn.value;
      if (!isLoggedIn) {
        myBatches.clear();
        attendanceData.value = null;
        assignments.clear();
        reports.clear();
        parentRequests.clear();
        recordings.clear();
        upcomingClasses.clear();

        try {
          final resCourses = await _studentRepository.getCourses();
          courses.value = resCourses;

          final allBatches = <BatchModel>[];
          await Future.wait(resCourses.map((c) async {
            try {
              final resBatches = await _studentRepository.getBatches(courseId: c.id);
              allBatches.addAll(resBatches);
            } catch (e) {
              debugPrint('[Dashboard] Error loading batches for course ${c.id}: $e');
            }
          }));
          availableBatches.value = allBatches;
        } catch (e) {
          debugPrint('[Dashboard] Error loading guest data: $e');
        }

        try {
          final stats = await Get.find<ApiClient>().get('/public/stats');
          if (stats is Map<String, dynamic>) {
            statStudents.value = stats['students'] ?? 0;
            statTeachers.value = stats['teachers'] ?? 0;
            statCourses.value = stats['courses'] ?? 0;
            statClasses.value = stats['classesCompleted'] ?? 0;
          }
        } catch (e) {
          debugPrint('[Dashboard] Error loading public stats: $e');
        }
        return;
      }

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
      if (AuthService.to.isLoggedIn.value) {
        checkPendingEnrollment();
      }
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

  void checkPendingEnrollment() {
    final pendingId = AuthService.to.pendingBatchId;
    if (pendingId == null) return;
    
    // Clear pending batch ID so it doesn't trigger repeatedly
    AuthService.to.pendingBatchId = null;

    final batch = availableBatches.firstWhereOrNull((b) => b.id == pendingId);
    if (batch == null) {
      debugPrint('[Dashboard] Pending batch $pendingId not found in available batches');
      return;
    }

    final course = courses.firstWhereOrNull((c) => c.id == batch.courseId);
    if (course == null) {
      debugPrint('[Dashboard] Course not found for pending batch $pendingId');
      return;
    }

    final user = AuthService.to.currentUser.value;
    if (user == null) return;

    // Show Razorpay Checkout Sheet directly using Get.bottomSheet
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Get.bottomSheet(
        RazorpayCheckoutSheet(
          amount: course.fees,
          courseTitle: course.title,
          batchName: batch.batchName,
          email: user.email,
          phone: user.phone,
          onSuccess: (paymentId) {
            enrollInBatch(batch.id, paymentId: paymentId);
          },
        ),
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
      );
    });
  }

  Future<void> submitEnquiry() async {
    final name = enquiryNameController.text.trim();
    final email = enquiryEmailController.text.trim();
    final phone = enquiryPhoneController.text.trim();
    final message = enquiryMessageController.text.trim();

    if (name.isEmpty || email.isEmpty || message.isEmpty) {
      Get.snackbar(
        'Required Fields ⚠️',
        'Please enter name, email, and message.',
        backgroundColor: Colors.redAccent.withOpacity(0.85),
        colorText: Colors.white,
      );
      return;
    }

    try {
      isSubmittingEnquiry.value = true;
      await Get.find<ApiClient>().post('/support/public-connect', data: {
        'name': name,
        'email': email,
        'phone': phone,
        'role': 'student',
        'message': message,
      });

      Get.snackbar(
        'Message Sent! 📬',
        'Thank you for contacting us! We will get back to you shortly.',
        backgroundColor: Colors.white.withOpacity(0.85),
        colorText: const Color(0xFF1E293B),
        borderRadius: 16,
        margin: const EdgeInsets.all(16),
        barBlur: 15,
        boxShadows: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      );

      enquiryNameController.clear();
      enquiryEmailController.clear();
      enquiryPhoneController.clear();
      enquiryMessageController.clear();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isSubmittingEnquiry.value = false;
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
