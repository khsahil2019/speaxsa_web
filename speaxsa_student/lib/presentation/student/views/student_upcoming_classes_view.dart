import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/services/storage_service.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentUpcomingClassesView extends GetView<StudentDashboardController> {
  const StudentUpcomingClassesView({super.key});

  Future<void> _joinLiveRoom(String classId) async {
    try {
      final token = await StorageService.to.getToken() ?? '';
      final baseUrl = ApiEndpoints.baseUrl.replaceAll('/api', '');
      final url = "$baseUrl/live/room.html?classId=$classId&role=student&token=$token";
      
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        Get.snackbar('Error', 'Could not open live classroom');
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to launch live classroom: $e');
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final parsed = DateTime.parse(dateStr);
      return DateFormat('EEE, d MMM yyyy').format(parsed);
    } catch (e) {
      return dateStr;
    }
  }

  String _formatTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return '—';
    try {
      // timeStr can be HH:mm:ss
      final parts = timeStr.split(':');
      if (parts.length >= 2) {
        final hour = int.parse(parts[0]);
        final minute = int.parse(parts[1]);
        final tempDt = DateTime(2026, 1, 1, hour, minute);
        return DateFormat('h:mm a').format(tempDt);
      }
      return timeStr;
    } catch (e) {
      return timeStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Upcoming Lectures"),
      ),
      body: Obx(() {
        final classes = controller.upcomingClasses;
        if (classes.isEmpty) {
          return const EmptyStateWidget(
            title: "No Upcoming Classes",
            message: "No live lectures or classrooms scheduled for your enrolled batches.",
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: classes.length,
          itemBuilder: (context, i) {
            final c = classes[i];
            final isLive = c.status == 'live';
            
            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              elevation: isLive ? 4 : 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isLive ? AppColors.error.withOpacity(0.5) : Colors.transparent,
                  width: 2,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today, size: 12, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                "Lecture ${i + 1}",
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ),
                        StatusChip(status: c.status),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      c.title,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (c.batchName != null)
                          Chip(
                            labelPadding: const EdgeInsets.symmetric(horizontal: 4),
                            avatar: const Icon(Icons.layers, size: 12, color: Colors.purple),
                            label: Text(c.batchName!, style: const TextStyle(fontSize: 11)),
                            backgroundColor: Colors.purple.withOpacity(0.08),
                          ),
                        if (c.teacherName != null)
                          Chip(
                            labelPadding: const EdgeInsets.symmetric(horizontal: 4),
                            avatar: const Icon(Icons.person, size: 12, color: AppColors.success),
                            label: Text(c.teacherName!, style: const TextStyle(fontSize: 11)),
                            backgroundColor: AppColors.success.withOpacity(0.08),
                          ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      children: [
                        const Icon(Icons.access_time, size: 14, color: Colors.grey),
                        const SizedBox(width: 6),
                        Text(
                          "${_formatDate(c.classDate)}  |  ${_formatTime(c.classTime)}",
                          style: const TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isLive ? AppColors.error : AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () => _joinLiveRoom(c.id),
                        icon: const Icon(Icons.video_call, size: 20),
                        label: Text(
                          isLive ? "JOIN LIVE NOW" : "Enter Classroom",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      }),
    );
  }
}
