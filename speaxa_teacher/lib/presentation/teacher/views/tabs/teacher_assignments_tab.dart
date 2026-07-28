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
              return _AssignmentCard(
                assignment: a,
                onGradePressed: () => _showSubmissionsSheet(context, a.id, a.title),
              );
            },
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.small(
        onPressed: () => _showCreateAssignmentDialog(context),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
        tooltip: "Create Homework Assignment",
        child: const Icon(Icons.add),
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
          maxChildSize: 0.95,
          minChildSize: 0.5,
          expand: false,
          builder: (context, scrollController) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          "Submissions: $title",
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
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
                                        children: [
                                          Expanded(
                                            child: Text(
                                              sub['student_name'] ?? 'Student',
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          StatusChip(status: submissionStatus),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text("Submitted: ${sub['submitted_at'] ?? 'N/A'}", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                      if (marksObtained != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 4),
                                          child: Text("Score: $marksObtained • $feedback", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green)),
                                        )
                                      else
                                        const Padding(
                                          padding: EdgeInsets.only(top: 4),
                                          child: Text("Not Graded Yet", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange)),
                                        ),
                                      const SizedBox(height: 10),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          if (sub['file_url'] != null)
                                            Flexible(
                                              child: TextButton.icon(
                                                icon: const Icon(Icons.attachment, size: 14),
                                                label: const Text("View Work", style: TextStyle(fontSize: 11)),
                                                style: TextButton.styleFrom(padding: EdgeInsets.zero),
                                                onPressed: () {
                                                  Get.snackbar('Student Submission', 'File: ${sub['file_url']}');
                                                },
                                              ),
                                            )
                                          else
                                            const SizedBox.shrink(),
                                          ElevatedButton.icon(
                                            icon: const Icon(Icons.edit_note, size: 16),
                                            label: Text(marksObtained != null ? "Re-Grade" : "Grade Submission"),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppColors.primary,
                                              foregroundColor: Colors.white,
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              elevation: 0,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                            ),
                                            onPressed: () => _showGradingDialog(context, sub['id'].toString(), assignmentId),
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
    final RxString selectedGradePill = ''.obs;

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          contentPadding: const EdgeInsets.all(20),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), shape: BoxShape.circle),
                child: const Icon(Icons.grade_rounded, color: AppColors.primary, size: 22),
              ),
              const SizedBox(width: 10),
              const Text("Grade Submission", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Quick Score Presets", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  children: [100, 90, 85, 75, 50].map((score) {
                    return InkWell(
                      onTap: () {
                        marksCtrl.text = score.toString();
                        selectedGradePill.value = score.toString();
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                        ),
                        child: Text("$score Marks", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),

                CustomTextField(
                  label: 'Marks Obtained (out of 100) *',
                  hint: 'e.g. 92',
                  controller: marksCtrl,
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.score,
                ),

                const SizedBox(height: 8),
                const Text("Feedback Presets", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    "🌟 Outstanding work!",
                    "👍 Great effort, keep practicing!",
                    "📝 Review chapter formulas.",
                  ].map((preset) {
                    return InkWell(
                      onTap: () => feedCtrl.text = preset,
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(6)),
                        child: Text(preset, style: const TextStyle(fontSize: 10.5, color: Colors.black87)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),

                CustomTextField(
                  label: 'Mentor Feedback & Remarks',
                  hint: 'Well solved! Clear step-by-step logic.',
                  controller: feedCtrl,
                  maxLines: 2,
                  prefixIcon: Icons.comment,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel", style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton.icon(
              icon: const Icon(Icons.check_circle_outline, size: 16),
              label: const Text("Submit Grade"),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () {
                if (marksCtrl.text.isEmpty) {
                  Get.snackbar('Error', 'Please enter marks obtained');
                  return;
                }

                final body = {
                  'submissionId': submissionId,
                  'marks_obtained': int.tryParse(marksCtrl.text.trim()) ?? 0,
                  'feedback': feedCtrl.text.trim(),
                };

                controller.gradeAssignment(body);
                Navigator.pop(context);
                Get.snackbar('Grade Recorded ✓', 'Student submission successfully graded!', backgroundColor: AppColors.success, colorText: Colors.white);
              },
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

class _AssignmentCard extends StatefulWidget {
  final dynamic assignment;
  final VoidCallback onGradePressed;

  const _AssignmentCard({
    required this.assignment,
    required this.onGradePressed,
  });

  @override
  State<_AssignmentCard> createState() => _AssignmentCardState();
}

class _AssignmentCardState extends State<_AssignmentCard> {
  bool isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final a = widget.assignment;
    final desc = a.description ?? '';
    final hasLongDesc = desc.length > 80;

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
                const SizedBox(width: 8),
                StatusChip(status: a.status),
              ],
            ),
            const SizedBox(height: 8),
            Text("Batch: ${a.batchName ?? 'Live Batch'} • Max Marks: ${a.maxMarks}", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13)),
            const SizedBox(height: 4),
            Text("Due Date: ${a.dueDate ?? 'N/A'}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
            if (desc.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                desc,
                maxLines: isExpanded ? 100 : 2,
                overflow: isExpanded ? TextOverflow.clip : TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey.shade800, fontSize: 13, height: 1.4),
              ),
              if (hasLongDesc)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: InkWell(
                    onTap: () => setState(() => isExpanded = !isExpanded),
                    child: Text(
                      isExpanded ? "See Less ▲" : "See More ▼",
                      style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ),
            ],
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (a.fileUrl != null && a.fileUrl!.isNotEmpty)
                  Flexible(
                    child: TextButton.icon(
                      icon: const Icon(Icons.download, size: 16),
                      label: const Text("Download Sheet", style: TextStyle(fontSize: 11)),
                      style: TextButton.styleFrom(padding: EdgeInsets.zero),
                      onPressed: () {
                        Get.snackbar('Download', 'File url: ${a.fileUrl}');
                      },
                    ),
                  )
                else
                  const SizedBox.shrink(),
                ElevatedButton.icon(
                  icon: const Icon(Icons.grading, size: 16),
                  label: const Text("Grade Submissions", style: TextStyle(fontSize: 11)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.teacherRole,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: widget.onGradePressed,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
