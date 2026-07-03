import 'package:get/get.dart';
import '../network/api_client.dart';
import '../constants/api_endpoints.dart';
import 'auth_service.dart';

class FcmService extends GetxService {
  static FcmService get to => Get.find<FcmService>();

  Future<FcmService> init() async {
    return this;
  }

  Future<void> registerFcmToken(String token, {String deviceType = 'mobile'}) async {
    if (!AuthService.to.isLoggedIn.value) return;
    try {
      final apiClient = Get.find<ApiClient>();
      await apiClient.post(ApiEndpoints.fcmToken, data: {
        'token': token,
        'device_type': deviceType,
      });
      print('[FCM] Token registered successfully: $token');
    } catch (e) {
      print('[FCM] Token registration failed: $e');
    }
  }
}
