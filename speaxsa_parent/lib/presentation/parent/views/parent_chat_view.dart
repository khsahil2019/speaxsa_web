import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/parent_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import 'parent_chat_detail_view.dart';

class ParentChatView extends GetView<ParentDashboardController> {
  const ParentChatView({super.key});

  double scaleMetric(dynamic val) {
    if (val == null) return 0.0;
    final numVal = double.tryParse(val.toString()) ?? 0.0;
    if (numVal <= 0) return 0.0;
    return numVal > 10 ? numVal / 10 : numVal;
  }

  Color getBadgeColor(double val) {
    if (val >= 7.5) return AppColors.success;
    if (val >= 5.0) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final child = controller.selectedChild.value;
      if (child == null) {
        return const EmptyStateWidget(
          title: "Select a Child",
          message: "Please link or select a child account to connect with their teachers.",
        );
      }

      if (controller.childObservations.isEmpty) {
        return EmptyStateWidget(
          title: "No Mentors Assigned Yet",
          message: "Subject mentors will appear here once ${child.name} is enrolled in a course batch and therapist reviews are logged.",
          icon: Icons.supervisor_account_outlined,
        );
      }

      // Group observations by teacher to avoid duplicate profiles
      final Map<String, Map<String, dynamic>> teachersMap = {};
      for (var obs in controller.childObservations) {
        final tName = obs['teacher_name']?.toString();
        if (tName != null && tName.isNotEmpty) {
          if (!teachersMap.containsKey(tName)) {
            teachersMap[tName] = {
              'teacher_id': obs['teacher_id']?.toString() ?? '',
              'teacher_name': tName,
              'batches': <String>{obs['batch_name']?.toString() ?? ''},
              'curiosity': scaleMetric(obs['curiosity']),
              'understanding': scaleMetric(obs['understanding']),
              'consistency': scaleMetric(obs['consistency']),
              'communication': scaleMetric(obs['communication']),
            };
          } else {
            (teachersMap[tName]!['batches'] as Set<String>).add(obs['batch_name']?.toString() ?? '');
          }
        }
      }
      final teachersList = teachersMap.values.toList();

      if (teachersList.isEmpty) {
        return EmptyStateWidget(
          title: "No Mentors Assigned Yet",
          message: "Subject mentors will appear here once ${child.name} is enrolled in a course batch.",
          icon: Icons.supervisor_account_outlined,
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: teachersList.length,
        itemBuilder: (context, i) {
          final t = teachersList[i];
          final String name = t['teacher_name'];
          final String id = t['teacher_id'];
          final Set<String> batches = t['batches'];
          
          final initials = name.isNotEmpty
              ? name.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join('').toUpperCase().substring(0, name.split(' ').length > 1 ? 2 : 1)
              : 'T';

          final ratings = [
            {'label': 'Curiosity', 'val': t['curiosity']},
            {'label': 'Focus', 'val': t['understanding']},
            {'label': 'Consistency', 'val': t['consistency']},
            {'label': 'Speech & Comm', 'val': t['communication']},
          ];

          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 2,
            shadowColor: Colors.black.withOpacity(0.04),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: AppColors.primary.withOpacity(0.1),
                        foregroundColor: AppColors.primary,
                        child: Text(initials, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 2),
                            Text(
                              batches.join(', '),
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Observations score grid
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                      childAspectRatio: 2.8,
                    ),
                    itemCount: ratings.length,
                    itemBuilder: (context, idx) {
                      final r = ratings[idx];
                      final double score = r['val'] as double;
                      return Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade100),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              r['label'] as String,
                              style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 2),
                            Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(
                                    text: score > 0 ? score.toStringAsFixed(1) : '—',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: score > 0 ? getBadgeColor(score) : Colors.black87,
                                    ),
                                  ),
                                  if (score > 0)
                                    const TextSpan(
                                      text: '/10',
                                      style: TextStyle(fontSize: 10, color: Colors.grey),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    height: 40,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      icon: const Icon(Icons.chat_bubble_outline, size: 18),
                      label: const Text("Message Teacher", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      onPressed: () {
                        Get.to(() => ParentChatDetailView(
                          teacherId: id,
                          teacherName: name,
                          studentId: child.id,
                          studentName: child.name,
                        ));
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    });
  }
}
