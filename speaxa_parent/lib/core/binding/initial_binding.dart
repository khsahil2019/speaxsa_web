import 'package:get/get.dart';
import '../network/api_client.dart';
import '../network/socket_service.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';
import '../services/fcm_service.dart';

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    // Core services (StorageService, ApiClient, SocketService, AuthService, FcmService)
    // are already initialized and registered synchronously in main.dart prior to runApp().
  }
}
