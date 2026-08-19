import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
                    color: AppColors.parentRole.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.mark_email_read_rounded,
                    size: 38,
                    color: AppColors.parentRole,
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
              const SizedBox(height: 32),

              if (purpose == 'register') ...[
                const Text(
                  "Enter 6-Digit OTP Code *",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 12),

                // Production 6-Box Pin Input
                OtpPinInput(
                  controller: controller.regEmailOtpController,
                  length: 6,
                ),
                const SizedBox(height: 32),

                Obx(() => CustomButton(
                  text: 'Verify & Complete Registration',
                  onPressed: controller.register,
                  isLoading: controller.isLoading.value,
                )),
                const SizedBox(height: 24),

                // Resend OTP section
                Center(
                  child: Obx(() {
                    if (controller.canResend.value) {
                      return TextButton.icon(
                        onPressed: controller.isLoading.value ? null : controller.resendRegisterOtp,
                        icon: const Icon(Icons.refresh_rounded, size: 18, color: AppColors.parentRole),
                        label: const Text(
                          "Resend OTP Code",
                          style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold, fontSize: 14),
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
                const Text(
                  "Enter 6-Digit Reset Code *",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 12),

                // Production 6-Box Pin Input for Reset Password
                OtpPinInput(
                  controller: controller.resetOtpController,
                  length: 6,
                ),
                const SizedBox(height: 20),

                CustomTextField(
                  label: 'New Password *',
                  hint: 'At least 6 characters',
                  controller: controller.resetNewPasswordController,
                  obscureText: true,
                  prefixIcon: Icons.lock_outline,
                ),
                const SizedBox(height: 28),

                Obx(() => CustomButton(
                  text: 'Verify & Reset Password',
                  onPressed: controller.resetPassword,
                  isLoading: controller.isLoading.value,
                )),
              ],

              const SizedBox(height: 28),

              // Back to Register / Login link
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

/// Production 6-Box Digit Pin Input Widget
class OtpPinInput extends StatefulWidget {
  final TextEditingController controller;
  final int length;

  const OtpPinInput({
    super.key,
    required this.controller,
    this.length = 6,
  });

  @override
  State<OtpPinInput> createState() => _OtpPinInputState();
}

class _OtpPinInputState extends State<OtpPinInput> {
  late List<FocusNode> _focusNodes;
  late List<TextEditingController> _boxControllers;

  @override
  void initState() {
    super.initState();
    _focusNodes = List.generate(widget.length, (_) => FocusNode());
    _boxControllers = List.generate(widget.length, (_) => TextEditingController());

    if (widget.controller.text.isNotEmpty) {
      final text = widget.controller.text;
      for (int i = 0; i < widget.length && i < text.length; i++) {
        _boxControllers[i].text = text[i];
      }
    }
  }

  @override
  void dispose() {
    for (var node in _focusNodes) {
      node.dispose();
    }
    for (var ctrl in _boxControllers) {
      ctrl.dispose();
    }
    super.dispose();
  }

  void _updateMainController() {
    final pin = _boxControllers.map((c) => c.text).join();
    widget.controller.text = pin;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(widget.length, (index) {
        return SizedBox(
          width: 46,
          height: 56,
          child: TextField(
            controller: _boxControllers[index],
            focusNode: _focusNodes[index],
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            maxLength: 1,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
            ),
            decoration: InputDecoration(
              counterText: '',
              contentPadding: EdgeInsets.zero,
              filled: true,
              fillColor: isDark ? AppColors.darkCard : Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.parentRole, width: 2),
              ),
            ),
            onChanged: (value) {
              if (value.length > 1) {
                final code = value.replaceAll(RegExp(r'\D'), '');
                for (int i = 0; i < widget.length && i < code.length; i++) {
                  _boxControllers[i].text = code[i];
                }
                _focusNodes[widget.length - 1].requestFocus();
                _updateMainController();
                return;
              }
              if (value.isNotEmpty) {
                if (index < widget.length - 1) {
                  _focusNodes[index + 1].requestFocus();
                } else {
                  _focusNodes[index].unfocus();
                }
              } else if (value.isEmpty && index > 0) {
                _focusNodes[index - 1].requestFocus();
              }
              _updateMainController();
            },
          ),
        );
      }),
    );
  }
}
