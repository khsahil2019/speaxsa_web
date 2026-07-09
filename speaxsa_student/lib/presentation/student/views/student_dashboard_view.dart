import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/storage_service.dart';
import '../../../data/models/batch_model.dart';
import '../../../data/models/live_class_model.dart';
import '../../../data/repositories/student_repository.dart';
import '../controllers/student_dashboard_controller.dart';
import 'student_courses_view.dart';
import 'student_attendance_view.dart';
import 'student_assignments_view.dart';
import 'student_reports_view.dart';
import 'parent_requests_view.dart';
import 'student_upcoming_classes_view.dart';
import 'student_recordings_view.dart';
import '../../shared/views/notifications_view.dart';
import '../../shared/views/profile_view.dart';
import '../../shared/widgets/skeleton_loader.dart';
import '../../shared/widgets/error_state_widget.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentDashboardView extends GetView<StudentDashboardController> {
  const StudentDashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final idx = controller.selectedIndex.value;
      return Scaffold(
        appBar: _buildAppBar(context, idx),
        drawer: _buildDrawer(context),
        body: IndexedStack(
          index: idx,
          children: [
            _buildMainDashboard(context),
            const StudentCoursesView(),
            const StudentUpcomingClassesView(isEmbedded: true),
            const StudentAssignmentsView(),
            const ProfileView(isEmbedded: true),
          ],
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: idx,
          onTap: (val) => controller.selectedIndex.value = val,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: Colors.grey,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home_rounded), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.menu_book_outlined), activeIcon: Icon(Icons.menu_book_rounded), label: 'Courses'),
            BottomNavigationBarItem(icon: Icon(Icons.video_call_outlined), activeIcon: Icon(Icons.video_call_rounded), label: 'Lectures'),
            BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment_rounded), label: 'Tasks'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person_rounded), label: 'Profile'),
          ],
        ),
      );
    });
  }

  AppBar _buildAppBar(BuildContext context, int index) {
    if (index == 0) {
      return AppBar(
        title: Image.asset(
          "assets/images/logo.png",
          height: 28,
          fit: BoxFit.contain,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Get.to(() => const NotificationsView()),
          ),
        ],
      );
    }

    final titles = ['', 'Browse Courses', 'Upcoming Lectures', 'Tasks & Assignments', 'My Profile'];
    return AppBar(
      title: Text(titles[index]),
      actions: [
        if (index != 4) // Don't show profile shortcut on profile tab itself
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => controller.selectedIndex.value = 4,
          ),
      ],
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final user = AuthService.to.currentUser.value;
    final baseUrl = ApiEndpoints.baseUrl.replaceAll('/api', '');
    final hasPhoto = user?.photoUrl != null && user!.photoUrl!.isNotEmpty && user.photoUrl != 'null';

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      backgroundColor: Colors.transparent,
      child: Container(
        margin: const EdgeInsets.only(top: 44, bottom: 16, left: 8, right: 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkCard : Colors.white,
          borderRadius: BorderRadius.circular(28),
        ),
        child: Column(
          children: [
            // ── Profile Header ─────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(28),
                  topRight: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  // Avatar
                  CircleAvatar(
                    radius: 38,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    backgroundImage: hasPhoto ? NetworkImage('$baseUrl${user!.photoUrl}') : null,
                    child: !hasPhoto
                        ? Text(
                            user?.name.substring(0, 1).toUpperCase() ?? 'S',
                            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: Colors.white),
                          )
                        : null,
                  ),
                  const SizedBox(height: 12),
                  // Greeting
                  Text(
                    "Hello, ${user?.name.split(' ').first ?? 'Student'}! 👋",
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? '',
                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12),
                  ),
                  const SizedBox(height: 10),
                  // Student code pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.badge_outlined, color: Colors.white, size: 14),
                        const SizedBox(width: 6),
                        Text(
                          user?.studentCode ?? 'Pending',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Streak Badge ───────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_fire_department, color: Colors.deepOrange, size: 22),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("${user?.learningStreak ?? 0} Day Streak", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.deepOrange)),
                        Text("Keep the momentum going!", style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // ── Menu Items ─────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _buildDrawerItem(
                    context,
                    icon: Icons.dashboard_rounded,
                    label: 'Dashboard',
                    isSelected: controller.selectedIndex.value == 0,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 0; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.menu_book_rounded,
                    label: 'Browse Courses',
                    isSelected: controller.selectedIndex.value == 1,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 1; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.calendar_today_rounded,
                    label: 'Attendance',
                    isSelected: controller.selectedIndex.value == 2,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 2; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.assignment_rounded,
                    label: 'Assignments',
                    isSelected: controller.selectedIndex.value == 3,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 3; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.analytics_rounded,
                    label: 'Reports',
                    isSelected: controller.selectedIndex.value == 4,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 4; },
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    child: Divider(height: 1),
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.video_call_rounded,
                    label: 'Upcoming Lectures',
                    onTap: () { Navigator.pop(context); Get.to(() => const StudentUpcomingClassesView()); },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.play_circle_fill_rounded,
                    label: 'Recordings',
                    onTap: () { Navigator.pop(context); Get.to(() => const StudentRecordingsView()); },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.family_restroom_rounded,
                    label: 'Parent Requests',
                    badge: controller.parentRequests.isNotEmpty ? '${controller.parentRequests.length}' : null,
                    onTap: () { Navigator.pop(context); Get.to(() => const ParentRequestsView()); },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.person_rounded,
                    label: 'My Profile',
                    onTap: () { Navigator.pop(context); Get.to(() => const ProfileView()); },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.notifications_rounded,
                    label: 'Notifications',
                    onTap: () { Navigator.pop(context); Get.to(() => const NotificationsView()); },
                  ),
                ],
              ),
            ),
            
            // Speaxa Logo
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Opacity(
                opacity: 0.85,
                child: Image.asset(
                  'assets/images/logo.png',
                  height: 26,
                  fit: BoxFit.contain,
                  errorBuilder: (context, err, stack) => const SizedBox(),
                ),
              ),
            ),

            // ── Logout ─────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error, width: 1),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text("Logout", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  onPressed: () => AuthService.to.logout(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, {
    required IconData icon,
    required String label,
    bool isSelected = false,
    String? badge,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: isSelected ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: isSelected 
                      ? AppColors.primary 
                      : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected 
                          ? AppColors.primary 
                          : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                    ),
                  ),
                ),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(color: AppColors.warning, borderRadius: BorderRadius.circular(10)),
                    child: Text(badge, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                if (isSelected)
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMainDashboard(BuildContext context) {
    return Obx(() {
      if (controller.isLoading.value) return const SkeletonLoader(itemCount: 4);
      if (controller.errorMessage.isNotEmpty) {
        return ErrorStateWidget(errorMessage: controller.errorMessage.value, onRetry: controller.loadDashboardData);
      }

      final user = AuthService.to.currentUser.value;
      final attData = controller.attendanceData.value;
      final batches = controller.myBatches;

      return RefreshIndicator(
        onRefresh: controller.loadDashboardData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Welcome Card
              Stack(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: AppColors.heroGradient,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.indigoAccent.withOpacity(0.35),
                          blurRadius: 18,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                "Welcome back, ${user?.name.split(' ').first ?? 'Student'}! 👋",
                                style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.local_fire_department, color: Colors.orangeAccent, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    "${user?.learningStreak ?? 0} Days",
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Grade: ${user?.grade ?? 'Class 10'}  •  Board: ${user?.board ?? 'CBSE'}",
                          style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    right: -10,
                    bottom: -15,
                    child: Opacity(
                      opacity: 0.12,
                      child: Image.asset(
                        'assets/images/logo.png',
                        height: 90,
                        color: Colors.white,
                        errorBuilder: (context, err, stack) => const SizedBox(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildQuickMenu(context),
              const SizedBox(height: 24),

              // Attendance Gauge Stats Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.success.withOpacity(0.15),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          "${attData?.attendancePct ?? 0}%",
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.success),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Attendance Summary", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            Text("Classes Attended: ${attData?.present ?? 0} / ${attData?.total ?? 0}", style: const TextStyle(color: Colors.grey, fontSize: 13)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.chevron_right),
                        onPressed: () => controller.selectedIndex.value = 2,
                      )
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Enrolled Batches Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("My Enrolled Batches", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () => controller.selectedIndex.value = 1, child: const Text("View All")),
                ],
              ),
              const SizedBox(height: 8),

              if (batches.isEmpty)
                EmptyStateWidget(
                  title: "No Batches Enrolled",
                  message: "Browse active courses and enroll in batches to start learning live.",
                  buttonText: "Browse Courses",
                  onButtonPressed: () => controller.selectedIndex.value = 1,
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: batches.length,
                  itemBuilder: (context, i) {
                    final b = batches[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(color: Colors.grey.shade100),
                      ),
                      child: ListTile(
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (context) => BatchDetailsBottomSheet(
                              batch: b,
                              controller: controller,
                            ),
                          );
                        },
                        leading: CircleAvatar(
                          backgroundColor: AppColors.primary.withOpacity(0.1),
                          child: const Icon(Icons.class_, color: AppColors.primary),
                        ),
                        title: Text(b.batchName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text("Teacher: ${b.teacherName ?? 'Assigned Teacher'}\nDays: ${b.daysOfWeek.join(', ')}"),
                        trailing: StatusChip(status: b.status),
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildQuickMenu(BuildContext context) {
    final menuItems = [
      {
        'title': 'Browse\nCourses',
        'icon': Icons.search,
        'color': AppColors.indigoAccent,
        'action': () => controller.selectedIndex.value = 1,
      },
      {
        'title': 'Upcoming\nLectures',
        'icon': Icons.video_call,
        'color': AppColors.primary,
        'action': () => Get.to(() => const StudentUpcomingClassesView()),
      },
      {
        'title': 'Session\nRecordings',
        'icon': Icons.play_circle_fill,
        'color': AppColors.goldAccent,
        'action': () => Get.to(() => const StudentRecordingsView()),
      },
      {
        'title': 'My\nAttendance',
        'icon': Icons.done_all,
        'color': AppColors.primary,
        'action': () => controller.selectedIndex.value = 2,
      },
      {
        'title': 'My\nAssignments',
        'icon': Icons.assignment,
        'color': AppColors.indigoAccent,
        'action': () => controller.selectedIndex.value = 3,
      },
      {
        'title': 'Academic\nReports',
        'icon': Icons.analytics,
        'color': AppColors.goldAccent,
        'action': () => controller.selectedIndex.value = 4,
      },
      {
        'title': 'Parent\nLink',
        'icon': Icons.family_restroom,
        'color': AppColors.primary,
        'action': () => Get.to(() => const ParentRequestsView()),
      },
      {
        'title': 'In-App\nAlerts',
        'icon': Icons.notifications,
        'color': AppColors.indigoAccent,
        'action': () => Get.to(() => const NotificationsView()),
      },
    ];

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Quick Links", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.85,
          ),
          itemCount: menuItems.length,
          itemBuilder: (context, i) {
            final item = menuItems[i];
            final color = item['color'] as Color;
            return InkWell(
              onTap: item['action'] as VoidCallback,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                decoration: BoxDecoration(
                  color: color.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: color.withOpacity(0.15), width: 1),
                ),
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(item['icon'] as IconData, color: color, size: 20),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item['title'] as String,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                        height: 1.15,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class BatchDetailsBottomSheet extends StatefulWidget {
  final BatchModel batch;
  final StudentDashboardController controller;

  const BatchDetailsBottomSheet({
    super.key,
    required this.batch,
    required this.controller,
  });

  @override
  State<BatchDetailsBottomSheet> createState() => _BatchDetailsBottomSheetState();
}

class _BatchDetailsBottomSheetState extends State<BatchDetailsBottomSheet> {
  bool _isLoading = true;
  String _errorMessage = '';
  List<dynamic> _notes = [];
  List<dynamic> _modules = [];
  List<LiveClassModel> _liveClasses = [];

  bool get isDark => Theme.of(context).brightness == Brightness.dark;
  Color get textColor => isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
  Color get secTextColor => isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
  Color get borderColor => isDark ? Colors.white10 : Colors.grey.shade100;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = '';
      });

      final repo = Get.find<StudentRepository>();

      try {
        final res = await repo.getBatchNotes(widget.batch.id);
        _notes = res;
      } catch (e) {
        debugPrint('[BatchDetails] Error loading notes: $e');
      }

      try {
        final res = await repo.getCourseModules(widget.batch.courseId ?? '');
        _modules = res;
      } catch (e) {
        debugPrint('[BatchDetails] Error loading modules: $e');
      }

      try {
        final res = await repo.getLiveClassesForBatch(widget.batch.id);
        _liveClasses = res;
      } catch (e) {
        debugPrint('[BatchDetails] Error loading live classes: $e');
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to load details: $e';
      });
    }
  }

  Future<void> _launchUrl(String url) async {
    try {
      final uri = Uri.parse(url.startsWith('http') ? url : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$url');
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      Get.snackbar('Error', 'Could not open notes link: $e');
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
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      child: Column(
        children: [
          // Drag Handle
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

          // Header
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
                        widget.batch.batchName,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "Teacher: ${widget.batch.teacherName ?? 'Expert Teacher'}",
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
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

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _errorMessage.isNotEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_errorMessage, style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _fetchDetails,
                              child: const Text("Retry"),
                            ),
                          ],
                        ),
                      )
                    : DefaultTabController(
                        length: 2,
                        child: Column(
                          children: [
                            const TabBar(
                              labelColor: AppColors.primary,
                              unselectedLabelColor: Colors.grey,
                              indicatorColor: AppColors.primary,
                              labelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              tabs: [
                                Tab(icon: Icon(Icons.video_library_outlined, size: 20), text: "Live Schedule"),
                                Tab(icon: Icon(Icons.menu_book_outlined, size: 20), text: "Syllabus & Notes"),
                              ],
                            ),
                            Expanded(
                              child: TabBarView(
                                children: [
                                  _buildLiveScheduleTab(),
                                  _buildSyllabusNotesTab(),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveScheduleTab() {
    if (_liveClasses.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.video_call_outlined, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 10),
            Text(
              "No live classes scheduled",
              style: TextStyle(color: secTextColor, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _liveClasses.length,
      itemBuilder: (context, i) {
        final c = _liveClasses[i];
        final isLive = c.status == 'live';
        final isEnded = c.status == 'ended';

        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: isLive ? Colors.red : borderColor,
              width: isLive ? 1.5 : 1,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        c.title,
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5, color: textColor),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isLive
                            ? const Color(0xFFEF4444).withOpacity(isDark ? 0.18 : 0.08)
                            : (isEnded 
                                ? Colors.grey.withOpacity(isDark ? 0.18 : 0.08) 
                                : const Color(0xFF10B981).withOpacity(isDark ? 0.18 : 0.08)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isLive ? "LIVE NOW" : (isEnded ? "ENDED" : "SCHEDULED"),
                        style: TextStyle(
                          color: isLive ? const Color(0xFFEF4444) : (isEnded ? Colors.grey.shade500 : const Color(0xFF10B981)),
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, size: 12.5, color: Colors.grey.shade500),
                    const SizedBox(width: 6),
                    Text(
                      "${_formatDate(c.classDate)}  |  ${_formatTime(c.classTime)}",
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                if (!isEnded) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 36,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLive ? const Color(0xFFEF4444) : AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        // Join Classroom
                        final token = await StorageService.to.getToken() ?? '';
                        final baseUrl = ApiEndpoints.baseUrl.replaceAll('/api', '');
                        final url = "$baseUrl/live/room.html?classId=${c.id}&role=student&token=$token";
                        launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
                      },
                      icon: Icon(isLive ? Icons.play_circle_fill_rounded : Icons.login_rounded, size: 16),
                      label: Text(
                        isLive ? "JOIN LIVE" : "ENTER CLASSROOM",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSyllabusNotesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Syllabus Modules ─────────────────────────────
          Row(
            children: [
              const Icon(Icons.menu_book_outlined, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                "Course Syllabus & Sections",
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textColor),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_modules.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                "No syllabus sections uploaded yet.",
                style: TextStyle(color: secTextColor, fontSize: 12, fontStyle: FontStyle.italic),
              ),
            )
          else
            ...List.generate(_modules.length, (idx) {
              final m = _modules[idx];
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCardAlt : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: borderColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "${idx + 1}. ${m['title'] ?? 'Module'}",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5, color: textColor),
                    ),
                    if (m['description'] != null && m['description'].toString().isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        m['description'].toString(),
                        style: TextStyle(fontSize: 11.5, color: secTextColor),
                      ),
                    ],
                  ],
                ),
              );
            }),

          const SizedBox(height: 24),
          const Divider(height: 1),
          const SizedBox(height: 20),

          // ── Notes & Study Materials ──────────────────────
          Row(
            children: [
              const Icon(Icons.file_copy_outlined, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                "Study Materials & Notes",
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textColor),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_notes.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                "No study materials uploaded for this batch yet.",
                style: TextStyle(color: secTextColor, fontSize: 12, fontStyle: FontStyle.italic),
              ),
            )
          else
            ..._notes.map((n) {
              final fileUrl = n['file_url']?.toString() ?? '';
              final fileType = n['file_type']?.toString() ?? 'link';
              final uploadedAtStr = n['uploaded_at']?.toString();

              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: borderColor),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(isDark ? 0.15 : 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          fileType.toLowerCase() == 'pdf' ? Icons.picture_as_pdf_outlined : Icons.link_rounded,
                          color: AppColors.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              n['title']?.toString() ?? 'Notes',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
                            ),
                            if (n['description'] != null && n['description'].toString().isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                n['description'].toString(),
                                style: TextStyle(fontSize: 11.5, color: secTextColor),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            if (uploadedAtStr != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                "Uploaded: ${_formatDate(uploadedAtStr)}",
                                style: TextStyle(fontSize: 10, color: Colors.grey.shade400, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (fileUrl.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.download_rounded, color: AppColors.primary),
                          onPressed: () => _launchUrl(fileUrl),
                        ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }
}

