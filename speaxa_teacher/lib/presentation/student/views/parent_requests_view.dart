import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class ParentRequestsView extends GetView<StudentDashboardController> {
  const ParentRequestsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Parent Link Requests")),
      body: Obx(() {
        final requests = controller.parentRequests;
        if (requests.isEmpty) {
          return const EmptyStateWidget(
            title: "No Connection Requests",
            message: "When a parent links to your student code, their request will appear here for approval.",
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: requests.length,
          itemBuilder: (context, i) {
            final req = requests[i] as Map<String, dynamic>;
            final linkId = req['link_id']?.toString() ?? '';
            final status = req['status']?.toString() ?? 'pending';

            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person_pin)),
                title: Text(req['parent_name']?.toString() ?? 'Parent', style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(req['parent_email']?.toString() ?? ''),
                trailing: status == 'pending'
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.check_circle, color: Colors.green),
                            onPressed: () => controller.approveParentRequest(linkId),
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel, color: Colors.red),
                            onPressed: () => controller.rejectParentRequest(linkId),
                          ),
                        ],
                      )
                    : StatusChip(status: status),
              ),
            );
          },
        );
      }),
    );
  }
}
