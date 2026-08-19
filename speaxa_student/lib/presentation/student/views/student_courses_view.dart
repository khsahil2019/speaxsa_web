import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/routes/app_routes.dart';
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
    'Maths': '📐',
    'Math': '📐',
    'Chemistry': '🧪',
    'Biology': '🧬',
    'Science': '🔬',
    'English': '📚',
    'Hindi': '✍️',
    'Social Science': '🌍',
    'Computer Science': '💻',
  };

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final coursesList = controller.courses.where((c) {
        final matchesSearch = c.title.toLowerCase().contains(controller.courseSearchQuery.value.toLowerCase()) ||
            (c.description ?? '').toLowerCase().contains(controller.courseSearchQuery.value.toLowerCase()) ||
            (c.subject ?? '').toLowerCase().contains(controller.courseSearchQuery.value.toLowerCase());

        final selGrade = controller.courseSelectedGrade.value;
        final matchesGrade = selGrade == 'All Grades' || selGrade == 'All' || (c.grade ?? '').toLowerCase() == selGrade.toLowerCase();

        final selBoard = controller.courseSelectedBoard.value;
        final matchesBoard = selBoard == 'All Boards' || selBoard == 'All' || (c.board ?? '').toLowerCase() == selBoard.toLowerCase();

        return matchesSearch && matchesGrade && matchesBoard;
      }).toList();

      final isDark = Theme.of(context).brightness == Brightness.dark;
      final searchBgColor = isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade100;
      final searchTextColor = isDark ? Colors.white : Colors.black87;

      return Column(
        children: [
          // Search & Filter Panel
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            color: Theme.of(context).scaffoldBackgroundColor,
            child: Column(
              children: [
                // 1. Search Bar
                Container(
                  decoration: BoxDecoration(
                    color: searchBgColor,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: TextField(
                    onChanged: (val) => controller.courseSearchQuery.value = val,
                    style: TextStyle(color: searchTextColor, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: "Search courses or subjects...",
                      hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13.5),
                      prefixIcon: Icon(Icons.search_rounded, color: Colors.grey.shade500, size: 20),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // 2. Grade & Board Filter Dropdowns
                Obx(() {
                  const grades = ['All Grades', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
                  const boards = ['All Boards', 'CBSE', 'ICSE', 'State Board'];

                  return Row(
                    children: [
                      // Grade Dropdown
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.04) : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: grades.contains(controller.courseSelectedGrade.value) ? controller.courseSelectedGrade.value : 'All Grades',
                              isExpanded: true,
                              icon: Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: isDark ? Colors.white70 : Colors.black54),
                              dropdownColor: isDark ? AppColors.darkCard : Colors.white,
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
                              onChanged: (val) {
                                if (val != null) controller.courseSelectedGrade.value = val;
                              },
                              items: grades.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Board Dropdown
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.04) : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: boards.contains(controller.courseSelectedBoard.value) ? controller.courseSelectedBoard.value : 'All Boards',
                              isExpanded: true,
                              icon: Icon(Icons.keyboard_arrow_down_rounded, size: 20, color: isDark ? Colors.white70 : Colors.black54),
                              dropdownColor: isDark ? AppColors.darkCard : Colors.white,
                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
                              onChanged: (val) {
                                if (val != null) controller.courseSelectedBoard.value = val;
                              },
                              items: boards.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                }),
              ],
            ),
          ),
  const Divider(height: 1),

  // Course List
  Expanded(
    child: RefreshIndicator(
      onRefresh: controller.loadDashboardData,
      color: AppColors.primary,
      child: coursesList.isEmpty
          ? Center(
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off_rounded, size: 64, color: Colors.grey.shade400),
                      const SizedBox(height: 16),
                      const Text(
                        "No Matching Courses",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        "Try searching for a different keyword or changing the subject filter.",
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            )
          : ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: coursesList.length,
              itemBuilder: (context, index) {
                final course = coursesList[index];
                final courseBatches = controller.availableBatches
                    .where((b) => b.courseId == course.id)
                    .toList();

                // Extract unique teachers for this course from batches
                final List<Map<String, dynamic>> teachersList = [];
                final Set<String> seenTeacherKeys = {};

                for (final batch in courseBatches) {
                  final name = (batch.teacherName != null && batch.teacherName!.trim().isNotEmpty)
                      ? batch.teacherName!.trim()
                      : 'SOP Verified Educator';
                  final photo = batch.teacherPhoto;
                  final level = batch.teacherLevel ?? 'Master Mentor';
                  final rating = batch.teacherRating ?? 4.9;
                  final teacherId = batch.teacherId ?? name;

                  final key = '$teacherId-$name';
                  if (!seenTeacherKeys.contains(key)) {
                    seenTeacherKeys.add(key);
                    teachersList.add({
                      'id': teacherId,
                      'name': name,
                      'photo': photo,
                      'level': level,
                      'rating': rating,
                      'batchName': batch.batchName,
                      'subject': batch.subject ?? course.subject ?? 'General',
                    });
                  }
                }

                if (teachersList.isEmpty) {
                  teachersList.add({
                    'id': 'default',
                    'name': 'Speaxa Verified Mentor',
                    'photo': null,
                    'level': 'Lead Educator',
                    'rating': 5.0,
                    'batchName': 'Upcoming Speech Batch',
                    'subject': course.subject ?? 'General',
                  });
                }

                final rawThumbnail = course.thumbnailUrl;
                final fullThumbnailUrl = rawThumbnail != null && rawThumbnail.isNotEmpty
                    ? (rawThumbnail.startsWith('http')
                        ? rawThumbnail
                        : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$rawThumbnail')
                    : null;

                final subjectEmoji = _subjectEmojis[course.subject] ?? '📖';

                final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
                final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
                final cardBorderColor = isDark ? Colors.white10 : Colors.grey.shade200;

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 16),
                  clipBehavior: Clip.antiAlias,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: cardBorderColor),
                  ),
                  child: InkWell(
                    onTap: () => showCourseDetailsBottomSheet(context, course, courseBatches, controller),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Compact Image Banner
                        Container(
                          height: 120,
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
                              const SizedBox(height: 14),

                              // Compact Educator Row (1-Line, Zero Overflow)
                              Row(
                                children: [
                                  const Icon(Icons.school_outlined, size: 14, color: AppColors.primary),
                                  const SizedBox(width: 6),
                                  Text(
                                    "Educators: ",
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: secTextColor,
                                    ),
                                  ),
                                  Expanded(
                                    child: SingleChildScrollView(
                                      scrollDirection: Axis.horizontal,
                                      physics: const BouncingScrollPhysics(),
                                      child: Row(
                                        children: teachersList.map((teacher) {
                                          return InkWell(
                                            onTap: () => _showTeacherDetailsBottomSheet(context, teacher, courseBatches, course),
                                            borderRadius: BorderRadius.circular(20),
                                            child: Container(
                                              margin: const EdgeInsets.only(right: 8),
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: isDark ? Colors.white.withOpacity(0.06) : Colors.grey.shade100,
                                                borderRadius: BorderRadius.circular(20),
                                                border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  _buildTeacherAvatarImage(teacher['photo'], teacher['name'], size: 22),
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    teacher['name'],
                                                    style: TextStyle(
                                                      fontSize: 11.5,
                                                      fontWeight: FontWeight.w600,
                                                      color: textColor,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    "⭐${teacher['rating']}",
                                                    style: const TextStyle(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                      color: Color(0xFFD97706),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  const Icon(Icons.info_outline_rounded, size: 12, color: AppColors.primary),
                                                ],
                                              ),
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),

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
          ),
        ),
      ],
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

  static void showCourseDetailsBottomSheet(
    BuildContext context,
    CourseModel course,
    List<BatchModel> courseBatches,
    StudentDashboardController controller,
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
                                  _buildBatchDetailRowStatic(
                                    Icons.person_outline_rounded,
                                    "Teacher: ${batch.teacherName ?? 'Assigned Teacher'}",
                                  ),
                                  const SizedBox(height: 6),
                                  _buildBatchDetailRowStatic(
                                    Icons.calendar_today_outlined,
                                    "Days: ${batch.daysOfWeek.join(', ')}",
                                  ),
                                  const SizedBox(height: 6),
                                  _buildBatchDetailRowStatic(
                                    Icons.access_time_rounded,
                                    "Timings: ${batch.startTime ?? ''} - ${batch.endTime ?? ''}",
                                  ),
                                  if (batch.plannerUrl != null && batch.plannerUrl!.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    _buildPlannerButtonStatic(batch),
                                  ],
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
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        disabledBackgroundColor: isAlreadyEnrolled
                                            ? (isDark ? Colors.white12 : Colors.grey.shade200)
                                            : (isDark ? Colors.white24 : Colors.grey.shade300),
                                        disabledForegroundColor: isAlreadyEnrolled
                                            ? (isDark ? Colors.blue.shade300 : const Color(0xFF1D4ED8))
                                            : (isDark ? Colors.white30 : Colors.grey.shade500),
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                      ),
                                      onPressed: (isFull || isAlreadyEnrolled)
                                          ? null
                                          : () {
                                              Navigator.pop(context); // Close course details sheet
                                              
                                              final user = AuthService.to.currentUser.value;
                                              if (user == null) {
                                                Get.dialog(
                                                  AlertDialog(
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                                    title: const Text("Authentication Required", style: TextStyle(fontWeight: FontWeight.bold)),
                                                    content: const Text("Please sign in or create an account to enroll in a batch and proceed to payment."),
                                                    actions: [
                                                      TextButton(
                                                        onPressed: () => Get.back(),
                                                        child: const Text("Cancel", style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                                                      ),
                                                      ElevatedButton(
                                                        style: ElevatedButton.styleFrom(
                                                          backgroundColor: AppColors.primary,
                                                          foregroundColor: Colors.white,
                                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                                        ),
                                                        onPressed: () {
                                                          AuthService.to.pendingBatchId = batch.id;
                                                          Get.back();
                                                          Get.toNamed(Routes.LOGIN);
                                                        },
                                                        child: const Text("Sign In / Register", style: TextStyle(fontWeight: FontWeight.bold)),
                                                      ),
                                                    ],
                                                  ),
                                                );
                                                return;
                                              }

                                              // Show Razorpay Checkout Sheet
                                              showModalBottomSheet(
                                                context: context,
                                                isScrollControlled: true,
                                                backgroundColor: Colors.transparent,
                                                builder: (context) {
                                                  return RazorpayCheckoutSheet(
                                                    amount: course.fees,
                                                    courseTitle: course.title,
                                                    batchName: batch.batchName,
                                                    email: user.email,
                                                    phone: user.phone,
                                                    onSuccess: (paymentId) {
                                                      controller.enrollInBatch(batch.id, paymentId: paymentId);
                                                    },
                                                  );
                                                },
                                              );
                                            },
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          isAlreadyEnrolled
                                              ? "Already Enrolled"
                                              : (isFull ? "No Seats Available" : "Pay & Enroll Now"),
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                          ),
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

  static Widget _buildBatchDetailRowStatic(IconData icon, String text) {
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

  static Widget _buildPlannerButtonStatic(BatchModel batch) {
    return InkWell(
      onTap: () => _launchUrlStatic(batch.plannerUrl!),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.amber.withOpacity(0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.amber.withOpacity(0.3)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.picture_as_pdf_outlined, size: 14, color: Colors.amber),
            SizedBox(width: 6),
            Text(
              "Syllabus Planner",
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.bold,
                color: Colors.amber,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Future<void> _launchUrlStatic(String url) async {
    try {
      final uri = Uri.parse(url.startsWith('http') ? url : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$url');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      Get.snackbar('Error', 'Could not open link: $e');
    }
  }

  static void _showTeacherDetailsBottomSheet(
    BuildContext context,
    Map<String, dynamic> teacher,
    List<BatchModel> courseBatches,
    CourseModel course,
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

        final teacherBatches = courseBatches
            .where((b) => b.teacherName == teacher['name'] || b.teacherId == teacher['id'])
            .toList();

        return Container(
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          padding: const EdgeInsets.all(20),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Drag Indicator Bar
                Center(
                  child: Container(
                    width: 48,
                    height: 4.5,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Teacher Header Avatar Card
                Center(
                  child: Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      Container(
                        width: 84,
                        height: 84,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: AppColors.tealIndigoGradient,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.25),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.all(3),
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: bgColor,
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: _buildTeacherAvatarImage(teacher['photo'], teacher['name'], size: 78),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.verified_rounded,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                Text(
                  teacher['name'] ?? 'SOP Verified Educator',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: textColor,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        teacher['level'] ?? 'Lead Faculty',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 14, color: Color(0xFFD97706)),
                          const SizedBox(width: 4),
                          Text(
                            "${teacher['rating']} Rating",
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFB45309),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Verification Badges Row (Wrapped in Expanded to prevent RenderFlex overflow)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.03) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: _buildMetaDetailItem(Icons.verified_user_rounded, "SOP Audit", "Verified Specialist", isDark)),
                      Container(height: 28, width: 1, color: isDark ? Colors.white10 : Colors.grey.shade300),
                      Expanded(child: _buildMetaDetailItem(Icons.school_rounded, "Subject", teacher['subject'] ?? "Speech Therapy", isDark)),
                      Container(height: 28, width: 1, color: isDark ? Colors.white10 : Colors.grey.shade300),
                      Expanded(child: _buildMetaDetailItem(Icons.stars_rounded, "Experience", "5+ Years", isDark)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Active Batches Section
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    "Batches Taught by ${teacher['name']}:",
                    style: TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.bold,
                      color: textColor,
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                if (teacherBatches.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withOpacity(0.03) : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      "This educator is assigned to active batches for ${course.title}. Click below to explore schedule & enroll.",
                      style: TextStyle(fontSize: 13, color: secTextColor),
                    ),
                  )
                else
                  ...teacherBatches.map((b) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withOpacity(0.04) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.groups_rounded, size: 20, color: AppColors.primary),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                b.batchName,
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textColor),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "${b.daysOfWeek.join(', ')} • ${b.startTime ?? 'TBD'} - ${b.endTime ?? ''}",
                                style: TextStyle(fontSize: 12, color: secTextColor),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            "${b.availableSeats} seats left",
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                          ),
                        ),
                      ],
                    ),
                  )),

                const SizedBox(height: 20),

                // Action button to enroll
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 20),
                    label: Text(
                      "Enroll in ${course.title} (₹${course.fees.toStringAsFixed(0)})",
                      style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      showCourseDetailsBottomSheet(context, course, courseBatches, Get.find<StudentDashboardController>());
                    },
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        );
      },
    );
  }

  static Widget _buildTeacherAvatarImage(String? photoUrl, String teacherName, {double size = 36}) {
    final fullUrl = photoUrl != null && photoUrl.isNotEmpty
        ? (photoUrl.startsWith('http')
            ? photoUrl
            : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$photoUrl')
        : null;

    if (fullUrl != null) {
      return Image.network(
        fullUrl,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildAvatarPlaceholderWidget(teacherName, size: size),
      );
    }
    return _buildAvatarPlaceholderWidget(teacherName, size: size);
  }

  static Widget _buildAvatarPlaceholderWidget(String name, {double size = 36}) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'T';
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        gradient: AppColors.tealIndigoGradient,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          fontSize: size * 0.42,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }

  static Widget _buildMetaDetailItem(IconData icon, String title, String subtitle, bool isDark) {
    return Column(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(fontSize: 10, color: isDark ? Colors.white54 : Colors.grey.shade600, fontWeight: FontWeight.w500),
        ),
        Text(
          subtitle,
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
        ),
      ],
    );
  }
}
