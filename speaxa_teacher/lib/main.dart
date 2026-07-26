import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'core/binding/initial_binding.dart';
import 'core/constants/app_constants.dart';
import 'core/constants/app_themes.dart';
import 'core/routes/app_pages.dart';
import 'core/services/auth_service.dart';
import 'core/services/storage_service.dart';
import 'core/network/api_client.dart';
import 'core/network/socket_service.dart';
import 'core/services/fcm_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Async core service initializations
  final storageService = await StorageService().init();
  Get.put(storageService);

  final apiClient = await ApiClient().init();
  Get.put(apiClient);

  final socketService = await SocketService().init();
  Get.put(socketService);

  final authService = await AuthService().init();
  Get.put(authService);

  final fcmService = await FcmService().init();
  Get.put(fcmService);

  runApp(const SpeaxaApp());
}

class SpeaxaApp extends StatelessWidget {
  const SpeaxaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = StorageService.to.isDarkMode();
    final initialRoute = AuthService.to.getInitialRoute();

    return GetMaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      initialBinding: InitialBinding(),
      theme: AppThemes.lightTheme,
      darkTheme: AppThemes.darkTheme,
      themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
      initialRoute: initialRoute,
      getPages: AppPages.pages,
    );
  }
}
