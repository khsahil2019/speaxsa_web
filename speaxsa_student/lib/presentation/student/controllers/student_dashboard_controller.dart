import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/attendance_model.dart';
import '../../../data/models/assignment_model.dart';
import '../../../data/models/report_model.dart';
import '../../../data/models/live_class_model.dart';
import '../../../data/models/recording_model.dart';
import '../../../data/repositories/student_repository.dart';

class StudentDashboardController extends GetxController with WidgetsBindingObserver {
  final StudentRepository _studentRepository = StudentRepository();

  final RxInt selectedIndex = 0.obs;
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  final RxList<BatchModel> myBatches = <BatchModel>[].obs;
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

      final results = await Future.wait([
        _studentRepository.getMyBatches(),
        _studentRepository.getAttendance(),
        _studentRepository.getAssignments(),
        _studentRepository.getReports(),
        _studentRepository.getParentRequests(),
        _studentRepository.getBatches(),
        _studentRepository.getRecordings(),
      ]);

      myBatches.value = results[0] as List<BatchModel>;
      attendanceData.value = results[1] as AttendanceData;
      assignments.value = results[2] as List<AssignmentModel>;
      reports.value = results[3] as List<MonthlyReportModel>;
      parentRequests.value = results[4] as List<dynamic>;
      availableBatches.value = results[5] as List<BatchModel>;
      recordings.value = results[6] as List<RecordingModel>;

      debugPrint('[Dashboard] Loaded ${myBatches.length} enrolled batches, ${availableBatches.length} available batches');

      // Dynamically fetch live/scheduled classes for all enrolled batches in parallel
      final upcomingClassesList = <LiveClassModel>[];
      if (myBatches.isNotEmpty) {
        final liveClassesResponses = await Future.wait(
          myBatches.map((b) => _studentRepository.getLiveClassesForBatch(b.id))
        );
        for (int i = 0; i < myBatches.length; i++) {
          final batch = myBatches[i];
          final classes = liveClassesResponses[i];
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

  Future<void> enrollInBatch(String batchId) async {
    try {
      await _studentRepository.enrollInBatch(batchId);
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
      loadDashboardData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    }
  }

  Future<void> rejectParentRequest(String linkId) async {
    try {
      await _studentRepository.rejectParentRequest(linkId);
      Get.snackbar('Info', 'Parent connection request rejected');
      loadDashboardData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    }
  }
}
