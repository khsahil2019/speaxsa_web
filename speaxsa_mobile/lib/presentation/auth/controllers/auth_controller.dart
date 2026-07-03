import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/storage_service.dart';
import '../../../data/repositories/auth_repository.dart';

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

  TextEditingController get nameController => regNameController;
  TextEditingController get phoneController => regPhoneController;

  // Reset Password Controllers
  final resetIdentifierController = TextEditingController();
  final resetOtpController = TextEditingController();
  final resetNewPasswordController = TextEditingController();

  @override
  void onInit() {
    super.onInit();
    _loadSavedCredentials();
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
        role: selectedRole.value,
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

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      Get.snackbar('Error', 'Please fill in all required fields', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      isLoading.value = true;
      final result = await _authRepository.register({
        'name': name,
        'email': email,
        'password': password,
        'role': selectedRole.value,
        if (phone.isNotEmpty) 'phone': phone,
      });

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
    resetIdentifierController.dispose();
    resetOtpController.dispose();
    resetNewPasswordController.dispose();
    super.onClose();
  }
}
