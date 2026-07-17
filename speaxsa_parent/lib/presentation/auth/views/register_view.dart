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
              // Centered Logo Avatar (Exact matching screenshot 2)
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

              // Title (Exact matching screenshot 2)
              Center(
                child: Text(
                  "Join Speaxsa",
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
                  "Create your Parent account",
                  style: TextStyle(color: Colors.grey, fontSize: 15),
                ),
              ),
              const SizedBox(height: 24),

              CustomTextField(
                label: 'Full Name',
                hint: 'enter full name',
                controller: controller.nameController,
                prefixIcon: Icons.person_outline,
              ),

              CustomTextField(
                label: 'Email Address',
                hint: 'enter email address',
                controller: controller.regEmailController,
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
              ),

              CustomTextField(
                label: 'Phone Number',
                hint: 'enter mobile number',
                controller: controller.phoneController,
                prefixIcon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),

              Obx(() => CustomTextField(
                label: 'Password',
                hint: '••••••••',
                controller: controller.regPasswordController,
                obscureText: !controller.isPasswordVisible.value,
                prefixIcon: Icons.lock_outline,
                suffixIcon: IconButton(
                  icon: Icon(controller.isPasswordVisible.value ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                  onPressed: () => controller.isPasswordVisible.toggle(),
                ),
              )),

              // Terms & Conditions Checkbox (Exact matching screenshot 2)
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Checkbox(
                    value: true,
                    onChanged: (val) {},
                    activeColor: AppColors.primary,
                  ),
                  const Expanded(
                    child: Text.rich(
                      TextSpan(
                        text: "I agree to the ",
                        style: TextStyle(fontSize: 12.5, color: Colors.grey),
                        children: [
                          TextSpan(
                            text: "Terms & Conditions",
                            style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                          ),
                          TextSpan(text: " and "),
                          TextSpan(
                            text: "Privacy Policy",
                            style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Obx(() => CustomButton(
                text: 'Create Account',
                onPressed: controller.register,
                isLoading: controller.isLoading.value,
              )),
              const SizedBox(height: 24),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Already have an account? ", style: TextStyle(fontSize: 14, color: Colors.grey)),
                  GestureDetector(
                    onTap: () => Get.toNamed('/login'),
                    child: const Text(
                      "Sign In",
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
}
