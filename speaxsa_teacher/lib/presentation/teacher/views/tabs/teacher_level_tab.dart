import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';

class TeacherLevelTab extends GetView<TeacherDashboardController> {
  const TeacherLevelTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final details = controller.levelDetails.value;
        final currentLevel = details['currentLevel'] ?? 'Junior Mentor';
        final nextLevel = details['nextLevel'] ?? 'Senior Mentor';
        final points = details['points'] ?? 0;
        final nextLevelPoints = details['nextLevelPoints'] ?? 1000;
        final teachingHours = details['teachingHours'] ?? 0;
        final classesCompleted = details['classesCompleted'] ?? 0;
        final progress = nextLevelPoints > 0 ? (points / nextLevelPoints).clamp(0.0, 1.0) : 1.0;

        return RefreshIndicator(
          onRefresh: controller.loadLevelData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Level Progress Banner
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(currentLevel, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: AppColors.primary)),
                            const Icon(Icons.shield, color: Colors.amber, size: 28),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text("$points Points • Next Milestone at $nextLevelPoints Points", style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 10,
                            backgroundColor: Colors.grey.shade100,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("${(progress * 100).toStringAsFixed(0)}% Completed", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                            Text("Upgrade to $nextLevel", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Teaching stats
                const Text("SOP Teaching Stats", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              const Icon(Icons.timelapse, color: AppColors.primary, size: 28),
                              const SizedBox(height: 8),
                              const Text("Teaching Hours", style: TextStyle(color: Colors.grey, fontSize: 11)),
                              const SizedBox(height: 4),
                              Text("$teachingHours hrs", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              const Icon(Icons.school, color: AppColors.primary, size: 28),
                              const SizedBox(height: 8),
                              const Text("Classes Delivered", style: TextStyle(color: Colors.grey, fontSize: 11)),
                              const SizedBox(height: 4),
                              Text("$classesCompleted", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Upgrade criteria table
                const Text("Milestone Tier Specifications", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Table(
                      columnWidths: const {
                        0: FlexColumnWidth(1.2),
                        1: FlexColumnWidth(1.0),
                        2: FlexColumnWidth(1.5),
                      },
                      border: TableBorder.symmetric(inside: BorderSide(color: Colors.grey.shade200, width: 1)),
                      children: [
                        _buildTableHeader(),
                        _buildTableRow("Junior Mentor", "Standard", "50% revenue share"),
                        _buildTableRow("Senior Mentor", "1000 pts", "55% revenue + bonus"),
                        _buildTableRow("Master Mentor", "5000 pts", "60% revenue + milestone awards"),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  TableRow _buildTableHeader() {
    return const TableRow(
      children: [
        Padding(padding: EdgeInsets.all(10), child: Text("Tier Level", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
        Padding(padding: EdgeInsets.all(10), child: Text("Criteria", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
        Padding(padding: EdgeInsets.all(10), child: Text("Allowance / Commission", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))),
      ],
    );
  }

  TableRow _buildTableRow(String level, String criteria, String payout) {
    return TableRow(
      children: [
        Padding(padding: const EdgeInsets.all(10), child: Text(level, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
        Padding(padding: const EdgeInsets.all(10), child: Text(criteria, style: const TextStyle(fontSize: 11))),
        Padding(padding: const EdgeInsets.all(10), child: Text(payout, style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.bold))),
      ],
    );
  }
}
