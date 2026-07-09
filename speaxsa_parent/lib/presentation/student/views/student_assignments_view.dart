import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentAssignmentsView extends GetView<StudentDashboardController> {
  const StudentAssignmentsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final list = controller.assignments;
      if (list.isEmpty) {
        return const EmptyStateWidget(
          title: "No Assignments Found",
          message: "Assignments assigned by teachers will be listed here.",
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        itemBuilder: (context, i) {
          final a = list[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(a.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
                      StatusChip(status: a.submissionStatus ?? 'pending'),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text("Batch: ${a.batchName ?? 'Class'} | Due: ${a.dueDate?.split('T').first ?? 'N/A'}"),
                  if (a.description != null && a.description!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(a.description!, style: const TextStyle(color: Colors.grey)),
                  ],
                  if (a.marksObtained != null) ...[
                    const SizedBox(height: 8),
                    Text("Marks: ${a.marksObtained} / ${a.maxMarks}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                    if (a.feedback != null) Text("Feedback: ${a.feedback}", style: const TextStyle(fontStyle: FontStyle.italic)),
                  ],
                ],
              ),
            ),
          );
        },
      );
    });
  }
}
