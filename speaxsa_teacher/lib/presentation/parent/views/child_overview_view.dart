import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/parent_dashboard_controller.dart';

class ChildOverviewView extends GetView<ParentDashboardController> {
  const ChildOverviewView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final child = controller.selectedChild.value;
      final reports = controller.childReports;
      final attendance = controller.childAttendance;

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Child: ${child?.name ?? 'Select child'}", style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text("Grade: ${child?.grade ?? 'N/A'} | Board: ${child?.board ?? 'N/A'}", style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 20),

            const Text("Attendance History", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (attendance.isEmpty)
              const Text("No attendance records logged yet.", style: TextStyle(color: Colors.grey))
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: attendance.length > 5 ? 5 : attendance.length,
                itemBuilder: (context, i) {
                  final att = attendance[i] as Map<String, dynamic>;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      dense: true,
                      title: Text(att['class_title']?.toString() ?? att['batch_name']?.toString() ?? 'Class'),
                      subtitle: Text("Date: ${att['attendance_date']?.toString().split('T').first ?? ''}"),
                      trailing: Text(att['status']?.toString().toUpperCase() ?? 'ABSENT', style: TextStyle(fontWeight: FontWeight.bold, color: att['status'] == 'present' ? Colors.green : Colors.red)),
                    ),
                  );
                },
              ),
            const SizedBox(height: 20),

            const Text("Monthly Performance Reports", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (reports.isEmpty)
              const Text("No monthly reports generated yet.", style: TextStyle(color: Colors.grey))
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: reports.length,
                itemBuilder: (context, i) {
                  final r = reports[i] as Map<String, dynamic>;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      title: Text("Report Month: ${r['report_month'] ?? ''}", style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text("Attendance: ${r['attendance_pct'] ?? 0}% | Feedback: ${r['teacher_feedback'] ?? 'Good'}"),
                    ),
                  );
                },
              ),
          ],
        ),
      );
    });
  }
}
