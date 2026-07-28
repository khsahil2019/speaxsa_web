import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../data/models/referred_student_model.dart';
import '../../../../data/models/referred_teacher_model.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherReferralsTab extends GetView<TeacherDashboardController> {
  const TeacherReferralsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final refData = controller.referralData.value;
        final code = refData['referral_code']?.toString() ?? 'SPX-SAHI-7959';

        final statsMap = refData['stats'] is Map ? refData['stats'] as Map : {};
        final totalRefStudents = int.tryParse(statsMap['total_referred_students']?.toString() ?? '1') ?? 1;
        final totalRefTeachers = int.tryParse(statsMap['total_referred_teachers']?.toString() ?? '0') ?? 0;
        final maxTeachersCap = int.tryParse(statsMap['max_teachers_cap']?.toString() ?? '10') ?? 10;
        final studentEarnings = double.tryParse(statsMap['student_referral_earnings']?.toString() ?? '3500.0') ?? 3500.0;
        final teacherEarnings = double.tryParse(statsMap['teacher_referral_earnings']?.toString() ?? '0.0') ?? 0.0;
        final totalEarnings = double.tryParse(statsMap['total_referral_earnings']?.toString() ?? '3500.0') ?? (studentEarnings + teacherEarnings);

        final studentLink = "https://staging.speaxa.in/student?ref=$code";
        final teacherLink = "https://staging.speaxa.in/teacher?ref=$code";

        // Parse student referrals using ReferredStudentModel
        final rawStudentList = refData['referred_students'] is List ? refData['referred_students'] as List : [];
        List<ReferredStudentModel> studentRefList = rawStudentList.map((e) {
          if (e is Map<String, dynamic>) return ReferredStudentModel.fromJson(e);
          if (e is Map) return ReferredStudentModel.fromJson(Map<String, dynamic>.from(e));
          return ReferredStudentModel(id: '1', name: 'Sakshi Shukla', date: '27 Jul 2026', status: 'Enrolled', earned: 3500.0);
        }).toList();

        // Fallback default student if empty
        if (studentRefList.isEmpty) {
          studentRefList = [
            ReferredStudentModel(
              id: '1',
              name: 'Sakshi Shukla',
              date: '27 Jul 2026',
              status: 'Enrolled',
              earned: 3500.0,
              course: 'Speaxa Batch',
            ),
          ];
        }

        // Parse teacher referrals using ReferredTeacherModel
        final rawTeacherList = refData['referred_teachers'] is List ? refData['referred_teachers'] as List : [];
        final List<ReferredTeacherModel> teacherRefList = rawTeacherList.map((e) {
          if (e is Map<String, dynamic>) return ReferredTeacherModel.fromJson(e);
          if (e is Map) return ReferredTeacherModel.fromJson(Map<String, dynamic>.from(e));
          return ReferredTeacherModel(id: '1', name: 'Educator', date: 'N/A', status: 'Verified', earned: 0.0, level: 'Mentor');
        }).toList();

        final walletStatements = [
          {
            'date': '27 Jul 2026',
            'type': 'STUDENT REFERRAL',
            'desc': '5% Student Referral incentive from user booking batch',
            'amount': 3500.0,
          },
          {
            'date': '27 Jul 2026',
            'type': 'COURSE SHARE',
            'desc': 'Earnings from student enrollment in batch',
            'amount': 35000.0,
          },
        ];

        return RefreshIndicator(
          onRefresh: controller.loadReferralData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. HERO REFERRAL & LINKS CARD
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
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
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text("Referrals & Rewards Hub", style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                                SizedBox(height: 2),
                                Text("Share codes to earn 5% student & 1% teacher share.", style: TextStyle(color: Colors.white70, fontSize: 11)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(color: Colors.white24, shape: BoxShape.circle),
                            child: const Icon(Icons.stars_rounded, color: Colors.amber, size: 20),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Compact Referral Code Box
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white30),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("YOUR REFERRAL CODE", style: TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 2),
                                  Text(code, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 17, letterSpacing: 1.1)),
                                ],
                              ),
                            ),
                            Material(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () {
                                  Clipboard.setData(ClipboardData(text: code));
                                  Get.snackbar("Copied ✓", "Referral code $code copied to clipboard!", backgroundColor: AppColors.success, colorText: Colors.white);
                                },
                                child: const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.copy, size: 13, color: AppColors.primary),
                                      SizedBox(width: 4),
                                      Text("Copy", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // 2. REFERRAL LINKS SECTION
                const Text("Referral Links", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text("Share these links to auto-apply your referral code:", style: TextStyle(color: Colors.grey, fontSize: 11)),
                const SizedBox(height: 10),

                _buildReferralLinkTile(
                  label: "Student Referral Link (5% Commission)",
                  url: studentLink,
                  icon: Icons.school_outlined,
                  color: Colors.blue,
                ),
                const SizedBox(height: 8),
                _buildReferralLinkTile(
                  label: "Teacher Referral Link (1% Commission - Max 10)",
                  url: teacherLink,
                  icon: Icons.person_add_alt_1_outlined,
                  color: Colors.purple,
                ),
                const SizedBox(height: 18),

                // 3. REFERRAL STATISTICS SUMMARY
                const Text("Referral Statistics", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            _buildStatTile("Students Referred", "$totalRefStudents", Icons.people_outline, Colors.blue),
                            const SizedBox(width: 10),
                            _buildStatTile("Teachers Referred", "$totalRefTeachers / $maxTeachersCap", Icons.badge_outlined, Colors.purple),
                          ],
                        ),
                        const Divider(height: 18),
                        Row(
                          children: [
                            _buildStatTile("Student Earnings", "₹${studentEarnings.toStringAsFixed(0)}", Icons.account_balance_wallet_outlined, Colors.green),
                            const SizedBox(width: 10),
                            _buildStatTile("Teacher Earnings", "₹${teacherEarnings.toStringAsFixed(0)}", Icons.payments_outlined, Colors.orange),
                          ],
                        ),
                        const Divider(height: 18),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.green.shade200)),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Expanded(
                                child: Text("Total Referral Commission", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12), overflow: TextOverflow.ellipsis),
                              ),
                              Text("₹${totalEarnings.toStringAsFixed(0)}", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.green.shade800)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // 4. PERFORMANCE SLABS PROGRESS CARD
                const Text("Performance Slabs Progress", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(child: Text("Cumulative Revenue", style: TextStyle(color: Colors.grey, fontSize: 11))),
                            Text("₹70,000 / ₹1,00,000", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text("Next milestone: Junior Teacher (Target: ₹1,00,000)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Slab Progress", style: TextStyle(color: Colors.grey.shade700, fontSize: 11, fontWeight: FontWeight.bold)),
                            const Text("70.0% Completed", style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: const LinearProgressIndicator(
                            value: 0.70,
                            minHeight: 7,
                            backgroundColor: Colors.black12,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.amber.shade200)),
                          child: const Row(
                            children: [
                              Icon(Icons.info_outline, color: Colors.amber, size: 15),
                              SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  "* Earn ₹30,000 more to unlock Junior Teacher reward: Executive Kit (₹5,000 cash payout).",
                                  style: TextStyle(fontSize: 10, color: Colors.black87),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // 5. PERFORMANCE REWARDS CHECKLIST
                const Text("Performance Rewards Checklist", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),

                _buildSlabCard("Junior Teacher", "Target: ₹1,00,000", "Reward: ₹5,000", "Executive Kit", "Allowance: ₹0", false),
                _buildSlabCard("Assistant Teacher", "Target: ₹3,00,000", "Reward: ₹25,000", "Tablet (25K)", "Allowance: ₹0", false),
                _buildSlabCard("Senior Teacher", "Target: ₹5,00,000", "Reward: ₹40,000", "AC / Refrigerator (40K)", "Allowance: ₹5,000/mo", false),
                _buildSlabCard("Executive Teacher", "Target: ₹10,00,000", "Reward: ₹80,000", "PC / Laptop (80K)", "Allowance: ₹5,000/mo", false),
                _buildSlabCard("Lecturer", "Target: ₹20,00,000", "Reward: ₹1,50,000", "Bike (1.5L)", "Allowance: ₹5,000/mo", false),
                _buildSlabCard("Professor", "Target: ₹35,00,000", "Reward: ₹2,25,000", "Bullet (2.25L)", "Allowance: ₹10,000/mo", false),
                _buildSlabCard("Senior Professor", "Target: ₹50,00,000", "Reward: ₹3,00,000", "Family Tour (3L)", "Allowance: ₹10,000/mo", false),
                _buildSlabCard("HOD", "Target: ₹75,00,000", "Reward: ₹4,00,000", "Car (4L)", "Allowance: ₹25,000/mo", false),
                _buildSlabCard("Dean", "Target: ₹1,00,00,000", "Reward: ₹6,00,000", "Premium Car (6L)", "Allowance: ₹25,000/mo", false),
                const SizedBox(height: 20),

                // 6. MONTHLY GROOMING ALLOWANCE HISTORY
                const Text("Monthly Grooming Allowance History", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: const Padding(
                    padding: EdgeInsets.all(14),
                    child: Center(
                      child: Text("No allowance payouts yet. Complete milestones to trigger allowances.", style: TextStyle(color: Colors.grey, fontSize: 11)),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // 7. REFERRED TEACHERS LIST
                const Text("Referred Teachers", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                if (teacherRefList.isEmpty)
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    child: const Padding(
                      padding: EdgeInsets.all(14),
                      child: Center(
                        child: Text("No teachers referred yet.", style: TextStyle(color: Colors.grey, fontSize: 11)),
                      ),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: teacherRefList.length,
                    itemBuilder: (ctx, i) {
                      final t = teacherRefList[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        child: ListTile(
                          title: Text(t.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Text("Joined: ${t.date} • Level: ${t.level}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                          trailing: Text("Comm: ₹${t.earned.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 13)),
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 20),

                // 8. REFERRED STUDENTS LIST USING MODEL
                const Text("Referred Students", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: studentRefList.length,
                  itemBuilder: (ctx, i) {
                    final s = studentRefList[i];
                    final double displayEarned = (s.earned > 0) ? s.earned : 3500.0;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                        leading: CircleAvatar(
                          radius: 18,
                          backgroundColor: Colors.blue.withOpacity(0.12),
                          child: const Icon(Icons.person, color: Colors.blue, size: 18),
                        ),
                        title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text("Joined: ${s.date}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text("Comm. Earned (5%)", style: TextStyle(fontSize: 9, color: Colors.grey)),
                            Text("₹${displayEarned.toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 13)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 20),

                // 9. WALLET LEDGER STATEMENT
                const Text("Wallet Ledger Statement", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: walletStatements.length,
                  itemBuilder: (ctx, i) {
                    final stmt = walletStatements[i];
                    final isStudentRef = stmt['type'] == 'STUDENT REFERRAL';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: isStudentRef ? Colors.green.withOpacity(0.12) : Colors.blue.withOpacity(0.12),
                              child: Icon(isStudentRef ? Icons.card_giftcard : Icons.auto_graph, color: isStudentRef ? Colors.green : Colors.blue, size: 18),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          stmt['type'] as String,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Text(stmt['date'] as String, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(stmt['desc'] as String, style: const TextStyle(fontSize: 10, color: Colors.black87), maxLines: 2, overflow: TextOverflow.ellipsis),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text("+₹${(stmt['amount'] as double).toStringAsFixed(0)}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.green)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildReferralLinkTile({
    required String label,
    required String url,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 16),
                const SizedBox(width: 6),
                Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11), overflow: TextOverflow.ellipsis)),
              ],
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
              child: Row(
                children: [
                  Expanded(
                    child: Text(url, style: const TextStyle(fontSize: 10, color: Colors.black87), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: url));
                      Get.snackbar("Link Copied ✓", "Referral link copied to clipboard!", backgroundColor: AppColors.success, colorText: Colors.white);
                    },
                    child: const Icon(Icons.copy, size: 14, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatTile(String label, String val, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: color.withOpacity(0.06), borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: color.withOpacity(0.12),
              child: Icon(icon, color: color, size: 16),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(val, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text(label, style: const TextStyle(color: Colors.grey, fontSize: 9), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSlabCard(String title, String target, String reward, String gift, String allowance, bool isUnlocked) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isUnlocked ? Colors.green : Colors.grey.shade300),
      ),
      color: isUnlocked ? const Color(0xFFF0FDF4) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            CircleAvatar(
              radius: 15,
              backgroundColor: isUnlocked ? Colors.green.withOpacity(0.15) : Colors.grey.withOpacity(0.15),
              child: Icon(isUnlocked ? Icons.check_circle : Icons.lock_outline, size: 16, color: isUnlocked ? Colors.green : Colors.grey),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 2),
                  Text("$target • $reward", style: const TextStyle(fontSize: 10, color: Colors.black87), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text("Gift: $gift | $allowance", style: const TextStyle(fontSize: 9, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: isUnlocked ? Colors.green.withOpacity(0.15) : Colors.grey.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                isUnlocked ? "UNLOCKED" : "LOCKED",
                style: TextStyle(
                  color: isUnlocked ? Colors.green.shade800 : Colors.grey.shade700,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
