import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../data/models/user_model.dart';
import '../../../data/models/chat_message_model.dart';
import '../../../data/repositories/parent_repository.dart';

class ParentDashboardController extends GetxController {
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

  // Link child controller
  final studentCodeController = TextEditingController();

  // Chat message controller
  final messageController = TextEditingController();
  final RxList<ChatMessageModel> chatMessages = <ChatMessageModel>[].obs;
  
  Timer? _chatTimer;

  @override
  void onInit() {
    super.onInit();
    loadParentData();
  }

  Future<void> loadParentData() async {
    try {
      isLoading.value = true;
      errorMessage.value = '';

      final kids = await _parentRepository.getChildren();
      children.value = kids;

      if (kids.isNotEmpty) {
        selectedChild.value = kids.first;
        await loadChildOverview(kids.first.id);
      }
    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
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

      childOverview.value = results[0] as Map;
      childAttendance.value = results[1] as List;
      childAssignments.value = results[2] as List;
      childReports.value = results[3] as List;
      childObservations.value = results[4] as List;
    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> linkChildByCode() async {
    final code = studentCodeController.text.trim();
    if (code.isEmpty) {
      Get.snackbar('Error', 'Please enter student code or email', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      await _parentRepository.linkChild(code);
      Get.snackbar('Request Sent', 'Link request sent to student! Pending approval.', backgroundColor: Colors.green, colorText: Colors.white);
      studentCodeController.clear();
      loadParentData();
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
    if (selectedChild.value == null) return;
    try {
      final msgs = await _parentRepository.getMessages(teacherId: teacherId, studentId: selectedChild.value!.id);
      chatMessages.value = msgs;
    } catch (e) {
      print('[Chat] Error loading messages: $e');
    }
  }

  Future<void> sendMessageToTeacher(String teacherId) async {
    final text = messageController.text.trim();
    if (text.isEmpty || selectedChild.value == null) return;

    try {
      final sentMsg = await _parentRepository.sendMessage(
        teacherId: teacherId,
        studentId: selectedChild.value!.id,
        message: text,
      );
      chatMessages.add(sentMsg);
      messageController.clear();
    } catch (e) {
      Get.snackbar('Error', e.toString());
    }
  }

  @override
  void onClose() {
    stopMessagePolling();
    studentCodeController.dispose();
    messageController.dispose();
    super.onClose();
  }
}
