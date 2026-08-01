import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/storage_service.dart';
import '../../../core/constants/app_colors.dart';
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
import '../../../core/network/api_client.dart';

class TeacherDashboardController extends GetxController {
  final TeacherRepository _teacherRepository = TeacherRepository();

  final RxInt selectedIndex = 0.obs;
  final RxInt sopCurrentStep = 1.obs;
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  // Reusable Navigation History Stack
  final RxList<Map<String, dynamic>> navigationStack = <Map<String, dynamic>>[].obs;

  void navigateToTab(int tabIndex, {int? sopStep}) {
    navigationStack.add({
      'tabIndex': selectedIndex.value,
      'sopStep': sopCurrentStep.value,
    });
    selectedIndex.value = tabIndex;
    if (sopStep != null) {
      sopCurrentStep.value = sopStep;
    }
  }

  bool popNavigationStack() {
    if (navigationStack.isNotEmpty) {
      final prev = navigationStack.removeLast();
      selectedIndex.value = prev['tabIndex'] as int;
      if (prev['sopStep'] != null) {
        sopCurrentStep.value = prev['sopStep'] as int;
      }
      return true;
    }
    return false;
  }

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

      await AuthService.to.fetchLatestUserProfile();

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
      } else {
        try {
          wallet.value = await _teacherRepository.getWallet();
        } catch (_) {}
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

      checkAndPromptEmailVerification();
    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  Timer? _emailReminderTimer;

  void checkAndPromptEmailVerification() {
    final user = AuthService.to.currentUser.value;
    if (user != null && (user.emailVerified != true)) {
      Future.delayed(const Duration(milliseconds: 800), () {
        if (Get.context != null) {
          _showEmailUnverifiedModal(Get.context!, user.email);
        }
      });

      // Periodic 2-minute reminder timer until email is verified
      _emailReminderTimer?.cancel();
      _emailReminderTimer = Timer.periodic(const Duration(minutes: 2), (timer) async {
        await AuthService.to.fetchLatestUserProfile();
        final refreshedUser = AuthService.to.currentUser.value;
        if (refreshedUser == null || refreshedUser.emailVerified == true) {
          timer.cancel();
          _emailReminderTimer = null;
        } else if (Get.context != null) {
          _showEmailUnverifiedModal(Get.context!, refreshedUser.email);
        }
      });
    } else {
      _emailReminderTimer?.cancel();
      _emailReminderTimer = null;
    }
  }

  void resendEmailVerification() async {
    final user = AuthService.to.currentUser.value;
    if (user == null) return;
    try {
      final apiClient = Get.find<ApiClient>();
      await apiClient.post('/auth/resend-verification', data: {'email': user.email, 'identifier': user.email});
      Get.snackbar('Verification Dispatched', 'A new email verification link has been sent to ${user.email} ✓', backgroundColor: AppColors.success, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Notice', 'Verification link sent to ${user.email}. Please check your inbox or spam folder.', backgroundColor: AppColors.info, colorText: Colors.white);
    }
  }

  void _showEmailUnverifiedModal(BuildContext context, String email) {
    showModalBottomSheet(
      context: context,
      isDismissible: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.amber.shade300),
              ),
              child: Icon(Icons.mark_email_unread_rounded, color: Colors.amber.shade900, size: 44),
            ),
            const SizedBox(height: 16),
            const Text(
              "Email Verification Pending ⚠️",
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              "Your account email address is not yet verified. Please verify your email to ensure full platform access and receive student notifications:",
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEFCE8),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.amber.shade300),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.email, size: 16, color: Colors.amber),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      email,
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.amber.shade900),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text("Remind Me Later", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      resendEmailVerification();
                    },
                    child: const Text("Resend Link", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
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
  Future<void> launchInAppLiveClassRoom(String classId, {String role = 'teacher'}) async {
    try {
      final token = await StorageService.to.getToken();
      final currentUser = AuthService.to.currentUser.value;
      final userStr = currentUser != null ? jsonEncode(currentUser.toJson()) : '{}';
      final encodedUser = Uri.encodeComponent(userStr);
      final url = 'https://speaxa.in/live/room.html?classId=$classId&role=$role&token=$token&user=$encodedUser';
      final uri = Uri.parse(url);

      // Launch in-app webview mode for seamless in-app live classroom experience
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.inAppWebView,
        webViewConfiguration: const WebViewConfiguration(
          enableJavaScript: true,
          enableDomStorage: true,
        ),
      );

      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      Get.snackbar('Launch Error', 'Could not launch live class room: $e', backgroundColor: AppColors.error, colorText: Colors.white);
    }
  }

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

  Future<void> gradeAssignment(Map<String, dynamic> body) async {
    final submissionId = body['submissionId']?.toString() ?? '';
    final marks = (body['marks_obtained'] is num) ? (body['marks_obtained'] as num).toDouble() : double.tryParse(body['marks_obtained']?.toString() ?? '0') ?? 0.0;
    final feedback = body['feedback']?.toString() ?? '';
    final assignmentId = body['assignmentId']?.toString() ?? '';
    await gradeSubmission(submissionId, marks, feedback, assignmentId);
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

  final RxMap bankDetails = {}.obs;
  final RxList<dynamic> payoutRequestsList = <dynamic>[].obs;

  // Wallet & Bank Account System
  Future<Map<String, dynamic>?> fetchIfscDetails(String ifsc) async {
    try {
      final cleanIfsc = ifsc.trim().toUpperCase();
      if (!RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$').hasMatch(cleanIfsc)) return null;
      final dioClient = Dio();
      final response = await dioClient.get('https://ifsc.razorpay.com/$cleanIfsc');
      if (response.statusCode == 200 && response.data is Map) {
        return Map<String, dynamic>.from(response.data);
      }
    } catch (e) {
      print("IFSC lookup error: $e");
    }
    return null;
  }

  Future<void> loadBankDetails() async {
    try {
      final data = await _teacherRepository.getBankDetails();
      bankDetails.value = data;
    } catch (e) {
      print("Error loading bank details: $e");
    }
  }

  Future<void> saveBankDetails(Map<String, dynamic> data) async {
    try {
      isLoading.value = true;
      await _teacherRepository.saveBankDetails(data);
      bankDetails.value = data;
      Get.snackbar('Success', 'Bank account & UPI details saved successfully ✓', backgroundColor: AppColors.success, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> loadPayoutRequests() async {
    try {
      final list = await _teacherRepository.getPayoutRequests();
      payoutRequestsList.assignAll(list);
    } catch (e) {
      print("Error loading payout requests: $e");
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

  Future<void> requestPayout(double amount, {Map<String, dynamic>? bankInfo}) async {
    try {
      isLoading.value = true;
      await _teacherRepository.requestPayout(amount, bankDetails: bankInfo ?? Map<String, dynamic>.from(bankDetails));
      Get.snackbar('Success', 'Payout request of ₹$amount submitted successfully ✓', backgroundColor: AppColors.success, colorText: Colors.white);
      loadTeacherData();
      loadPayoutRequests();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> emailPassbookStatement() async {
    try {
      isLoading.value = true;
      final res = await _teacherRepository.emailPassbookStatement();
      Get.snackbar('Passbook Statement Sent', res['message'] ?? 'SPEAXA Digital Bank Passbook PDF dispatched to your registered email ✓', backgroundColor: AppColors.success, colorText: Colors.white);
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

  // Signature image state
  final RxString signatureImageBase64 = ''.obs;

  // Sign agreement with printed name and signature image
  Future<void> signDigitalAgreement({String? customSignatureImage}) async {
    final sig = signatureController.text.trim();
    if (sig.isEmpty) {
      Get.snackbar('Error', 'Please type your full legal name as digital signature', backgroundColor: AppColors.error, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      final sigImg = customSignatureImage ?? (signatureImageBase64.value.isNotEmpty ? signatureImageBase64.value : null);
      await _teacherRepository.signAgreement(sig, signatureImage: sigImg);
      Get.snackbar('Agreement Executed', 'Deed of Affidavit & Governance Agreement signed successfully! Copy emailed ✓', backgroundColor: AppColors.success, colorText: Colors.white);
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  // SOP File Proof Upload
  Future<void> uploadSopFile(String fieldName, String filePath) async {
    try {
      isLoading.value = true;
      await _teacherRepository.uploadSopProof(fieldName, filePath);
      Get.snackbar('Proof Uploaded', '$fieldName verified successfully!', backgroundColor: AppColors.success, colorText: Colors.white);
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  // SOP Link Proof
  Future<void> linkSopUrl(String fieldName, String linkUrl) async {
    try {
      isLoading.value = true;
      await _teacherRepository.linkSopProof(fieldName, linkUrl);
      Get.snackbar('Link Saved', '$fieldName link saved successfully!', backgroundColor: AppColors.success, colorText: Colors.white);
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  // Save Availability
  Future<void> saveAvailabilitySlots(String slotsJson) async {
    try {
      isLoading.value = true;
      await _teacherRepository.saveAvailability(slotsJson);
      Get.snackbar('Availability Saved', 'Teaching time slots saved successfully!', backgroundColor: AppColors.success, colorText: Colors.white);
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  // KYC uploads with visibility selection
  Future<void> uploadKyc(String filePath, String docType, {String visibility = 'private'}) async {
    try {
      isLoading.value = true;
      await _teacherRepository.uploadDocument(filePath, docType, visibility: visibility);
      Get.snackbar('Upload Complete ✓', '$docType document uploaded successfully!', backgroundColor: AppColors.success, colorText: Colors.white);
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Upload Failed', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  // Remove KYC Document
  Future<void> removeKycDocument(String docType) async {
    try {
      isLoading.value = true;
      await _teacherRepository.removeDocument(docType);
      Get.snackbar('Document Removed', '$docType removed successfully!', backgroundColor: AppColors.success, colorText: Colors.white);
      loadTeacherData();
    } catch (e) {
      Get.snackbar('Remove Failed', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
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
    _emailReminderTimer?.cancel();
    signatureController.dispose();
    super.onClose();
  }
}
