import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherAssignmentsTab extends GetView<TeacherDashboardController> {
  const TeacherAssignmentsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.assignments;
        if (list.isEmpty) {
          return EmptyStateWidget(
            title: "No Assignments Deployed",
            message: "Create and publish assignments/worksheets for your batch students.",
            buttonText: "Create Assignment",
            onButtonPressed: () => _showCreateAssignmentDialog(context),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadAssignments,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final a = list[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(a.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
                          StatusChip(status: a.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text("Batch: ${a.batchName ?? 'Live Batch'} • Max Marks: ${a.maxMarks}", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text("Due Date: ${a.dueDate ?? 'N/A'}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      if (a.description != null && a.description!.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(a.description!, style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
                      ],
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          if (a.fileUrl != null && a.fileUrl!.isNotEmpty)
                            TextButton.icon(
                              icon: const Icon(Icons.download, size: 16),
                              label: const Text("Download Sheet", style: TextStyle(fontSize: 12)),
                              onPressed: () {
                                Get.snackbar('Download', 'File url: ${a.fileUrl}');
                              },
                            )
                          else
                            const SizedBox.shrink(),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.grading, size: 16),
                            label: const Text("Grade Submissions", style: TextStyle(fontSize: 12)),
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.teacherRole, foregroundColor: Colors.white, elevation: 0),
                            onPressed: () => _showSubmissionsSheet(context, a.id, a.title),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateAssignmentDialog(context),
        label: const Text("Create Assignment"),
        icon: const Icon(Icons.add),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
      ),
    );
  }

  void _showSubmissionsSheet(BuildContext context, String assignmentId, String title) async {
    final submissions = await controller.getAssignmentSubmissions(assignmentId);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          maxChildSize: 0.9,
          minChildSize: 0.5,
          expand: false,
          builder: (context, scrollController) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Submissions: $title", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Expanded(
                    child: submissions.isEmpty
                        ? const Center(child: Text("No student submissions yet", style: TextStyle(color: Colors.grey)))
                        : ListView.builder(
                            controller: scrollController,
                            itemCount: submissions.length,
                            itemBuilder: (context, i) {
                              final sub = submissions[i] as Map<String, dynamic>;
                              final submissionStatus = sub['status']?.toString() ?? 'submitted';
                              final marksObtained = sub['marks_obtained'];
                              final feedback = sub['feedback'] ?? '';

                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(sub['student_name'] ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                          StatusChip(status: submissionStatus),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text("Submitted: ${sub['submitted_at'] ?? 'N/A'}", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                      if (marksObtained != null)
                                        Text("Score: $marksObtained • Feedback: $feedback", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green))
                                      else
                                        const Text("Not Graded Yet", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange)),
                                      const SizedBox(height: 10),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          if (sub['file_url'] != null)
                                            TextButton.icon(
                                              icon: const Icon(Icons.attachment, size: 14),
                                              label: const Text("View Work", style: TextStyle(fontSize: 11)),
                                              onPressed: () {
                                                Get.snackbar('Student Submission', 'File: ${sub['file_url']}');
                                              },
                                            )
                                          else
                                            const SizedBox.shrink(),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4), elevation: 0),
                                            onPressed: () => _showGradingDialog(context, sub['id'].toString(), assignmentId),
                                            child: Text(marksObtained != null ? "Re-Grade" : "Grade"),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showGradingDialog(BuildContext context, String submissionId, String assignmentId) {
    final marksCtrl = TextEditingController();
    final feedCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("Grade Submission"),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CustomTextField(label: 'Marks Obtained', hint: 'e.g. 92', controller: marksCtrl, keyboardType: TextInputType.number, prefixIcon: Icons.score),
              CustomTextField(label: 'Feedback / Remarks', hint: 'Well solved! Good conceptual understanding.', controller: feedCtrl, maxLines: 2, prefixIcon: Icons.comment),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
              onPressed: () {
                final marks = double.tryParse(marksCtrl.text.trim());
                if (marks == null) {
                  Get.snackbar('Error', 'Please enter a valid numeric mark');
                  return;
                }
                controller.gradeSubmission(submissionId, marks, feedCtrl.text.trim(), assignmentId);
                Navigator.pop(context); // close dialog
                Navigator.pop(context); // close submissions sheet
              },
              child: const Text("Submit Grade"),
            ),
          ],
        );
      },
    );
  }

  Future<void> _selectDate(BuildContext context, TextEditingController ctrl) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      ctrl.text = "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
    }
  }

  void _showCreateAssignmentDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final marksCtrl = TextEditingController(text: '100');
    final dateCtrl = TextEditingController();

    final RxString selectedBatchId = ''.obs;
    final RxString filePath = ''.obs;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Deploy Assignment Sheet", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),

                const Text("Select Batch *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Obx(() => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      hint: const Text("Choose Batch"),
                      value: selectedBatchId.value.isEmpty ? null : selectedBatchId.value,
                      items: controller.batches.where((b) => b.status == 'active').map((b) {
                        return DropdownMenuItem<String>(
                          value: b.id,
                          child: Text(b.batchName),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          selectedBatchId.value = val;
                        }
                      },
                    ),
                  ),
                )),
                const SizedBox(height: 16),

                CustomTextField(label: 'Assignment Title *', hint: 'e.g. Chapter 1: Kinematics worksheet', controller: titleCtrl, prefixIcon: Icons.title),
                CustomTextField(label: 'Instructions *', hint: 'e.g. Solve all 10 questions and show calculations.', controller: descCtrl, maxLines: 3, prefixIcon: Icons.description),
                CustomTextField(label: 'Max Marks *', hint: '100', controller: marksCtrl, keyboardType: TextInputType.number, prefixIcon: Icons.star),
                CustomTextField(
                  label: 'Due Date (YYYY-MM-DD) *',
                  hint: 'Select Due Date',
                  controller: dateCtrl,
                  readOnly: true,
                  prefixIcon: Icons.calendar_today,
                  onTap: () => _selectDate(context, dateCtrl),
                ),

                const Text("Attach Worksheet File (PDF/Image) *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Obx(() => Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
                  child: filePath.value.isEmpty
                      ? TextButton.icon(
                          icon: const Icon(Icons.file_upload, color: AppColors.teacherRole),
                          label: const Text("Upload Homework File"),
                          onPressed: () async {
                            final result = await FilePicker.pickFiles();
                            if (result != null && result.files.single.path != null) {
                              filePath.value = result.files.single.path!;
                            }
                          },
                        )
                      : Row(
                          children: [
                            const Icon(Icons.attach_file, color: AppColors.teacherRole),
                            const SizedBox(width: 8),
                            Expanded(child: Text(filePath.value.split('/').last, maxLines: 1, overflow: TextOverflow.ellipsis)),
                            IconButton(icon: const Icon(Icons.delete, color: Colors.grey), onPressed: () => filePath.value = ''),
                          ],
                        ),
                )),

                const SizedBox(height: 24),
                CustomButton(
                  text: 'Deploy Assignment',
                  onPressed: () {
                    if (selectedBatchId.value.isEmpty || titleCtrl.text.isEmpty || descCtrl.text.isEmpty || marksCtrl.text.isEmpty || dateCtrl.text.isEmpty || filePath.value.isEmpty) {
                      Get.snackbar('Error', 'Please fill all required fields and attach a file');
                      return;
                    }

                    final body = {
                      'batchId': selectedBatchId.value,
                      'title': titleCtrl.text.trim(),
                      'description': descCtrl.text.trim(),
                      'max_marks': int.tryParse(marksCtrl.text.trim()) ?? 100,
                      'due_date': dateCtrl.text.trim(),
                    };

                    controller.createAssignment(body, filePath.value);
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
