import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../data/models/user_model.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/status_chip.dart';
import '../../../shared/widgets/signature_canvas_widget.dart';

enum SopStepStatus { allDone, inProgress, pending, rejected }

class TeacherSopTab extends GetView<TeacherDashboardController> {
  const TeacherSopTab({super.key});
  
  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final sop = controller.sopStatus.value;
      final status = sop?.status ?? 'pending';
      final user = AuthService.to.currentUser.value;
      final int currentStep = controller.sopCurrentStep.value;

      // Granular completion stats
      final int docCount = controller.documents.length;
      final bool kycAllDone = docCount >= 4 || status == 'approved';
      final bool kycInProgress = docCount > 0 && !kycAllDone;

      final bool profileQual = user?.qualification != null && user!.qualification!.isNotEmpty;
      final bool profileExp = (user?.experienceYears ?? 0) > 0;
      final bool profileSubj = user?.subjectExpertise != null && user!.subjectExpertise!.isNotEmpty;
      final bool profileLang = user?.languages != null && user!.languages!.isNotEmpty;
      final int profileFilledCount = (profileQual ? 1 : 0) + (profileExp ? 1 : 0) + (profileSubj ? 1 : 0) + (profileLang ? 1 : 0);
      final bool profileAllDone = profileFilledCount >= 4;
      final bool profileInProgress = profileFilledCount > 0 && !profileAllDone;

      final bool availabilitySaved = sop?.availability != null && sop!.availability!.isNotEmpty;

      int proofCount = 0;
      if (sop?.cameraSopUrl != null && sop!.cameraSopUrl!.isNotEmpty) proofCount++;
      if (sop?.lightingSopUrl != null && sop!.lightingSopUrl!.isNotEmpty) proofCount++;
      if (sop?.audioSopUrl != null && sop!.audioSopUrl!.isNotEmpty) proofCount++;
      if (sop?.internetProofUrl != null && sop!.internetProofUrl!.isNotEmpty) proofCount++;
      if (sop?.demoTeachingUrl != null && sop!.demoTeachingUrl!.isNotEmpty) proofCount++;

      final bool proofAllDone = status == 'approved' || proofCount >= 5;
      final bool proofInProgress = proofCount > 0 || status == 'submitted' || status == 'sop_pending';

      final bool affidavitSigned = sop?.agreementSigned ?? false;

      // Evaluate SopStepStatus for each of the 6 steps
      final Map<int, SopStepStatus> stepStatuses = {
        1: SopStepStatus.allDone,
        2: status == 'rejected' ? SopStepStatus.rejected : (kycAllDone ? SopStepStatus.allDone : (kycInProgress ? SopStepStatus.inProgress : SopStepStatus.pending)),
        3: status == 'rejected' ? SopStepStatus.rejected : (profileAllDone ? SopStepStatus.allDone : (profileInProgress ? SopStepStatus.inProgress : SopStepStatus.pending)),
        4: availabilitySaved ? SopStepStatus.allDone : SopStepStatus.pending,
        5: status == 'rejected' ? SopStepStatus.rejected : (proofAllDone ? SopStepStatus.allDone : (proofInProgress ? SopStepStatus.inProgress : SopStepStatus.pending)),
        6: status == 'rejected' ? SopStepStatus.rejected : (affidavitSigned ? SopStepStatus.allDone : (controller.signatureImageBase64.isNotEmpty ? SopStepStatus.inProgress : SopStepStatus.pending)),
      };

      int completedStepsCount = 0;
      stepStatuses.forEach((k, v) {
        if (v == SopStepStatus.allDone) completedStepsCount++;
      });

      final double progressRatio = completedStepsCount / 6.0;

      return Scaffold(
        backgroundColor: AppColors.lightBg,
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Live Admin Review Timer Card (when submitted)
              if (status == 'submitted' || status == 'sop_pending')
                _buildLiveAdminReviewTimerCard(context, sop?.submittedAt),

              // Header Card with Progress Bar
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4)),
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
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Step $currentStep of 6: ${SopStepTitles.getStepTitle(currentStep)}",
                                style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11, fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
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
                        Flexible(
                          child: Text(
                            "Progress: $completedStepsCount of 6 Steps Completed",
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
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
              const SizedBox(height: 18),

              // Step Wizard Selector Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(6, (index) {
                    final stepNum = index + 1;
                    final isSelected = currentStep == stepNum;
                    final stepState = stepStatuses[stepNum] ?? SopStepStatus.pending;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: GestureDetector(
                        onTap: () => controller.sopCurrentStep.value = stepNum,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: _getStepBackgroundColor(stepState, isSelected),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _getStepBorderColor(stepState, isSelected), width: isSelected ? 2 : 1),
                            boxShadow: [
                              if (isSelected) BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4, offset: const Offset(0, 2)),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _buildStepBadgeIcon(stepState),
                              const SizedBox(width: 6),
                              Text(
                                "Step $stepNum",
                                style: TextStyle(
                                  color: _getStepTextColor(stepState, isSelected),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 16),

              // Active Step Card
              _buildActiveStepContent(
                context,
                currentStep,
                stepStatuses[currentStep] ?? SopStepStatus.pending,
                docCount,
                profileFilledCount,
                proofCount,
                status,
              ),

              const SizedBox(height: 20),

              // Step Wizard Navigation Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (currentStep > 1)
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        side: const BorderSide(color: AppColors.primary),
                      ),
                      icon: const Icon(Icons.arrow_back, size: 16, color: AppColors.primary),
                      label: const Text("Previous Step", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                      onPressed: () => controller.sopCurrentStep.value--,
                    )
                  else
                    const SizedBox(),
                  if (currentStep < 6)
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                      icon: const Icon(Icons.arrow_forward, size: 16),
                      label: const Text("Next Step", style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: () => controller.sopCurrentStep.value++,
                    )
                  else
                    const SizedBox(),
                ],
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      );
    });
  }

  // ── Live 24-48 Hours Admin Review Timer Card ──────────────────────

  Widget _buildLiveAdminReviewTimerCard(BuildContext context, String? submittedAtStr) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFCD34D), width: 1.5),
        boxShadow: [
          BoxShadow(color: Colors.amber.withValues(alpha: 0.15), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.amber.shade100,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.amber.shade400, width: 1.5),
                ),
                child: const Icon(Icons.hourglass_top_rounded, color: Color(0xFFD97706), size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "SOP Verification Under Admin Review",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF92400E)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "Submitted: ${submittedAtStr != null ? submittedAtStr.substring(0, 10) : 'Today'} • Under Active Evaluation",
                      style: const TextStyle(fontSize: 11, color: Color(0xFFB45309)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.amber.shade800,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.timer_outlined, color: Colors.white, size: 12),
                    SizedBox(width: 4),
                    Text(
                      "Est. Review Time: 24–48 Hours",
                      style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: () => controller.loadTeacherData(),
                icon: const Icon(Icons.refresh, size: 14, color: Color(0xFFB45309)),
                label: const Text("Refresh Status", style: TextStyle(fontSize: 11, color: Color(0xFFB45309), fontWeight: FontWeight.bold)),
                style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(60, 30)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Step Colors & White Tick Icon Helpers ──────────────────────────

  Widget _buildStepBadgeIcon(SopStepStatus stepState) {
    switch (stepState) {
      case SopStepStatus.allDone:
        return Container(
          width: 18,
          height: 18,
          decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
          child: const Icon(Icons.check, color: Colors.white, size: 12),
        );
      case SopStepStatus.inProgress:
        return Container(
          width: 18,
          height: 18,
          decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle),
          child: const Icon(Icons.hourglass_top, color: Colors.white, size: 11),
        );
      case SopStepStatus.rejected:
        return Container(
          width: 18,
          height: 18,
          decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle),
          child: const Icon(Icons.close, color: Colors.white, size: 12),
        );
      case SopStepStatus.pending:
      default:
        return Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(color: Colors.grey.shade200, shape: BoxShape.circle),
          child: Icon(Icons.circle_outlined, color: Colors.grey.shade600, size: 12),
        );
    }
  }

  Color _getStepBackgroundColor(SopStepStatus state, bool isSelected) {
    if (isSelected) {
      switch (state) {
        case SopStepStatus.allDone:
          return const Color(0xFFDCFCE7);
        case SopStepStatus.inProgress:
          return const Color(0xFFFEF9C3);
        case SopStepStatus.rejected:
          return const Color(0xFFFEE2E2);
        case SopStepStatus.pending:
        default:
          return Colors.white;
      }
    }
    switch (state) {
      case SopStepStatus.allDone:
        return const Color(0xFFF0FDF4);
      case SopStepStatus.inProgress:
        return const Color(0xFFFEFCE8);
      case SopStepStatus.rejected:
        return const Color(0xFFFEF2F2);
      case SopStepStatus.pending:
      default:
        return Colors.white;
    }
  }

  Color _getStepBorderColor(SopStepStatus state, bool isSelected) {
    if (isSelected) return AppColors.primary;
    switch (state) {
      case SopStepStatus.allDone:
        return const Color(0xFF86EFAC);
      case SopStepStatus.inProgress:
        return const Color(0xFFFDE047);
      case SopStepStatus.rejected:
        return const Color(0xFFFCA5A5);
      case SopStepStatus.pending:
      default:
        return const Color(0xFFCBD5E1);
    }
  }

  Color _getStepTextColor(SopStepStatus state, bool isSelected) {
    if (isSelected) return AppColors.primary;
    switch (state) {
      case SopStepStatus.allDone:
        return const Color(0xFF15803D);
      case SopStepStatus.inProgress:
        return const Color(0xFFA16207);
      case SopStepStatus.rejected:
        return const Color(0xFFB91C1C);
      case SopStepStatus.pending:
      default:
        return const Color(0xFF475569);
    }
  }

  // ── Step Content Builder ──────────────────────────────────────────

  Widget _buildActiveStepContent(
    BuildContext context,
    int step,
    SopStepStatus stepState,
    int docCount,
    int profileCount,
    int proofCount,
    String status,
  ) {
    switch (step) {
      case 1:
        return _buildStep1OnboardingCard(context, stepState);
      case 2:
        return _buildStep2KycCard(context, stepState, docCount);
      case 3:
        return _buildStep3ProfileCard(context, stepState, profileCount);
      case 4:
        return _buildStep4AvailabilityCard(context, stepState, status == 'approved');
      case 5:
        return _buildStep5TechnicalSopCard(context, stepState, proofCount, status == 'approved');
      case 6:
        return _buildStep6DeedCard(context, stepState);
      default:
        return _buildStep1OnboardingCard(context, stepState);
    }
  }

  Widget _buildStepCardContainer({
    required SopStepStatus stepState,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: _getStepBackgroundColor(stepState, false),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _getStepBorderColor(stepState, false), width: 1.2),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: child,
      ),
    );
  }

  Widget _buildStepStatusHeaderBadge(SopStepStatus stepState, String labelText) {
    Color bg;
    Color fg;
    switch (stepState) {
      case SopStepStatus.allDone:
        bg = const Color(0xFFDCFCE7);
        fg = const Color(0xFF15803D);
        break;
      case SopStepStatus.inProgress:
        bg = const Color(0xFFFEF9C3);
        fg = const Color(0xFFA16207);
        break;
      case SopStepStatus.rejected:
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFB91C1C);
        break;
      case SopStepStatus.pending:
      default:
        bg = const Color(0xFFF1F5F9);
        fg = const Color(0xFF64748B);
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildStepBadgeIcon(stepState),
          const SizedBox(width: 4),
          Text(labelText, style: TextStyle(color: fg, fontSize: 10, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildStep1OnboardingCard(BuildContext context, SopStepStatus stepState) {
    return _buildStepCardContainer(
      stepState: stepState,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.school_outlined, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "Step 1: Educator Orientation & Standards",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepStatusHeaderBadge(stepState, "Completed ✓"),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            "Welcome to SPEAXA! Key platform orientation principles:",
            style: TextStyle(fontSize: 12, color: Colors.black87),
          ),
          const SizedBox(height: 12),
          _buildBullet("1. Interactive Live Classes using Agora Video Engine."),
          _buildBullet("2. Join your live class 5 minutes prior to scheduled start time."),
          _buildBullet("3. Use interactive live polls & concept recaps during every class."),
          _buildBullet("4. Upload homework assignments within 2 hours of class completion."),
          _buildBullet("5. Fill 7-point student observation ratings after every batch."),
          const SizedBox(height: 16),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
            onPressed: () => controller.sopCurrentStep.value = 2,
            child: const Text("Continue to Step 2 →", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2KycCard(BuildContext context, SopStepStatus stepState, int docCount) {
    String badgeText = "Pending Upload";
    if (stepState == SopStepStatus.allDone) badgeText = "All 4 Docs Uploaded ✓";
    if (stepState == SopStepStatus.inProgress) badgeText = "In Progress ($docCount/4 Uploaded)";
    if (stepState == SopStepStatus.rejected) badgeText = "Rejected - Action Required";

    return _buildStepCardContainer(
      stepState: stepState,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.badge_outlined, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "Step 2: Verification Documents (KYC)",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepStatusHeaderBadge(stepState, badgeText),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            "Upload Government ID (Aadhaar/PAN), Highest Degree Certificate & Resume:",
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
            icon: const Icon(Icons.folder_shared, size: 16),
            label: const Text("Manage & Upload Documents", style: TextStyle(fontWeight: FontWeight.bold)),
            onPressed: () => controller.navigateToTab(15, sopStep: 2),
          ),
        ],
      ),
    );
  }

  Widget _buildStep3ProfileCard(BuildContext context, SopStepStatus stepState, int filledCount) {
    String badgeText = "Pending Details";
    if (stepState == SopStepStatus.allDone) badgeText = "Profile Completed ✓";
    if (stepState == SopStepStatus.inProgress) badgeText = "In Progress ($filledCount/4 Filled)";
    if (stepState == SopStepStatus.rejected) badgeText = "Rejected";

    return _buildStepCardContainer(
      stepState: stepState,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.person_outline, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "Step 3: Educator Profile & Proofs",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepStatusHeaderBadge(stepState, badgeText),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            "Enter your teaching credentials, subject expertise, and attach verification proof documents directly below:",
            style: TextStyle(fontSize: 12, color: Colors.black87),
          ),
          const SizedBox(height: 16),
          _Step3InlineProfileEditor(controller: controller),
        ],
      ),
    );
  }

  // ── Step 4: Interactive Availability Slot Builder ─────────────────

  Widget _buildStep4AvailabilityCard(BuildContext context, SopStepStatus stepState, bool isLocked) {
    final sop = controller.sopStatus.value;
    String badgeText = stepState == SopStepStatus.allDone ? "Configured ✓" : "Pending Choice";

    return _buildStepCardContainer(
      stepState: stepState,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_month_outlined, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "Step 4: Weekly Teaching Availability",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepStatusHeaderBadge(stepState, badgeText),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            stepState == SopStepStatus.allDone
                ? "Current Active Calendar: ${sop?.availability}"
                : "Select days and time ranges to build your weekly teaching availability slots:",
            style: const TextStyle(fontSize: 12, color: Colors.black87),
          ),
          const SizedBox(height: 14),

          // Interactive Availability Builder Widget
          _Step4InteractiveAvailabilityBuilder(controller: controller),
        ],
      ),
    );
  }

  // ── Step 5: Technical Proofs & 13 Compliance Checkboxes ───────────

  Widget _buildStep5TechnicalSopCard(BuildContext context, SopStepStatus stepState, int proofCount, bool isApproved) {
    String badgeText = "Pending Attachments";
    if (stepState == SopStepStatus.allDone) badgeText = "All Proofs Verified ✓";
    if (stepState == SopStepStatus.inProgress) badgeText = "In Progress ($proofCount/5 Attached)";
    if (stepState == SopStepStatus.rejected) badgeText = "Rejected - Resubmit";

    return _buildStepCardContainer(
      stepState: stepState,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.videocam_outlined, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "Step 5: Setup & Technical Proofs",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepStatusHeaderBadge(stepState, badgeText),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.blue.shade200)),
            child: const Text(
              "💡 Layman Guide: Please attach proof files or video links for your teaching setup below, then check all 13 compliance checkboxes to certify your setup.",
              style: TextStyle(fontSize: 11, color: Colors.blue, height: 1.3),
            ),
          ),
          const SizedBox(height: 14),

          // Full Technical SOP & 13 Compliance Checkboxes Widget
          _Step5TechnicalSopAndChecklistWidget(controller: controller),
        ],
      ),
    );
  }

  // ── Step 6: Legal Deed of Affidavit & Digital Signature ───────────

  Widget _buildStep6DeedCard(BuildContext context, SopStepStatus stepState) {
    final user = AuthService.to.currentUser.value;
    final sop = controller.sopStatus.value;
    final bool isApproved = sop?.status == 'approved';
    final bool isSigned = sop?.agreementSigned ?? false;
    controller.signatureController.text = sop?.digitalSignature ?? user?.name ?? '';

    String badgeText = isApproved
        ? (isSigned ? "Executed & Signed ✓" : "Ready for Signature")
        : "Locked (Requires Admin Approval)";

    return _buildStepCardContainer(
      stepState: isApproved ? (isSigned ? SopStepStatus.allDone : SopStepStatus.inProgress) : SopStepStatus.pending,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.draw_outlined, color: AppColors.primary, size: 22),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  "Step 6: Digital Signature & Deed of Affidavit",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              _buildStepStatusHeaderBadge(isApproved ? (isSigned ? SopStepStatus.allDone : SopStepStatus.inProgress) : SopStepStatus.pending, badgeText),
            ],
          ),
          const SizedBox(height: 10),

          // Legal Affidavit Box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade300)),
            child: const Text(
              "BEFORE THE SPEAXA EDUCATION COMPLIANCE COMMITTEE:\nDeed of Oath & Legal Affidavit of Undertaking. I solemnly declare on oath that all qualifications, video proofs, and credentials submitted are authentic and comply with SPEAXA platform governance ethics.",
              style: TextStyle(fontSize: 11, color: Colors.black87, height: 1.4),
            ),
          ),
          const SizedBox(height: 14),

          if (!isApproved) ...[
            // Locked State Notice Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade300),
              ),
              child: Row(
                children: [
                  Icon(Icons.lock_rounded, color: Colors.amber.shade800, size: 26),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Digital Agreement Signing Locked 🔒",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.amber.shade900),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "Digital Agreement Signing will be unlocked automatically after Speaxa Admin reviews and approves your SOP submission.",
                          style: TextStyle(fontSize: 11, color: Colors.amber.shade900),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ] else if (isSigned) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.green.shade300)),
              child: Text("Digitally Executed by: ${sop?.digitalSignature ?? user?.name} ✓", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.success)),
            ),
          ] else ...[
            CustomTextField(
              label: 'Printed Legal Name',
              hint: 'e.g. Abhishek Kaushik',
              controller: controller.signatureController,
              prefixIcon: Icons.edit_note,
            ),
            const SizedBox(height: 12),

            SignatureCanvasWidget(
              onSignatureChanged: (base64Image) {
                controller.signatureImageBase64.value = base64Image;
              },
              onClear: () {
                controller.signatureImageBase64.value = '';
              },
            ),
            const SizedBox(height: 16),

            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10)),
              onPressed: controller.signDigitalAgreement,
              child: const Text("Sign & Execute Agreement", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Text(text, style: const TextStyle(fontSize: 12, color: Colors.black87)),
    );
  }
}

// ── Step 3: Inline Profile Editor ───────────────────────────────────

class _Step3InlineProfileEditor extends StatefulWidget {
  final TeacherDashboardController controller;

  const _Step3InlineProfileEditor({required this.controller});

  @override
  State<_Step3InlineProfileEditor> createState() => _Step3InlineProfileEditorState();
}

class _Step3InlineProfileEditorState extends State<_Step3InlineProfileEditor> {
  late TextEditingController _qualCtrl;
  late TextEditingController _expCtrl;
  late TextEditingController _subjectCtrl;
  late TextEditingController _languagesCtrl;
  late TextEditingController _altEmailCtrl;
  late TextEditingController _bioCtrl;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService.to.currentUser.value;
    _qualCtrl = TextEditingController(text: user?.qualification ?? '');
    _expCtrl = TextEditingController(text: user?.experienceYears?.toString() ?? '0');
    _subjectCtrl = TextEditingController(text: user?.subjectExpertise ?? '');
    _languagesCtrl = TextEditingController(text: user?.languages ?? '');
    _altEmailCtrl = TextEditingController(text: user?.altEmail ?? '');
    _bioCtrl = TextEditingController(text: user?.bio ?? '');
  }

  @override
  void dispose() {
    _qualCtrl.dispose();
    _expCtrl.dispose();
    _subjectCtrl.dispose();
    _languagesCtrl.dispose();
    _altEmailCtrl.dispose();
    _bioCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfileDetails() async {
    setState(() => _isSaving = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final data = <String, dynamic>{
        'qualification': _qualCtrl.text.trim(),
        'experience_years': int.tryParse(_expCtrl.text.trim()) ?? 0,
        'subject_expertise': _subjectCtrl.text.trim(),
        'languages': _languagesCtrl.text.trim(),
        'alt_email': _altEmailCtrl.text.trim(),
        'bio': _bioCtrl.text.trim(),
      };

      final response = await apiClient.put(ApiEndpoints.profile, data: data);
      if (response != null && response['user'] != null) {
        final updatedUser = UserModel.fromJson(response['user']);
        AuthService.to.updateUserProfile(updatedUser);
        Get.snackbar('Profile Saved ✓', 'Profile details updated successfully!', backgroundColor: AppColors.primary, colorText: Colors.white);
        widget.controller.sopCurrentStep.value = 4;
      }
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSmallLabel("Highest Qualification / Degree Title"),
        const SizedBox(height: 4),
        _buildTextField(_qualCtrl, "e.g. M.Sc. Physics, B.Ed.", Icons.school_outlined),

        const SizedBox(height: 12),
        _buildSmallLabel("Previous Teaching Experience (Years)"),
        const SizedBox(height: 4),
        _buildTextField(_expCtrl, "e.g. 5", Icons.work_history_outlined, keyboardType: TextInputType.number),

        const SizedBox(height: 12),
        _buildSmallLabel("Subject Expertise"),
        const SizedBox(height: 4),
        _buildTextField(_subjectCtrl, "e.g. Physics, Mathematics", Icons.subject_outlined),

        const SizedBox(height: 12),
        _buildSmallLabel("Teaching Languages Spoken"),
        const SizedBox(height: 4),
        _buildTextField(_languagesCtrl, "e.g. English, Hindi", Icons.translate_outlined),

        const SizedBox(height: 12),
        _buildSmallLabel("Alternate Email Address"),
        const SizedBox(height: 4),
        _buildTextField(_altEmailCtrl, "e.g. alt@email.com", Icons.email_outlined, keyboardType: TextInputType.emailAddress),

        const SizedBox(height: 12),
        _buildSmallLabel("Educator Bio & Philosophy"),
        const SizedBox(height: 4),
        _buildTextField(_bioCtrl, "Share your teaching philosophy...", Icons.article_outlined, maxLines: 2),

        const SizedBox(height: 18),
        const Divider(),
        const SizedBox(height: 10),

        const Text(
          "Attach Profile Verification Proof Documents:",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
        ),
        const SizedBox(height: 4),
        const Text("Upload document proofs for experience letter and subject expertise below:", style: TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 12),

        Obx(() {
          final docsList = widget.controller.documents;
          final Map<String, dynamic> docMap = {};
          for (var item in docsList) {
            if (item is Map<String, dynamic>) {
              final type = (item['doc_type'] ?? '').toString().toLowerCase();
              docMap[type] = item;
            }
          }

          return Column(
            children: [
              _buildProofUploadTile("📄 1. Teaching Experience Letter / Proof", "experience_proof", docMap['experience_proof']),
              _buildProofUploadTile("🎓 2. Subject Expertise Certificate", "expertise_proof", docMap['expertise_proof']),
              _buildProofUploadTile("🗣️ 3. Language Preference Certificate", "language_proof", docMap['language_proof']),
            ],
          );
        }),

        const SizedBox(height: 18),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: _isSaving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save, size: 18),
            label: Text(
              _isSaving ? "Saving..." : "Save Profile & Continue to Step 4 →",
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
            onPressed: _isSaving ? null : _saveProfileDetails,
          ),
        ),
      ],
    );
  }

  Widget _buildSmallLabel(String label) {
    return Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)));
  }

  Widget _buildTextField(TextEditingController ctrl, String hint, IconData icon, {TextInputType keyboardType = TextInputType.text, int maxLines = 1}) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboardType,
      maxLines: maxLines,
      style: const TextStyle(fontSize: 12),
      decoration: InputDecoration(
        prefixIcon: Icon(icon, size: 16, color: AppColors.primary),
        hintText: hint,
        hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
      ),
    );
  }

  Widget _buildProofUploadTile(String title, String docType, Map<String, dynamic>? docItem) {
    final bool isUploaded = docItem != null;
    final String fileName = docItem?['original_name']?.toString() ?? docItem?['file_name']?.toString() ?? 'Proof Attached';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isUploaded ? const Color(0xFFF0FDF4) : Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isUploaded ? Colors.green.shade300 : Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: isUploaded ? const Color(0xFF10B981) : Colors.grey.shade300, shape: BoxShape.circle),
            child: Icon(isUploaded ? Icons.check : Icons.upload_file, color: Colors.white, size: 12),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(isUploaded ? "Uploaded: $fileName ✓" : "Status: Pending Upload", style: TextStyle(fontSize: 10, color: isUploaded ? Colors.green.shade800 : Colors.grey)),
              ],
            ),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: isUploaded ? Colors.grey.shade100 : AppColors.primary.withValues(alpha: 0.1),
              foregroundColor: isUploaded ? Colors.black87 : AppColors.primary,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: Icon(isUploaded ? Icons.sync : Icons.attach_file, size: 14),
            label: Text(isUploaded ? "Replace" : "Attach File", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
            onPressed: () async {
              FilePickerResult? result = await FilePicker.pickFiles();
              if (result != null && result.files.isNotEmpty) {
                final file = result.files.single;
                if (file.size > 5 * 1024 * 1024) {
                  _showMax5MbErrorBottomSheet(context, file.size);
                  return;
                }
                if (file.path != null) {
                  widget.controller.uploadKyc(file.path!, docType);
                }
              }
            },
          ),
        ],
      ),
    );
  }
}

// ── Step 4: Interactive Availability Slot Builder Widget ────────────

class _Step4InteractiveAvailabilityBuilder extends StatefulWidget {
  final TeacherDashboardController controller;

  const _Step4InteractiveAvailabilityBuilder({required this.controller});

  @override
  State<_Step4InteractiveAvailabilityBuilder> createState() => _Step4InteractiveAvailabilityBuilderState();
}

class _Step4InteractiveAvailabilityBuilderState extends State<_Step4InteractiveAvailabilityBuilder> {
  final List<String> _daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  final Set<String> _selectedDays = {'Mon', 'Tue', 'Wed', 'Thu', 'Fri'};
  TimeOfDay _startTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 13, minute: 0);
  String _selectedTimezone = 'IST';
  final List<Map<String, dynamic>> _addedSlots = [];

  @override
  void initState() {
    super.initState();
    // Parse existing availability if present
    final sop = widget.controller.sopStatus.value;
    if (sop?.availability != null && sop!.availability!.isNotEmpty) {
      try {
        final parsed = jsonDecode(sop.availability!);
        if (parsed is List) {
          for (var item in parsed) {
            if (item is Map<String, dynamic>) {
              _addedSlots.add(item);
            }
          }
        }
      } catch (e) {
        _addedSlots.add({
          'days': ['Mon-Sat'],
          'startTime': '09:00',
          'endTime': '13:00',
          'timezone': 'IST',
          'rawText': sop.availability,
        });
      }
    }
  }

  void _addSlot() {
    if (_selectedDays.isEmpty) {
      Get.snackbar('Notice', 'Please select at least one day for the availability slot', backgroundColor: AppColors.warning, colorText: Colors.white);
      return;
    }

    final startStr = '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}';
    final endStr = '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}';

    setState(() {
      _addedSlots.add({
        'days': _selectedDays.toList(),
        'startTime': startStr,
        'endTime': endStr,
        'timezone': _selectedTimezone,
      });
    });
  }

  void _removeSlot(int index) {
    setState(() {
      _addedSlots.removeAt(index);
    });
  }

  Future<void> _saveAvailability() async {
    if (_addedSlots.isEmpty) {
      Get.snackbar('Notice', 'Please add at least one availability slot to your calendar', backgroundColor: AppColors.warning, colorText: Colors.white);
      return;
    }

    final jsonSlots = jsonEncode(_addedSlots);
    await widget.controller.saveAvailabilitySlots(jsonSlots);
    widget.controller.sopCurrentStep.value = 5; // Advance to Step 5
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Active Slots List
        const Text("Active Availability Slots List:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
          child: _addedSlots.isEmpty
              ? const Text("No availability slots added yet. Select days and time range below.", style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic))
              : Column(
                  children: List.generate(_addedSlots.length, (idx) {
                    final slot = _addedSlots[idx];
                    final daysStr = (slot['days'] as List?)?.join(', ') ?? slot['rawText'] ?? 'Days';
                    final timeStr = "${slot['startTime']} - ${slot['endTime']} (${slot['timezone'] ?? 'IST'})";

                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.green.shade200)),
                      child: Row(
                        children: [
                          const Icon(Icons.access_time_filled, size: 14, color: AppColors.success),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text("$daysStr: $timeStr", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black87), maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 14, color: Colors.redAccent),
                            constraints: const BoxConstraints(),
                            padding: EdgeInsets.zero,
                            onPressed: () => _removeSlot(idx),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
        ),

        const SizedBox(height: 16),
        const Text("Build Availability Slot:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),

        // Day Selector Pills
        const Text("Select Days *", style: TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: _daysList.map((day) {
            final bool isSelected = _selectedDays.contains(day);
            return FilterChip(
              label: Text(day),
              selected: isSelected,
              onSelected: (val) {
                setState(() {
                  if (val) {
                    _selectedDays.add(day);
                  } else {
                    _selectedDays.remove(day);
                  }
                });
              },
              selectedColor: AppColors.primary,
              backgroundColor: Colors.white,
              labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black87, fontSize: 11, fontWeight: FontWeight.bold),
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            );
          }).toList(),
        ),

        const SizedBox(height: 12),
        // Time Pickers & Timezone Dropdown
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Start Time *", style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 4),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showTimePicker(context: context, initialTime: _startTime);
                      if (picked != null) setState(() => _startTime = picked);
                    },
                    icon: const Icon(Icons.schedule, size: 14),
                    label: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text("${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8)),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("End Time *", style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 4),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picked = await showTimePicker(context: context, initialTime: _endTime);
                      if (picked != null) setState(() => _endTime = picked);
                    },
                    icon: const Icon(Icons.schedule, size: 14),
                    label: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text("${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Timezone", style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 4),
                  DropdownButtonFormField<String>(
                    value: _selectedTimezone,
                    style: const TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'IST', child: Text('IST')),
                      DropdownMenuItem(value: 'GMT', child: Text('GMT')),
                      DropdownMenuItem(value: 'EST', child: Text('EST')),
                      DropdownMenuItem(value: 'PST', child: Text('PST')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedTimezone = val);
                    },
                  ),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(backgroundColor: Colors.grey.shade100, foregroundColor: AppColors.primary, elevation: 0, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
          icon: const Icon(Icons.add_circle_outline, size: 16),
          label: const Text("Add Slot to List", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          onPressed: _addSlot,
        ),

        const SizedBox(height: 18),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            icon: const Icon(Icons.save, size: 18),
            label: const Text("Save Availability Calendar & Continue to Step 5 →", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            onPressed: _saveAvailability,
          ),
        ),
      ],
    );
  }
}

// ── Step 5: Full Technical SOP & 13 Compliance Checkboxes Widget ───

class _Step5TechnicalSopAndChecklistWidget extends StatefulWidget {
  final TeacherDashboardController controller;

  const _Step5TechnicalSopAndChecklistWidget({required this.controller});

  @override
  State<_Step5TechnicalSopAndChecklistWidget> createState() => _Step5TechnicalSopAndChecklistWidgetState();
}

class _Step5TechnicalSopAndChecklistWidgetState extends State<_Step5TechnicalSopAndChecklistWidget> {
  final Map<String, TextEditingController> _linkControllers = {
    'camera_sop': TextEditingController(),
    'lighting_sop': TextEditingController(),
    'audio_sop': TextEditingController(),
    'internet_proof': TextEditingController(),
    'demo_teaching': TextEditingController(),
  };

  final Map<String, bool> _checklistState = {
    'camera_stable': false,
    'camera_1080p': false,
    'lighting_soft': false,
    'lighting_bg': false,
    'audio_mic': false,
    'audio_noise': false,
    'internet_speed': false,
    'presentation_style': false,
    'dress_code': false,
    'class_flow': false,
    'board_materials': false,
    'content_delivery': false,
    'discipline_rules': false,
  };

  @override
  void initState() {
    super.initState();
    // Parse existing checklist if present
    final sop = widget.controller.sopStatus.value;
    if (sop?.teacherChecklist != null && sop!.teacherChecklist is Map) {
      final map = sop.teacherChecklist as Map;
      map.forEach((key, val) {
        if (_checklistState.containsKey(key)) {
          _checklistState[key] = val == true;
        }
      });
    }
  }

  @override
  void dispose() {
    _linkControllers.forEach((_, c) => c.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sop = widget.controller.sopStatus.value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 5 Proof Upload Items (File OR Shareable Link)
        _buildTechnicalProofItem("1. Camera Setup Framing", "camera_sop", sop?.cameraSopUrl, "Take eye-level photo of webcam setup"),
        _buildTechnicalProofItem("2. Lighting Setup Proof", "lighting_sop", sop?.lightingSopUrl, "Photo of front soft light falling on face"),
        _buildTechnicalProofItem("3. Microphone Audio Headset", "audio_sop", sop?.audioSopUrl, "Photo of collar mic / external headset"),
        _buildTechnicalProofItem("4. Internet Speed Test Proof", "internet_proof", sop?.internetProofUrl, "Screenshot of Speedtest.net (>20 Mbps upload)"),
        _buildTechnicalProofItem("5. Demo Teaching Snippet", "demo_teaching", sop?.demoTeachingUrl, "2-min video link or file showing teaching style"),

        const SizedBox(height: 18),
        const Divider(),
        const SizedBox(height: 10),

        // 13 Compliance Declaration Checkboxes
        const Text(
          "Compliance Declaration Checklist (Check all 13 items):",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
        ),
        const SizedBox(height: 4),
        const Text("Check each box to certify you understand and have configured these setup requirements:", style: TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 12),

        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
          child: Column(
            children: [
              _buildCheckboxTile('camera_stable', "I use a stable eye-level camera tripod (no shaky handheld feed)."),
              _buildCheckboxTile('camera_1080p', "My camera supports minimum 1080p resolution and shows face, upper body, and hands clearly."),
              _buildCheckboxTile('lighting_soft', "I use a front soft/ring light falling on my face, with no backlight glare behind me."),
              _buildCheckboxTile('lighting_bg', "I have a white or clean neutral background with no messy details visible."),
              _buildCheckboxTile('audio_mic', "I use a collar mic / external headset mic (built-in webcam mic is not permitted)."),
              _buildCheckboxTile('audio_noise', "My teaching environment is free of echo, fan noise, or background chatter."),
              _buildCheckboxTile('internet_speed', "My upload speed is above 20 Mbps, and I have mobile hotspot backup ready."),
              _buildCheckboxTile('presentation_style', "I will maintain an energetic tone, direct eye contact with the camera, and use gestures naturally."),
              _buildCheckboxTile('dress_code', "I will wear solid colored shirts/tops and maintain a clean professional appearance."),
              _buildCheckboxTile('class_flow', "I will join sessions 10–15 mins early, test media, greet students by name, and run polls every 3–5 mins."),
              _buildCheckboxTile('board_materials', "I will write in large legible characters with structured spacing and use annotations."),
              _buildCheckboxTile('content_delivery', "I will follow modular delivery: Concept -> Examples -> Practice -> Recap -> Doubt section."),
              _buildCheckboxTile('discipline_rules', "I will not solicit students privately, promote external coaching, or use unprofessional language."),
            ],
          ),
        ),

        const SizedBox(height: 18),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            icon: const Icon(Icons.send_rounded, size: 18),
            label: const Text("Submit Technical Verification for Admin Review", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            onPressed: () {
              widget.controller.submitSopChecklist(_checklistState);
              widget.controller.sopCurrentStep.value = 6;
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTechnicalProofItem(String title, String fieldName, String? currentUrl, String hint) {
    final bool isUploaded = currentUrl != null && currentUrl.isNotEmpty;
    final ctrl = _linkControllers[fieldName]!;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isUploaded ? const Color(0xFFF0FDF4) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isUploaded ? Colors.green.shade300 : Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(color: isUploaded ? const Color(0xFF10B981) : Colors.grey.shade300, shape: BoxShape.circle),
                child: Icon(isUploaded ? Icons.check : Icons.videocam, color: Colors.white, size: 12),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(isUploaded ? "Verified / Link Attached ✓" : hint, style: TextStyle(fontSize: 10, color: isUploaded ? Colors.green.shade800 : Colors.grey)),
                  ],
                ),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
                icon: const Icon(Icons.upload_file, size: 14),
                label: Text(isUploaded ? "Replace" : "Attach File", style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                onPressed: () async {
                  FilePickerResult? result = await FilePicker.pickFiles();
                  if (result != null && result.files.isNotEmpty) {
                    final file = result.files.single;
                    if (file.size > 5 * 1024 * 1024) {
                      _showMax5MbErrorBottomSheet(context, file.size);
                      return;
                    }
                    if (file.path != null) {
                      widget.controller.uploadSopFile(fieldName, file.path!);
                    }
                  }
                },
              ),
            ],
          ),
          if (!isUploaded) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: ctrl,
                    style: const TextStyle(fontSize: 11),
                    decoration: InputDecoration(
                      hintText: "Or paste Drive / YouTube video link...",
                      hintStyle: const TextStyle(fontSize: 11, color: Colors.grey),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.grey.shade200, foregroundColor: Colors.black87, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
                  onPressed: () {
                    if (ctrl.text.trim().isNotEmpty) {
                      widget.controller.linkSopUrl(fieldName, ctrl.text.trim());
                    }
                  },
                  child: const Text("Save Link", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCheckboxTile(String key, String text) {
    final bool val = _checklistState[key] ?? false;
    return CheckboxListTile(
      value: val,
      activeColor: AppColors.primary,
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(text, style: TextStyle(fontSize: 11, color: val ? Colors.black87 : Colors.grey.shade700)),
      onChanged: (bool? checked) {
        setState(() {
          _checklistState[key] = checked == true;
        });
      },
    );
  }
}

void _showMax5MbErrorBottomSheet(BuildContext context, int fileSizeInBytes) {
  final double mbSize = fileSizeInBytes / (1024 * 1024);
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10))),
          const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 44),
          const SizedBox(height: 10),
          const Text("File Exceeds Max 5MB Limit", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            "The selected file size is ${mbSize.toStringAsFixed(1)} MB. Maximum allowed upload file size is 5 MB. Please select a smaller or compressed file.",
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              onPressed: () => Navigator.pop(ctx),
              child: const Text("Understood", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    ),
  );
}

class SopStepTitles {
  static String getStepTitle(int step) {
    switch (step) {
      case 1:
        return "Orientation & Guidelines";
      case 2:
        return "KYC Documents";
      case 3:
        return "Educator Profile & Proofs";
      case 4:
        return "Teaching Availability";
      case 5:
        return "Setup & Technical Proofs";
      case 6:
        return "Digital Signature & Deed";
      default:
        return "Orientation";
    }
  }
}
