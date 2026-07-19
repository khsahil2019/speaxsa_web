import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state_widget.dart';

class TeacherNotesTab extends GetView<TeacherDashboardController> {
  const TeacherNotesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.notes;
        if (list.isEmpty) {
          return EmptyStateWidget(
            title: "No Study Materials Uploaded",
            message: "Upload chapter workbooks, practice notes, or class guides for students.",
            buttonText: "Upload Material",
            onButtonPressed: () => _showUploadNoteDialog(context),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadNotes,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final n = list[i] as Map<String, dynamic>;
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withOpacity(0.1),
                    child: const Icon(Icons.picture_as_pdf, color: Colors.red),
                  ),
                  title: Text(n['title'] ?? 'Study Material', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("Batch: ${n['batch_name'] ?? 'All Batches'}\nDesc: ${n['description'] ?? 'No Description'}"),
                  trailing: IconButton(
                    icon: const Icon(Icons.open_in_new, color: AppColors.primary),
                    onPressed: () {
                      Get.snackbar('Open Workbook', 'File link: ${n['file_url']}');
                    },
                  ),
                ),
              );
            },
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showUploadNoteDialog(context),
        label: const Text("Upload Notes"),
        icon: const Icon(Icons.upload_file),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
      ),
    );
  }

  void _showUploadNoteDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    final RxString selectedBatchId = ''.obs;
    final RxString selectedCourseId = ''.obs;
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
                const Text("Upload Study Workbook / Notes", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                          final selectedBatch = controller.batches.firstWhere((b) => b.id == val);
                          selectedCourseId.value = selectedBatch.courseId ?? '';
                        }
                      },
                    ),
                  ),
                )),
                const SizedBox(height: 16),

                CustomTextField(label: 'Workbook Title *', hint: 'e.g. Chapter 1 Kinematics revision workbook', controller: titleCtrl, prefixIcon: Icons.title),
                CustomTextField(label: 'Description *', hint: 'Provide short summaries or workbook contents...', controller: descCtrl, maxLines: 2, prefixIcon: Icons.description),

                const Text("Worksheets/Notes PDF Document *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Obx(() => Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
                  child: filePath.value.isEmpty
                      ? TextButton.icon(
                          icon: const Icon(Icons.file_upload, color: AppColors.teacherRole),
                          label: const Text("Select PDF Workbook File"),
                          onPressed: () async {
                            final result = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
                            if (result != null && result.files.single.path != null) {
                              filePath.value = result.files.single.path!;
                            }
                          },
                        )
                      : Row(
                          children: [
                            const Icon(Icons.picture_as_pdf, color: Colors.red),
                            const SizedBox(width: 8),
                            Expanded(child: Text(filePath.value.split('/').last, maxLines: 1, overflow: TextOverflow.ellipsis)),
                            IconButton(icon: const Icon(Icons.delete, color: Colors.grey), onPressed: () => filePath.value = ''),
                          ],
                        ),
                )),

                const SizedBox(height: 24),
                CustomButton(
                  text: 'Upload Workbook',
                  onPressed: () {
                    if (selectedBatchId.value.isEmpty || titleCtrl.text.isEmpty || descCtrl.text.isEmpty || filePath.value.isEmpty) {
                      Get.snackbar('Error', 'Please fill all required fields and upload a PDF file');
                      return;
                    }

                    final body = {
                      'title': titleCtrl.text.trim(),
                      'description': descCtrl.text.trim(),
                      'batchId': selectedBatchId.value,
                      'courseId': selectedCourseId.value,
                    };

                    controller.uploadNote(body, filePath.value);
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
