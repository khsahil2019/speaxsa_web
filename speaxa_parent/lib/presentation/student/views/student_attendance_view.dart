import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentAttendanceView extends GetView<StudentDashboardController> {
  const StudentAttendanceView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final data = controller.attendanceData.value;
      final records = data?.records ?? [];

      if (records.isEmpty) {
        return const EmptyStateWidget(
          title: "No Attendance Records",
          message: "Your attendance records will appear here as you join live classes.",
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: records.length,
        itemBuilder: (context, i) {
          final r = records[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: Icon(
                r.status == 'present' || r.status == 'late' ? Icons.check_circle_outline : Icons.cancel_outlined,
                color: r.status == 'present' || r.status == 'late' ? Colors.green : Colors.red,
              ),
              title: Text(r.classTitle ?? r.batchName ?? 'Live Class'),
              subtitle: Text("Date: ${r.attendanceDate.split('T').first} | Duration: ${r.durationMins} mins"),
              trailing: StatusChip(status: r.status),
            ),
          );
        },
      );
    });
  }
}
