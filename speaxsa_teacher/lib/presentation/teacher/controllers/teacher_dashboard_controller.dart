import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/sop_model.dart';
import '../../../data/models/wallet_model.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/live_class_model.dart';
import '../../../data/models/assignment_model.dart';
import '../../../data/repositories/teacher_repository.dart';
import '../../../data/repositories/auth_repository.dart';
import 'package:file_picker/file_picker.dart';
import '../../../core/services/auth_service.dart';

class TeacherDashboardController extends GetxController {
  final TeacherRepository _teacherRepository = TeacherRepository();

  final RxInt selectedIndex = 0.obs;
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  // Reactive Data States
  final RxMap analytics = {}.obs;
  final Rx<SopModel?> sopStatus = Rx<SopModel?>(null);
  final RxList<BatchModel> batches = <BatchModel>[].obs;
  final Rx<TeacherWalletModel?> wallet = Rx<TeacherWalletModel?>(null);
  final RxList<dynamic> documents = <dynamic>[].obs;
  
  final RxList<CourseModel> courses = <CourseModel>[].obs;
  final RxList<LiveClassModel> liveClasses = <LiveClassModel>[].obs;
  final RxList<AssignmentModel> assignments = <AssignmentModel>[].obs;
  final RxList<dynamic> observations = <dynamic>[].obs;
  final RxList<dynamic> attendanceLogs = <dynamic>[].obs;
  final RxList<dynamic> notes = <dynamic>[].obs;
  final RxList<dynamic> conversations = <dynamic>[].obs;
  final RxList<dynamic> activeMessages = <dynamic>[].obs;
  final RxMap referralData = {}.obs;
  final RxList<dynamic> rewards = <dynamic>[].obs;
  final RxMap levelDetails = {}.obs;
  final RxList<dynamic> walletStatement = <dynamic>[].obs;
  final RxList<dynamic> certificates = <dynamic>[].obs;

  // Digital Signature Controller for Agreement
  final signatureController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    loadTeacherData();
  }

  // Load all dashboard overview data
  Future<void> loadTeacherData() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      final results = await Future.wait([
        _teacherRepository.getAnalytics(),
        _teacherRepository.getSopStatus(),
        _teacherRepository.getBatches(),
        _teacherRepository.getDocuments(),
      ]);

      analytics.value = results[0] as Map;
      sopStatus.value = results[1] as SopModel?;
      batches.value = results[2] as List<BatchModel>;
      documents.value = results[3] as List<dynamic>;

      if (analytics['wallet'] != null) {
        wallet.value = TeacherWalletModel.fromJson(analytics['wallet']);
      }
      
      // Auto-load secondary lists
      loadCourses();
      loadLiveClasses();
      loadAssignments();
      loadObservations();
      loadAttendanceLogs();
      loadNotes();
      loadChats();
      loadReferralData();
      loadLevelData();
      loadCertificates();
      loadWalletStatement();
    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  // Courses
  Future<void> loadCourses() async {
    try {
      final list = await _teacherRepository.getCourses();
      courses.assignAll(list);
    } catch (e) {
      print("Error loading courses: $e");
    }
  }

  Future<void> createCourse(Map<String, dynamic> data) async {
    try {
      isLoading.value = true;
      await _teacherRepository.createCourse(data);
      Get.snackbar('Success', 'Course draft created successfully!');
      loadCourses();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  Future<String?> uploadCourseThumbnail(String filePath) async {
    try {
      isLoading.value = true;
      final url = await _teacherRepository.uploadCourseThumbnail(filePath);
      Get.snackbar('Success', 'Course thumbnail uploaded!');
      return url;
    } catch (e) {
      Get.snackbar('Error', e.toString());
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> requestCourseApproval(String courseId) async {
    try {
      isLoading.value = true;
      await _teacherRepository.requestCourseApproval(courseId);
      Get.snackbar('Success', 'Course approval requested!');
      loadCourses();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // Batches
  Future<void> createBatch(Map<String, dynamic> data, String plannerPath, String? demoVideoPath) async {
    try {
      isLoading.value = true;
      await _teacherRepository.createBatch(data, plannerPath, demoVideoPath);
      Get.snackbar('Success', 'Study batch created successfully!');
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  Future<List<dynamic>> getBatchStudents(String batchId) async {
    try {
      return await _teacherRepository.getBatchStudents(batchId);
    } catch (e) {
      Get.snackbar('Error', e.toString());
      return [];
    }
  }

  // Live Classes
  Future<void> loadLiveClasses() async {
    try {
      final list = await _teacherRepository.getLiveClasses();
      liveClasses.assignAll(list);
    } catch (e) {
      print("Error loading live classes: $e");
    }
  }

  Future<void> createLiveClass(Map<String, dynamic> data) async {
    try {
      isLoading.value = true;
      await _teacherRepository.createLiveClass(data);
      Get.snackbar('Success', 'Live class scheduled successfully!');
      loadLiveClasses();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // Observations
  Future<void> loadObservations() async {
    try {
      final list = await _teacherRepository.getObservations();
      observations.assignAll(list);
    } catch (e) {
      print("Error loading observations: $e");
    }
  }

  Future<void> createObservation(Map<String, dynamic> data) async {
    try {
      isLoading.value = true;
      await _teacherRepository.createObservation(data);
      Get.snackbar('Success', 'Observation logged successfully!');
      loadObservations();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // Assignments
  Future<void> loadAssignments() async {
    try {
      final list = await _teacherRepository.getAssignments();
      assignments.assignAll(list);
    } catch (e) {
      print("Error loading assignments: $e");
    }
  }

  Future<void> createAssignment(Map<String, dynamic> data, String filePath) async {
    try {
      isLoading.value = true;
      await _teacherRepository.createAssignment(data, filePath);
      Get.snackbar('Success', 'Homework assignment created successfully!');
      loadAssignments();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  Future<List<dynamic>> getAssignmentSubmissions(String assignmentId) async {
    try {
      return await _teacherRepository.getAssignmentSubmissions(assignmentId);
    } catch (e) {
      Get.snackbar('Error', e.toString());
      return [];
    }
  }

  Future<void> gradeSubmission(String submissionId, double marks, String feedback, String assignmentId) async {
    try {
      isLoading.value = true;
      await _teacherRepository.gradeSubmission(submissionId, marks, feedback);
      Get.snackbar('Success', 'Submission graded successfully!');
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // Attendance
  Future<void> loadAttendanceLogs() async {
    try {
      final list = await _teacherRepository.getAttendanceLogs();
      attendanceLogs.assignAll(list);
    } catch (e) {
      print("Error loading attendance: $e");
    }
  }

  // Notes (Study Materials)
  Future<void> loadNotes() async {
    try {
      final list = await _teacherRepository.getNotes();
      notes.assignAll(list);
    } catch (e) {
      print("Error loading study materials: $e");
    }
  }

  Future<void> uploadNote(Map<String, dynamic> data, String? filePath) async {
    try {
      isLoading.value = true;
      await _teacherRepository.uploadNote(data, filePath);
      Get.snackbar('Success', 'Study material workbook uploaded!');
      loadNotes();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // Chats / Direct Messaging
  Future<void> loadChats() async {
    try {
      final list = await _teacherRepository.getConversations();
      conversations.assignAll(list);
    } catch (e) {
      print("Error loading conversations: $e");
    }
  }

  Future<void> loadMessages(String conversationId) async {
    try {
      activeMessages.clear();
      final list = await _teacherRepository.getMessages(conversationId);
      activeMessages.assignAll(list);
    } catch (e) {
      print("Error loading messages: $e");
    }
  }

  Future<void> sendMessage(String conversationId, String text) async {
    if (text.trim().isEmpty) return;
    try {
      final sent = await _teacherRepository.sendMessage(conversationId, text);
      activeMessages.add(sent);
      loadChats(); // refresh conversation item preview
    } catch (e) {
      Get.snackbar('Error', e.toString());
    }
  }

  // Referrals
  Future<void> loadReferralData() async {
    try {
      final data = await _teacherRepository.getReferrals();
      referralData.value = data;
      final rewardList = await _teacherRepository.getRewards();
      rewards.assignAll(rewardList);
    } catch (e) {
      print("Error loading referral data: $e");
    }
  }

  // Level
  Future<void> loadLevelData() async {
    try {
      final data = await _teacherRepository.getLevelDetails();
      levelDetails.value = data;
    } catch (e) {
      print("Error loading level details: $e");
    }
  }

  // Certificates
  Future<void> loadCertificates() async {
    try {
      final list = await _teacherRepository.getCertificates();
      certificates.assignAll(list);
    } catch (e) {
      print("Error loading certificates: $e");
    }
  }

  // Wallet statements
  Future<void> loadWalletStatement() async {
    try {
      final list = await _teacherRepository.getWalletStatement();
      walletStatement.assignAll(list);
    } catch (e) {
      print("Error loading wallet statement: $e");
    }
  }

  Future<void> requestPayout(double amount) async {
    try {
      isLoading.value = true;
      await _teacherRepository.requestPayout(amount);
      Get.snackbar('Success', 'Payout request submitted successfully!');
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // SOP Setup checklist submit
  Future<void> submitSopChecklist(Map<String, dynamic> checklist) async {
    try {
      isLoading.value = true;
      await _teacherRepository.submitSop(checklist);
      Get.snackbar('Submitted', 'SOP submitted successfully for admin verification!');
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // Sign agreement
  Future<void> signDigitalAgreement() async {
    final sig = signatureController.text.trim();
    if (sig.isEmpty) {
      Get.snackbar('Error', 'Please type your full legal name as digital signature');
      return;
    }

    try {
      isLoading.value = true;
      await _teacherRepository.signAgreement(sig);
      Get.snackbar('Agreement Signed', 'Digital teaching agreement signed successfully! You can now launch classes.');
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  // KYC uploads
  Future<void> uploadKyc(String filePath, String docType) async {
    try {
      isLoading.value = true;
      await _teacherRepository.uploadDocument(filePath, docType);
      Get.snackbar('Success', '$docType uploaded successfully!');
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> updateProfileAvatar() async {
    final result = await FilePicker.pickFiles(type: FileType.image);
    if (result != null && result.files.single.path != null) {
      isLoading.value = true;
      try {
        final authRepo = AuthRepository();
        final photoUrl = await authRepo.uploadAvatar(result.files.single.path!);
        if (photoUrl.isNotEmpty) {
          final current = AuthService.to.currentUser.value;
          if (current != null) {
            final updated = await authRepo.updateProfile({'photo_url': photoUrl});
            AuthService.to.currentUser.value = updated;
            Get.snackbar('Success', 'Profile photo updated successfully!');
          }
        }
      } catch (e) {
        Get.snackbar('Error', 'Failed to upload photo: $e');
      } finally {
        isLoading.value = false;
      }
    }
  }

  @override
  void onClose() {
    signatureController.dispose();
    super.onClose();
  }
}
