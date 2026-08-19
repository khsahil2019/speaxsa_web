import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/storage_service.dart';
import '../../../data/repositories/auth_repository.dart';

import '../../../core/services/fcm_service.dart';

class AuthController extends GetxController {
  final AuthRepository _authRepository = AuthRepository();

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

  TextEditingController get nameController => regNameController;
  TextEditingController get phoneController => regPhoneController;

  // Reset Password Controllers
  final resetIdentifierController = TextEditingController();
  final resetOtpController = TextEditingController();
  final resetNewPasswordController = TextEditingController();

  // OTP Resend Countdown
  final RxInt resendCountdown = 30.obs;
  final RxBool canResend = true.obs;
  Timer? _timer;

  @override
  void onInit() {
    super.onInit();
    _loadSavedCredentials();
  }

  void startResendTimer() {
    resendCountdown.value = 30;
    canResend.value = false;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (resendCountdown.value > 0) {
        resendCountdown.value--;
      } else {
        canResend.value = true;
        timer.cancel();
      }
    });
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
        role: 'parent',
      );

      final token = result['token'] ?? '';
      final user = result['user'];

      if (rememberMe.value) {
        await StorageService.to.saveRememberMe(remember: true, email: emailController.text.trim(), password: passwordController.text);
      } else {
        await StorageService.to.saveRememberMe(remember: false, email: '', password: '');
      }

      AuthService.to.setUserSession(user, token);
      FcmService.to.syncToken();

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
    final otpCode = regEmailOtpController.text.trim();

    if (name.isEmpty || email.isEmpty || phone.isEmpty || password.isEmpty) {
      Get.snackbar('Error', 'Please fill in all required fields', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      final result = await _authRepository.register({
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
        'role': 'parent',
        if (otpCode.isNotEmpty) 'emailOtp': otpCode,
        if (otpCode.isNotEmpty) 'otp': otpCode,
      });

      if (result['status'] == 'otp_sent') {
        Get.snackbar(
          'Verification Required',
          result['message'] ?? 'Please enter the 6-digit OTP sent to your phone/email',
          backgroundColor: Colors.blue,
          colorText: Colors.white,
        );
        startResendTimer();
        Get.toNamed('/otp-verify', arguments: {
          'purpose': 'register',
          'email': email,
          'phone': phone,
          'otp_val': result['otp'],
        });
        return;
      }

      final token = result['token'] ?? '';
      final user = result['user'];

      if (user != null) {
        AuthService.to.setUserSession(user, token);
      }

      Get.snackbar('Success', 'Account created successfully!', backgroundColor: Colors.green, colorText: Colors.white);

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

  Future<void> resendRegisterOtp() async {
    if (!canResend.value) return;

    final phone = regPhoneController.text.trim();
    final email = regEmailController.text.trim();
    final identifier = phone.isNotEmpty ? phone : email;

    try {
      isLoading.value = true;
      await _authRepository.sendOtp(identifier, purpose: 'register');
      startResendTimer();
      Get.snackbar('OTP Sent', 'A new verification code has been sent.', backgroundColor: Colors.green, colorText: Colors.white);
    } on ApiException catch (e) {
      Get.snackbar('Resend Failed', e.message, backgroundColor: Colors.red, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'Failed to resend OTP', backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> sendForgotPasswordOtp() async {
    final identifier = resetIdentifierController.text.trim();
    if (identifier.isEmpty) {
      Get.snackbar('Error', 'Please enter email address or phone number', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      await _authRepository.forgotPassword(identifier);
      startResendTimer();
      Get.snackbar('Success', 'Verification code sent to $identifier', backgroundColor: Colors.green, colorText: Colors.white);
      Get.toNamed('/otp-verify', arguments: {
        'purpose': 'reset_password',
        'identifier': identifier,
      });
    } on ApiException catch (e) {
      Get.snackbar('Failed', e.message, backgroundColor: Colors.red, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred', backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> resetPassword() async {
    final identifier = resetIdentifierController.text.trim();
    final otp = resetOtpController.text.trim();
    final newPassword = resetNewPasswordController.text;

    if (identifier.isEmpty || otp.isEmpty || newPassword.isEmpty) {
      Get.snackbar('Error', 'Please fill in all required fields', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      await _authRepository.resetPassword(identifier: identifier, otp: otp, newPassword: newPassword);
      Get.snackbar('Success', 'Password reset successfully! Please sign in.', backgroundColor: Colors.green, colorText: Colors.white);
      Get.offAllNamed('/login');
    } on ApiException catch (e) {
      Get.snackbar('Reset Failed', e.message, backgroundColor: Colors.red, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred', backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  @override
  void onClose() {
    _timer?.cancel();
    emailController.dispose();
    passwordController.dispose();
    regNameController.dispose();
    regEmailController.dispose();
    regPhoneController.dispose();
    regPasswordController.dispose();
    regQualificationController.dispose();
    regBoardController.dispose();
    regGradeController.dispose();
    regReferralCodeController.dispose();
    regOtpController.dispose();
    regPhoneOtpController.dispose();
    regEmailOtpController.dispose();
    resetIdentifierController.dispose();
    resetOtpController.dispose();
    resetNewPasswordController.dispose();
    super.onClose();
  }
}
