import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentAttendanceView extends GetView<StudentDashboardController> {
  const StudentAttendanceView({super.key});

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '—';
    try {
      final parsed = DateTime.parse(dateStr);
      return DateFormat('d MMM yyyy').format(parsed);
    } catch (e) {
      return dateStr;
    }
  }

  String _formatTime(String? isoStr) {
    if (isoStr == null || isoStr.isEmpty) return '—';
    try {
      final parsed = DateTime.parse(isoStr).toLocal();
      return DateFormat('hh:mm a').format(parsed);
    } catch (e) {
      return isoStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
    final cardBorderColor = isDark ? Colors.white10 : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: const Text(
          "My Attendance Log",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        elevation: 0,
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        foregroundColor: textColor,
      ),
      body: Obx(() {
        final data = controller.attendanceData.value;
        final records = data?.records ?? [];

        if (records.isEmpty) {
          return const EmptyStateWidget(
            title: "No Attendance Records",
            message: "Your attendance records will appear here as you join live classes.",
            icon: Icons.calendar_today_outlined,
          );
        }

        return ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: records.length,
          itemBuilder: (context, i) {
            final r = records[i];
            final present = r.status == 'present' || r.status == 'late' || r.status == 'half';
            
            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: cardBorderColor),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Row with Title & Status Chip
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                r.classTitle ?? 'Live Class session',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: textColor,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Batch: ${r.batchName ?? '—'}",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: secTextColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusChip(status: r.status),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Divider(height: 1),
                    const SizedBox(height: 12),

                    // Attendance Stats Grid
                    Row(
                      children: [
                        // Left Side - Date
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Session Date",
                                style: TextStyle(fontSize: 11, color: secTextColor, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.primary.withOpacity(0.8)),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      _formatDate(r.attendanceDate),
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textColor),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        // Right Side - Duration
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Duration Attended",
                                style: TextStyle(fontSize: 11, color: secTextColor, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.schedule_rounded, size: 14, color: AppColors.primary.withOpacity(0.8)),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      "${r.durationMins} mins",
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: textColor),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    
                    if (present && (r.joinTime != null || r.exitTime != null)) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkCardAlt : Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            // Entry Time
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "ENTER TIME",
                                    style: TextStyle(fontSize: 9, color: secTextColor, letterSpacing: 0.5, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _formatTime(r.joinTime),
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: present ? Colors.green.shade600 : textColor),
                                  ),
                                ],
                              ),
                            ),
                            // Separator
                            Container(
                              height: 24,
                              width: 1,
                              color: isDark ? Colors.white10 : Colors.grey.shade300,
                              margin: const EdgeInsets.symmetric(horizontal: 8),
                            ),
                            // Exit Time
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "EXIT TIME",
                                    style: TextStyle(fontSize: 9, color: secTextColor, letterSpacing: 0.5, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _formatTime(r.exitTime),
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.red.shade600),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
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
