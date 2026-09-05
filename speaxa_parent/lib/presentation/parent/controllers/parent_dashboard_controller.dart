import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
import '../../../data/models/user_model.dart';
import '../../../data/models/chat_message_model.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../data/repositories/parent_repository.dart';

class ParentDashboardController extends GetxController with WidgetsBindingObserver {
  final ParentRepository _parentRepository = ParentRepository();

  final RxInt selectedIndex = 0.obs;
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  final RxList<UserModel> children = <UserModel>[].obs;
  final Rx<UserModel?> selectedChild = Rx<UserModel?>(null);
  final RxMap childOverview = {}.obs;
  final RxList<dynamic> childAttendance = <dynamic>[].obs;
  final RxList<dynamic> childAssignments = <dynamic>[].obs;
  final RxList<dynamic> childReports = <dynamic>[].obs;
  final RxList<dynamic> childObservations = <dynamic>[].obs;
  final RxList<Map<String, dynamic>> teachersList = <Map<String, dynamic>>[].obs;
  final RxList<dynamic> notificationsList = <dynamic>[].obs;

  int get unreadNotificationCount {
    return notificationsList.where((n) {
      if (n is Map) {
        final isRead = n['is_read'] == true || n['is_read'] == 1 || n['is_read'] == 'true';
        return !isRead;
      }
      return false;
    }).length;
  }

  // Link child controller
  final studentCodeController = TextEditingController();

  // Chat message controller
  final messageController = TextEditingController();
  final RxList<ChatMessageModel> chatMessages = <ChatMessageModel>[].obs;
  
  Timer? _chatTimer;

  @override
  void onInit() {
    super.onInit();
    WidgetsBinding.instance.addObserver(this);
    loadParentData();
  }

  @override
  void onClose() {
    WidgetsBinding.instance.removeObserver(this);
    stopMessagePolling();
    studentCodeController.dispose();
    messageController.dispose();
    super.onClose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      loadParentData();
    }
  }

  Future<void> loadParentData() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      final isLoggedIn = AuthService.to.isLoggedIn.value;
      if (!isLoggedIn) {
        children.clear();
        selectedChild.value = null;
        childOverview.clear();
        childAttendance.clear();
        childAssignments.clear();
        childReports.clear();
        childObservations.clear();
        teachersList.clear();
        notificationsList.clear();
        isLoading.value = false;
        return;
      }

      try {
        final freshUser = await AuthRepository().fetchProfile();
        AuthService.to.updateUserProfile(freshUser);
      } catch (pErr) {
        debugPrint('[ParentDashboard] Live profile sync notice: $pErr');
      }

      final kids = await _parentRepository.getChildren();
      children.value = kids;

      if (kids.isNotEmpty) {
        final currentId = selectedChild.value?.id;
        final match = kids.firstWhereOrNull((k) => k.id == currentId);
        final firstApproved = kids.firstWhereOrNull((k) => k.approvalStatus == null || k.approvalStatus == 'approved');
        selectedChild.value = match ?? firstApproved ?? kids.first;

        if (selectedChild.value != null && (selectedChild.value!.approvalStatus == null || selectedChild.value!.approvalStatus == 'approved')) {
          await loadChildOverview(selectedChild.value!.id);
        } else {
          childOverview.clear();
          childAttendance.clear();
          childAssignments.clear();
          childReports.clear();
          childObservations.clear();
        }
      } else {
        selectedChild.value = null;
        childOverview.clear();
        childAttendance.clear();
        childAssignments.clear();
        childReports.clear();
        childObservations.clear();
      }

      await loadTeachersAndNotifications();
      checkEmailVerificationPopup();
    } catch (e) {
      errorMessage.value = e.toString();
      debugPrint('[ParentDashboard] Load error: $e');
    } finally {
      isLoading.value = false;
    }
  }

  bool _hasPromptedEmailVerification = false;

  void checkEmailVerificationPopup() {
    if (_hasPromptedEmailVerification) return;
    final user = AuthService.to.currentUser.value;
    if (user != null && user.emailVerified == false) {
      _hasPromptedEmailVerification = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        showEmailVerificationDialog();
      });
    }
  }

  void showEmailVerificationDialog() {
    final user = AuthService.to.currentUser.value;
    if (user == null) return;

    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.mark_email_unread_rounded, size: 40, color: Colors.amber),
              ),
              const SizedBox(height: 16),
              const Text(
                "Email Verification Required",
                style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                "Your registered email (${user.email}) is not verified yet. Click below to receive a direct verification link in your email inbox.",
                style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Get.back(),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.grey.shade300),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text("Later", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        Get.back();
                        try {
                          final authRepo = AuthRepository();
                          await authRepo.sendEmailVerificationLink(user.email);
                          
                          Get.dialog(
                            Dialog(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                              child: Padding(
                                padding: const EdgeInsets.all(22),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981).withOpacity(0.12),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.mark_email_read_rounded, size: 42, color: Color(0xFF10B981)),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      "Verification Link Sent!",
                                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      "We have sent a verification link to:\n${user.email}\n\nPlease check your email inbox (and spam folder) and click the link to verify your account.",
                                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 24),
                                    SizedBox(
                                      width: double.infinity,
                                      child: ElevatedButton(
                                        onPressed: () => Get.back(),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.parentRole,
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                          padding: const EdgeInsets.symmetric(vertical: 13),
                                        ),
                                        child: const Text("OK, Got It", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        } catch (e) {
                          Get.snackbar('Error', 'Failed to send verification link: $e', backgroundColor: Colors.red, colorText: Colors.white);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.parentRole,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text("Send Link", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      barrierDismissible: true,
    );
  }

  Future<void> loadTeachersAndNotifications() async {
    try {
      final teachers = await _parentRepository.getTeachers();
      teachersList.assignAll(teachers);

      final apiClient = Get.find<ApiClient>();
      final notifRes = await apiClient.get('/parent/notifications');
      List<dynamic> notifs = [];
      if (notifRes is List) {
        notifs = notifRes;
      } else if (notifRes is Map && notifRes['notifications'] is List) {
        notifs = List<dynamic>.from(notifRes['notifications']);
      }
      notificationsList.assignAll(notifs);
    } catch (e) {
      debugPrint('[ParentDashboard] Error loading teachers/notifications: $e');
    }
  }

  Future<void> selectChild(UserModel child) async {
    selectedChild.value = child;
    if (child.approvalStatus == null || child.approvalStatus == 'approved') {
      await loadChildOverview(child.id);
    } else {
      childOverview.clear();
      childAttendance.clear();
      childAssignments.clear();
      childReports.clear();
      childObservations.clear();
    }
  }

  Future<void> loadChildOverview(String studentId) async {
    try {
      isLoading.value = true;
      final results = await Future.wait([
        _parentRepository.getChildOverview(studentId),
        _parentRepository.getChildAttendance(studentId),
        _parentRepository.getChildAssignments(studentId),
        _parentRepository.getChildReports(studentId),
        _parentRepository.getChildObservations(studentId),
      ]);

      childOverview.value = results[0] is Map ? results[0] as Map : {};
      childAttendance.value = results[1] is List ? results[1] as List : [];
      childAssignments.value = results[2] is List ? results[2] as List : [];
      childReports.value = results[3] is List ? results[3] as List : [];
      childObservations.value = results[4] is List ? results[4] as List : [];
    } catch (e) {
      errorMessage.value = e.toString();
      debugPrint('[ParentDashboard] Child overview error: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<bool> linkChildByCode() async {
    final code = studentCodeController.text.trim();
    if (code.isEmpty) {
      Get.snackbar('Error', 'Please enter student code or email address', backgroundColor: Colors.red, colorText: Colors.white);
      return false;
    }

    try {
      isLoading.value = true;
      await _parentRepository.linkChild(code);
      Get.snackbar('Request Sent', 'Link request sent to student! Pending approval.', backgroundColor: Colors.green, colorText: Colors.white);
      studentCodeController.clear();
      await loadParentData();
      return true;
    } catch (e) {
      Get.snackbar('Link Failed', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> resendReminderEmail(String studentId) async {
    try {
      isLoading.value = true;
      await _parentRepository.resendLinkEmail(studentId);
      Get.snackbar('Reminder Sent', 'Reminder email sent to student successfully!', backgroundColor: Colors.green, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  void startMessagePolling(String teacherId) {
    stopMessagePolling();
    loadChatMessages(teacherId);
    _chatTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      loadChatMessages(teacherId);
    });
  }

  void stopMessagePolling() {
    _chatTimer?.cancel();
    _chatTimer = null;
  }

  Future<void> loadChatMessages(String teacherId) async {
    try {
      final msgs = await _parentRepository.getMessages(teacherId: teacherId, studentId: selectedChild.value?.id);
      chatMessages.value = msgs;
    } catch (e) {
      debugPrint('[Chat] Error loading messages: $e');
    }
  }

  Future<void> sendMessageToTeacher(String teacherId) async {
    final text = messageController.text.trim();
    if (text.isEmpty) return;

    try {
      final sentMsg = await _parentRepository.sendMessage(
        teacherId: teacherId,
        studentId: selectedChild.value?.id,
        message: text,
      );
      chatMessages.add(sentMsg);
      messageController.clear();
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    }
  }

  Future<void> rateTeacher({required String teacherId, required double rating, required String comment}) async {
    try {
      await _parentRepository.rateTeacher(teacherId: teacherId, rating: rating, comment: comment);
      Get.snackbar('Thank You', 'Your rating and feedback have been submitted!', backgroundColor: Colors.green, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Submission Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    }
  }
}
