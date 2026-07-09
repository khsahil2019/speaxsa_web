import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
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
            const StudentAttendanceView(),
            const StudentAssignmentsView(),
            const StudentReportsView(),
          ],
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: idx,
          onTap: (val) => controller.selectedIndex.value = val,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: Colors.grey,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.menu_book_outlined), activeIcon: Icon(Icons.menu_book), label: 'Courses'),
            BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined), activeIcon: Icon(Icons.calendar_today), label: 'Attendance'),
            BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined), activeIcon: Icon(Icons.assignment), label: 'Tasks'),
            BottomNavigationBarItem(icon: Icon(Icons.analytics_outlined), activeIcon: Icon(Icons.analytics), label: 'Reports'),
          ],
        ),
      );
    });
  }

  AppBar _buildAppBar(BuildContext context, int index) {
    final titles = ['Student Portal', 'Browse Batches', 'My Attendance', 'Assignments', 'Performance Reports'];
    return AppBar(
      title: Text(titles[index]),
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () => Get.to(() => const NotificationsView()),
        ),
        IconButton(
          icon: const Icon(Icons.person_outline),
          onPressed: () => Get.to(() => const ProfileView()),
        ),
      ],
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final user = AuthService.to.currentUser.value;
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
            accountName: Text(user?.name ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            accountEmail: Text("Code: ${user?.studentCode ?? 'N/A'} • Grade: ${user?.grade ?? 'N/A'}"),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(user?.name.substring(0, 1).toUpperCase() ?? 'S', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary)),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_outlined),
            title: const Text('Dashboard'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 0; },
          ),
          ListTile(
            leading: const Icon(Icons.family_restroom),
            title: const Text('Parent Link Requests'),
            trailing: Obx(() => controller.parentRequests.isNotEmpty
                ? CircleAvatar(radius: 10, backgroundColor: AppColors.warning, child: Text('${controller.parentRequests.length}', style: const TextStyle(fontSize: 10, color: Colors.white)))
                : const SizedBox.shrink()),
            onTap: () { Navigator.pop(context); Get.to(() => const ParentRequestsView()); },
          ),
          ListTile(
            leading: const Icon(Icons.person_outlined),
            title: const Text('My Profile'),
            onTap: () { Navigator.pop(context); Get.to(() => const ProfileView()); },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.error),
            title: const Text('Logout', style: TextStyle(color: AppColors.error)),
            onTap: () => AuthService.to.logout(),
          ),
        ],
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
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.heroGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text("Welcome back, ${user?.name.split(' ').first ?? 'Student'}! 👋", style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold), overflow: TextOverflow.ellipsis),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.local_fire_department, color: Colors.orangeAccent, size: 16),
                              const SizedBox(width: 4),
                              Text("${user?.learningStreak ?? 0} Days", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text("Code: ${user?.studentCode ?? 'Pending'} | Board: ${user?.board ?? 'CBSE'}", style: const TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
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
                      child: ListTile(
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
        'color': Colors.indigo,
        'action': () => controller.selectedIndex.value = 1,
      },
      {
        'title': 'Upcoming\nLectures',
        'icon': Icons.video_call,
        'color': Colors.redAccent,
        'action': () => Get.to(() => const StudentUpcomingClassesView()),
      },
      {
        'title': 'Session\nRecordings',
        'icon': Icons.play_circle_fill,
        'color': Colors.orange,
        'action': () => Get.to(() => const StudentRecordingsView()),
      },
      {
        'title': 'My\nAttendance',
        'icon': Icons.done_all,
        'color': AppColors.success,
        'action': () => controller.selectedIndex.value = 2,
      },
      {
        'title': 'My\nAssignments',
        'icon': Icons.assignment,
        'color': Colors.blue,
        'action': () => controller.selectedIndex.value = 3,
      },
      {
        'title': 'Academic\nReports',
        'icon': Icons.analytics,
        'color': Colors.teal,
        'action': () => controller.selectedIndex.value = 4,
      },
      {
        'title': 'Parent\nLink',
        'icon': Icons.family_restroom,
        'color': Colors.amber.shade800,
        'action': () => Get.to(() => const ParentRequestsView()),
      },
      {
        'title': 'In-App\nAlerts',
        'icon': Icons.notifications,
        'color': Colors.pink,
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

