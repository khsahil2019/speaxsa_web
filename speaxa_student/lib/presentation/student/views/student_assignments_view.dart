import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../data/models/assignment_model.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentAssignmentsView extends GetView<StudentDashboardController> {
  final bool isEmbedded;
  const StudentAssignmentsView({super.key, this.isEmbedded = false});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);

    final content = Obx(() {
      final list = controller.assignments;
      if (list.isEmpty) {
        return const EmptyStateWidget(
          title: "No Assignments Found",
          message: "Assignments assigned by your mentors will be listed here.",
          icon: Icons.task_outlined,
        );
      }

      return ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        itemCount: list.length,
        itemBuilder: (context, i) {
          final a = list[i];
          return CompactAssignmentCard(
            assignment: a,
            controller: controller,
          );
        },
      );
    });

    if (isEmbedded) return content;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkCard : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
            ),
            child: IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: Icon(Icons.arrow_back_ios_new_rounded, color: isDark ? AppColors.darkTextPrimary : Colors.black87, size: 18),
              onPressed: () => Get.back(),
            ),
          ),
        ),
        title: const Text(
          "Assignments & Tasks",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        elevation: 0,
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        foregroundColor: textColor,
      ),
      body: content,
    );
  }
}

class CompactAssignmentCard extends StatelessWidget {
  final AssignmentModel assignment;
  final StudentDashboardController controller;

  const CompactAssignmentCard({
    super.key,
    required this.assignment,
    required this.controller,
  });

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final parsed = DateTime.parse(dateStr);
      return DateFormat('d MMM yyyy').format(parsed);
    } catch (e) {
      return dateStr;
    }
  }

  void _openDetailsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AssignmentDetailBottomSheet(
        assignment: assignment,
        controller: controller,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final a = assignment;
    final submitted = a.submissionId != null || (a.submissionStatus != null && a.submissionStatus != 'pending');
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
    final cardBorderColor = isDark ? Colors.white10 : Colors.grey.shade200;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: cardBorderColor),
      ),
      child: InkWell(
        onTap: () => _openDetailsModal(context),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  StatusChip(status: a.submissionStatus ?? 'pending'),
                  Text(
                    "Max Marks: ${a.maxMarks}",
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                a.title,
                style: TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                "Batch: ${a.batchName ?? '—'}  •  Due: ${_formatDate(a.dueDate)}",
                style: TextStyle(fontSize: 12, color: secTextColor),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    submitted ? "✓ Submitted" : "Pending Action",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: submitted ? const Color(0xFF10B981) : Colors.orange.shade700,
                    ),
                  ),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.2),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _openDetailsModal(context),
                    icon: const Icon(Icons.visibility_outlined, size: 14),
                    label: const Text("View Details & Submit", style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class AssignmentDetailBottomSheet extends StatefulWidget {
  final AssignmentModel assignment;
  final StudentDashboardController controller;

  const AssignmentDetailBottomSheet({
    super.key,
    required this.assignment,
    required this.controller,
  });

  @override
  State<AssignmentDetailBottomSheet> createState() => _AssignmentDetailBottomSheetState();
}

class _AssignmentDetailBottomSheetState extends State<AssignmentDetailBottomSheet> {
  String? _selectedFilePath;
  String? _selectedFileName;
  bool _isSubmitting = false;

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final parsed = DateTime.parse(dateStr);
      return DateFormat('d MMM yyyy').format(parsed);
    } catch (e) {
      return dateStr;
    }
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'],
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFilePath = result.files.single.path;
          _selectedFileName = result.files.single.name;
        });
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to select file: $e', backgroundColor: Colors.red, colorText: Colors.white);
    }
  }

  Future<void> _submitAssignment() async {
    if (_selectedFilePath == null) return;
    setState(() => _isSubmitting = true);
    try {
      await widget.controller.submitAssignment(widget.assignment.id, _selectedFilePath!);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      // Handled in controller
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _downloadTemplate(String url) async {
    try {
      final uri = Uri.parse(url.startsWith('http') ? url : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$url');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      Get.snackbar('Error', 'Could not open assignment document: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.assignment;
    final submitted = a.submissionId != null || (a.submissionStatus != null && a.submissionStatus != 'pending');

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColors.darkCard : Colors.white;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
    final cardBorderColor = isDark ? Colors.white10 : Colors.grey.shade200;
    final innerBgColor = isDark ? AppColors.darkCardAlt : Colors.grey.shade50;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? Colors.white24 : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  a.title,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              StatusChip(status: a.submissionStatus ?? 'pending'),
              const SizedBox(width: 10),
              Text("Max Marks: ${a.maxMarks}", style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
            ],
          ),
          const Divider(height: 24),

          Flexible(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Batch: ${a.batchName ?? '—'}  •  Due Date: ${_formatDate(a.dueDate)}", style: TextStyle(fontSize: 13, color: secTextColor, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  if (a.description != null && a.description!.isNotEmpty) ...[
                    const Text("Instructions / Guidelines", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Text(a.description!, style: TextStyle(fontSize: 13, color: secTextColor, height: 1.4)),
                    const SizedBox(height: 16),
                  ],

                  if (a.fileUrl != null && a.fileUrl!.isNotEmpty) ...[
                    InkWell(
                      onTap: () => _downloadTemplate(a.fileUrl!),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF3B82F6).withOpacity(0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.2)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.picture_as_pdf_outlined, color: Color(0xFF3B82F6), size: 22),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text("Download Assignment Attachment PDF", style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF3B82F6), fontSize: 13)),
                            ),
                            const Icon(Icons.download_rounded, color: Color(0xFF3B82F6), size: 18),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (submitted) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.15)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 20),
                              const SizedBox(width: 8),
                              Expanded(child: Text("Submitted on ${_formatDate(a.submittedAt)}", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981)))),
                            ],
                          ),
                          if (a.marksObtained != null) ...[
                            const SizedBox(height: 8),
                            Text("Marks: ${a.marksObtained!.toStringAsFixed(1)} / ${a.maxMarks}", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF10B981))),
                          ],
                          if (a.feedback != null && a.feedback!.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text("Feedback: \"${a.feedback}\"", style: TextStyle(fontSize: 12.5, color: secTextColor, fontStyle: FontStyle.italic)),
                          ],
                        ],
                      ),
                    ),
                  ] else ...[
                    const Text("Submit Homework Solution", style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    if (_selectedFilePath == null)
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary, width: 1.5),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _pickFile,
                          icon: const Icon(Icons.upload_file_rounded, size: 20),
                          label: const Text("Select Solution PDF / Document", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      )
                    else
                      Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: innerBgColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: cardBorderColor),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.picture_as_pdf, color: Colors.red, size: 20),
                                const SizedBox(width: 10),
                                Expanded(child: Text(_selectedFileName ?? 'Selected Document', style: TextStyle(fontWeight: FontWeight.bold, color: textColor), maxLines: 1, overflow: TextOverflow.ellipsis)),
                                IconButton(icon: const Icon(Icons.cancel_rounded, color: Colors.grey, size: 20), onPressed: () => setState(() => _selectedFilePath = null)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: _isSubmitting ? null : _submitAssignment,
                              icon: _isSubmitting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_rounded, size: 16),
                              label: Text(_isSubmitting ? "SUBMITTING..." : "CONFIRM & SUBMIT", style: const TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
