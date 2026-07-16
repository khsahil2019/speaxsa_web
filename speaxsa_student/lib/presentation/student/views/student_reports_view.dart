import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';

class StudentReportsView extends GetView<StudentDashboardController> {
  const StudentReportsView({super.key});

  String _formatMonth(String monthStr) {
    try {
      final parts = monthStr.split('-');
      if (parts.length == 2) {
        final year = int.parse(parts[0]);
        final month = int.parse(parts[1]);
        final date = DateTime(year, month, 1);
        return DateFormat('MMMM yyyy').format(date);
      }
    } catch (_) {}
    return monthStr;
  }

  Color _getMetricColor(double value) {
    if (value >= 85) return const Color(0xFF10B981); // Emerald Green
    if (value >= 65) return const Color(0xFF3B82F6); // Blue
    if (value >= 45) return const Color(0xFFF59E0B); // Amber Orange
    return const Color(0xFFEF4444); // Red
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final secTextColor = isDark ? AppColors.darkTextSecondary : const Color(0xFF64748B);
    final cardBg = isDark ? AppColors.darkCard : Colors.white;
    final cardBorder = isDark ? Colors.white10 : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: const Text(
          "Academic Report Cards",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        elevation: 0,
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        foregroundColor: textColor,
      ),
      body: Obx(() {
        final list = controller.reports;
        if (list.isEmpty) {
          return const EmptyStateWidget(
            title: "No Monthly Reports",
            message: "Monthly performance reports compiled by your teachers will appear here.",
            icon: Icons.analytics_outlined,
          );
        }

        return ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: list.length,
          itemBuilder: (context, i) {
            final r = list[i];
            final trend = r.improvementTrend.toLowerCase();
            
            Color trendColor = const Color(0xFFF59E0B);
            IconData trendIcon = Icons.trending_flat_rounded;
            String trendText = "Stable";
            if (trend == 'improving') {
              trendColor = const Color(0xFF10B981);
              trendIcon = Icons.trending_up_rounded;
              trendText = "Improving";
            } else if (trend == 'declining') {
              trendColor = const Color(0xFFEF4444);
              trendIcon = Icons.trending_down_rounded;
              trendText = "Declining";
            }

            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 24),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: BorderSide(color: cardBorder),
              ),
              color: cardBg,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top header: Month and Grade Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _formatMonth(r.reportMonth),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: textColor,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.layers_outlined, size: 13, color: secTextColor),
                                  const SizedBox(width: 4),
                                  Text(
                                    r.batchName ?? 'General',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: secTextColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Icon(Icons.person_outline_rounded, size: 13, color: secTextColor),
                                  const SizedBox(width: 4),
                                  Text(
                                    r.teacherName ?? 'Mentor',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: secTextColor,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF3CBDB0), Color(0xFF14B8A6)],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF3CBDB0).withOpacity(0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              )
                            ],
                          ),
                          child: Text(
                            r.overallGrade ?? '—',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 16.5,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Divider(height: 1),
                    const SizedBox(height: 20),

                    // Metrics Grid (2x2)
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16,
                      childAspectRatio: 2.1,
                      children: [
                        _buildMetricCard(
                          context,
                          "Attendance",
                          r.attendancePct,
                          Icons.calendar_today_rounded,
                        ),
                        _buildMetricCard(
                          context,
                          "Assignments",
                          r.assignmentCompletion,
                          Icons.assignment_turned_in_rounded,
                        ),
                        _buildMetricCard(
                          context,
                          "Curiosity",
                          r.curiosityScore,
                          Icons.emoji_objects_outlined,
                        ),
                        _buildMetricCard(
                          context,
                          "Communication",
                          r.communicationGrowth,
                          Icons.chat_bubble_outline_rounded,
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Divider(height: 1),
                    const SizedBox(height: 16),

                    // Trend Indicator Row
                    Row(
                      children: [
                        Text(
                          "Performance Trend:",
                          style: TextStyle(
                            fontSize: 13,
                            color: secTextColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: trendColor.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: trendColor.withOpacity(0.2)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(trendIcon, size: 14, color: trendColor),
                              const SizedBox(width: 4),
                              Text(
                                trendText,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.bold,
                                  color: trendColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    // Strong & Weak Topics (Chips)
                    if (r.strongTopics.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text(
                        "Strong Areas",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: r.strongTopics.map((topic) {
                          return Chip(
                            backgroundColor: const Color(0xFF10B981).withOpacity(0.08),
                            labelPadding: const EdgeInsets.symmetric(horizontal: 4),
                            side: const BorderSide(color: Color(0xFF10B981), width: 0.5),
                            label: Text(
                              topic,
                              style: const TextStyle(
                                color: Color(0xFF10B981),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],

                    if (r.weakTopics.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(
                        "Needs Practice",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: r.weakTopics.map((topic) {
                          return Chip(
                            backgroundColor: const Color(0xFFEF4444).withOpacity(0.08),
                            labelPadding: const EdgeInsets.symmetric(horizontal: 4),
                            side: const BorderSide(color: Color(0xFFEF4444), width: 0.5),
                            label: Text(
                              topic,
                              style: const TextStyle(
                                color: Color(0xFFEF4444),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],

                    // Detailed remarks block
                    if (r.teacherRemarks != null && r.teacherRemarks!.isNotEmpty) ...[
                      const SizedBox(height: 20),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkCardAlt : Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade100),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.format_quote_rounded, color: AppColors.primary, size: 18),
                                const SizedBox(width: 6),
                                Text(
                                  "Teacher's Remarks",
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? Colors.grey.shade300 : const Color(0xFF334155),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              r.teacherRemarks!,
                              style: TextStyle(
                                fontSize: 12.5,
                                color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade700,
                                height: 1.4,
                                fontStyle: FontStyle.italic,
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

  Widget _buildMetricCard(
    BuildContext context,
    String label,
    double value,
    IconData icon,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final metricColor = _getMetricColor(value);
    final metricBgColor = metricColor.withOpacity(0.08);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCardAlt : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: metricBgColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 14, color: metricColor),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade600,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "${value.toStringAsFixed(0)}%",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: value / 100,
              minHeight: 4,
              backgroundColor: isDark ? Colors.white10 : Colors.grey.shade200,
              valueColor: AlwaysStoppedAnimation<Color>(metricColor),
            ),
          ),
        ],
      ),
    );
  }
}
