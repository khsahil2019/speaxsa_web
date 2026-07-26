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
            if (controller.currentRegStep.value > 1) {
              controller.currentRegStep.value--;
            } else {
              Get.back();
            }
          },
        ),
        title: Obx(() => Text("Step ${controller.currentRegStep.value} of 3")),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo Header
              Center(
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(12),
                  child: Image.asset(
                    'assets/images/logo.png',
                    errorBuilder: (c, e, s) => const Icon(Icons.school, size: 40, color: AppColors.primary),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              Center(
                child: Text(
                  "Join Speaxsa",
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: AppColors.lightTextPrimary,
                      ),
                ),
              ),
              const SizedBox(height: 4),
              const Center(
                child: Text(
                  "Create your Teacher profile",
                  style: TextStyle(color: Colors.grey, fontSize: 14),
                ),
              ),
              const SizedBox(height: 24),

              // Step Content Wrapper
              Obx(() {
                switch (controller.currentRegStep.value) {
                  case 1:
                    return _buildStep1(context);
                  case 2:
                    return _buildStep2(context);
                  case 3:
                    return _buildStep3(context);
                  default:
                    return _buildStep1(context);
                }
              }),
              const SizedBox(height: 24),

              // Bottom Toggle link (Only visible on Step 1)
              Obx(() {
                if (controller.currentRegStep.value == 1) {
                  return Row(
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
                  );
                }
                return const SizedBox.shrink();
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep1(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("1. Personal Details", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)),
        const SizedBox(height: 16),
        CustomTextField(
          label: 'Full Name *',
          hint: 'enter full name',
          controller: controller.regNameController,
          prefixIcon: Icons.person_outline,
        ),
        CustomTextField(
          label: 'Email Address *',
          hint: 'enter email address',
          controller: controller.regEmailController,
          prefixIcon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
        CustomTextField(
          label: 'Phone Number *',
          hint: 'enter mobile number',
          controller: controller.regPhoneController,
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
        const SizedBox(height: 20),
        CustomButton(
          text: 'Next: Professional Info',
          onPressed: () {
            if (controller.regNameController.text.trim().isEmpty ||
                controller.regEmailController.text.trim().isEmpty ||
                controller.regPhoneController.text.trim().isEmpty ||
                controller.regPasswordController.text.isEmpty) {
              Get.snackbar('Error', 'Please fill in all required fields', backgroundColor: Colors.red, colorText: Colors.white);
              return;
            }
            controller.currentRegStep.value = 2;
          },
        ),
      ],
    );
  }

  Widget _buildStep2(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("2. Professional Info", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)),
        const SizedBox(height: 16),
        CustomTextField(
          label: 'Qualification *',
          hint: 'e.g. M.Sc. in Physics, B.Ed.',
          controller: controller.regQualificationController,
          prefixIcon: Icons.school_outlined,
        ),
        CustomTextField(
          label: 'Experience (Years) *',
          hint: 'e.g. 5',
          controller: controller.regExperienceYearsController,
          keyboardType: TextInputType.number,
          prefixIcon: Icons.timelapse_outlined,
        ),
        CustomTextField(
          label: 'Subject Expertise *',
          hint: 'e.g. Physics, Mathematics',
          controller: controller.regSubjectExpertiseController,
          prefixIcon: Icons.menu_book_outlined,
        ),
        CustomTextField(
          label: 'Languages Spoken *',
          hint: 'e.g. English, Hindi',
          controller: controller.regLanguagesController,
          prefixIcon: Icons.translate_outlined,
        ),
        const SizedBox(height: 20),
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
                text: 'Next: Location',
                onPressed: () {
                  if (controller.regQualificationController.text.trim().isEmpty ||
                      controller.regExperienceYearsController.text.trim().isEmpty ||
                      controller.regSubjectExpertiseController.text.trim().isEmpty ||
                      controller.regLanguagesController.text.trim().isEmpty) {
                    Get.snackbar('Error', 'Please fill in all required fields', backgroundColor: Colors.red, colorText: Colors.white);
                    return;
                  }
                  controller.currentRegStep.value = 3;
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStep3(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("3. Location & Referrals", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)),
        const SizedBox(height: 16),
        CustomTextField(
          label: 'Permanent Address *',
          hint: 'enter your location address',
          controller: controller.regAddressController,
          prefixIcon: Icons.location_on_outlined,
          maxLines: 2,
        ),
        CustomTextField(
          label: 'Referral Code (Optional)',
          hint: 'enter referral code',
          controller: controller.regReferralCodeController,
          prefixIcon: Icons.card_giftcard_outlined,
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
                  style: TextStyle(fontSize: 12, color: Colors.grey),
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
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text("Back"),
                onPressed: () => controller.currentRegStep.value = 2,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Obx(() => CustomButton(
                text: 'Register Account',
                isLoading: controller.isLoading.value,
                onPressed: () {
                  if (controller.regAddressController.text.trim().isEmpty) {
                    Get.snackbar('Error', 'Please enter your permanent address', backgroundColor: Colors.red, colorText: Colors.white);
                    return;
                  }
                  controller.register();
                },
              )),
            ),
          ],
        ),
      ],
    );
  }
}
