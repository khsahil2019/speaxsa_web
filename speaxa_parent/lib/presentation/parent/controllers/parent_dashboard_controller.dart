import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
import '../../../data/models/user_model.dart';
import '../../../data/models/chat_message_model.dart';
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

      final kids = await _parentRepository.getChildren();
      children.value = kids;

      if (kids.isNotEmpty) {
        // If previous selection exists in kids, keep it, otherwise pick first
        final currentId = selectedChild.value?.id;
        final match = kids.firstWhereOrNull((k) => k.id == currentId);
        selectedChild.value = match ?? kids.first;
        await loadChildOverview(selectedChild.value!.id);
      } else {
        selectedChild.value = null;
        childOverview.clear();
      }

      await loadTeachersAndNotifications();
    } catch (e) {
      errorMessage.value = e.toString();
      debugPrint('[ParentDashboard] Load error: $e');
    } finally {
      isLoading.value = false;
    }
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
    await loadChildOverview(child.id);
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

  Future<void> linkChildByCode() async {
    final code = studentCodeController.text.trim();
    if (code.isEmpty) {
      Get.snackbar('Error', 'Please enter student code or email address', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      await _parentRepository.linkChild(code);
      Get.snackbar('Request Sent', 'Link request sent to student! Pending approval.', backgroundColor: Colors.green, colorText: Colors.white);
      studentCodeController.clear();
      await loadParentData();
    } catch (e) {
      Get.snackbar('Link Failed', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
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
