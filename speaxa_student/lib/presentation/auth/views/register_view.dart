import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/auth_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class RegisterView extends GetView<AuthController> {
  const RegisterView({super.key});

  static const List<String> gradeOptions = [
    'Class 1',
    'Class 2',
    'Class 3',
    'Class 4',
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
    'Undergraduate / College',
    'Competitive Exam Prep',
  ];

  static const List<String> boardOptions = [
    'CBSE',
    'ICSE / ISC',
    'State Board',
    'IB (International Baccalaureate)',
    'IGCSE / Cambridge',
    'Other / Open School',
  ];

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
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(14),
                  child: Image.asset(
                    'assets/images/logo.png',
                    errorBuilder: (c, e, s) => const Icon(Icons.school_rounded, size: 40, color: AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              Center(
                child: Text(
                  "Create Student Account",
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),
              const SizedBox(height: 6),

              Obx(() => Center(
                child: Text(
                  controller.currentRegStep.value == 1
                      ? "Step 1 of 2: Basic Contact Details"
                      : "Step 2 of 2: Academic & School Information",
                  style: TextStyle(color: secTextColor, fontSize: 13.5, fontWeight: FontWeight.w500),
                ),
              )),
              const SizedBox(height: 24),

              Obx(() {
                if (controller.currentRegStep.value == 1) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CustomTextField(
                        label: 'Full Name *',
                        hint: 'e.g. Rahul Sharma',
                        controller: controller.nameController,
                        prefixIcon: Icons.person_outline,
                      ),
                      CustomTextField(
                        label: 'Email Address *',
                        hint: 'student@example.com',
                        controller: controller.regEmailController,
                        prefixIcon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                      ),
                      CustomTextField(
                        label: 'Mobile / Phone Number *',
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
                      const SizedBox(height: 24),
                      CustomButton(
                        text: 'Continue to Academic Info →',
                        onPressed: () {
                          if (controller.nameController.text.trim().isEmpty ||
                              controller.regEmailController.text.trim().isEmpty ||
                              controller.phoneController.text.trim().isEmpty ||
                              controller.regPasswordController.text.isEmpty) {
                            Get.snackbar('Validation Error', 'Please fill in all required contact fields', backgroundColor: Colors.red, colorText: Colors.white);
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
                      Text("Class / Grade Level *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(14),
                          color: isDark ? AppColors.darkCard : Colors.white,
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: controller.selectedRegGrade.value.isEmpty ? null : controller.selectedRegGrade.value,
                            hint: Text("Select Class / Grade", style: TextStyle(color: secTextColor)),
                            isExpanded: true,
                            dropdownColor: isDark ? AppColors.darkCard : Colors.white,
                            items: gradeOptions.map((String val) {
                              return DropdownMenuItem<String>(
                                value: val,
                                child: Text(val, style: TextStyle(color: textColor, fontSize: 14)),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) controller.selectedRegGrade.value = val;
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),

                      Text("Education Board / Curriculum *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        decoration: BoxDecoration(
                          border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(14),
                          color: isDark ? AppColors.darkCard : Colors.white,
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: controller.selectedRegBoard.value.isEmpty ? null : controller.selectedRegBoard.value,
                            hint: Text("Select Board (CBSE, ICSE, etc.)", style: TextStyle(color: secTextColor)),
                            isExpanded: true,
                            dropdownColor: isDark ? AppColors.darkCard : Colors.white,
                            items: boardOptions.map((String val) {
                              return DropdownMenuItem<String>(
                                value: val,
                                child: Text(val, style: TextStyle(color: textColor, fontSize: 14)),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) controller.selectedRegBoard.value = val;
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 18),

                      CustomTextField(
                        label: 'Referral Code (Optional)',
                        hint: 'e.g. TEACHER-CODE or REF123',
                        controller: controller.regReferralCodeController,
                        prefixIcon: Icons.card_giftcard_rounded,
                      ),
                      const SizedBox(height: 16),

                      Obx(() => controller.isLoading.value
                          ? const Center(child: CircularProgressIndicator())
                          : CustomButton(
                              text: 'Create Student Account',
                              onPressed: () => controller.register(),
                            )),
                      const SizedBox(height: 20),

                      Center(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text("Already have an account? ", style: TextStyle(color: secTextColor, fontSize: 13.5)),
                            GestureDetector(
                              onTap: () => Get.back(),
                              child: const Text(
                                "Sign In",
                                style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13.5),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  );
                }
              }),
            ],
          ),
        ),
      ),
    );
  }
}
