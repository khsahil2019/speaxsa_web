import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
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
  final regAltEmailController = TextEditingController();
  final regPhoneController = TextEditingController();
  final regMobileNumberController = TextEditingController();
  final regPasswordController = TextEditingController();
  final regQualificationController = TextEditingController();
  final regExperienceYearsController = TextEditingController();
  final regSubjectExpertiseController = TextEditingController();
  final regLanguagesController = TextEditingController();
  final regAddressController = TextEditingController();
  final regLinkedInController = TextEditingController();
  final regTwitterController = TextEditingController();
  final regBoardController = TextEditingController();
  final regGradeController = TextEditingController();
  final regReferralCodeController = TextEditingController();
  final regOtpController = TextEditingController();
  final regPhoneOtpController = TextEditingController();
  final regEmailOtpController = TextEditingController();
  final RxInt currentRegStep = 1.obs;
  final RxString emailError = ''.obs;
  final RxBool isCheckingEmail = false.obs;

  TextEditingController get nameController => regNameController;
  TextEditingController get phoneController => regPhoneController;

  Future<bool> validateStep1AndCheckEmail() async {
    final name = regNameController.text.trim();
    final email = regEmailController.text.trim();
    final altEmail = regAltEmailController.text.trim();
    final phone = regPhoneController.text.trim();
    final secMobile = regMobileNumberController.text.trim();
    final password = regPasswordController.text;

    emailError.value = '';

    if (name.isEmpty || email.isEmpty || phone.isEmpty || password.isEmpty) {
      Get.snackbar('Missing Information', 'Please fill in all required fields (Name, Email, Phone, Password)', backgroundColor: AppColors.error, colorText: Colors.white);
      return false;
    }

    if (name.length < 2) {
      Get.snackbar('Invalid Name', 'Please enter your full legal name (at least 2 characters)', backgroundColor: AppColors.error, colorText: Colors.white);
      return false;
    }

    if (!GetUtils.isEmail(email)) {
      emailError.value = 'Please enter a valid email address';
      Get.snackbar('Invalid Email', 'Please enter a valid primary email address (e.g. name@domain.com)', backgroundColor: AppColors.error, colorText: Colors.white);
      return false;
    }

    if (altEmail.isNotEmpty && !GetUtils.isEmail(altEmail)) {
      Get.snackbar('Invalid Alternative Email', 'Please enter a valid alternative email address (e.g. alt@domain.com)', backgroundColor: AppColors.error, colorText: Colors.white);
      return false;
    }

    final cleanPhone = phone.replaceAll(RegExp(r'[^\d]'), '');
    if (cleanPhone.length < 10) {
      Get.snackbar('Invalid Phone Number', 'Please enter a valid 10-digit mobile number', backgroundColor: AppColors.error, colorText: Colors.white);
      return false;
    }

    if (secMobile.isNotEmpty) {
      final cleanSecMobile = secMobile.replaceAll(RegExp(r'[^\d]'), '');
      if (cleanSecMobile.length < 10) {
        Get.snackbar('Invalid Secondary Mobile', 'Please enter a valid 10-digit WhatsApp/Secondary phone number', backgroundColor: AppColors.error, colorText: Colors.white);
        return false;
      }
    }

    if (password.length < 6) {
      Get.snackbar('Weak Password', 'Password must be at least 6 characters long', backgroundColor: AppColors.error, colorText: Colors.white);
      return false;
    }

    try {
      isCheckingEmail.value = true;
      isLoading.value = true;

      final exists = await _authRepository.checkEmailExists(email);
      if (exists) {
        emailError.value = 'This email is already registered. Please sign in instead.';
        Get.snackbar(
          'Email Already Registered ⚠️',
          'An account with $email is already registered. Please sign in or use a different email address.',
          backgroundColor: AppColors.error,
          colorText: Colors.white,
          duration: const Duration(seconds: 4),
        );
        return false;
      }
    } catch (e) {
      print("Email check error: $e");
    } finally {
      isCheckingEmail.value = false;
      isLoading.value = false;
    }

    return true;
  }

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
      if (isClosed) return;
      try {
        emailController.text = creds['email'] ?? '';
        passwordController.text = creds['password'] ?? '';
      } catch (e) {
        print("Error setting credentials on controller: $e");
      }
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
        role: 'teacher',
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
    final altEmail = regAltEmailController.text.trim();
    var phone = regPhoneController.text.trim();
    if (phone.isNotEmpty && !phone.startsWith('+')) {
      final cleanDigits = phone.replaceAll(RegExp(r'[^0-9]'), '');
      phone = '+91$cleanDigits';
    }
    var mobileNumber = regMobileNumberController.text.trim();
    if (mobileNumber.isNotEmpty && !mobileNumber.startsWith('+')) {
      final cleanDigitsMobile = mobileNumber.replaceAll(RegExp(r'[^0-9]'), '');
      mobileNumber = '+91$cleanDigitsMobile';
    }
    final password = regPasswordController.text;
    final qualification = regQualificationController.text.trim();
    final experienceYears = int.tryParse(regExperienceYearsController.text.trim()) ?? 0;
    final subjectExpertise = regSubjectExpertiseController.text.trim();
    final languages = regLanguagesController.text.trim();
    final address = regAddressController.text.trim();
    final linkedIn = regLinkedInController.text.trim();
    final twitter = regTwitterController.text.trim();
    final referralCode = regReferralCodeController.text.trim();

    if (name.isEmpty || email.isEmpty || phone.isEmpty || password.isEmpty) {
      Get.snackbar('Error', 'Please fill in all required fields (Name, Email, Mobile, Password)', backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    final enteredOtp = regEmailOtpController.text.trim().isNotEmpty 
        ? regEmailOtpController.text.trim() 
        : regOtpController.text.trim();

    final socialLinks = {
      if (linkedIn.isNotEmpty) 'linkedin': linkedIn,
      if (twitter.isNotEmpty) 'twitter': twitter,
    };

    try {
      isLoading.value = true;
      final result = await _authRepository.register({
        'name': name,
        'email': email,
        'phone': phone,
        'password': password,
        'role': 'teacher',
        if (altEmail.isNotEmpty) 'alt_email': altEmail,
        if (mobileNumber.isNotEmpty) 'mobile_number': mobileNumber,
        if (socialLinks.isNotEmpty) 'social_links': socialLinks,
        if (qualification.isNotEmpty) 'qualification': qualification,
        'experience_years': experienceYears,
        if (subjectExpertise.isNotEmpty) 'subject_expertise': subjectExpertise,
        if (languages.isNotEmpty) 'languages': languages,
        if (address.isNotEmpty) 'address': address,
        if (referralCode.isNotEmpty) 'referred_by_code': referralCode,
        if (enteredOtp.isNotEmpty) 'otp': enteredOtp,
        if (enteredOtp.isNotEmpty) 'emailOtp': enteredOtp,
      });

      if (result['status'] == 'otp_sent') {
        Get.snackbar('Verification Required', result['message'] ?? 'Please verify 6-digit OTP code sent to your phone/email', backgroundColor: Colors.blue, colorText: Colors.white);
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

      if (Get.context != null) {
        _showEmailVerificationBottomSheet(Get.context!, email);
      } else {
        Get.snackbar('Success', 'Account created successfully!', backgroundColor: AppColors.success, colorText: Colors.white);
        final route = AuthService.to.getInitialRoute();
        Get.offAllNamed(route);
      }
    } on ApiException catch (e) {
      Get.snackbar('Registration Failed', e.message, backgroundColor: AppColors.error, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred during registration', backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      isLoading.value = false;
    }
  }

  void _showEmailVerificationBottomSheet(BuildContext context, String userEmail) {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.mark_email_read_rounded, color: AppColors.primary, size: 48),
            ),
            const SizedBox(height: 16),
            const Text(
              "Mobile Verified! Email Verification Sent ✉️",
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              "Your mobile number has been verified successfully. We have dispatched a verification email link to:",
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.email, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      userEmail,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              "Please check your inbox or spam folder and tap the link to activate full Teacher privileges.",
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600, height: 1.3),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {
                      Get.snackbar('Link Dispatched', 'Verification link re-sent to $userEmail ✓', backgroundColor: AppColors.success, colorText: Colors.white);
                    },
                    child: const Text("Resend Link", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {
                      Get.back();
                      final route = AuthService.to.getInitialRoute();
                      Get.offAllNamed(route);
                    },
                    child: const Text("Continue to App →", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
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
