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
        final analytics = controller.analytics;
        final currentLevel = details['currentLevel'] ?? analytics['level'] ?? 'Junior Teacher';
        final totalRevenue = (details['totalRevenue'] ?? analytics['cumulativeRevenue'] ?? 70000).toDouble();

        // 9 Web Panel Performance Slabs
        final List<Map<String, dynamic>> slabs = [
          {'name': 'Junior Teacher', 'target': 100000.0, 'reward': '₹5,000', 'item': 'Executive Kit', 'allowance': '₹0/mo', 'group': 'Foundation Group'},
          {'name': 'Assistant Teacher', 'target': 300000.0, 'reward': '₹25,000', 'item': 'Tablet (25K)', 'allowance': '₹0/mo', 'group': 'Foundation Group'},
          {'name': 'Senior Teacher', 'target': 500000.0, 'reward': '₹40,000', 'item': 'AC / Refrigerator (40K)', 'allowance': '₹5,000/mo', 'group': 'Teaching Excellence'},
          {'name': 'Executive Teacher', 'target': 1000000.0, 'reward': '₹80,000', 'item': 'PC / Laptop (80K)', 'allowance': '₹5,000/mo', 'group': 'Teaching Excellence'},
          {'name': 'Lecturer', 'target': 2000000.0, 'reward': '₹1,50,000', 'item': 'Bike (1.5L)', 'allowance': '₹5,000/mo', 'group': 'Teaching Excellence'},
          {'name': 'Professor', 'target': 3500000.0, 'reward': '₹2,25,000', 'item': 'Bullet (2.25L)', 'allowance': '₹10,000/mo', 'group': 'Academic Excellence'},
          {'name': 'Senior Professor', 'target': 5000000.0, 'reward': '₹3,00,000', 'item': 'Family Tour (3L)', 'allowance': '₹10,000/mo', 'group': 'Academic Excellence'},
          {'name': 'HOD', 'target': 7500000.0, 'reward': '₹4,00,000', 'item': 'Car (4L)', 'allowance': '₹25,000/mo', 'group': 'Leadership Group'},
          {'name': 'Dean', 'target': 10000000.0, 'reward': '₹6,00,000', 'item': 'Premium Car (6L)', 'allowance': '₹25,000/mo', 'group': 'Leadership Group'},
        ];

        // Find active milestone
        int activeSlabIdx = 0;
        for (int i = 0; i < slabs.length; i++) {
          if (totalRevenue >= slabs[i]['target']) {
            activeSlabIdx = i + 1;
          }
        }
        if (activeSlabIdx >= slabs.length) activeSlabIdx = slabs.length - 1;

        final currentSlab = slabs[activeSlabIdx < slabs.length ? activeSlabIdx : slabs.length - 1];
        final targetRevenue = currentSlab['target'] as double;
        final progress = (totalRevenue / targetRevenue).clamp(0.0, 1.0);
        final remaining = (targetRevenue - totalRevenue).clamp(0.0, targetRevenue);

        return RefreshIndicator(
          onRefresh: controller.loadLevelData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Level & Milestone Progress Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: AppColors.heroGradient,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("Current Educator Milestone", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 2),
                              Text(currentLevel, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: const BoxDecoration(color: Colors.white24, shape: BoxShape.circle),
                            child: const Icon(Icons.workspace_premium_rounded, color: Colors.amber, size: 30),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Cumulative Revenue", style: const TextStyle(color: Colors.white70, fontSize: 11)),
                          Text("₹${totalRevenue.toInt()} / ₹${targetRevenue.toInt()}", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 8,
                          backgroundColor: Colors.white24,
                          valueColor: const AlwaysStoppedAnimation<Color>(Colors.amber),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("${(progress * 100).toStringAsFixed(1)}% Progress", style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                          Text("Next: ${currentSlab['name']}", style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      if (remaining > 0) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                          child: Text(
                            "💡 Earn ₹${remaining.toInt()} more to unlock ${currentSlab['name']} reward: ${currentSlab['item']} (${currentSlab['reward']}).",
                            style: const TextStyle(color: Colors.white, fontSize: 10.5),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Performance Rewards Checklist (1:1 Web Panel)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Text(
                        "Performance Rewards Checklist",
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text("${slabs.length} Total Slabs", style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 10),

                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: slabs.length,
                  itemBuilder: (context, i) {
                    final item = slabs[i];
                    final isUnlocked = totalRevenue >= item['target'];

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 18,
                                        backgroundColor: isUnlocked ? Colors.green.withOpacity(0.15) : Colors.amber.withOpacity(0.12),
                                        child: Icon(
                                          isUnlocked ? Icons.check_circle_rounded : Icons.workspace_premium_outlined,
                                          color: isUnlocked ? Colors.green : Colors.amber.shade800,
                                          size: 20,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15), maxLines: 1, overflow: TextOverflow.ellipsis),
                                            Text(item['group'], style: TextStyle(color: Colors.grey.shade600, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isUnlocked ? Colors.green.withOpacity(0.12) : Colors.grey.shade100,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: isUnlocked ? Colors.green.withOpacity(0.3) : Colors.grey.shade300),
                                  ),
                                  child: Text(
                                    isUnlocked ? "UNLOCKED ✓" : "LOCKED 🔒",
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10.5,
                                      color: isUnlocked ? Colors.green.shade800 : Colors.grey.shade600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 20),

                            Row(
                              children: [
                                _buildRewardMetric("Target", "₹${(item['target'] as double).toInt()}"),
                                _buildRewardMetric("Reward", item['reward']),
                                _buildRewardMetric("Gift", item['item']),
                                _buildRewardMetric("Allowance", item['allowance']),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildRewardMetric(String title, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 9.5, color: Colors.grey, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black87),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
