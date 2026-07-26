import 'package:get/get.dart';
import '../../data/repositories/student_repository.dart';
import '../network/api_client.dart';
import '../network/socket_service.dart';
import '../services/storage_service.dart';
import '../services/auth_service.dart';
import '../services/fcm_service.dart';

class InitialBinding extends Bindings {
  @override
  void dependencies() {
    // Core services are registered in main.dart.
    // Register repositories for global availability.
    Get.lazyPut(() => StudentRepository());
  }
}
