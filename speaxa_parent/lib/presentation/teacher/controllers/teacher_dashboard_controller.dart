import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/sop_model.dart';
import '../../../data/models/wallet_model.dart';
import '../../../data/repositories/teacher_repository.dart';

class TeacherDashboardController extends GetxController {
  final TeacherRepository _teacherRepository = TeacherRepository();

  final RxInt selectedIndex = 0.obs;
  final RxBool isLoading = true.obs;
  final RxString errorMessage = ''.obs;

  final RxMap analytics = {}.obs;
  final Rx<SopModel?> sopStatus = Rx<SopModel?>(null);
  final RxList<BatchModel> batches = <BatchModel>[].obs;
  final Rx<TeacherWalletModel?> wallet = Rx<TeacherWalletModel?>(null);
  final RxList<dynamic> documents = <dynamic>[].obs;

  // Digital Signature Controller for Agreement
  final signatureController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    loadTeacherData();
  }

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
    } catch (e) {
      errorMessage.value = e.toString();
    } finally {
      isLoading.value = false;
    }
  }

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

  @override
  void onClose() {
    signatureController.dispose();
    super.onClose();
  }
}
