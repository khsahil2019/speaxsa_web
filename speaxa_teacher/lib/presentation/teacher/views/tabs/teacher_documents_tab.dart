import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/empty_state_widget.dart';

class TeacherDocumentsTab extends GetView<TeacherDashboardController> {
  const TeacherDocumentsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.documents;
        if (list.isEmpty) {
          return EmptyStateWidget(
            title: "No Documents Uploaded",
            message: "Upload KYC verification documents (Aadhaar, PAN, Resume, Degree Certificate) to get approved.",
            buttonText: "Upload Document",
            onButtonPressed: () => _showUploadDocDialog(context),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadTeacherData,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final doc = list[i] as Map<String, dynamic>;
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: ListTile(
                  onTap: () async {
                    final fileUrl = doc['file_url'] ?? doc['file_path'];
                    if (fileUrl != null && fileUrl.toString().isNotEmpty) {
                      final fullUrl = fileUrl.toString().startsWith('http')
                          ? fileUrl.toString()
                          : 'https://speaxa.in$fileUrl';
                      final uri = Uri.parse(fullUrl);
                      try {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      } catch (e) {
                        Get.snackbar('Error', 'Could not open document: $e');
                      }
                    } else {
                      Get.snackbar('Info', 'Document URL link is processing');
                    }
                  },
                  leading: const Icon(Icons.description, color: AppColors.primary, size: 28),
                  title: Text(doc['doc_type']?.toString().toUpperCase() ?? 'DOCUMENT', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("File: ${doc['original_name'] ?? 'File'}\n(Tap to view document)"),
                  trailing: const Icon(Icons.check_circle, color: Colors.green),
                ),
              );
            },
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showUploadDocDialog(context),
        label: const Text("Upload Document"),
        icon: const Icon(Icons.upload),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
      ),
    );
  }

  void _showUploadDocDialog(BuildContext context) {
    final RxString selectedDocType = 'aadhaar'.obs;
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Upload KYC Document", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),

              const Text("Select Document Type *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
                    value: selectedDocType.value,
                    items: const [
                      DropdownMenuItem(value: 'aadhaar', child: Text("Aadhaar Card")),
                      DropdownMenuItem(value: 'pan', child: Text("PAN Card")),
                      DropdownMenuItem(value: 'resume', child: Text("Resume / CV")),
                      DropdownMenuItem(value: 'degree', child: Text("Degree Certificate")),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        selectedDocType.value = val;
                      }
                    },
                  ),
                ),
              )),
              const SizedBox(height: 16),

              const Text("Attach Document File *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              Obx(() => Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
                child: filePath.value.isEmpty
                    ? TextButton.icon(
                        icon: const Icon(Icons.file_upload, color: AppColors.teacherRole),
                        label: const Text("Select Document File"),
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
                text: 'Upload for KYC Approval',
                onPressed: () {
                  if (filePath.value.isEmpty) {
                    Get.snackbar('Error', 'Please select a file to upload');
                    return;
                  }

                  controller.uploadKyc(filePath.value, selectedDocType.value);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
