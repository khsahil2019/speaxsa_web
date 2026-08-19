import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/auth_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class ForgotPasswordView extends GetView<AuthController> {
  const ForgotPasswordView({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: textColor, size: 20),
          onPressed: () => Get.back(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: AppColors.studentRole.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.lock_reset_rounded,
                    size: 38,
                    color: AppColors.studentRole,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              Center(
                child: Text(
                  "Forgot Password",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),
              const SizedBox(height: 8),

              Center(
                child: Text(
                  "Enter your registered email address or mobile number to receive a 6-digit verification code.",
                  style: TextStyle(color: secTextColor, fontSize: 13.5, height: 1.4),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 28),

              CustomTextField(
                label: 'Email or Mobile Number *',
                hint: 'student@example.com or +91...',
                controller: controller.resetIdentifierController,
                prefixIcon: Icons.contact_mail_outlined,
              ),
              const SizedBox(height: 24),

              Obx(() => CustomButton(
                text: 'Send Verification OTP',
                onPressed: controller.sendForgotPasswordOtp,
                isLoading: controller.isLoading.value,
              )),
              const SizedBox(height: 20),

              Center(
                child: GestureDetector(
                  onTap: () => Get.back(),
                  child: Text(
                    "Remembered password? Sign In",
                    style: TextStyle(
                      color: AppColors.studentRole,
                      fontWeight: FontWeight.bold,
                      fontSize: 13.5,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
