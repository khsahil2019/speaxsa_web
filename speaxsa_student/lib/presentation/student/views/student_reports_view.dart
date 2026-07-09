import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';

class StudentReportsView extends GetView<StudentDashboardController> {
  const StudentReportsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final list = controller.reports;
      if (list.isEmpty) {
        return const EmptyStateWidget(
          title: "No Monthly Reports",
          message: "Monthly performance reports compiled by your teachers will appear here.",
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        itemBuilder: (context, i) {
          final r = list[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Month: ${r.reportMonth}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text("Batch: ${r.batchName ?? 'N/A'} | Teacher: ${r.teacherName ?? 'N/A'}"),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatTile("Attendance", "${r.attendancePct.toInt()}%"),
                      _buildStatTile("Classes", "${r.attendedClasses}/${r.totalClasses}"),
                      _buildStatTile("Assignments", "${r.assignmentsSubmitted}/${r.assignmentsAssigned}"),
                    ],
                  ),
                  if (r.teacherFeedback != null && r.teacherFeedback!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text("Teacher Feedback: ${r.teacherFeedback}", style: const TextStyle(fontStyle: FontStyle.italic)),
                  ]
                ],
              ),
            ),
          );
        },
      );
    });
  }

  Widget _buildStatTile(String label, String val) {
    return Column(
      children: [
        Text(val, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
