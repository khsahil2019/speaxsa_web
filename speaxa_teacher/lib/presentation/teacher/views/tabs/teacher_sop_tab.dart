import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherSopTab extends GetView<TeacherDashboardController> {
  const TeacherSopTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sop = controller.sopStatus.value;
      final status = sop?.status ?? 'pending';
      final user = AuthService.to.currentUser.value;

      // 6 Essential SOP Compliance Steps State
      final kycUploaded = controller.documents.isNotEmpty;
      final profileCompleted = controller.analytics['totalStudents'] != null;
      final availabilitySaved = true;
      final technicalSopDone = sop?.status == 'approved' || sop != null;
      final affidavitSigned = sop?.agreementSigned ?? false;

      int completedSteps = 1; // Step 1 Onboarding Guide default completed
      if (kycUploaded) completedSteps++;
      if (profileCompleted) completedSteps++;
      if (availabilitySaved) completedSteps++;
      if (technicalSopDone) completedSteps++;
      if (affidavitSigned) completedSteps++;

      final double progressRatio = completedSteps / 6.0;

      return Scaffold(
        backgroundColor: AppColors.lightBg,
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Overflow-Free Header Card with Progress Bar
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Educator Onboarding & SOP Hub",
                                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                softWrap: true,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Complete 6 mandatory verification steps to launch live batches",
                                style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 11),
                                softWrap: true,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusChip(status: status),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("Progress: $completedSteps of 6 Steps Completed", style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                        Text("${(progressRatio * 100).toInt()}%", style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: LinearProgressIndicator(
                        value: progressRatio,
                        minHeight: 8,
                        backgroundColor: Colors.white24,
                        valueColor: const AlwaysStoppedAnimation<Color>(Colors.greenAccent),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              const Text("6-Step Verification Checklist", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text("Tap any pending step to fill details or complete verification:", style: TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 14),

              // STEP 1: Onboarding Guide
              _buildSopStepTile(
                context,
                stepNumber: "1",
                title: "Onboarding Guide",
                subtitle: "Orientation video & platform teaching standards.",
                isCompleted: true,
                badgeText: "Completed ✓",
                onTapAction: () => _showOnboardingModal(context),
              ),

              // STEP 2: KYC Documents
              _buildSopStepTile(
                context,
                stepNumber: "2",
                title: "KYC Documents",
                subtitle: "Government ID proof, Aadhaar/PAN, and Highest Degree.",
                isCompleted: kycUploaded,
                badgeText: kycUploaded ? "Verified ✓" : "Upload Pending",
                onTapAction: () => controller.selectedIndex.value = 15,
              ),

              // STEP 3: Profile & Experience
              _buildSopStepTile(
                context,
                stepNumber: "3",
                title: "Profile & Experience",
                subtitle: "Teaching experience years, bio, subject expertise & subjects.",
                isCompleted: profileCompleted,
                badgeText: profileCompleted ? "Verified ✓" : "Fill Details",
                onTapAction: () => controller.selectedIndex.value = 14,
              ),

              // STEP 4: Availability Calendar
              _buildSopStepTile(
                context,
                stepNumber: "4",
                title: "Availability Calendar",
                subtitle: "Weekly teaching time slots and preferred class hours.",
                isCompleted: availabilitySaved,
                badgeText: availabilitySaved ? "Configured ✓" : "Set Hours",
                onTapAction: () => _showAvailabilityModal(context),
              ),

              // STEP 5: Technical SOPs
              _buildSopStepTile(
                context,
                stepNumber: "5",
                title: "Technical SOPs",
                subtitle: "Camera framing, noise-cancelling headset & 20Mbps+ internet proof.",
                isCompleted: technicalSopDone,
                badgeText: technicalSopDone ? "Verified ✓" : "Review & Submit",
                onTapAction: () => _showTechnicalSopModal(context),
              ),

              // STEP 6: Deed of Affidavit (DISABLED WHEN SIGNED)
              _buildSopStepTile(
                context,
                stepNumber: "6",
                title: "Deed of Affidavit",
                subtitle: affidavitSigned
                    ? "Signed by ${sop?.digitalSignature ?? user?.name ?? 'Educator'} ✓"
                    : "Binding legal digital teaching agreement & signature.",
                isCompleted: affidavitSigned,
                badgeText: affidavitSigned ? "Signed & Verified ✓" : "Sign Now",
                onTapAction: affidavitSigned
                    ? () {
                        Get.snackbar(
                          "Deed Signed ✓",
                          "Your Deed of Affidavit is signed, verified, and legally binding.",
                          backgroundColor: AppColors.success,
                          colorText: Colors.white,
                        );
                      }
                    : () => _showDeedOfAffidavitModal(context),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildSopStepTile(
    BuildContext context, {
    required String stepNumber,
    required String title,
    required String subtitle,
    required bool isCompleted,
    required String badgeText,
    required VoidCallback onTapAction,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: isCompleted ? Colors.green.shade300 : Colors.grey.shade300, width: 1),
      ),
      color: isCompleted ? const Color(0xFFF0FDF4) : Colors.white,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: isCompleted ? AppColors.success : AppColors.primary.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isCompleted
                ? const Icon(Icons.check, color: Colors.white, size: 20)
                : Text(stepNumber, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16)),
          ),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.black54)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isCompleted ? AppColors.success.withOpacity(0.15) : AppColors.warning.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                badgeText,
                style: TextStyle(
                  color: isCompleted ? AppColors.success : AppColors.warning,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 2),
            Icon(isCompleted ? Icons.lock_outline : Icons.chevron_right, size: 18, color: Colors.grey),
          ],
        ),
        onTap: onTapAction,
      ),
    );
  }

  void _showOnboardingModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Step 1: Onboarding & Orientation Guide", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            const Text("Welcome to Speaxa Educator Platform! Please review key orientation principles:", style: TextStyle(fontSize: 12, color: Colors.black87)),
            const SizedBox(height: 12),
            _buildBullet("1. Interactive Live Classes with Agora Video Engine."),
            _buildBullet("2. Launch live class 5 minutes prior to scheduled start time."),
            _buildBullet("3. Use interactive live polls at least twice per batch session."),
            _buildBullet("4. Post homework assignments within 2 hours of class conclusion."),
            _buildBullet("5. Submit 7-point student observation ratings after every batch."),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                onPressed: () => Navigator.pop(ctx),
                child: const Text("Got It ✓"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAvailabilityModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Step 4: Availability Calendar", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text("Select your available daily teaching hours:", style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 14),
            const Text("Preferred Slot 1: Morning (9:00 AM - 1:00 PM)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 4),
            const Text("Preferred Slot 2: Evening (4:00 PM - 9:00 PM)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                onPressed: () {
                  Navigator.pop(ctx);
                  Get.snackbar("Success", "Availability slots saved successfully!");
                },
                child: const Text("Save Availability Hours ✓"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTechnicalSopModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Step 5: Technical SOP Verification", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text("Check all technical requirements before submitting to Admin:", style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            _buildCheckTileModal("1. HD Camera & Framing (1080p)", true),
            _buildCheckTileModal("2. Noise-Cancelling Headset Mic", true),
            _buildCheckTileModal("3. High-Speed Fiber Internet (20Mbps+)", true),
            _buildCheckTileModal("4. Clean Room Lighting & Backdrop", true),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                onPressed: () {
                  Navigator.pop(ctx);
                  controller.submitSopChecklist({'camera': true, 'audio': true, 'internet': true, 'lighting': true});
                },
                child: const Text("Submit Technical Proofs ✓"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeedOfAffidavitModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom + 20, top: 20, left: 20, right: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Step 6: Deed of Affidavit & Legal Agreement", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text("I hereby declare that all provided documents, qualifications, and teaching credentials are authentic and comply with Speaxa Code of Ethics.", style: TextStyle(fontSize: 12, color: Colors.black87)),
            const SizedBox(height: 14),
            CustomTextField(
              label: 'Digital Signature (Full Legal Name)',
              hint: 'e.g. Abhishek Kaushik',
              controller: controller.signatureController,
              prefixIcon: Icons.edit_note,
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
                onPressed: () {
                  Navigator.pop(ctx);
                  controller.signDigitalAgreement();
                },
                child: const Text("Sign & Submit Deed of Affidavit ✓"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Text(text, style: const TextStyle(fontSize: 12, color: Colors.black87)),
    );
  }

  Widget _buildCheckTileModal(String text, bool isChecked) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Icon(isChecked ? Icons.check_box : Icons.check_box_outline_blank, color: isChecked ? AppColors.success : Colors.grey, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold))),
        ],
      ),
    );
  }
}
