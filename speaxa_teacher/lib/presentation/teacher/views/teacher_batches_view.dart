import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/teacher_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class TeacherBatchesView extends GetView<TeacherDashboardController> {
  const TeacherBatchesView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final list = controller.batches;
      if (list.isEmpty) {
        return const EmptyStateWidget(
          title: "No Batches Created",
          message: "Created live class batches will appear here.",
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        itemBuilder: (context, i) {
          final b = list[i];
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
                      Expanded(child: Text(b.batchName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
                      StatusChip(status: b.status),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text("Course: ${b.courseTitle ?? b.subject ?? 'Live Batch'}", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
                  Text("Schedule: ${b.daysOfWeek.join(', ')} | ${b.startTime ?? ''} - ${b.endTime ?? ''}"),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Students Enrolled: ${b.seatsFilled} / ${b.capacity}", style: const TextStyle(fontWeight: FontWeight.bold)),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.videocam),
                        label: const Text("Launch Class"),
                        onPressed: () => Get.snackbar('Live Class', 'Classroom hub channel: ${b.agoraChannel ?? b.id}'),
                      ),
                    ],
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
