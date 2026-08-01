import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/auth_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class ForgotPasswordView extends GetView<AuthController> {
  const ForgotPasswordView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Forgot Password")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Reset Password", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("Enter your registered email or phone number to receive an OTP code.", style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            CustomTextField(
              label: 'Email or Mobile Number',
              hint: 'email@example.com or +91...',
              controller: controller.resetIdentifierController,
              prefixIcon: Icons.contact_mail_outlined,
            ),
            const SizedBox(height: 20),
            Obx(() => CustomButton(
              text: 'Send Verification OTP',
              onPressed: controller.sendForgotPasswordOtp,
              isLoading: controller.isLoading.value,
            )),
          ],
        ),
      ),
    );
  }
}
