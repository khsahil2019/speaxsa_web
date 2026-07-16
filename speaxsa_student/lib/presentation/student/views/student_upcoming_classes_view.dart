import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/services/storage_service.dart';
import '../../../core/services/fcm_service.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';

class StudentUpcomingClassesView extends GetView<StudentDashboardController> {
  final bool isEmbedded;
  const StudentUpcomingClassesView({super.key, this.isEmbedded = false});

  Future<void> _joinLiveRoom(String classId) async {
    try {
      final token = await StorageService.to.getToken() ?? '';
      final baseUrl = ApiEndpoints.baseUrl.replaceAll('/api', '');
      final url = "$baseUrl/live/room.html?classId=$classId&role=student&token=$token";
      
      final uri = Uri.parse(url);
      
      // On Android, launching without checking canLaunchUrl is safer
      // for custom browser schemes/intents when intent queries might be restricted,
      // but since we added the scheme to queries, we can launch it directly.
      try {
        Get.find<FcmService>().showLocalNotification(
          "Entering Classroom 🏫",
          "You are now entering the live classroom. Keep your curiosity high!"
        );
      } catch (e) {
        debugPrint('[Notification] Live class notification failed: $e');
      }

      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      Get.snackbar('Error', 'Failed to launch classroom: $e', backgroundColor: Colors.red, colorText: Colors.white);
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
    final bodyContent = Obx(() {
      final classes = controller.upcomingClasses;
      if (classes.isEmpty) {
        return const EmptyStateWidget(
          title: "No Upcoming Classes",
          message: "No live lectures or classrooms scheduled for your enrolled batches.",
        );
      }

      return ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        itemCount: classes.length,
        itemBuilder: (context, i) {
          final c = classes[i];
          final isLive = c.status == 'live';
          final isEnded = c.status == 'ended';
          final isScheduled = c.status == 'scheduled';

          final isDark = Theme.of(context).brightness == Brightness.dark;
          final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
          final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
          final detailsBg = isDark ? AppColors.darkCardAlt : Colors.grey.shade50;
          final detailsBorderColor = isDark ? Colors.white10 : Colors.grey.shade100;
          final cardBorderColor = isLive ? const Color(0xFFEF4444) : (isDark ? Colors.white10 : Colors.grey.shade200);
          final dateColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF334155);

          return Card(
            elevation: isLive ? 3 : 0,
            margin: const EdgeInsets.only(bottom: 20),
            clipBehavior: Clip.antiAlias,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(
                color: cardBorderColor,
                width: isLive ? 2 : 1,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Live Glowing Header
                if (isLive)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          "LIVE NOW",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const Spacer(),
                        const Text(
                          "Join the ongoing classroom session",
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),

                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Subtitle Row (Batch and Teacher)
                      Row(
                        children: [
                          Flexible(
                            child: _buildSmallChip(
                              Icons.layers_outlined,
                              c.batchName ?? 'General',
                              const Color(0xFF8B5CF6),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: _buildSmallChip(
                              Icons.person_outline_rounded,
                              c.teacherName ?? 'Mentor',
                              AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Lecture Title
                      Text(
                        c.title,
                        style: TextStyle(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w800,
                          color: textColor,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Schedule Details Shaded Box
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: detailsBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: detailsBorderColor),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isLive 
                                    ? const Color(0xFFFEF2F2).withOpacity(isDark ? 0.2 : 1) 
                                    : (isDark ? Colors.white.withOpacity(0.08) : const Color(0xFFF1F5F9)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                Icons.calendar_today_outlined,
                                size: 18,
                                color: isLive ? const Color(0xFFEF4444) : (isDark ? Colors.grey.shade300 : Colors.grey.shade600),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatDate(c.classDate),
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: dateColor,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    "Starts at: ${_formatTime(c.classTime)}",
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: secTextColor,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Status indicator pill
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isLive 
                                    ? const Color(0xFFFEF2F2) 
                                    : (isEnded ? Colors.grey.shade100 : const Color(0xFFECFDF5)),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isLive 
                                    ? "ACTIVE" 
                                    : (isEnded ? "ENDED" : "SCHEDULED"),
                                style: TextStyle(
                                  color: isLive 
                                      ? const Color(0xFFEF4444) 
                                      : (isEnded ? Colors.grey.shade500 : const Color(0xFF10B981)),
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // CTA Button
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isLive 
                                ? const Color(0xFFEF4444) 
                                : (isEnded ? Colors.grey.shade300 : AppColors.primary),
                            foregroundColor: isEnded ? Colors.grey.shade600 : Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: isEnded ? null : () => _joinLiveRoom(c.id),
                          icon: Icon(
                            isLive ? Icons.play_circle_fill_rounded : Icons.login_rounded,
                            size: 18,
                          ),
                          label: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              isLive 
                                  ? "JOIN CLASSROOM (LIVE)" 
                                  : (isEnded ? "CLASS COMPLETED" : "ENTER CLASSROOM"),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13.5,
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      );
    });

    if (isEmbedded) return bodyContent;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Upcoming Lectures"),
      ),
      body: bodyContent,
    );
  }

  Widget _buildSmallChip(IconData icon, String text, Color themeColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: themeColor.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12.5, color: themeColor),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: themeColor,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
