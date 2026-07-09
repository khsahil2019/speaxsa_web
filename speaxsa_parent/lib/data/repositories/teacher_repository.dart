import 'package:get/get.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../models/batch_model.dart';
import '../models/sop_model.dart';
import '../models/wallet_model.dart';

class TeacherRepository {
  final ApiClient _apiClient = Get.find<ApiClient>();

  Future<Map<String, dynamic>> getAnalytics() async {
    final response = await _apiClient.get(ApiEndpoints.teacherAnalytics);
    return response as Map<String, dynamic>;
  }

  Future<SopModel?> getSopStatus() async {
    final response = await _apiClient.get(ApiEndpoints.teacherSop);
    if (response == null) return null;
    return SopModel.fromJson(response);
  }

  Future<void> submitSop(Map<String, dynamic> checklist) async {
    await _apiClient.post('/teacher/sop/submit', data: {'teacher_checklist': checklist});
  }

  Future<void> signAgreement(String digitalSignature) async {
    await _apiClient.post('/teacher/sop/sign-agreement', data: {'digital_signature': digitalSignature});
  }

  Future<List<BatchModel>> getBatches() async {
    final response = await _apiClient.get(ApiEndpoints.teacherBatches);
    return (response as List).map((e) => BatchModel.fromJson(e)).toList();
  }

  Future<TeacherWalletModel> getWallet() async {
    final analytics = await getAnalytics();
    return TeacherWalletModel.fromJson(analytics['wallet'] ?? {});
  }

  Future<List<dynamic>> getDocuments() async {
    final response = await _apiClient.get(ApiEndpoints.teacherDocuments);
    return response as List;
  }

  Future<void> uploadDocument(String filePath, String docType) async {
    await _apiClient.uploadFile(
      '${ApiEndpoints.teacherDocuments}/upload',
      filePath,
      fieldName: 'document',
      extraFields: {'doc_type': docType},
    );
  }
}
