import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/auth_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class RegisterView extends GetView<AuthController> {
  const RegisterView({super.key});

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
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo Avatar
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.parentRole.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(14),
                  child: Image.asset(
                    'assets/images/logo.png',
                    errorBuilder: (c, e, s) => const Icon(Icons.family_restroom_rounded, size: 40, color: AppColors.parentRole),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              Center(
                child: Text(
                  "Create Parent Account",
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),
              const SizedBox(height: 6),

              Center(
                child: Text(
                  "Monitor your child's learning journey and progress",
                  style: TextStyle(color: secTextColor, fontSize: 13.5),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 24),

              CustomTextField(
                label: 'Full Name *',
                hint: 'e.g. Anish Sharma',
                controller: controller.nameController,
                prefixIcon: Icons.person_outline,
              ),

              CustomTextField(
                label: 'Primary Email Address *',
                hint: 'parent@example.com',
                controller: controller.regEmailController,
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
              ),

              CustomTextField(
                label: 'Mobile Number *',
                hint: '+91 9876543210',
                controller: controller.phoneController,
                prefixIcon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),

              Obx(() => CustomTextField(
                label: 'Password *',
                hint: '••••••••',
                controller: controller.regPasswordController,
                obscureText: !controller.isPasswordVisible.value,
                prefixIcon: Icons.lock_outline,
                suffixIcon: IconButton(
                  icon: Icon(controller.isPasswordVisible.value ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                  onPressed: () => controller.isPasswordVisible.toggle(),
                ),
              )),
              const SizedBox(height: 12),

              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Checkbox(
                    value: true,
                    onChanged: (val) {},
                    activeColor: AppColors.parentRole,
                  ),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        text: "I agree to the ",
                        style: TextStyle(fontSize: 12, color: secTextColor),
                        children: const [
                          TextSpan(
                            text: "Terms of Service",
                            style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: " and "),
                          TextSpan(
                            text: "Privacy Policy",
                            style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Obx(() => CustomButton(
                text: 'Create Parent Account',
                onPressed: controller.register,
                isLoading: controller.isLoading.value,
              )),
              const SizedBox(height: 24),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text("Already registered? ", style: TextStyle(fontSize: 13.5, color: secTextColor)),
                  GestureDetector(
                    onTap: () => Get.back(),
                    child: const Text(
                      "Sign In",
                      style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold, fontSize: 13.5),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
