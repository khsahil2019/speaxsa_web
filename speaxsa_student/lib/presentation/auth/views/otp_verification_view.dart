import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/auth_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class OtpVerificationView extends GetView<AuthController> {
  const OtpVerificationView({super.key});

  @override
  Widget build(BuildContext context) {
    final args = Get.arguments as Map<String, dynamic>? ?? {};
    final purpose = args['purpose'] ?? 'login';

    return Scaffold(
      appBar: AppBar(title: const Text("Enter OTP")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Verification Code", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              "Enter the 6-digit code sent to ${args['email'] ?? args['identifier'] ?? 'your email'}",
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),

            if (purpose == 'register') ...[
              if (args['otp_email'] != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    "Dev OTP -> Email: ${args['otp_email'] ?? ''}",
                    style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              CustomTextField(
                label: 'Email OTP Code',
                hint: 'enter 6-digit OTP',
                controller: controller.regEmailOtpController,
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 20),
              Obx(() => CustomButton(
                text: 'Complete Registration',
                onPressed: controller.register,
                isLoading: controller.isLoading.value,
              )),
            ] else ...[
               CustomTextField(
                label: 'OTP Code',
                hint: 'enter 6-digit OTP',
                controller: controller.resetOtpController,
                prefixIcon: Icons.pin_outlined,
                keyboardType: TextInputType.number,
              ),
              CustomTextField(
                label: 'New Password',
                hint: 'At least 6 characters',
                controller: controller.resetNewPasswordController,
                obscureText: true,
                prefixIcon: Icons.lock_outline,
              ),
              const SizedBox(height: 20),
              Obx(() => CustomButton(
                text: 'Reset Password',
                onPressed: controller.resetPassword,
                isLoading: controller.isLoading.value,
              )),
            ]
          ],
        ),
      ),
    );
  }
}
