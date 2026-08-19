import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/auth_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class OtpVerificationView extends GetView<AuthController> {
  const OtpVerificationView({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;

    final args = Get.arguments as Map<String, dynamic>? ?? {};
    final purpose = args['purpose'] ?? 'login';
    final recipient = args['phone'] ?? args['email'] ?? args['identifier'] ?? 'your registered phone/email';
    final devOtp = args['otp_val'] ?? args['otp_email'] ?? args['otp'];

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
              // Icon Header
              Center(
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: AppColors.studentRole.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.mark_email_read_rounded,
                    size: 38,
                    color: AppColors.studentRole,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              Center(
                child: Text(
                  purpose == 'register' ? "Verify Mobile / Email" : "Reset Password OTP",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 8),

              Center(
                child: Text(
                  "Enter the 6-digit verification code sent to\n$recipient",
                  style: TextStyle(color: secTextColor, fontSize: 14, height: 1.4),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 24),

              // Dev OTP Banner if present
              if (devOtp != null && devOtp.toString().isNotEmpty) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.info.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.info.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.developer_mode_rounded, color: AppColors.info, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            text: "Dev Test OTP: ",
                            style: const TextStyle(fontSize: 13, color: AppColors.info),
                            children: [
                              TextSpan(
                                text: "$devOtp",
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1.5),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              if (purpose == 'register') ...[
                CustomTextField(
                  label: '6-Digit Verification OTP *',
                  hint: 'e.g. 123456',
                  controller: controller.regEmailOtpController,
                  prefixIcon: Icons.pin_outlined,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 24),

                Obx(() => CustomButton(
                  text: 'Verify & Complete Registration',
                  onPressed: controller.register,
                  isLoading: controller.isLoading.value,
                )),
                const SizedBox(height: 20),

                // Resend OTP section
                Center(
                  child: Obx(() {
                    if (controller.canResend.value) {
                      return TextButton.icon(
                        onPressed: controller.isLoading.value ? null : controller.resendRegisterOtp,
                        icon: const Icon(Icons.refresh_rounded, size: 18, color: AppColors.studentRole),
                        label: const Text(
                          "Resend OTP Code",
                          style: TextStyle(color: AppColors.studentRole, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      );
                    } else {
                      return Text(
                        "Resend code in ${controller.resendCountdown.value}s",
                        style: TextStyle(color: secTextColor, fontSize: 13.5, fontWeight: FontWeight.w500),
                      );
                    }
                  }),
                ),
              ] else ...[
                CustomTextField(
                  label: '6-Digit OTP Code *',
                  hint: 'e.g. 123456',
                  controller: controller.resetOtpController,
                  prefixIcon: Icons.pin_outlined,
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                CustomTextField(
                  label: 'New Password *',
                  hint: 'At least 6 characters',
                  controller: controller.resetNewPasswordController,
                  obscureText: true,
                  prefixIcon: Icons.lock_outline,
                ),
                const SizedBox(height: 24),

                Obx(() => CustomButton(
                  text: 'Verify & Reset Password',
                  onPressed: controller.resetPassword,
                  isLoading: controller.isLoading.value,
                )),
              ],

              const SizedBox(height: 28),

              // Back link
              Center(
                child: GestureDetector(
                  onTap: () => Get.back(),
                  child: Text(
                    "Wrong email or mobile number? Go back",
                    style: TextStyle(
                      color: secTextColor,
                      fontSize: 13,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
