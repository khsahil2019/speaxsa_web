import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/services/auth_service.dart';
import '../../../data/models/course_model.dart';
import '../../../data/models/batch_model.dart';
import '../controllers/student_dashboard_controller.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/razorpay_checkout_sheet.dart';

class StudentCoursesView extends GetView<StudentDashboardController> {
  const StudentCoursesView({super.key});

  static const Map<String, String> _subjectEmojis = {
    'Physics': '⚛️',
    'Mathematics': '📐',
    'Chemistry': '🧪',
    'Biology': '🧬',
    'English': '📚',
  };

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final coursesList = controller.courses;
      if (coursesList.isEmpty) {
        return const EmptyStateWidget(
          title: "No Courses Available",
          message: "Check back soon for new courses and syllabus updates.",
        );
      }

      return RefreshIndicator(
        onRefresh: controller.loadDashboardData,
        color: AppColors.primary,
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          itemCount: coursesList.length,
          itemBuilder: (context, index) {
            final course = coursesList[index];
            final courseBatches = controller.availableBatches
                .where((b) => b.courseId == course.id)
                .toList();

            // Construct full thumbnail URL if relative
            final rawThumbnail = course.thumbnailUrl;
            final fullThumbnailUrl = rawThumbnail != null && rawThumbnail.isNotEmpty
                ? (rawThumbnail.startsWith('http')
                    ? rawThumbnail
                    : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$rawThumbnail')
                : null;

            final subjectEmoji = _subjectEmojis[course.subject] ?? '📖';

            final isDark = Theme.of(context).brightness == Brightness.dark;
            final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
            final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
            final cardBorderColor = isDark ? Colors.white10 : Colors.grey.shade200;

            return Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 20),
              clipBehavior: Clip.antiAlias,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: cardBorderColor),
              ),
              child: InkWell(
                onTap: () => _showCourseDetailsBottomSheet(context, course, courseBatches),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Course Image (Banner style, identical to website)
                    Container(
                      height: 150,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.06),
                      ),
                      child: fullThumbnailUrl != null
                          ? Image.network(
                              fullThumbnailUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  _buildPlaceholderBanner(course.subject ?? 'Course', subjectEmoji),
                            )
                          : _buildPlaceholderBanner(course.subject ?? 'Course', subjectEmoji),
                    ),

                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Badges Row
                          Row(
                            children: [
                              _buildBadge(
                                course.subject ?? 'General',
                                AppColors.primary.withOpacity(0.12),
                                AppColors.primary,
                              ),
                              const SizedBox(width: 8),
                              _buildBadge(
                                course.grade ?? 'Class 10',
                                const Color(0xFF10B981).withOpacity(0.12),
                                const Color(0xFF10B981),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Title
                          Text(
                            course.title,
                            style: TextStyle(
                              fontSize: 16.5,
                              fontWeight: FontWeight.w800,
                              color: textColor,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Description snippet
                          if (course.description != null && course.description!.isNotEmpty)
                            Text(
                              course.description!,
                              style: TextStyle(
                                fontSize: 13,
                                color: secTextColor,
                                height: 1.4,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          const SizedBox(height: 16),

                          const Divider(height: 1),
                          const SizedBox(height: 14),

                          // Bottom Price & Total Batches Info Row
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "₹${course.fees.toStringAsFixed(0)}",
                                style: const TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.primary,
                                ),
                              ),
                              Text(
                                "${course.batchCount} batches",
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: Colors.grey.shade500,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
    });
  }

  Widget _buildPlaceholderBanner(String subject, String emoji) {
    return Container(
      decoration: const BoxDecoration(
        gradient: AppColors.tealIndigoGradient,
      ),
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            emoji,
            style: const TextStyle(fontSize: 48),
          ),
          const SizedBox(height: 8),
          Text(
            subject,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  void _showCourseDetailsBottomSheet(
    BuildContext context,
    CourseModel course,
    List<BatchModel> courseBatches,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final bgColor = isDark ? AppColors.darkCard : Colors.white;
        final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
        final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
        final borderColor = isDark ? Colors.white10 : Colors.grey.shade100;

        return Container(
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Slide Handle bar
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 48,
                  height: 4.5,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),

              // Header Details
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.title,
                            style: const TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Text(
                                course.subject ?? 'General',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                "₹${course.fees.toStringAsFixed(0)}",
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF10B981),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),

              // Scrollable content area
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Course Overview
                      Text(
                        "Course Description",
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        course.description ?? "No description available for this course.",
                        style: TextStyle(
                          fontSize: 13.5,
                          color: secTextColor,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Available Batches Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Select Available Batch",
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: textColor,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              "${courseBatches.length} Batches",
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

                      if (courseBatches.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 32),
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.class_outlined, size: 44, color: Colors.grey.shade400),
                              const SizedBox(height: 8),
                              Text(
                                "No batches active currently",
                                style: TextStyle(
                                  color: Colors.grey.shade500,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: courseBatches.length,
                          itemBuilder: (context, index) {
                            final batch = courseBatches[index];
                            final progress = batch.seatsFilled / batch.capacity;
                            final isFull = batch.seatsFilled >= batch.capacity;
                            
                            // Check if student is already enrolled in this specific batch
                            final isAlreadyEnrolled = controller.myBatches.any((mb) => mb.id == batch.id);

                            return Container(
                              margin: const EdgeInsets.only(bottom: 14),
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkCardAlt : Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: borderColor),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Batch Name & Status
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          batch.batchName,
                                          style: TextStyle(
                                            fontSize: 14.5,
                                            fontWeight: FontWeight.bold,
                                            color: textColor,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isAlreadyEnrolled
                                              ? Colors.blue.withOpacity(0.08)
                                              : (isFull
                                                  ? Colors.red.withOpacity(0.08)
                                                  : AppColors.success.withOpacity(0.08)),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          isAlreadyEnrolled
                                              ? "Enrolled"
                                              : (isFull ? "Full" : "Active"),
                                          style: TextStyle(
                                            color: isAlreadyEnrolled
                                                ? Colors.blue
                                                : (isFull ? Colors.red : AppColors.success),
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),

                                  // Teacher and Timings details
                                  _buildBatchDetailRow(
                                    Icons.person_outline_rounded,
                                    "Teacher: ${batch.teacherName ?? 'Assigned Teacher'}",
                                  ),
                                  const SizedBox(height: 6),
                                  _buildBatchDetailRow(
                                    Icons.calendar_today_outlined,
                                    "Days: ${batch.daysOfWeek.join(', ')}",
                                  ),
                                  const SizedBox(height: 6),
                                  _buildBatchDetailRow(
                                    Icons.access_time_rounded,
                                    "Timings: ${batch.startTime ?? ''} - ${batch.endTime ?? ''}",
                                  ),
                                  const SizedBox(height: 12),

                                  // Capacity Progress bar
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        "Seats Filled: ${batch.seatsFilled} / ${batch.capacity}",
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: secTextColor,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        "${(progress * 100).toStringAsFixed(0)}%",
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: secTextColor,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: LinearProgressIndicator(
                                      value: progress,
                                      minHeight: 6,
                                      backgroundColor: isDark ? Colors.white12 : Colors.grey.shade200,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        isFull ? Colors.red : AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 14),

                                  // Enroll CTA button
                                  SizedBox(
                                    width: double.infinity,
                                    height: 40,
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: isAlreadyEnrolled
                                            ? (isDark ? Colors.white12 : Colors.grey.shade200)
                                            : (isFull ? (isDark ? Colors.white24 : Colors.grey.shade300) : AppColors.primary),
                                        foregroundColor: isAlreadyEnrolled 
                                            ? (isDark ? Colors.grey.shade400 : Colors.grey.shade600) 
                                            : Colors.white,
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                      ),
                                      onPressed: (isFull || isAlreadyEnrolled)
                                          ? null
                                          : () {
                                              Navigator.pop(context); // Close course details sheet
                                              
                                              // Show Razorpay Checkout Sheet
                                              final user = AuthService.to.currentUser.value;
                                              showModalBottomSheet(
                                                context: context,
                                                isScrollControlled: true,
                                                backgroundColor: Colors.transparent,
                                                builder: (context) {
                                                  return RazorpayCheckoutSheet(
                                                    amount: course.fees,
                                                    courseTitle: course.title,
                                                    batchName: batch.batchName,
                                                    email: user?.email ?? '',
                                                    phone: user?.phone ?? '',
                                                    onSuccess: (paymentId) {
                                                      controller.enrollInBatch(batch.id, paymentId: paymentId);
                                                    },
                                                  );
                                                },
                                              );
                                            },
                                      child: Text(
                                        isAlreadyEnrolled
                                            ? "Already Enrolled"
                                            : (isFull ? "No Seats Available" : "Pay & Enroll Now"),
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: isAlreadyEnrolled ? Colors.grey.shade500 : Colors.white,
                                        ),
                                      ),
                                    ),
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
      },
    );
  }

  Widget _buildBatchDetailRow(IconData icon, String text) {
    final isDark = Theme.of(Get.context!).brightness == Brightness.dark;
    return Row(
      children: [
        Icon(icon, size: 14, color: isDark ? Colors.grey.shade400 : Colors.grey.shade500),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12.5,
              color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}
