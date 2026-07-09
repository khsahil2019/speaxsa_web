import 'package:get/get.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/attendance_model.dart';
import '../../../data/models/assignment_model.dart';
import '../../../data/models/report_model.dart';
import '../../../data/repositories/student_repository.dart';

class StudentDashboardController extends GetxController {
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

  @override
  void onInit() {
    super.onInit();
    loadDashboardData();
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
      ]);

      myBatches.value = results[0] as List<BatchModel>;
      attendanceData.value = results[1] as AttendanceData;
      assignments.value = results[2] as List<AssignmentModel>;
      reports.value = results[3] as List<MonthlyReportModel>;
      parentRequests.value = results[4] as List<dynamic>;
      availableBatches.value = results[5] as List<BatchModel>;
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
