import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/empty_state_widget.dart';

class TeacherReferralsTab extends GetView<TeacherDashboardController> {
  const TeacherReferralsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final ref = controller.referralData.value;
        final rewardsList = controller.rewards;
        final code = ref['referral_code'] ?? 'SPEAXA-MENTOR';
        final totalEarned = ref['total_referral_earnings'] ?? 0.0;
        final count = ref['referred_count'] ?? 0;
        final referredTeachers = ref['referred_teachers'] as List? ?? [];

        return RefreshIndicator(
          onRefresh: controller.loadReferralData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Referral Code Box
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: AppColors.heroGradient,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      const Text("Share & Earn Rewards", style: TextStyle(color: Colors.white70, fontSize: 13)),
                      const SizedBox(height: 4),
                      const Text("Refer fellow mentors to the platform", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white30)),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(code, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20, letterSpacing: 1.5)),
                            IconButton(
                              icon: const Icon(Icons.copy, color: Colors.white),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: code));
                                Get.snackbar('Copied', 'Referral code copied to clipboard!');
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildMiniStat("Teachers Referred", "$count"),
                          _buildMiniStat("Total Earned", "₹${totalEarned.toString()}"),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Referred list
                const Text("Referred Educators", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                if (referredTeachers.isEmpty)
                  const Text("No referrals yet. Share your code to get started!", style: TextStyle(color: Colors.grey, fontSize: 13))
                else
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: referredTeachers.length,
                      separatorBuilder: (c, idx) => const Divider(height: 1),
                      itemBuilder: (c, idx) {
                        final t = referredTeachers[idx] as Map<String, dynamic>;
                        return ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.teacherRole.withOpacity(0.1),
                            child: const Icon(Icons.person, color: AppColors.teacherRole),
                          ),
                          title: Text(t['name'] ?? 'Teacher', style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text("Level: ${t['teacher_level'] ?? 'Junior'} • Joined: ${t['created_at']?.split('T')[0] ?? ''}"),
                        );
                      },
                    ),
                  ),

                const SizedBox(height: 24),

                // Rewards list
                const Text("Milestone Rewards", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                if (rewardsList.isEmpty)
                  const Text("No milestone rewards log found.", style: TextStyle(color: Colors.grey, fontSize: 13))
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: rewardsList.length,
                    itemBuilder: (c, i) {
                      final r = rewardsList[i] as Map<String, dynamic>;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: const Icon(Icons.stars, color: Colors.amber, size: 28),
                          title: Text(r['title'] ?? 'Reward', style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text(r['description'] ?? ''),
                          trailing: Text("₹${r['points'] ?? 0}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
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

  Widget _buildMiniStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
      ],
    );
  }
}
