import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../network/api_client.dart';
import '../constants/api_endpoints.dart';
import 'auth_service.dart';

// Background messaging handler (must be a top-level function)
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Process background message
  debugPrint('[FCM] Handling background message: ${message.messageId}');
}

class FcmService extends GetxService {
  static FcmService get to => Get.find<FcmService>();

  FirebaseMessaging? _messaging;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  
  bool _firebaseInitialized = false;

  Future<FcmService> init() async {
    try {
      // 1. Initialize Firebase Core
      // Wrapped in try/catch in case Google Services config files (google-services.json / plist)
      // are not downloaded or initialized yet.
      await Firebase.initializeApp();
      _messaging = FirebaseMessaging.instance;
      _firebaseInitialized = true;
      debugPrint('[FCM] Firebase initialized successfully.');

      // 2. Setup Background Handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      
      // 3. Request permissions (iOS/Android 13+)
      await _requestPermissions();

      // 4. Register listeners
      _setupForegroundListeners();
    } catch (e) {
      debugPrint('[FCM] Firebase Core could not be initialized (Configuration files may be missing). Fallback to Local Notifications only: $e');
    }

    // 5. Initialize Local Notifications (always runs so local notifications work)
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

  void _setupForegroundListeners() {
    if (!_firebaseInitialized || _messaging == null) return;

    // Listen when a message arrives while app is in foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('[FCM] Foreground message: ${message.notification?.title}');
      
      final notification = message.notification;
      final android = message.notification?.android;

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
      return await _messaging!.getToken();
    } catch (e) {
      debugPrint('[FCM] Error fetching token: $e');
      return null;
    }
  }

  Future<void> registerFcmToken(String token, {String deviceType = 'mobile'}) async {
    if (!AuthService.to.isLoggedIn.value) return;
    try {
      final apiClient = Get.find<ApiClient>();
      await apiClient.post(ApiEndpoints.fcmToken, data: {
        'token': token,
        'device_type': deviceType,
      });
      debugPrint('[FCM] Token registered successfully: $token');
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
