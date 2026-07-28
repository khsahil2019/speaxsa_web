import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/api_endpoints.dart';
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
              final title = n['title'] ?? n['fileName'] ?? 'Study Material';
              final batch = n['batch_name'] ?? n['batchName'] ?? 'All Batches';
              final desc = n['description'] ?? 'No Description provided';
              final fileUrl = n['file_url'] ?? n['fileUrl'] ?? n['url'];

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: InkWell(
                  onTap: () => _showMaterialDetailsModal(context, n),
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: Colors.red.withOpacity(0.1),
                          child: const Icon(Icons.picture_as_pdf_rounded, color: Colors.red, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text("Batch: $batch", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                              Text(
                                desc,
                                style: TextStyle(color: Colors.grey.shade700, fontSize: 11),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.open_in_new_rounded, color: AppColors.primary),
                              tooltip: "Open PDF",
                              onPressed: () => _openPdf(fileUrl),
                            ),
                            TextButton(
                              onPressed: () => _showMaterialDetailsModal(context, n),
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: const Size(50, 20),
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text("View More", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.small(
        onPressed: () => _showUploadNoteDialog(context),
        tooltip: "Upload Notes",
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
        child: const Icon(Icons.upload_file_rounded),
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

  Future<void> _openPdf(dynamic fileUrl) async {
    if (fileUrl == null || fileUrl.toString().trim().isEmpty) {
      Get.snackbar("Open PDF", "No PDF file link attached to this material.", backgroundColor: AppColors.warning, colorText: Colors.white);
      return;
    }

    String urlStr = fileUrl.toString().trim();
    if (!urlStr.startsWith('http')) {
      final serverBase = ApiEndpoints.baseUrl.replaceAll('/api', '');
      urlStr = "$serverBase$urlStr";
    }

    final uri = Uri.parse(urlStr);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (e) {
      Get.snackbar("Open PDF", "Could not open document: $e", backgroundColor: AppColors.error, colorText: Colors.white);
    }
  }

  void _showMaterialDetailsModal(BuildContext context, Map<String, dynamic> n) {
    final title = n['title'] ?? n['fileName'] ?? 'Study Material Document';
    final batch = n['batch_name'] ?? n['batchName'] ?? 'All Batches';
    final desc = n['description'] ?? 'No additional mentor instructions provided.';
    final date = n['created_at'] != null ? n['created_at'].toString().split('T')[0] : 'Today';
    final fileUrl = n['file_url'] ?? n['fileUrl'] ?? n['url'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Expanded(
                  child: Text(
                    "Study Material Details",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 16),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.red.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: Colors.red.shade100,
                    child: const Icon(Icons.picture_as_pdf_rounded, color: Colors.red, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 4),
                        Text("Target Batch: $batch", style: TextStyle(color: Colors.grey.shade800, fontSize: 12, fontWeight: FontWeight.w600)),
                        Text("Uploaded: $date", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            const Text("Mentor Instructions / Notes Description:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                desc,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade900, height: 1.4),
              ),
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.open_in_new_rounded, size: 20),
                label: const Text("📄 Open / Launch PDF Workbook", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  _openPdf(fileUrl);
                },
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
