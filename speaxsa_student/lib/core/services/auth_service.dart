import 'package:get/get.dart';
import '../network/socket_service.dart';
import '../services/storage_service.dart';
import '../../data/models/user_model.dart';

class AuthService extends GetxService {
  static AuthService get to => Get.find<AuthService>();

  final Rx<UserModel?> currentUser = Rx<UserModel?>(null);
  final RxBool isLoggedIn = false.obs;

  bool get isStudent => currentUser.value?.role == 'student';
  bool get isTeacher => currentUser.value?.role == 'teacher';
  bool get isParent => currentUser.value?.role == 'parent';

  Future<AuthService> init() async {
    final user = StorageService.to.getUser();
    final token = await StorageService.to.getToken();

    if (user != null && token != null && token.isNotEmpty) {
      currentUser.value = user;
      isLoggedIn.value = true;
      SocketService.to.connectSocket();
    }
    return this;
  }

  void setUserSession(UserModel user, String token) async {
    currentUser.value = user;
    isLoggedIn.value = true;
    await StorageService.to.saveUser(user);
    await StorageService.to.saveToken(token);
    SocketService.to.connectSocket();
  }

  void updateUserProfile(UserModel updatedUser) async {
    currentUser.value = updatedUser;
    await StorageService.to.saveUser(updatedUser);
  }

  Future<void> logout() async {
    currentUser.value = null;
    isLoggedIn.value = false;
    SocketService.to.disconnectSocket();
    await StorageService.to.clearAll();
    Get.offAllNamed('/landing');
  }

  String getInitialRoute() {
    if (!isLoggedIn.value || currentUser.value == null) {
      return '/landing';
    }
    switch (currentUser.value!.role) {
      case 'teacher':
        return '/teacher/dashboard';
      case 'parent':
        return '/parent/dashboard';
      case 'student':
      default:
        return '/student/dashboard';
    }
  }
}
