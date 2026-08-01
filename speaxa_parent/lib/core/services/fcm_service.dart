import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:get/get.dart';
import '../network/api_client.dart';
import '../constants/api_endpoints.dart';
import '../constants/app_colors.dart';
import 'auth_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("[FCM Parent Background] Message received: ${message.messageId}");
}

class FcmService extends GetxService {
  static FcmService get to => Get.find<FcmService>();

  FirebaseAnalytics? analytics;
  String? _cachedToken;

  Future<FcmService> init() async {
    try {
      await Firebase.initializeApp();

      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Reactively sync token as soon as user logs in
      ever(AuthService.to.isLoggedIn, (bool isLoggedIn) {
        if (isLoggedIn) {
          debugPrint('[FCM Parent] User logged in state changed to true -> Syncing FCM token...');
          syncToken();
        }
      });

      // 1. Initialize Analytics
      analytics = FirebaseAnalytics.instance;
      await analytics?.logAppOpen();

      // 2. Initialize Crashlytics
      FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
      PlatformDispatcher.instance.onError = (error, stack) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
        return true;
      };

      // 3. Initialize Cloud Messaging (FCM)
      final messaging = FirebaseMessaging.instance;

      NotificationSettings settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      debugPrint('[FCM Parent] Permission status: ${settings.authorizationStatus}');

      final token = await messaging.getToken();
      if (token != null) {
        _cachedToken = token;
        debugPrint('[FCM Parent] Device Token: $token');
        registerFcmToken(token);
      }

      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        registerFcmToken(newToken);
      });

      // 4. Foreground Banner Listener
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        final title = message.notification?.title ?? 'Speaxa Notification';
        final body = message.notification?.body ?? '';

        Get.snackbar(
          title,
          body,
          snackPosition: SnackPosition.TOP,
          backgroundColor: AppColors.primary,
          colorText: Colors.white,
          icon: const Icon(Icons.notifications_active, color: Colors.amber),
          duration: const Duration(seconds: 4),
          margin: const EdgeInsets.all(12),
          borderRadius: 12,
        );
      });

      // 5. Notification Tap Listener
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[FCM Parent Tap] Notification clicked: ${message.data}');
      });

    } catch (e) {
      debugPrint('[FCM Parent] Initialization notice: $e');
    }
    return this;
  }

  Future<void> syncToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      final tokenToRegister = token ?? _cachedToken;
      if (tokenToRegister != null) {
        await registerFcmToken(tokenToRegister);
      }
    } catch (e) {
      debugPrint('[FCM Parent] Error syncing token: $e');
    }
  }

  Future<void> registerFcmToken(String token, {String deviceType = 'mobile'}) async {
    _cachedToken = token;
    if (!AuthService.to.isLoggedIn.value) {
      debugPrint('[FCM Parent] User not logged in yet. Token cached for post-login registration.');
      return;
    }
    try {
      final currentUserId = AuthService.to.currentUser.value?.id;
      final apiClient = Get.find<ApiClient>();
      await apiClient.post(ApiEndpoints.fcmToken, data: {
        'token': token,
        'user_id': currentUserId,
        'device_type': deviceType,
      });
      debugPrint('[FCM Parent] Token registered successfully: $token for user: $currentUserId');
    } catch (e) {
      debugPrint('[FCM Parent] Token registration failed: $e');
    }
  }
}
