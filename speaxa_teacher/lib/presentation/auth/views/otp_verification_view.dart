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
              if (args['otp_val'] != null)
                // Container(
                //   width: double.infinity,
                //   padding: const EdgeInsets.all(12),
                //   margin: const EdgeInsets.only(bottom: 16),
                //   decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.blue.shade200)),
                //   child: Text(
                //     "Dev OTP: ${args['otp_val']}",
                //     style: TextStyle(color: Colors.blue.shade900, fontWeight: FontWeight.bold, fontSize: 14),
                //   ),
                // ),
              CustomTextField(
                label: 'Enter 6-Digit OTP Code',
                hint: '123456',
                controller: controller.regEmailOtpController,
                prefixIcon: Icons.pin_outlined,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 20),
              Obx(() => CustomButton(
                text: 'Verify & Complete Registration',
                onPressed: controller.register,
                isLoading: controller.isLoading.value,
              )),
            ] else ...[
              CustomTextField(
                label: 'OTP Code',
                hint: '123456',
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
