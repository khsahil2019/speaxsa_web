import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../data/models/batch_model.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';

class StudentMyBatchesView extends GetView<StudentDashboardController> {
  final bool isEmbedded;
  const StudentMyBatchesView({super.key, this.isEmbedded = false});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);

    final content = Obx(() {
      final list = controller.myBatches;
      if (list.isEmpty) {
        return EmptyStateWidget(
          title: "No Enrolled Batches",
          message: "You have not enrolled in any batch yet. Explore available courses to join a batch.",
          icon: Icons.groups_outlined,
          buttonText: "Browse Courses",
          onButtonPressed: () => controller.selectedIndex.value = 1,
        );
      }

      return RefreshIndicator(
        onRefresh: () => controller.loadDashboardData(),
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          itemCount: list.length,
          itemBuilder: (context, i) {
            final batch = list[i];
            return EnrolledBatchCard(
              batch: batch,
              controller: controller,
            );
          },
        ),
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
          "My Enrolled Batches",
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

class EnrolledBatchCard extends StatelessWidget {
  final BatchModel batch;
  final StudentDashboardController controller;

  const EnrolledBatchCard({
    super.key,
    required this.batch,
    required this.controller,
  });

  void _openBatchDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => BatchDetailsBottomSheet(batchId: batch.id, initialBatch: batch),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
    final cardBorderColor = isDark ? Colors.white10 : Colors.grey.shade200;

    final daysStr = batch.daysOfWeek.isNotEmpty ? batch.daysOfWeek.join(', ') : 'Mon - Fri';

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: cardBorderColor),
      ),
      child: InkWell(
        onTap: () => _openBatchDetails(context),
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0D7A6D), Color(0xFF10B981)],
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Center(
                      child: Icon(Icons.school_rounded, color: Colors.white, size: 24),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          batch.courseTitle ?? batch.batchName,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: textColor,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            batch.batchName,
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 12),

              Row(
                children: [
                  Icon(Icons.person_outline_rounded, size: 16, color: secTextColor),
                  const SizedBox(width: 8),
                  Text("Teacher: ", style: TextStyle(fontSize: 12.5, color: secTextColor)),
                  Expanded(
                    child: Text(
                      batch.teacherName ?? 'Assigned Instructor',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: textColor),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              Row(
                children: [
                  Icon(Icons.calendar_today_rounded, size: 15, color: secTextColor),
                  const SizedBox(width: 8),
                  Text("Schedule: ", style: TextStyle(fontSize: 12.5, color: secTextColor)),
                  Expanded(
                    child: Text(
                      daysStr,
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: textColor),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              Row(
                children: [
                  Icon(Icons.event_seat_rounded, size: 15, color: secTextColor),
                  const SizedBox(width: 8),
                  Text("Available Seats: ", style: TextStyle(fontSize: 12.5, color: secTextColor)),
                  Text(
                    "${batch.availableSeats} Left",
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                height: 42,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => _openBatchDetails(context),
                  icon: const Icon(Icons.menu_book_rounded, size: 16),
                  label: const Text(
                    "View Batch Details & Syllabus",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class BatchDetailsBottomSheet extends StatefulWidget {
  final String batchId;
  final BatchModel initialBatch;

  const BatchDetailsBottomSheet({
    super.key,
    required this.batchId,
    required this.initialBatch,
  });

  @override
  State<BatchDetailsBottomSheet> createState() => _BatchDetailsBottomSheetState();
}

class _BatchDetailsBottomSheetState extends State<BatchDetailsBottomSheet> {
  bool _isLoading = true;
  Map<String, dynamic>? _detailsData;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    try {
      final apiClient = Get.find<ApiClient>();
      final res = await apiClient.get('/student/batches/${widget.batchId}/details');
      if (mounted) {
        setState(() {
          _detailsData = res is Map<String, dynamic> ? res : null;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _launchUrlStr(String url) async {
    try {
      final full = url.startsWith('http') ? url : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$url';
      final uri = Uri.parse(full);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      Get.snackbar('Error', 'Could not open URL: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.initialBatch;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColors.darkCard : Colors.white;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;

    final batchDetail = _detailsData?['batch'] is Map ? Map<String, dynamic>.from(_detailsData!['batch']) : null;
    final materials = _detailsData?['materials'] is List ? List<dynamic>.from(_detailsData!['materials']) : [];

    final plannerUrl = batchDetail?['planner_url'] ?? b.plannerUrl;
    final demoUrl = batchDetail?['demo_video_url'];

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
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
            children: [
              const Icon(Icons.layers_rounded, color: AppColors.primary, size: 24),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  b.courseTitle ?? b.batchName,
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: textColor),
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
          const SizedBox(height: 4),
          Text("Batch Name: ${b.batchName}", style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13)),
          const Divider(height: 24),

          if (_isLoading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(color: AppColors.primary),
                    SizedBox(height: 12),
                    Text("Loading Batch Details & Syllabus..."),
                  ],
                ),
              ),
            )
          else if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Text("Failed to load details: $_errorMessage", style: const TextStyle(color: Colors.red)),
            )
          else
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Teacher Info Box
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkCardAlt : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const CircleAvatar(
                                backgroundColor: AppColors.primary,
                                radius: 18,
                                child: Icon(Icons.person, color: Colors.white, size: 20),
                              ),
                              const SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(b.teacherName ?? 'Instructor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textColor)),
                                  Text("Course Educator", style: TextStyle(fontSize: 11.5, color: secTextColor)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text("Schedule: ${b.daysOfWeek.join(', ')}", style: TextStyle(fontSize: 12.5, color: secTextColor)),
                          if (b.startTime != null) Text("Time: ${b.startTime}", style: TextStyle(fontSize: 12.5, color: secTextColor)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Media Action Buttons
                    if (plannerUrl != null && plannerUrl.toString().isNotEmpty) ...[
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF3B82F6),
                            side: const BorderSide(color: Color(0xFF3B82F6), width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () => _launchUrlStr(plannerUrl.toString()),
                          icon: const Icon(Icons.picture_as_pdf_outlined, size: 20),
                          label: const Text("Download Batch Syllabus PDF", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],

                    if (demoUrl != null && demoUrl.toString().isNotEmpty) ...[
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange.shade700,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () => _launchUrlStr(demoUrl.toString()),
                          icon: const Icon(Icons.play_circle_fill_rounded, size: 20),
                          label: const Text("Watch Batch Demo Video", style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Study Notes & Materials List
                    Text("Study Notes & Class Materials", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: textColor)),
                    const SizedBox(height: 10),

                    if (materials.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Text("No study notes or materials uploaded for this batch yet.", style: TextStyle(color: secTextColor, fontSize: 13, fontStyle: FontStyle.italic)),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: materials.length,
                        itemBuilder: (context, i) {
                          final mat = Map<String, dynamic>.from(materials[i]);
                          final fileUrl = mat['file_url'] ?? mat['url'];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkCardAlt : Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.description_outlined, color: AppColors.primary, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(mat['title'] ?? mat['name'] ?? 'Study Material', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
                                      if (mat['chapter_name'] != null) Text("Chapter: ${mat['chapter_name']}", style: TextStyle(fontSize: 11, color: secTextColor)),
                                    ],
                                  ),
                                ),
                                if (fileUrl != null)
                                  IconButton(
                                    icon: const Icon(Icons.download_rounded, color: AppColors.primary, size: 20),
                                    onPressed: () => _launchUrlStr(fileUrl.toString()),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
