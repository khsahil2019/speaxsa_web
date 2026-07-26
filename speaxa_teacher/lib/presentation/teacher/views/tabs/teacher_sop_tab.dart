import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherSopTab extends GetView<TeacherDashboardController> {
  const TeacherSopTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sop = controller.sopStatus.value;
      final status = sop?.status ?? 'pending';

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("SOP Status", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text("Current Verification Stage", style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                      ],
                    ),
                    StatusChip(status: status),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            const Text("Technical Verification Checklist", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("Verify camera framing, clear audio headset, high-speed fiber internet proof, and lighting setup.", style: TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 16),

            _buildCheckTile("1. Camera & Framing Setup", "Face fully visible, eye-level camera framing.", true),
            _buildCheckTile("2. Audio & Noise Cancellation", "Noise-cancelling mic headset attached.", true),
            _buildCheckTile("3. High-Speed Internet Proof", "Minimum 20 Mbps upload speed.", true),
            _buildCheckTile("4. Room Lighting & Background", "Clean backdrop with proper front light.", true),
            _buildCheckTile("5. Demo Lecture Recording", "10-min interactive teaching demo.", true),

            const SizedBox(height: 24),

            if (status == 'approved' && !sop!.agreementSigned) ...[
              const Text("Digital Teaching Agreement", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text("SOP approved! Type your full legal name below to sign the digital agreement.", style: TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Digital Signature (Full Legal Name)',
                hint: 'e.g. Abhishek Kaushik',
                controller: controller.signatureController,
                prefixIcon: Icons.edit_note,
              ),
              Obx(() => CustomButton(
                text: 'Sign & Accept Agreement',
                onPressed: controller.signDigitalAgreement,
                isLoading: controller.isLoading.value,
              )),
            ] else ...[
              Obx(() => CustomButton(
                text: status == 'approved' ? 'SOP & Agreement Completed' : 'Submit Checklist for Admin Review',
                onPressed: status == 'approved' ? null : () => controller.submitSopChecklist({'camera': true, 'audio': true, 'internet': true, 'lighting': true, 'demo': true}),
                isLoading: controller.isLoading.value,
              )),
            ]
          ],
        ),
      );
    });
  }

  Widget _buildCheckTile(String title, String subtitle, bool isCompleted) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Icon(isCompleted ? Icons.check_circle : Icons.radio_button_unchecked, color: isCompleted ? AppColors.success : Colors.grey),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      ),
    );
  }
}
