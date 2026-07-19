import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/skeleton_loader.dart';
import '../../../shared/widgets/error_state_widget.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherHomeTab extends GetView<TeacherDashboardController> {
  const TeacherHomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (controller.isLoading.value) return const SkeletonLoader(itemCount: 4);
      if (controller.errorMessage.isNotEmpty) {
        return ErrorStateWidget(errorMessage: controller.errorMessage.value, onRetry: controller.loadTeacherData);
      }

      final analytics = controller.analytics;
      final sop = controller.sopStatus.value;
      final batches = controller.batches;

      return RefreshIndicator(
        onRefresh: controller.loadTeacherData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Welcome Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.heroGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            "Welcome, ${AuthService.to.currentUser.value?.name.split(' ').first ?? 'Teacher'}! 👨‍🏫",
                            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                          child: Text(
                            "${analytics['level'] ?? 'Verified Mentor'}",
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildHeroStat("Active Batches", "${analytics['activeBatches'] ?? 0}"),
                        _buildHeroStat("Students", "${analytics['totalStudents'] ?? 0}"),
                        _buildHeroStat("Rating", "${analytics['rating'] ?? 5.0}★"),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // SOP Verification Banner (if pending)
              if (sop == null || sop.status != 'approved' || !sop.agreementSigned) ...[
                Card(
                  color: AppColors.warning.withOpacity(0.1),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: AppColors.warning.withOpacity(0.3))),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 36),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("SOP Verification Pending", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const SizedBox(height: 2),
                              Text(
                                sop?.agreementSigned == false && sop?.status == 'approved'
                                    ? "SOP approved! Sign the digital agreement to start teaching."
                                    : "Submit your technical SOP proofs for admin approval.",
                                style: const TextStyle(fontSize: 12, color: Colors.black87),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () => controller.selectedIndex.value = 1, // SOP tab
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.warning, foregroundColor: Colors.white, elevation: 0),
                          child: const Text("Action"),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Quick Actions Grid
              const Text("Quick Actions Hub", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 4,
                crossAxisSpacing: 10,
                mainAxisSpacing: 12,
                childAspectRatio: 0.9,
                children: [
                  _buildQuickAction(Icons.verified_user_outlined, "SOP Hub", 1),
                  _buildQuickAction(Icons.book_outlined, "Courses", 2),
                  _buildQuickAction(Icons.layers_outlined, "Batches", 3),
                  _buildQuickAction(Icons.videocam_outlined, "Live class", 4),
                  _buildQuickAction(Icons.assignment_outlined, "Homework", 5),
                  _buildQuickAction(Icons.remove_red_eye_outlined, "Observe", 6),
                  _buildQuickAction(Icons.calendar_today_outlined, "Attendance", 7),
                  _buildQuickAction(Icons.file_present_outlined, "Materials", 8),
                  _buildQuickAction(Icons.chat_bubble_outline, "Chats", 9),
                  _buildQuickAction(Icons.account_balance_wallet_outlined, "Ledger", 10),
                  _buildQuickAction(Icons.card_giftcard_outlined, "Referrals", 11),
                  _buildQuickAction(Icons.military_tech_outlined, "Level", 12),
                  _buildDrawerGridAction(Icons.card_membership_outlined, "Certificates", 13),
                  _buildDrawerGridAction(Icons.person_outline, "Profile", 14),
                  _buildDrawerGridAction(Icons.folder_open_outlined, "KYC Docs", 15),
                ],
              ),
              const SizedBox(height: 24),

              // Batches List Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("My Active Batches", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () => controller.selectedIndex.value = 3, child: const Text("Manage")),
                ],
              ),
              const SizedBox(height: 8),

              if (batches.isEmpty)
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.class_outlined, size: 48, color: Colors.grey),
                          const SizedBox(height: 12),
                          const Text("No Batches Created Yet", style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          const Text("Complete SOP verification and create your first batch.", style: TextStyle(color: Colors.grey, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: batches.take(3).length,
                  itemBuilder: (context, i) {
                    final b = batches[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: AppColors.teacherRole.withOpacity(0.1),
                          child: const Icon(Icons.menu_book, color: AppColors.teacherRole),
                        ),
                        title: Text(b.batchName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text("Course: ${b.courseTitle ?? b.subject ?? 'Speaxa Batch'}\nStudents: ${b.seatsFilled}/${b.capacity}"),
                        trailing: StatusChip(status: b.status),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildHeroStat(String label, String value) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(color: Colors.white70, fontSize: 11),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, int targetIdx) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      shadowColor: Colors.black.withOpacity(0.04),
      elevation: 2,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => controller.selectedIndex.value = targetIdx,
        child: Padding(
          padding: const EdgeInsets.all(4.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: AppColors.teacherRole.withOpacity(0.08), shape: BoxShape.circle),
                child: Icon(icon, color: AppColors.teacherRole, size: 18),
              ),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawerGridAction(IconData icon, String label, int targetIdx) {
    return _buildQuickAction(icon, label, targetIdx);
  }
}
