import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routes/app_routes.dart';
import '../controllers/auth_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class LoginView extends GetView<AuthController> {
  const LoginView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Get.back(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Centered Circular Speaxa Logo Avatar (Exact matching screenshot 1)
              Center(
                child: Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(12),
                  child: Image.asset(
                    'assets/images/logo.png',
                    errorBuilder: (c, e, s) => const Icon(Icons.school, size: 48, color: AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // Title (Exact matching screenshot 1)
              Center(
                child: Text(
                  "Welcome Back",
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: AppColors.lightTextPrimary,
                      ),
                ),
              ),
              const SizedBox(height: 8),

              const Center(
                child: Text(
                  "Sign in to your Parent account",
                  style: TextStyle(color: Colors.grey, fontSize: 15),
                ),
              ),
              const SizedBox(height: 24),

              CustomTextField(
                label: 'Email Address',
                hint: 'enter email or phone',
                controller: controller.emailController,
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
              ),

              Obx(() => CustomTextField(
                label: 'Password',
                hint: '••••••••',
                controller: controller.passwordController,
                obscureText: !controller.isPasswordVisible.value,
                prefixIcon: Icons.lock_outline,
                suffixIcon: IconButton(
                  icon: Icon(controller.isPasswordVisible.value ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                  onPressed: () => controller.isPasswordVisible.toggle(),
                ),
              )),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Obx(() => Row(
                    children: [
                      Checkbox(
                        value: controller.rememberMe.value,
                        onChanged: (val) => controller.rememberMe.value = val ?? false,
                        activeColor: AppColors.primary,
                      ),
                      const Text("Remember Me", style: TextStyle(fontSize: 13)),
                    ],
                  )),
                  GestureDetector(
                    onTap: () => _showResetPasswordBottomSheet(context),
                    child: const Text(
                      "Forgot Password?",
                      style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Obx(() => CustomButton(
                text: 'Sign In',
                onPressed: controller.login,
                isLoading: controller.isLoading.value,
              )),
              const SizedBox(height: 28),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Don't have an account? ", style: TextStyle(fontSize: 14, color: Colors.grey)),
                  GestureDetector(
                    onTap: () => Get.toNamed(Routes.REGISTER),
                    child: const Text(
                      "Register",
                      style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleTab(String title, String roleKey) {
    final isSelected = controller.selectedRole.value == roleKey;
    return Expanded(
      child: GestureDetector(
        onTap: () => controller.selectedRole.value = roleKey,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Text(
            title,
            style: TextStyle(
              color: isSelected ? Colors.white : AppColors.lightTextSecondary,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  // Reset Password Bottom Sheet (Exact matching screenshot 1)
  void _showResetPasswordBottomSheet(BuildContext context) {
    final emailCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Reset Password",
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Get.back(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                "Enter your registered email address to receive a secure password reset verification code.",
                style: TextStyle(color: AppColors.lightTextSecondary, fontSize: 13.5, height: 1.5),
              ),
              const SizedBox(height: 20),

              CustomTextField(
                label: 'Email Address',
                hint: 'enter your email',
                controller: emailCtrl,
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),

              CustomButton(
                text: 'Send Verification Code',
                onPressed: () {
                  Get.back();
                  Get.snackbar(
                    'Success',
                    'Password reset code sent to ${emailCtrl.text}',
                    backgroundColor: AppColors.primary,
                    colorText: Colors.white,
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
