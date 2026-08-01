import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentCoursesView extends GetView<StudentDashboardController> {
  const StudentCoursesView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final batches = controller.availableBatches;
      if (batches.isEmpty) {
        return const EmptyStateWidget(
          title: "No Available Batches",
          message: "Check back soon for new course batches.",
        );
      }
      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: batches.length,
        itemBuilder: (context, i) {
          final b = batches[i];
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
                  const SizedBox(height: 8),
                  Text("Course: ${b.courseTitle ?? b.subject ?? 'Speaxa Course'}", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text("Teacher: ${b.teacherName ?? 'Mentor'} (${b.teacherLevel ?? 'Verified'})"),
                  Text("Schedule: ${b.daysOfWeek.join(', ')} | ${b.startTime ?? ''} - ${b.endTime ?? ''}"),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Seats Left: ${b.availableSeats} / ${b.capacity}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      ElevatedButton(
                        onPressed: () => controller.enrollInBatch(b.id),
                        child: const Text("Enroll Now"),
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
