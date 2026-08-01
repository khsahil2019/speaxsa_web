import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../network/api_client.dart';
import '../constants/api_endpoints.dart';
import 'auth_service.dart';

// Background messaging handler (must be a top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('[FCM] Handling background message: ${message.messageId}');
}

class FcmService extends GetxService {
  static FcmService get to => Get.find<FcmService>();

  FirebaseMessaging? _messaging;
  FirebaseAnalytics? analytics;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  bool _firebaseInitialized = false;

  Future<FcmService> init() async {
    try {
      await Firebase.initializeApp();
      _messaging = FirebaseMessaging.instance;
      _firebaseInitialized = true;
      debugPrint('[FCM] Firebase initialized successfully.');

      // 1. Initialize Analytics
      analytics = FirebaseAnalytics.instance;
      await analytics?.logAppOpen();

      // 2. Initialize Crashlytics
      FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
      PlatformDispatcher.instance.onError = (error, stack) {
        FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
        return true;
      };

      // 3. Setup Background Handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      
      // 4. Request permissions (iOS/Android 13+)
      await _requestPermissions();

      // 5. Register listeners
      _setupForegroundListeners();
    } catch (e) {
      debugPrint('[FCM] Firebase Core notice: $e');
    }

    // Initialize Local Notifications
    await _initLocalNotifications();

    return this;
  }

  Future<void> _requestPermissions() async {
    if (!_firebaseInitialized || _messaging == null) return;
    try {
      NotificationSettings settings = await _messaging!.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      debugPrint('[FCM] Permission status: ${settings.authorizationStatus}');
    } catch (e) {
      debugPrint('[FCM] Failed to request permissions: $e');
    }
  }

  Future<void> _initLocalNotifications() async {
    try {
      const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const InitializationSettings settings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _localNotifications.initialize(
        settings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          debugPrint('[LocalNotification] Click payload: ${response.payload}');
          // Handle navigation or actions here if payload is present
        },
      );

      // Create standard Android channel for heads-up notifications
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_importance_channel',
        'High Importance Notifications',
        description: 'Used for important alerts and class notifications.',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      debugPrint('[LocalNotification] Initialized successfully.');
    } catch (e) {
      debugPrint('[LocalNotification] Initialization failed: $e');
    }
  }

  String? _cachedToken;

  void _setupForegroundListeners() {
    if (!_firebaseInitialized || _messaging == null) return;

    // Reactively register token as soon as user logs in
    ever(AuthService.to.isLoggedIn, (bool isLoggedIn) {
      if (isLoggedIn) {
        debugPrint('[FCM] User logged in state changed to true -> Syncing FCM token...');
        syncToken();
      }
    });

    // Listen when a message arrives while app is in foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('[FCM] Foreground message: ${message.notification?.title}');
      
      final notification = message.notification;

      if (notification != null) {
        showLocalNotification(
          notification.title ?? 'New Update',
          notification.body ?? '',
          payload: message.data.toString(),
        );
      }
    });

    // Handle token refresh
    _messaging!.onTokenRefresh.listen((token) {
      registerFcmToken(token);
    });

    // Check for initial message (if app was opened from terminated state)
    _messaging!.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        debugPrint('[FCM] App opened from terminated state via message: ${message.messageId}');
      }
    });

    // Listen when app is opened from background state via clicking notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM] App opened from background state via message: ${message.messageId}');
    });

    // Attempt to register current token
    getToken().then((token) {
      if (token != null) {
        registerFcmToken(token);
      }
    });
  }

  Future<String?> getToken() async {
    if (!_firebaseInitialized || _messaging == null) return null;
    try {
      final token = await _messaging!.getToken();
      if (token != null) _cachedToken = token;
      return token;
    } catch (e) {
      debugPrint('[FCM] Error fetching token: $e');
      return null;
    }
  }

  Future<void> syncToken() async {
    final token = await getToken();
    final tokenToRegister = token ?? _cachedToken;
    if (tokenToRegister != null) {
      await registerFcmToken(tokenToRegister);
    }
  }

  Future<void> registerFcmToken(String token, {String deviceType = 'mobile'}) async {
    _cachedToken = token;
    if (!AuthService.to.isLoggedIn.value) {
      debugPrint('[FCM] User not logged in yet. Token cached for post-login registration.');
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
      debugPrint('[FCM] Token registered successfully: $token for user: $currentUserId');
    } catch (e) {
      debugPrint('[FCM] Token registration failed: $e');
    }
  }

  /// Show standard local notification instantly (can be triggered by specific client-side actions)
  Future<void> showLocalNotification(String title, String body, {String? payload}) async {
    try {
      const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
        'high_importance_channel',
        'High Importance Notifications',
        channelDescription: 'Used for important alerts and class notifications.',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
      );

      const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const NotificationDetails details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      // Generate a unique ID using hashcode of title
      final id = title.hashCode;
      await _localNotifications.show(id, title, body, details, payload: payload);
      debugPrint('[LocalNotification] Displayed: $title');
    } catch (e) {
      debugPrint('[LocalNotification] Display error: $e');
    }
  }
}
