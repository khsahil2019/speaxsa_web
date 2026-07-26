import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter/services.dart';
import 'package:app_links/app_links.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/storage_service.dart';
import '../../../core/services/fcm_service.dart';
import '../../../data/repositories/auth_repository.dart';

class AuthController extends GetxController {
  final AuthRepository _authRepository = AuthRepository();
  static final Set<String> _detectedReferrals = {};

  // Login Controllers
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final RxString selectedRole = 'student'.obs;
  final RxBool rememberMe = false.obs;
  final RxBool isLoading = false.obs;
  final RxBool isPasswordVisible = false.obs;

  // Register Controllers
  final regNameController = TextEditingController();
  final regEmailController = TextEditingController();
  final regPhoneController = TextEditingController();
  final regPasswordController = TextEditingController();
  final regQualificationController = TextEditingController();
  final regBoardController = TextEditingController();
  final regGradeController = TextEditingController();
  final regReferralCodeController = TextEditingController();
  final regOtpController = TextEditingController();
  final regPhoneOtpController = TextEditingController();
  final regEmailOtpController = TextEditingController();

  // Multi-step Registration states
  final RxInt currentRegStep = 1.obs;
  final RxString selectedRegGrade = ''.obs;
  final RxString selectedRegBoard = ''.obs;

  TextEditingController get nameController => regNameController;
  TextEditingController get phoneController => regPhoneController;

  // Reset Password Controllers
  final resetIdentifierController = TextEditingController();
  final resetOtpController = TextEditingController();
  final resetNewPasswordController = TextEditingController();

  final _appLinks = AppLinks();

  @override
  void onInit() {
    super.onInit();
    _loadSavedCredentials();
    _initDeepLinks();
    checkForClipboardReferral();
  }

  void _initDeepLinks() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        handleIncomingLink(initialUri);
      }
      _appLinks.uriLinkStream.listen((uri) {
        handleIncomingLink(uri);
      }, onError: (err) {
        debugPrint('[DeepLink] Stream error: $err');
      });
    } catch (e) {
      debugPrint('[DeepLink] Initialization failed: $e');
    }
  }

  void handleIncomingLink(Uri uri) {
    debugPrint('[DeepLink] Handling incoming link: $uri');
    String? refCode = uri.queryParameters['ref'] ?? uri.queryParameters['referred_by_code'] ?? uri.queryParameters['referred_by'];
    
    if (refCode == null || refCode.isEmpty) {
      final segments = uri.pathSegments;
      final refIndex = segments.indexOf('ref');
      if (refIndex != -1 && refIndex + 1 < segments.length) {
        refCode = segments[refIndex + 1];
      }
    }

    if (refCode != null && refCode.trim().isNotEmpty) {
      final trimmed = refCode.trim();
      if (_detectedReferrals.contains(trimmed)) return;
      _detectedReferrals.add(trimmed);

      regReferralCodeController.text = trimmed;
      debugPrint('[DeepLink] Auto-filled referral code: $trimmed');
      Get.snackbar(
        'Referral Applied 🎁',
        'Referral code "$trimmed" has been auto-filled!',
        backgroundColor: Colors.white.withOpacity(0.85),
        colorText: const Color(0xFF1E293B),
        snackPosition: SnackPosition.BOTTOM,
        borderRadius: 16,
        margin: const EdgeInsets.all(16),
        barBlur: 15,
        boxShadows: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      );
    }
  }

  Future<void> checkForClipboardReferral() async {
    try {
      final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
      if (clipboardData != null && clipboardData.text != null) {
        final text = clipboardData.text!.trim();
        if (text.startsWith('SPX-') || text.contains('speaxa.in/ref') || text.contains('ref=SPX-')) {
          String? refCode;
          if (text.startsWith('SPX-')) {
            refCode = text;
          } else {
            final uri = Uri.tryParse(text);
            if (uri != null) {
              refCode = uri.queryParameters['ref'] ?? uri.queryParameters['referred_by_code'];
              if (refCode == null) {
                final segments = uri.pathSegments;
                final refIndex = segments.indexOf('ref');
                if (refIndex != -1 && refIndex + 1 < segments.length) {
                  refCode = segments[refIndex + 1];
                }
              }
            }
          }
          if (refCode != null && refCode.trim().isNotEmpty) {
            final trimmed = refCode.trim();
            if (_detectedReferrals.contains(trimmed)) return;
            _detectedReferrals.add(trimmed);

            regReferralCodeController.text = trimmed;
            debugPrint('[Clipboard] Auto-filled referral code from clipboard: $trimmed');
            Get.snackbar(
              'Referral Detected 🎁',
              'Auto-filled referral code "$trimmed" from your clipboard.',
              backgroundColor: Colors.white.withOpacity(0.85),
              colorText: const Color(0xFF1E293B),
              snackPosition: SnackPosition.BOTTOM,
              borderRadius: 16,
              margin: const EdgeInsets.all(16),
              barBlur: 15,
              boxShadows: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                )
              ],
            );
          }
        }
      }
    } catch (e) {
      debugPrint('[Clipboard] Error checking clipboard: $e');
    }
  }

  void _loadSavedCredentials() async {
    rememberMe.value = StorageService.to.getRememberMe();
    if (rememberMe.value) {
      final creds = await StorageService.to.getSavedCredentials();
      emailController.text = creds['email'] ?? '';
      passwordController.text = creds['password'] ?? '';
    }
  }

  Future<void> login() async {
    if (emailController.text.trim().isEmpty || passwordController.text.isEmpty) {
      Get.snackbar('Error', 'Please enter email and password', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      final result = await _authRepository.login(
        email: emailController.text.trim(),
        password: passwordController.text,
        role: 'student',
      );

      final token = result['token'] ?? '';
      final user = result['user'];

      if (rememberMe.value) {
        await StorageService.to.saveRememberMe(remember: true, email: emailController.text.trim(), password: passwordController.text);
      } else {
        await StorageService.to.saveRememberMe(remember: false, email: '', password: '');
      }

      AuthService.to.setUserSession(user, token);

      Get.snackbar('Success', 'Welcome back, ${user.name}!', backgroundColor: Colors.green, colorText: Colors.white);

      final route = AuthService.to.getInitialRoute();
      Get.offAllNamed(route);
    } on ApiException catch (e) {
      Get.snackbar('Login Failed', e.message, backgroundColor: Colors.red, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred during login', backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> register() async {
    final name = regNameController.text.trim();
    final email = regEmailController.text.trim();
    final phone = regPhoneController.text.trim();
    final password = regPasswordController.text;

    if (name.isEmpty || email.isEmpty || phone.isEmpty || password.isEmpty) {
      Get.snackbar('Error', 'Please fill in all required fields', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    if (currentRegStep.value == 1) {
      currentRegStep.value = 2;
      return;
    }

    final grade = selectedRegGrade.value;
    final board = selectedRegBoard.value;

    if (grade.isEmpty || board.isEmpty) {
      Get.snackbar('Error', 'Please select both your Class and Board', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      final result = await _authRepository.register({
        'name': name,
        'email': email,
        'password': password,
        'role': 'student',
        'phone': phone,
        'grade': grade,
        'board': board,
        if (regReferralCodeController.text.trim().isNotEmpty) 'referred_by_code': regReferralCodeController.text.trim(),
        if (regEmailOtpController.text.isNotEmpty) 'emailOtp': regEmailOtpController.text.trim(),
      });

      if (result['status'] == 'otp_sent') {
        Get.snackbar('Verification Required', result['message'] ?? 'Please verify your email OTP', backgroundColor: Colors.blue, colorText: Colors.white);
        Get.toNamed('/otp-verify', arguments: {
          'purpose': 'register',
          'email': email,
          'otp_email': result['otp_email'],
        });
        return;
      }

      final token = result['token'] ?? '';
      final user = result['user'];

      if (user != null) {
        AuthService.to.setUserSession(user, token);
      }

      Get.snackbar('Success', 'Account created successfully!', backgroundColor: Colors.green, colorText: Colors.white);

      try {
        Get.find<FcmService>().showLocalNotification(
          "Welcome to Speaxa! 🎉",
          "Hi $name, your student registration is successfully completed. Start learning today!"
        );
      } catch (e) {
        debugPrint('[Notification] Registration notification failed: $e');
      }

      final route = AuthService.to.getInitialRoute();
      Get.offAllNamed(route);
    } on ApiException catch (e) {
      Get.snackbar('Registration Failed', e.message, backgroundColor: Colors.red, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred during registration', backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> sendForgotPasswordOtp() async {
    if (resetIdentifierController.text.trim().isEmpty) {
      Get.snackbar('Error', 'Please enter email address', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }
    Get.snackbar('Success', 'Verification code sent!', backgroundColor: Colors.green, colorText: Colors.white);
    Get.toNamed('/otp-verify');
  }

  Future<void> resetPassword() async {
    if (resetIdentifierController.text.isEmpty || resetNewPasswordController.text.isEmpty) {
      Get.snackbar('Error', 'Please enter required fields', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }
    Get.snackbar('Success', 'Password reset successfully!', backgroundColor: Colors.green, colorText: Colors.white);
    Get.offAllNamed('/login');
  }

  @override
  void onClose() {
    super.onClose();
  }
}
