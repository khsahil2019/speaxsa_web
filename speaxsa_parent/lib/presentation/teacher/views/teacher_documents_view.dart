import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/teacher_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';

class TeacherDocumentsView extends GetView<TeacherDashboardController> {
  const TeacherDocumentsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final list = controller.documents;
      if (list.isEmpty) {
        return const EmptyStateWidget(
          title: "No Documents Uploaded",
          message: "Uploaded KYC documents (Aadhaar, PAN, Resume, Degree Certificate) will be listed here.",
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        itemBuilder: (context, i) {
          final doc = list[i] as Map<String, dynamic>;
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: const Icon(Icons.description, color: Colors.blue),
              title: Text(doc['doc_type']?.toString().toUpperCase() ?? 'DOCUMENT', style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text("Original: ${doc['original_name'] ?? 'File'}"),
              trailing: const Icon(Icons.check_circle, color: Colors.green),
            ),
          );
        },
      );
    });
  }
}
