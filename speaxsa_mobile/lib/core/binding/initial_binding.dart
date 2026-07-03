import 'package:get/get.dart';
import '../network/api_client.dart';
import '../network/socket_service.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';
import '../services/fcm_service.dart';

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    Get.putAsync(() => StorageService().init());
    Get.putAsync(() => ApiClient().init());
    Get.putAsync(() => SocketService().init());
    Get.putAsync(() => AuthService().init());
    Get.putAsync(() => FcmService().init());
  }
}
