import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
import '../controllers/teacher_dashboard_controller.dart';
import 'tabs/teacher_home_tab.dart';
import 'tabs/teacher_sop_tab.dart';
import 'tabs/teacher_courses_tab.dart';
import 'tabs/teacher_batches_tab.dart';
import 'tabs/teacher_live_classes_tab.dart';
import 'tabs/teacher_assignments_tab.dart';
import 'tabs/teacher_observations_tab.dart';
import 'tabs/teacher_attendance_tab.dart';
import 'tabs/teacher_notes_tab.dart';
import 'tabs/teacher_chats_tab.dart';
import 'tabs/teacher_earnings_tab.dart';
import 'tabs/teacher_referrals_tab.dart';
import 'tabs/teacher_level_tab.dart';
import 'tabs/teacher_certificates_tab.dart';
import 'tabs/teacher_profile_tab.dart';
import 'tabs/teacher_documents_tab.dart';
import '../../shared/views/notifications_view.dart';

class TeacherDashboardView extends GetView<TeacherDashboardController> {
  const TeacherDashboardView({super.key});

  static DateTime? _lastBackPressTime;

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final idx = controller.selectedIndex.value;
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;

          if (controller.popNavigationStack()) {
            return;
          }

          final currentIdx = controller.selectedIndex.value;
          if (currentIdx == 1) {
            if (controller.sopCurrentStep.value > 1) {
              controller.sopCurrentStep.value--;
              return;
            } else {
              controller.selectedIndex.value = 0;
              return;
            }
          }

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
              "Exit Speaxa Teacher",
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
          drawer: idx == 0 ? _buildDrawer(context, idx) : null,
          drawerEnableOpenDragGesture: idx == 0,
          body: _getBody(idx),
          bottomNavigationBar: idx == 1 ? null : Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 16,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: BottomNavigationBar(
                  elevation: 0,
                  backgroundColor: Colors.transparent,
                  currentIndex: _getBottomNavIndex(idx),
                  onTap: (val) => _onBottomNavTap(val),
                  type: BottomNavigationBarType.fixed,
                  selectedItemColor: AppColors.primary,
                  unselectedItemColor: Colors.grey.shade500,
                  selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                  unselectedLabelStyle: const TextStyle(fontSize: 10),
                  items: const [
                    BottomNavigationBarItem(
                      icon: Icon(Icons.home_outlined, size: 22),
                      activeIcon: Icon(Icons.home_rounded, size: 24),
                      label: 'Home',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.school_outlined, size: 22),
                      activeIcon: Icon(Icons.school_rounded, size: 24),
                      label: 'Batches',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.video_camera_front_outlined, size: 22),
                      activeIcon: Icon(Icons.video_camera_front_rounded, size: 24),
                      label: 'Live Classes',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.verified_outlined, size: 22),
                      activeIcon: Icon(Icons.verified_rounded, size: 24),
                      label: 'SOP Setup',
                    ),
                    BottomNavigationBarItem(
                      icon: Icon(Icons.account_balance_wallet_outlined, size: 22),
                      activeIcon: Icon(Icons.account_balance_wallet_rounded, size: 24),
                      label: 'Earnings',
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    });
  }

  int _getBottomNavIndex(int idx) {
    if (idx == 0) return 0; // Home
    if (idx == 3) return 1; // Batches
    if (idx == 4) return 2; // Live Classes
    if (idx == 1) return 3; // SOP Setup
    if (idx == 10) return 4; // Earnings
    return 0;
  }

  void _onBottomNavTap(int val) {
    if (val == 0) controller.selectedIndex.value = 0;
    if (val == 1) controller.selectedIndex.value = 3;
    if (val == 2) controller.selectedIndex.value = 4;
    if (val == 3) controller.selectedIndex.value = 1;
    if (val == 4) controller.selectedIndex.value = 10;
  }

  Widget _getBody(int index) {
    switch (index) {
      case 0:
        return const TeacherHomeTab();
      case 1:
        return const TeacherSopTab();
      case 2:
        return const TeacherCoursesTab();
      case 3:
        return const TeacherBatchesTab();
      case 4:
        return const TeacherLiveClassesTab();
      case 5:
        return const TeacherAssignmentsTab();
      case 6:
        return const TeacherObservationsTab();
      case 7:
        return const TeacherAttendanceTab();
      case 8:
        return const TeacherNotesTab();
      case 9:
        return const TeacherChatsTab();
      case 10:
        return const TeacherEarningsTab();
      case 11:
        return const TeacherReferralsTab();
      case 12:
        return const TeacherLevelTab();
      case 13:
        return const TeacherCertificatesTab();
      case 14:
        return const TeacherProfileTab();
      case 15:
        return const TeacherDocumentsTab();
      default:
        return const TeacherHomeTab();
    }
  }

  AppBar _buildAppBar(BuildContext context, int index) {
    final user = AuthService.to.currentUser.value;
    final isHome = index == 0;

    return AppBar(
      elevation: 0,
      backgroundColor: AppColors.lightBg,
      leading: isHome
          ? Builder(
              builder: (ctx) => Padding(
                padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
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
                    icon: const Icon(Icons.segment_rounded, color: AppColors.primary, size: 22),
                    tooltip: "Open Navigation Menu",
                    onPressed: () => Scaffold.of(ctx).openDrawer(),
                  ),
                ),
              ),
            )
          : Padding(
              padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
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
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87, size: 18),
                  tooltip: index == 1 ? "Previous SOP Step" : "Back to Home Dashboard",
                  onPressed: () {
                    if (controller.popNavigationStack()) {
                      return;
                    }
                    if (index == 1) {
                      if (controller.sopCurrentStep.value > 1) {
                        controller.sopCurrentStep.value--;
                      } else {
                        controller.selectedIndex.value = 0;
                      }
                    } else {
                      controller.selectedIndex.value = 0;
                    }
                  },
                ),
              ),
            ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _getTitle(index),
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87),
          ),
          if (isHome && user != null)
            Text(
              "Welcome, ${user.name}",
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.normal),
            ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined, size: 24, color: Colors.black87),
          onPressed: () => Get.to(() => const NotificationsView()),
        ),
        const SizedBox(width: 4),
        GestureDetector(
          onTap: () => controller.selectedIndex.value = 14, // Profile tab
          child: Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.teacherRole, width: 2),
              ),
              child: CircleAvatar(
                radius: 15,
                backgroundColor: AppColors.teacherRole.withOpacity(0.1),
                backgroundImage: user?.fullPhotoUrl != null && user!.fullPhotoUrl!.isNotEmpty
                    ? NetworkImage(user.fullPhotoUrl!) as ImageProvider
                    : null,
                child: user?.fullPhotoUrl == null || user!.fullPhotoUrl!.isEmpty
                    ? Text(
                        user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'T',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.teacherRole),
                      )
                    : null,
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _getTitle(int index) {
    switch (index) {
      case 0: return 'Teacher Workspace';
      case 1: return 'SOP Setup';
      case 2: return 'My Courses';
      case 3: return 'Study Batches';
      case 4: return 'Live Classes';
      case 5: return 'Homework Assignments';
      case 6: return 'Student Observations';
      case 7: return 'Attendance Logs';
      case 8: return 'Study Materials';
      case 9: return 'Parent Connect';
      case 10: return 'Earnings & Ledger';
      case 11: return 'Referrals & Rewards';
      case 12: return 'My Mentor Level';
      case 13: return 'My Certificates';
      case 14: return 'Profile Settings';
      case 15: return 'KYC Documents';
      default: return 'Teacher Workspace';
    }
  }

  Widget _buildDrawer(BuildContext context, int activeIdx) {
    final user = AuthService.to.currentUser.value;
    return Drawer(
      child: Container(
        color: Colors.white,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // Modern Header with Educator Profile Avatar
            Container(
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
                          backgroundImage: user?.fullPhotoUrl != null && user!.fullPhotoUrl!.isNotEmpty
                              ? NetworkImage(user.fullPhotoUrl!) as ImageProvider
                              : null,
                          child: user?.fullPhotoUrl == null || user!.fullPhotoUrl!.isEmpty
                              ? Text(
                                  user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'T',
                                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.teacherRole),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.name ?? 'Educator',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user?.email ?? 'teacher@speaxa.in',
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          user?.teacherLevel ?? 'Verified Mentor',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.amber.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.star, size: 12, color: Colors.white),
                            const SizedBox(width: 3),
                            Text(
                              "${user?.rating ?? 5.0}★",
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

            // EXACT MENU CATEGORIES FROM USER DIRECTIVE
            _buildDrawerSectionHeader("Overview"),
            _buildDrawerItem(context, Icons.dashboard_outlined, Icons.dashboard, 'Dashboard', 0, activeIdx),
            _buildDrawerItem(context, Icons.verified_user_outlined, Icons.verified_user, 'SOP Setup', 1, activeIdx),

            _buildDrawerSectionHeader("Academic & Classes"),
            _buildDrawerItem(context, Icons.book_outlined, Icons.book, 'My Courses', 2, activeIdx),
            _buildDrawerItem(context, Icons.layers_outlined, Icons.layers, 'My Batches', 3, activeIdx),
            _buildDrawerItem(context, Icons.videocam_outlined, Icons.videocam, 'Live Classes', 4, activeIdx),
            _buildDrawerItem(context, Icons.file_present_outlined, Icons.file_present, 'Study Materials', 8, activeIdx),

            _buildDrawerSectionHeader("Student Tracking"),
            _buildDrawerItem(context, Icons.assignment_outlined, Icons.assignment, 'Assignments', 5, activeIdx),
            _buildDrawerItem(context, Icons.remove_red_eye_outlined, Icons.remove_red_eye, 'Observations', 6, activeIdx),
            _buildDrawerItem(context, Icons.calendar_today_outlined, Icons.calendar_today, 'Attendance', 7, activeIdx),

            _buildDrawerSectionHeader("Parent Connect"),
            _buildDrawerItem(context, Icons.chat_bubble_outline, Icons.chat_bubble, 'Parent Connect', 9, activeIdx),

            _buildDrawerSectionHeader("Finance & Rewards"),
            _buildDrawerItem(context, Icons.account_balance_wallet_outlined, Icons.account_balance_wallet, 'Earnings', 10, activeIdx),
            _buildDrawerItem(context, Icons.card_giftcard_outlined, Icons.card_giftcard, 'Referrals & Rewards', 11, activeIdx),

            _buildDrawerSectionHeader("Profile & Level"),
            _buildDrawerItem(context, Icons.military_tech_outlined, Icons.military_tech, 'My Level', 12, activeIdx),
            _buildDrawerItem(context, Icons.card_membership_outlined, Icons.card_membership, 'My Certificates', 13, activeIdx),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
              ),
              child: ListTile(
                dense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
                leading: Icon(Icons.notifications_outlined, color: Colors.grey.shade700, size: 20),
                title: const Text('Notifications', style: TextStyle(fontSize: 13, color: Colors.black87)),
                onTap: () {
                  Navigator.pop(context);
                  Get.to(() => const NotificationsView());
                },
              ),
            ),
            _buildDrawerItem(context, Icons.person_outline, Icons.person, 'Profile', 14, activeIdx),

            const Divider(height: 24, indent: 16, endIndent: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => _confirmLogout(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.logout, color: Colors.redAccent, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Logout',
                        style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: AppColors.teacherRole,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, IconData icon, IconData activeIcon, String title, int index, int activeIdx) {
    final isSelected = index == activeIdx;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.teacherRole.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
        leading: Icon(
          isSelected ? activeIcon : icon,
          color: isSelected ? AppColors.teacherRole : Colors.grey.shade700,
          size: 20,
        ),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? AppColors.teacherRole : Colors.black87,
          ),
        ),
        trailing: isSelected
            ? Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(color: AppColors.teacherRole, shape: BoxShape.circle),
              )
            : null,
        onTap: () {
          Navigator.pop(context);
          controller.selectedIndex.value = index;
        },
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Logout'),
        content: const Text('Are you sure you want to log out from Speaxa Educator?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(ctx);
              AuthService.to.logout();
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
