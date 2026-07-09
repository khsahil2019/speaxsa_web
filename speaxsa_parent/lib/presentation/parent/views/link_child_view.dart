import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/parent_dashboard_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';

class LinkChildView extends GetView<ParentDashboardController> {
  const LinkChildView({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Link Child Account", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text("Enter your child's unique Student Code (e.g. STU-1002) or registered email address.", style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 24),

          CustomTextField(
            label: 'Student Code or Email',
            hint: 'STU-1002 or student@example.com',
            controller: controller.studentCodeController,
            prefixIcon: Icons.qr_code_outlined,
          ),
          const SizedBox(height: 20),

          Obx(() => CustomButton(
            text: 'Send Link Request',
            onPressed: controller.linkChildByCode,
            isLoading: controller.isLoading.value,
          )),
        ],
      ),
    );
  }
}
