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
      final String sopStatus = sop?.status ?? 'pending';
      final bool isSopApproved = sopStatus == 'approved';
      final String sopBadgeText = isSopApproved
          ? "Approved ✓"
          : (sopStatus == 'submitted' || sopStatus == 'sop_pending' ? "Submitted" : "Pending");
      final batches = controller.batches;
      final userName = AuthService.to.currentUser.value?.name ?? 'Educator';

      return RefreshIndicator(
        onRefresh: controller.loadTeacherData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Hero Card displaying Educator Greeting & Stats
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
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
                              Text(_getTimeBasedGreeting(), style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 2),
                              Text(
                                "$userName 👋",
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                                softWrap: true,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.25), borderRadius: BorderRadius.circular(20)),
                          child: Text(
                            "${analytics['level'] ?? 'Verified Mentor'}",
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildHeroStat("Active Batches", "${analytics['activeBatches'] ?? 0}"),
                          Container(width: 1, height: 28, color: Colors.white24),
                          _buildHeroStat("Students", "${analytics['totalStudents'] ?? 0}"),
                          Container(width: 1, height: 28, color: Colors.white24),
                          _buildHeroStat("Rating", "${analytics['rating'] ?? 5.0}★"),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),

              // Categorized Quick Actions Hub Header
              // Row(
              //   children: [
              //     const Icon(Icons.grid_view_rounded, color: AppColors.primary, size: 20),
              //     const SizedBox(width: 8),
              //     const Text("Quick Action Hub", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              //   ],
              // ),
              const SizedBox(height: 14),

              // Category 1: 🎓 Teaching & Classroom
              _buildCategoryHeader("TEACHING & CLASSROOM"),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _buildCleanActionTile(Icons.video_camera_front_rounded, "Live Class", 4)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.school_rounded, "Batches", 3)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.menu_book_rounded, "Courses", 2)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.assignment_rounded, "Homework", 5)),
                ],
              ),
              const SizedBox(height: 16),

              // Category 2: 📊 Academic Operations & Tools
              _buildCategoryHeader("ACADEMIC OPERATIONS"),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _buildCleanActionTile(Icons.calendar_today_rounded, "Attendance", 7)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.folder_shared_rounded, "Materials", 8)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.visibility_rounded, "Observe", 6)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.chat_bubble_rounded, "Chats", 9)),
                ],
              ),
              const SizedBox(height: 16),

              // Category 3: 💰 Earnings & Rewards Hub
              _buildCategoryHeader("EARNINGS & REWARDS"),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _buildCleanActionTile(Icons.account_balance_wallet_rounded, "Wallet", 10)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.card_giftcard_rounded, "Referrals", 11)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.workspace_premium_rounded, "Certificates", 13)),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.military_tech_rounded, "Level", 12)),
                ],
              ),
              const SizedBox(height: 16),

              // Category 4: 🛡️ Compliance & Account
              _buildCategoryHeader("SETUP & PROFILE"),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildCleanActionTile(
                      Icons.verified_rounded,
                      "SOP Setup",
                      1,
                      isSopCompleted: isSopApproved,
                      badgeText: sopBadgeText,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(child: _buildCleanActionTile(Icons.person_rounded, "My Profile", 14)),
                  const SizedBox(width: 10),
                  const Expanded(child: SizedBox()),
                  const SizedBox(width: 10),
                  const Expanded(child: SizedBox()),
                ],
              ),
              const SizedBox(height: 24),

              // Batches List Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("My Active Batches", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () => controller.selectedIndex.value = 3, child: const Text("Manage All")),
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
                          const Text("Create your first study batch to start live teaching.", style: TextStyle(color: Colors.grey, fontSize: 13)),
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

  Widget _buildCategoryHeader(String title) {
    return Text(
      title,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade600, letterSpacing: 0.8),
    );
  }

  Widget _buildCleanActionTile(IconData icon, String label, int targetIdx, {bool isSopCompleted = false, String? badgeText}) {
    final cardBg = isSopCompleted ? const Color(0xFFF0FDF4) : Colors.white;
    final borderColor = isSopCompleted ? Colors.green.shade300 : Colors.grey.shade200;
    final iconColor = isSopCompleted ? Colors.green.shade700 : AppColors.primary;
    final circleBg = isSopCompleted ? Colors.green.shade50 : AppColors.primary.withOpacity(0.08);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => controller.selectedIndex.value = targetIdx,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: circleBg, shape: BoxShape.circle),
                      child: Icon(icon, color: iconColor, size: 20),
                    ),
                    const SizedBox(height: 6),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        label,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black87),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
              if (badgeText != null && badgeText.isNotEmpty)
                Positioned(
                  top: 4,
                  right: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSopCompleted ? Colors.green.shade700 : Colors.amber.shade800,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      badgeText,
                      style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
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

  String _getTimeBasedGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 4 && hour < 12) {
      return "Good Morning ☀️";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon 🌤️";
    } else if (hour >= 17 && hour < 22) {
      return "Good Evening 🌆";
    } else {
      return "Good Night 🌙";
    }
  }
}
