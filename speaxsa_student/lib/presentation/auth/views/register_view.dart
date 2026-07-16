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
          onPressed: () {
            if (controller.currentRegStep.value == 2) {
              controller.currentRegStep.value = 1;
            } else {
              Get.back();
            }
          },
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
                  "Create your Student account",
                  style: TextStyle(color: Colors.grey, fontSize: 15),
                ),
              ),
              const SizedBox(height: 24),

              Obx(() {
                if (controller.currentRegStep.value == 1) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                      const SizedBox(height: 24),
                      CustomButton(
                        text: 'Next Step',
                        onPressed: () {
                          if (controller.nameController.text.trim().isEmpty ||
                              controller.regEmailController.text.trim().isEmpty ||
                              controller.phoneController.text.trim().isEmpty ||
                              controller.regPasswordController.text.isEmpty) {
                            Get.snackbar('Error', 'Please fill in all fields', backgroundColor: Colors.red, colorText: Colors.white);
                            return;
                          }
                          controller.currentRegStep.value = 2;
                        },
                      ),
                    ],
                  );
                } else {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Select Class / Grade *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.lightTextPrimary)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(10),
                          color: Colors.white,
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: controller.selectedRegGrade.value.isEmpty ? null : controller.selectedRegGrade.value,
                            hint: const Text("Select Class"),
                            isExpanded: true,
                            items: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((String val) {
                              return DropdownMenuItem<String>(
                                value: val,
                                child: Text(val),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) controller.selectedRegGrade.value = val;
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      const Text("Select Syllabus Board *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.lightTextPrimary)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(10),
                          color: Colors.white,
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: controller.selectedRegBoard.value.isEmpty ? null : controller.selectedRegBoard.value,
                            hint: const Text("Select Board"),
                            isExpanded: true,
                            items: ['CBSE', 'ICSE', 'State Board'].map((String val) {
                              return DropdownMenuItem<String>(
                                value: val,
                                child: Text(val),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) controller.selectedRegBoard.value = val;
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      CustomTextField(
                        label: 'Referral Code (Optional)',
                        hint: 'enter referral code',
                        controller: controller.regReferralCodeController,
                        prefixIcon: Icons.card_giftcard,
                      ),
                      const SizedBox(height: 12),

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

                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: const Text("Back"),
                              onPressed: () => controller.currentRegStep.value = 1,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: CustomButton(
                              text: 'Create Account',
                              isLoading: controller.isLoading.value,
                              onPressed: controller.register,
                            ),
                          ),
                        ],
                      ),
                    ],
                  );
                }
              }),
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
