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
  const StudentAssignmentsView({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: const Text(
          "Assignments & Tasks",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        elevation: 0,
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        foregroundColor: textColor,
      ),
      body: Obx(() {
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
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: list.length,
          itemBuilder: (context, i) {
            final a = list[i];
            return AssignmentCard(
              assignment: a,
              controller: controller,
            );
          },
        );
      }),
    );
  }
}

class AssignmentCard extends StatefulWidget {
  final AssignmentModel assignment;
  final StudentDashboardController controller;

  const AssignmentCard({
    super.key,
    required this.assignment,
    required this.controller,
  });

  @override
  State<AssignmentCard> createState() => _AssignmentCardState();
}

class _AssignmentCardState extends State<AssignmentCard> {
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
      setState(() {
        _selectedFilePath = null;
        _selectedFileName = null;
      });
    } catch (e) {
      // Handled in controller
    } finally {
      setState(() => _isSubmitting = false);
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
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
    final cardBorderColor = isDark ? Colors.white10 : Colors.grey.shade200;
    final innerBgColor = isDark ? AppColors.darkCardAlt : Colors.grey.shade50;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 20),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: cardBorderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status and Badge Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                StatusChip(status: a.submissionStatus ?? 'pending'),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    "Max Marks: ${a.maxMarks}",
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Assignment Title
            Text(
              a.title,
              style: TextStyle(
                fontSize: 16.5,
                fontWeight: FontWeight.w800,
                color: textColor,
                height: 1.3,
              ),
            ),
            const SizedBox(height: 4),

            // Batch and Due Date Row
            Row(
              children: [
                Expanded(
                  child: Text(
                    "Batch: ${a.batchName ?? '—'}  •  Due: ${_formatDate(a.dueDate)}",
                    style: TextStyle(fontSize: 12, color: secTextColor, fontWeight: FontWeight.w600),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Description
            if (a.description != null && a.description!.isNotEmpty) ...[
              Text(
                a.description!,
                style: TextStyle(fontSize: 13, color: secTextColor, height: 1.45),
              ),
              const SizedBox(height: 14),
            ],

            // If teacher uploaded a reference file
            if (a.fileUrl != null && a.fileUrl!.isNotEmpty) ...[
              InkWell(
                onTap: () => _downloadTemplate(a.fileUrl!),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.picture_as_pdf_outlined, color: Color(0xFF3B82F6), size: 20),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          "Download Assignment Questions PDF",
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF3B82F6),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Icon(Icons.arrow_forward_ios_rounded, color: const Color(0xFF3B82F6).withOpacity(0.6), size: 12),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Submitted section
            if (submitted) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.15)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "Submitted on ${_formatDate(a.submittedAt)}",
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF10B981),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (a.marksObtained != null) ...[
                      const SizedBox(height: 8),
                      const Divider(height: 1),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Marks Awarded:", style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                          Text(
                            "${a.marksObtained!.toStringAsFixed(1)} / ${a.maxMarks}",
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF10B981),
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (a.feedback != null && a.feedback!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        "Feedback: \"${a.feedback}\"",
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade700,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ] else ...[
              // Not submitted yet: Show submission zone
              const Divider(height: 1),
              const SizedBox(height: 14),

              // File pick area
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
                    label: const Text(
                      "Select Submission PDF",
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                          Expanded(
                            child: Text(
                              _selectedFileName ?? 'Selected Document',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textColor),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel_rounded, color: Colors.grey, size: 20),
                            onPressed: () {
                              setState(() {
                                _selectedFilePath = null;
                                _selectedFileName = null;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981), // Success Emerald
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _isSubmitting ? null : _submitAssignment,
                        icon: _isSubmitting
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.send_rounded, size: 16),
                        label: Text(
                          _isSubmitting ? "SUBMITTING..." : "SUBMIT SOLUTION",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ],
        ),
      ),
    );
  }
}
