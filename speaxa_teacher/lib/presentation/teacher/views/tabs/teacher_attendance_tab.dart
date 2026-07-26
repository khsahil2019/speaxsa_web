import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherAttendanceTab extends GetView<TeacherDashboardController> {
  const TeacherAttendanceTab({super.key});

  @override
  Widget build(BuildContext context) {
    final RxString selectedBatchFilter = ''.obs;

    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.attendanceLogs;
        final filteredList = selectedBatchFilter.value.isEmpty
            ? list
            : list.where((item) => item['batch_id']?.toString() == selectedBatchFilter.value).toList();

        return Column(
          children: [
            // Filter Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Colors.white,
              child: Row(
                children: [
                  const Text("Filter Batch: ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade300)),
                      child: DropdownButtonHideUnderline(
                        child: Obx(() => DropdownButton<String>(
                          isExpanded: true,
                          value: selectedBatchFilter.value.isEmpty ? null : selectedBatchFilter.value,
                          hint: const Text("All Batches", style: TextStyle(fontSize: 13)),
                          items: [
                            const DropdownMenuItem<String>(value: '', child: Text("All Batches", style: TextStyle(fontSize: 13))),
                            ...controller.batches.map((b) {
                              return DropdownMenuItem<String>(value: b.id, child: Text(b.batchName, style: const TextStyle(fontSize: 13)));
                            }),
                          ],
                          onChanged: (val) {
                            selectedBatchFilter.value = val ?? '';
                          },
                        )),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Attendance list
            Expanded(
              child: filteredList.isEmpty
                  ? const EmptyStateWidget(
                      title: "No Attendance Logs",
                      message: "Attendance logs are auto-generated when students join Agora live class rooms.",
                    )
                  : RefreshIndicator(
                      onRefresh: controller.loadAttendanceLogs,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredList.length,
                        itemBuilder: (context, i) {
                          final att = filteredList[i] as Map<String, dynamic>;
                          final dateStr = att['attendance_date'] ?? '';
                          String formattedDate = dateStr;
                          try {
                            if (dateStr.isNotEmpty) {
                              final parsed = DateTime.parse(dateStr);
                              formattedDate = DateFormat('MMM dd, yyyy • hh:mm a').format(parsed);
                            }
                          } catch (e) {
                            print("Error parsing date: $e");
                          }

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: att['status'] == 'present'
                                    ? Colors.green.withOpacity(0.1)
                                    : Colors.red.withOpacity(0.1),
                                child: Icon(
                                  att['status'] == 'present' ? Icons.check : Icons.close,
                                  color: att['status'] == 'present' ? Colors.green : Colors.red,
                                ),
                              ),
                              title: Text(att['student_name'] ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text(
                                "Batch: ${att['batch_name'] ?? 'Study Batch'}\nClass: ${att['class_title'] ?? 'Live Session'}\nLogged: $formattedDate",
                                style: const TextStyle(fontSize: 12),
                              ),
                              trailing: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  StatusChip(status: att['status'] ?? 'absent'),
                                  const SizedBox(height: 4),
                                  Text("${att['duration_mins'] ?? 0} mins", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
            ),
          ],
        );
      }),
    );
  }
}
