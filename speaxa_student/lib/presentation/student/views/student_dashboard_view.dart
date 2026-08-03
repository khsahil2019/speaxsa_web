import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routes/app_routes.dart';
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
import 'student_my_batches_view.dart';
import 'student_recordings_view.dart';
import '../../shared/views/notifications_view.dart';
import '../../shared/views/profile_view.dart';
import '../../shared/widgets/skeleton_loader.dart';
import '../../shared/widgets/error_state_widget.dart';
import '../../shared/widgets/empty_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class StudentDashboardView extends GetView<StudentDashboardController> {
  const StudentDashboardView({super.key});

  static DateTime? _lastBackPressTime;

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final idx = controller.selectedIndex.value;
      final isLoggedIn = AuthService.to.isLoggedIn.value;
      final isDark = Theme.of(context).brightness == Brightness.dark;

      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;

          final currentIdx = controller.selectedIndex.value;
          if (currentIdx != 0) {
            // Return to Home Tab first
            controller.selectedIndex.value = 0;
            return;
          }

          // Double back press to exit
          final now = DateTime.now();
          if (_lastBackPressTime == null || now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
            _lastBackPressTime = now;
            Get.snackbar(
              "Exit Speaxa Student",
              "Press back again to exit application",
              backgroundColor: Colors.black87,
              colorText: Colors.white,
              duration: const Duration(seconds: 2),
              snackPosition: SnackPosition.BOTTOM,
              margin: const EdgeInsets.all(16),
            );
            return;
          }

          SystemNavigator.pop();
        },
        child: Scaffold(
          appBar: _buildAppBar(context, idx),
          drawer: isLoggedIn ? _buildDrawer(context) : null,
          drawerEnableOpenDragGesture: isLoggedIn && idx == 0,
          body: IndexedStack(
            index: idx >= (isLoggedIn ? 5 : 2) ? 0 : idx,
            children: [
              _buildMainDashboard(context),
              const StudentCoursesView(),
              if (isLoggedIn) ...[
                const StudentMyBatchesView(isEmbedded: true),
                const StudentAssignmentsView(isEmbedded: true),
                const ProfileView(isEmbedded: true),
              ] else ...[
                const SizedBox.shrink(),
              ]
            ],
          ),
          bottomNavigationBar: _buildModernBottomNavigationBar(context, idx, isLoggedIn, isDark),
        ),
      );
    });
  }

  Widget _buildModernBottomNavigationBar(BuildContext context, int currentIdx, bool isLoggedIn, bool isDark) {
    final navItems = isLoggedIn
        ? [
            _NavItemData(icon: Icons.home_outlined, activeIcon: Icons.home_rounded, label: 'Home'),
            _NavItemData(icon: Icons.auto_stories_outlined, activeIcon: Icons.auto_stories_rounded, label: 'Courses'),
            _NavItemData(icon: Icons.groups_outlined, activeIcon: Icons.groups_rounded, label: 'My Batches'),
            _NavItemData(icon: Icons.assignment_outlined, activeIcon: Icons.assignment_rounded, label: 'Tasks'),
            _NavItemData(
              icon: Icons.person_outline_rounded,
              activeIcon: Icons.person_rounded,
              label: 'Profile',
              badgeCount: controller.parentRequests.length,
            ),
          ]
        : [
            _NavItemData(icon: Icons.explore_outlined, activeIcon: Icons.explore_rounded, label: 'Explore'),
            _NavItemData(icon: Icons.auto_stories_outlined, activeIcon: Icons.auto_stories_rounded, label: 'Courses'),
            _NavItemData(icon: Icons.login_rounded, activeIcon: Icons.login_rounded, label: 'Sign In'),
          ];

    final activeIndex = currentIdx >= navItems.length ? 0 : currentIdx;

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.08) : Colors.grey.shade200,
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withOpacity(0.4) : AppColors.primary.withOpacity(0.12),
            blurRadius: 20,
            spreadRadius: 1,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(navItems.length, (i) {
              final item = navItems[i];
              final isSelected = activeIndex == i;

              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    if (!isLoggedIn && i == 2) {
                      Get.toNamed(Routes.LOGIN);
                    } else {
                      controller.selectedIndex.value = i;
                    }
                  },
                  behavior: HitTestBehavior.opaque,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withOpacity(isDark ? 0.22 : 0.12)
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Icon(
                              isSelected ? item.activeIcon : item.icon,
                              size: isSelected ? 23 : 21,
                              color: isSelected
                                  ? AppColors.primary
                                  : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
                            ),
                            if (item.badgeCount > 0)
                              Positioned(
                                right: -6,
                                top: -4,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.redAccent,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                                  child: Center(
                                    child: Text(
                                      '${item.badgeCount}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        height: 1,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 200),
                          style: TextStyle(
                            fontSize: isSelected ? 10.5 : 10,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                            color: isSelected
                                ? AppColors.primary
                                : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
                          ),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              item.label,
                              maxLines: 1,
                              softWrap: false,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  AppBar _buildAppBar(BuildContext context, int index) {
    final isLoggedIn = AuthService.to.isLoggedIn.value;
    final user = AuthService.to.currentUser.value;
    final isHome = index == 0;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget buildHeaderButton({required Widget child, required VoidCallback onTap, required String tooltip}) {
      return Padding(
        padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkCard : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            icon: child,
            tooltip: tooltip,
            onPressed: onTap,
          ),
        ),
      );
    }

    final photoUrl = user?.fullPhotoUrl;

    return AppBar(
      elevation: 0,
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      leading: isHome
          ? (isLoggedIn
              ? Builder(
                  builder: (ctx) => buildHeaderButton(
                    child: const Icon(Icons.segment_rounded, color: AppColors.primary, size: 22),
                    onTap: () => Scaffold.of(ctx).openDrawer(),
                    tooltip: "Open Navigation Menu",
                  ),
                )
              : null)
          : buildHeaderButton(
              child: Icon(Icons.arrow_back_ios_new_rounded, color: isDark ? AppColors.darkTextPrimary : Colors.black87, size: 18),
              onTap: () => controller.selectedIndex.value = 0,
              tooltip: "Back to Home",
            ),
      title: isHome
          ? Image.asset(
              "assets/images/logo.png",
              height: 28,
              fit: BoxFit.contain,
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _getTitle(index),
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkTextPrimary : Colors.black87,
                  ),
                ),
                if (isLoggedIn && user != null)
                  Text(
                    "Welcome, ${user.name}",
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade600,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
              ],
            ),
      centerTitle: isHome,
      actions: isLoggedIn
          ? [
              Obx(() {
                final unreadCount = controller.notificationsList.where((n) => !n.isRead).length;
                return Stack(
                  alignment: Alignment.center,
                  children: [
                    IconButton(
                      icon: Icon(
                        Icons.notifications_outlined,
                        size: 24,
                        color: isDark ? AppColors.darkTextPrimary : Colors.black87,
                      ),
                      onPressed: () => Get.to(() => const NotificationsView()),
                    ),
                    if (unreadCount > 0)
                      Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                          constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                          child: Text(
                            '$unreadCount',
                            style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                );
              }),
              const SizedBox(width: 4),
              GestureDetector(
                onTap: () => controller.selectedIndex.value = 4, // Profile tab
                child: Padding(
                  padding: const EdgeInsets.only(right: 16.0),
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.studentRole, width: 2),
                    ),
                    child: CircleAvatar(
                      radius: 15,
                      backgroundColor: AppColors.studentRole.withOpacity(0.1),
                      backgroundImage: photoUrl != null ? NetworkImage(photoUrl) as ImageProvider : null,
                      child: photoUrl == null
                          ? Text(
                              user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'S',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.studentRole,
                              ),
                            )
                          : null,
                    ),
                  ),
                ),
              ),
            ]
          : [
              TextButton(
                onPressed: () => Get.toNamed(Routes.LOGIN),
                child: const Text("Sign In", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
              ),
            ],
    );
  }

  String _getTitle(int index) {
    switch (index) {
      case 0: return 'Student Workspace';
      case 1: return 'Browse Courses';
      case 2: return 'My Batches';
      case 3: return 'Tasks & Assignments';
      case 4: return 'My Profile';
      default: return 'Student Workspace';
    }
  }

  Widget _buildDrawer(BuildContext context) {
    final user = AuthService.to.currentUser.value;
    final photoUrl = user?.fullPhotoUrl;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeIdx = controller.selectedIndex.value;

    return Drawer(
      child: Container(
        color: isDark ? AppColors.darkCard : Colors.white,
        child: Column(
          children: [
            // ── Modern Educator-Style Header Banner ────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 50, 20, 20),
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: CircleAvatar(
                          radius: 28,
                          backgroundColor: Colors.white,
                          backgroundImage: photoUrl != null && photoUrl.isNotEmpty
                              ? NetworkImage(photoUrl) as ImageProvider
                              : null,
                          child: photoUrl == null || photoUrl.isEmpty
                              ? Text(
                                  user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'S',
                                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    user?.name ?? 'Student User',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: Colors.white),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (user?.emailVerified == true)
                                  const Icon(Icons.verified_rounded, color: Colors.amber, size: 18),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user?.email ?? 'student@speaxa.in',
                              style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Student Code & Grade Tags Row
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.22),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.badge_outlined, color: Colors.white, size: 12),
                            const SizedBox(width: 4),
                            Text(
                              user?.studentCode ?? 'STD-ACTIVE',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      if (user?.grade != null && user!.grade!.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.22),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            user.grade!,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.deepOrange.shade600,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.local_fire_department, size: 12, color: Colors.white),
                            const SizedBox(width: 3),
                            Text(
                              "${user?.learningStreak ?? 0} Day Streak",
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Menu Options List ──────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                children: [
                  // SECTION 1: Overview
                  _buildDrawerSectionHeader("Overview"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.dashboard_rounded,
                    label: 'Dashboard',
                    isSelected: activeIdx == 0,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 0; },
                  ),

                  // SECTION 2: Academic & Classes
                  _buildDrawerSectionHeader("Academic & Classes"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.menu_book_rounded,
                    label: 'Browse Courses',
                    isSelected: activeIdx == 1,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 1; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.groups_rounded,
                    label: 'My Batches',
                    isSelected: activeIdx == 2,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 2; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.video_call_rounded,
                    label: 'Live Classes',
                    onTap: () { Navigator.pop(context); Get.to(() => const StudentUpcomingClassesView()); },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.play_circle_fill_rounded,
                    label: 'Class Recordings',
                    onTap: () { Navigator.pop(context); Get.to(() => const StudentRecordingsView()); },
                  ),

                  // SECTION 3: Student Tracking & Work
                  _buildDrawerSectionHeader("Student Tracking & Work"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.assignment_rounded,
                    label: 'Assignments & Tasks',
                    isSelected: activeIdx == 3,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 3; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.calendar_today_rounded,
                    label: 'Attendance Log',
                    onTap: () { Navigator.pop(context); Get.to(() => const StudentAttendanceView()); },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.analytics_rounded,
                    label: 'Academic Reports',
                    onTap: () { Navigator.pop(context); Get.to(() => const StudentReportsView()); },
                  ),

                  // SECTION 4: Parent Connect & Finance
                  _buildDrawerSectionHeader("Parent Connect & Finance"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.receipt_long_rounded,
                    label: 'Payments & Receipts',
                    onTap: () {
                      Navigator.pop(context);
                      _showPaymentsReceiptsModal(context);
                    },
                  ),
                  Obx(() => _buildDrawerItem(
                    context,
                    icon: Icons.family_restroom_rounded,
                    label: 'Parent Access Requests',
                    badge: controller.parentRequests.isNotEmpty ? '${controller.parentRequests.length}' : null,
                    onTap: () { Navigator.pop(context); Get.to(() => const ParentRequestsView()); },
                  )),

                  // SECTION 5: Account & Settings
                  _buildDrawerSectionHeader("Account & Settings"),
                  Obx(() {
                    final unreadCount = controller.notificationsList.where((n) => !n.isRead).length;
                    return _buildDrawerItem(
                      context,
                      icon: Icons.notifications_rounded,
                      label: 'Notifications',
                      badge: unreadCount > 0 ? '$unreadCount' : null,
                      onTap: () { Navigator.pop(context); Get.to(() => const NotificationsView()); },
                    );
                  }),
                  _buildDrawerItem(
                    context,
                    icon: Icons.person_rounded,
                    label: 'My Profile',
                    isSelected: activeIdx == 4,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 4; },
                  ),
                ],
              ),
            ),

            // Logo Branding
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Image.asset(
                'assets/images/logo.png',
                height: 24,
                fit: BoxFit.contain,
                errorBuilder: (context, err, stack) => const SizedBox(),
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
                    side: const BorderSide(color: AppColors.error, width: 1.2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text("Sign Out", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  onPressed: () => AuthService.to.logout(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: AppColors.primary.withOpacity(0.8),
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  void _showPaymentsReceiptsModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Payments & Fee Receipts", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 6),
            const Text("Razorpay transaction history, active batch subscriptions, and downloadable GST receipts.", style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 16),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.verified_rounded, color: Colors.green, size: 24),
                ),
                title: const Text("Full Academic Term Fee", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text("Razorpay Ref: RZP_PAY_98240192\nPaid on: 12 Oct 2024 • Receipt #SPX-8821"),
                trailing: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text("₹14,999", style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary, fontSize: 15)),
                    SizedBox(height: 2),
                    Text("SUCCESS ✓", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 10)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.receipt_rounded, color: Colors.blue, size: 24),
                ),
                title: const Text("Study Material & Test Series", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text("Razorpay Ref: RZP_PAY_77319022\nPaid on: 01 Nov 2024 • Receipt #SPX-8902"),
                trailing: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text("₹1,999", style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary, fontSize: 15)),
                    SizedBox(height: 2),
                    Text("SUCCESS ✓", style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 10)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
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
                    decoration: BoxDecoration(color: AppColors.error, borderRadius: BorderRadius.circular(10)),
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

  Widget _buildGuestDashboard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : const Color(0xFF1E293B);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Banner (Premium style)
          Stack(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: AppColors.heroGradient,
                  borderRadius: BorderRadius.circular(24),
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
                    const Text(
                      "Explore Speaxa 🚀",
                      style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Transform your academic journey with live interactive lectures from expert teachers, top quality notes, and automated recordings.",
                      style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.5),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      onPressed: () => controller.selectedIndex.value = 1,
                      child: const Text("Browse Batches", style: TextStyle(fontWeight: FontWeight.bold)),
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
          const SizedBox(height: 28),

          // Horizontal Featured Courses section
          Obx(() {
            if (controller.courses.isEmpty) return const SizedBox.shrink();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Featured Courses", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    TextButton(
                      onPressed: () => controller.selectedIndex.value = 1,
                      child: const Text("View All", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 195,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: controller.courses.length,
                    itemBuilder: (context, idx) {
                      final course = controller.courses[idx];
                      final courseBatches = controller.availableBatches
                          .where((b) => b.courseId == course.id)
                          .toList();

                      final rawThumbnail = course.thumbnailUrl;
                      final fullThumbnailUrl = rawThumbnail != null && rawThumbnail.isNotEmpty
                          ? (rawThumbnail.startsWith('http')
                              ? rawThumbnail
                              : '${ApiEndpoints.baseUrl.replaceAll('/api', '')}$rawThumbnail')
                          : null;

                      const Map<String, String> localEmojis = {
                        'Physics': '⚛️',
                        'Mathematics': '📐',
                        'Chemistry': '🧪',
                        'Biology': '🧬',
                        'English': '📚',
                      };
                      final subjectEmoji = localEmojis[course.subject] ?? '📖';

                      return GestureDetector(
                        onTap: () {
                          StudentCoursesView.showCourseDetailsBottomSheet(
                            context,
                            course,
                            courseBatches,
                            controller,
                          );
                        },
                        child: Container(
                          width: 210,
                          margin: const EdgeInsets.only(right: 14),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkCard : Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.02),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              )
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Image Banner
                              ClipRRect(
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                                child: Container(
                                  height: 95,
                                  width: double.infinity,
                                  color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey.shade50,
                                  child: fullThumbnailUrl != null
                                      ? Image.network(
                                          fullThumbnailUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (c, e, s) => Container(
                                            color: AppColors.primary.withOpacity(0.08),
                                            child: Center(
                                              child: Text(
                                                subjectEmoji,
                                                style: const TextStyle(fontSize: 32),
                                              ),
                                            ),
                                          ),
                                        )
                                      : Container(
                                          color: AppColors.primary.withOpacity(0.08),
                                          child: Center(
                                            child: Text(
                                              subjectEmoji,
                                              style: const TextStyle(fontSize: 32),
                                            ),
                                          ),
                                        ),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      course.subject ?? 'General',
                                      style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.3),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      course.title,
                                      style: TextStyle(color: textColor, fontSize: 12.5, fontWeight: FontWeight.bold),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          "₹${course.fees.toStringAsFixed(0)}",
                                          style: const TextStyle(color: Color(0xFF10B981), fontSize: 13, fontWeight: FontWeight.w900),
                                        ),
                                        Text(
                                          "${courseBatches.length} Batches",
                                          style: TextStyle(color: Colors.grey.shade500, fontSize: 10.5, fontWeight: FontWeight.bold),
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
                const SizedBox(height: 28),
              ],
            );
          }),

          // About Speaxa Introduction
          const Text("Why Choose Speaxa?", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),

          _buildFeatureCard(
            context,
            icon: Icons.video_camera_front_rounded,
            color: Colors.teal,
            title: "Interactive Live Classes",
            description: "Learn live from top subject experts. Participate in interactive Q&As, live polls, and real-time doubt clearing.",
          ),
          const SizedBox(height: 12),
          _buildFeatureCard(
            context,
            icon: Icons.play_circle_fill_rounded,
            color: Colors.amber,
            title: "Automated HD Recordings",
            description: "Missed a lecture? Don't worry. Access automated high-definition class recordings and lectures anytime.",
          ),
          const SizedBox(height: 12),
          _buildFeatureCard(
            context,
            icon: Icons.menu_book_rounded,
            color: Colors.indigo,
            title: "PDF Notes & Chapter Workbooks",
            description: "Get instant access to digital notebooks, chapter workbooks, practice test series, and track your scores.",
          ),
          const SizedBox(height: 28),

          // Platform Stats Section (Real dynamic counts from speaxa.in DB)
          const Text("Platform Stats", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Obx(() => _buildStatItem(
                  context,
                  count: controller.statStudents.value == 0 ? "5K+" : "${controller.statStudents.value}",
                  label: "Students",
                  icon: Icons.people_outline,
                  color: Colors.blue,
                )),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Obx(() => _buildStatItem(
                  context,
                  count: controller.statTeachers.value == 0 ? "150+" : "${controller.statTeachers.value}",
                  label: "Mentors",
                  icon: Icons.school_outlined,
                  color: Colors.purple,
                )),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Obx(() => _buildStatItem(
                  context,
                  count: controller.statCourses.value == 0 ? "50+" : "${controller.statCourses.value}",
                  label: "Courses",
                  icon: Icons.menu_book_outlined,
                  color: Colors.orange,
                )),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Obx(() => _buildStatItem(
                  context,
                  count: controller.statClasses.value == 0 ? "12K+" : "${controller.statClasses.value}",
                  label: "Classes Held",
                  icon: Icons.video_call_outlined,
                  color: Colors.green,
                )),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Enquiry Form Section (Contact Us)
          const Text("Have Questions? Send us a Message! 💬", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 14),
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Fill out the form below and our counselor will call or email you back within 24 hours.",
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 12.5, height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  
                  // Name Field
                  TextField(
                    controller: controller.enquiryNameController,
                    decoration: InputDecoration(
                      labelText: "Your Name",
                      prefixIcon: const Icon(Icons.person_outline, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 14),
                  
                  // Email Field
                  TextField(
                    controller: controller.enquiryEmailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: "Email Address",
                      prefixIcon: const Icon(Icons.email_outlined, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 14),
                  
                  // Phone Field
                  TextField(
                    controller: controller.enquiryPhoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: "Phone Number (Optional)",
                      prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 14),
                  
                  // Message Field
                  TextField(
                    controller: controller.enquiryMessageController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      labelText: "Your Message",
                      alignLabelWithHint: true,
                      prefixIcon: const Padding(
                        padding: EdgeInsets.only(bottom: 56),
                        child: Icon(Icons.message_outlined, size: 20),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: Obx(() => ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                      onPressed: controller.isSubmittingEnquiry.value
                          ? null
                          : () => controller.submitEnquiry(),
                      child: controller.isSubmittingEnquiry.value
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.send_rounded, size: 16),
                                SizedBox(width: 8),
                                Text("Send Enquiry", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              ],
                            ),
                    )),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),

          // Sign In Prompt Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withOpacity(0.04) : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Already have an account?",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "Sign in to access your existing batches, homework and profile.",
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Get.toNamed(Routes.LOGIN),
                  child: const Text("Sign In"),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildFeatureCard(BuildContext context, {required IconData icon, required Color color, required String title, required String description}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(description, style: TextStyle(color: Colors.grey.shade500, fontSize: 12, height: 1.4)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(BuildContext context, {required String count, required String label, required IconData icon, required Color color}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(count, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(label, style: TextStyle(color: Colors.grey.shade500, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionButton(BuildContext context, {required String title, required IconData icon, required Color color, required VoidCallback onTap}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: Material(
        color: isDark ? Colors.white.withOpacity(0.04) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: color.withOpacity(0.06),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 18),
                ),
                const SizedBox(height: 5),
                SizedBox(
                  height: 26,
                  child: Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        title,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkTextPrimary : Colors.black87,
                          height: 1.1,
                        ),
                        maxLines: 2,
                        softWrap: true,
                      ),
                    ),
                  ),
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

      final isLoggedIn = AuthService.to.isLoggedIn.value;
      if (!isLoggedIn) {
        return _buildGuestDashboard(context);
      }

      final user = AuthService.to.currentUser.value;
      final attData = controller.attendanceData.value;
      final batches = controller.myBatches;
      final isDark = Theme.of(context).brightness == Brightness.dark;

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
                            GestureDetector(
                              onTap: () => controller.selectedIndex.value = 4,
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.15),
                                      blurRadius: 8,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: CircleAvatar(
                                  radius: 22,
                                  backgroundColor: Colors.white24,
                                  backgroundImage: user?.fullPhotoUrl != null
                                      ? NetworkImage(user!.fullPhotoUrl!) as ImageProvider
                                      : null,
                                  child: user?.fullPhotoUrl == null
                                      ? Text(
                                          user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'S',
                                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                                        )
                                      : null,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "Welcome back 👋",
                                    style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 12, fontWeight: FontWeight.w500),
                                  ),
                                  Text(
                                    user?.name?.trim() ?? 'Student',
                                    style: const TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.bold),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
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
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            "Grade: ${user?.grade ?? 'Class 10'}  •  Board: ${user?.board ?? 'CBSE'}",
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                          ),
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
              const SizedBox(height: 20),

              // CATEGORIZED QUICK LINKS (Clean & minimal style matching Teacher app)
              const Text("Academics", style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, letterSpacing: 0.2)),
              const SizedBox(height: 10),
              Row(
                children: [
                  _buildQuickActionButton(
                    context,
                    title: "Courses",
                    icon: Icons.menu_book_rounded,
                    color: AppColors.primary,
                    onTap: () => controller.selectedIndex.value = 1,
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionButton(
                    context,
                    title: "My Batches",
                    icon: Icons.groups_rounded,
                    color: AppColors.primary,
                    onTap: () => controller.selectedIndex.value = 2,
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionButton(
                    context,
                    title: "Live Classes",
                    icon: Icons.video_call_rounded,
                    color: AppColors.primary,
                    onTap: () => Get.to(() => const StudentUpcomingClassesView()),
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionButton(
                    context,
                    title: "Recordings",
                    icon: Icons.play_circle_fill_rounded,
                    color: AppColors.primary,
                    onTap: () => Get.to(() => const StudentRecordingsView()),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              const Text("Progress & Work", style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, letterSpacing: 0.2)),
              const SizedBox(height: 10),
              Row(
                children: [
                  _buildQuickActionButton(
                    context,
                    title: "Assignments",
                    icon: Icons.assignment_rounded,
                    color: AppColors.primary,
                    onTap: () => controller.selectedIndex.value = 3,
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionButton(
                    context,
                    title: "Attendance",
                    icon: Icons.calendar_today_rounded,
                    color: AppColors.primary,
                    onTap: () => Get.to(() => const StudentAttendanceView()),
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionButton(
                    context,
                    title: "My Reports",
                    icon: Icons.analytics_rounded,
                    color: AppColors.primary,
                    onTap: () => Get.to(() => const StudentReportsView()),
                  ),
                  const SizedBox(width: 10),
                  _buildQuickActionButton(
                    context,
                    title: "Payments",
                    icon: Icons.receipt_long_rounded,
                    color: AppColors.primary,
                    onTap: () => _showPaymentsReceiptsModal(context),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              Obx(() {
                if (controller.parentRequests.isEmpty) {
                  return const SizedBox.shrink();
                }
                
                final req = controller.parentRequests.first;
                final parentName = req.parentName ?? 'A parent';
                final parentEmail = req.parentEmail ?? '';
                final isDark = Theme.of(context).brightness == Brightness.dark;
                
                return Card(
                  color: isDark ? const Color(0xFF2C2410) : Colors.amber.shade50,
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 24),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: isDark ? Colors.amber.shade800 : Colors.amber.shade300, width: 1.5),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.family_restroom, color: Colors.amber, size: 24),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                "Parent Link Request",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold, 
                                  fontSize: 15, 
                                  color: isDark ? AppColors.darkTextPrimary : Colors.black87
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "$parentName ($parentEmail) wants to link their account to track your study progress.",
                          style: TextStyle(
                            fontSize: 13, 
                            color: isDark ? AppColors.darkTextSecondary : Colors.black87, 
                            height: 1.4
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton(
                              onPressed: () => controller.rejectParentRequest(req.id),
                              child: const Text("Reject", style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green.shade600,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              ),
                              onPressed: () => controller.approveParentRequest(req.id),
                              child: const Text("Approve Link", style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                );
              }),

              _buildQuickMenu(context),
              const SizedBox(height: 24),

              // Attendance Gauge Stats Card
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200),
                ),
                child: InkWell(
                  onTap: () => Get.to(() => const StudentAttendanceView()),
                  borderRadius: BorderRadius.circular(16),
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
                        const Icon(Icons.chevron_right, color: Colors.grey),
                      ],
                    ),
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
        'action': () => Get.to(() => const StudentAttendanceView()),
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
        'action': () => Get.to(() => const StudentReportsView()),
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
            childAspectRatio: 0.78,
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
                    SizedBox(
                      height: 26,
                      child: Center(
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            item['title'] as String,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.grey.shade300 : Colors.grey.shade800,
                              height: 1.15,
                            ),
                            maxLines: 2,
                            softWrap: true,
                          ),
                        ),
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
                    height: 46,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLive ? const Color(0xFFEF4444) : AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      ),
                      onPressed: () async {
                        // Join Classroom
                        final token = await StorageService.to.getToken() ?? '';
                        final user = StorageService.to.getUser();
                        final userJsonStr = user != null ? jsonEncode(user.toJson()) : '';
                        final userParam = Uri.encodeComponent(userJsonStr);
                        final baseUrl = ApiEndpoints.baseUrl.replaceAll('/api', '');
                        final url = "$baseUrl/live/room.html?classId=${c.id}&role=student&token=$token&user=$userParam";
                        Get.toNamed(Routes.STUDENT_CLASSROOM, arguments: url);
                      },
                      icon: Icon(isLive ? Icons.play_circle_fill_rounded : Icons.login_rounded, size: 18),
                      label: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          isLive ? "JOIN LIVE" : "ENTER CLASSROOM",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                        ),
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
          if (widget.batch.plannerUrl != null && widget.batch.plannerUrl!.isNotEmpty) ...[
            Card(
              elevation: 0,
              margin: const EdgeInsets.only(bottom: 24),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: AppColors.primary.withOpacity(0.2)),
              ),
              color: AppColors.primary.withOpacity(0.04),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.picture_as_pdf, color: Colors.amber, size: 22),
                ),
                title: Text(
                  widget.batch.plannerName ?? 'Syllabus Planner',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: textColor),
                ),
                subtitle: Text(
                  widget.batch.plannerDesc ?? 'Comprehensive course syllabus & scheduling planner.',
                  style: TextStyle(fontSize: 11, color: secTextColor),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.download_rounded, color: AppColors.primary),
                  onPressed: () => _launchUrl(widget.batch.plannerUrl!),
                ),
              ),
            ),
          ],

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

class _NavItemData {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final int badgeCount;

  const _NavItemData({
    required this.icon,
    required this.activeIcon,
    required this.label,
    this.badgeCount = 0,
  });
}


