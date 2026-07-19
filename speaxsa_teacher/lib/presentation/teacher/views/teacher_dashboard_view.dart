import 'package:flutter/material.dart';
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

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final idx = controller.selectedIndex.value;
      return Scaffold(
        appBar: _buildAppBar(context, idx),
        drawer: _buildDrawer(context, idx),
        body: _getBody(idx),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _getBottomNavIndex(idx),
          onTap: (val) => _onBottomNavTap(val),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.teacherRole,
          unselectedItemColor: Colors.grey,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.class_outlined), activeIcon: Icon(Icons.class_), label: 'Batches'),
            BottomNavigationBarItem(icon: Icon(Icons.video_camera_front_outlined), activeIcon: Icon(Icons.video_camera_front), label: 'Live'),
            BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: 'Chats'),
            BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), activeIcon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
          ],
        ),
      );
    });
  }

  int _getBottomNavIndex(int idx) {
    // Maps actual selectedIndex to BottomNav position
    if (idx == 0) return 0; // Home
    if (idx == 3) return 1; // Batches
    if (idx == 4) return 2; // Live Classes
    if (idx == 9) return 3; // Chats
    if (idx == 10) return 4; // Wallet
    return 0; // fallback to Home if navigating drawer-only pages
  }

  void _onBottomNavTap(int val) {
    if (val == 0) controller.selectedIndex.value = 0;
    if (val == 1) controller.selectedIndex.value = 3;
    if (val == 2) controller.selectedIndex.value = 4;
    if (val == 3) controller.selectedIndex.value = 9;
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
    return AppBar(
      title: Text(_getTitle(index)),
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () => Get.to(() => const NotificationsView()),
        ),
        IconButton(
          icon: const Icon(Icons.person_outline),
          onPressed: () => controller.selectedIndex.value = 14, // Profile tab
        ),
      ],
    );
  }

  String _getTitle(int index) {
    switch (index) {
      case 0: return 'Teacher Workspace';
      case 1: return 'SOP & Compliance';
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
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
            accountName: Text(user?.name ?? 'Teacher', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            accountEmail: Text("Level: ${user?.teacherLevel ?? 'Junior Mentor'} • Rating: ${user?.rating ?? 5.0}★"),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              backgroundImage: user?.photoUrl != null && user!.photoUrl!.isNotEmpty
                  ? NetworkImage(user.photoUrl!) as ImageProvider
                  : null,
              child: user?.photoUrl == null || user!.photoUrl!.isEmpty
                  ? Text(user?.name.substring(0, 1).toUpperCase() ?? 'T', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.teacherRole))
                  : null,
            ),
          ),
          _buildDrawerItem(context, Icons.dashboard_outlined, 'Dashboard', 0, activeIdx),
          _buildDrawerItem(context, Icons.verified_user_outlined, 'SOP Setup', 1, activeIdx),
          _buildDrawerItem(context, Icons.book_outlined, 'My Courses', 2, activeIdx),
          _buildDrawerItem(context, Icons.layers_outlined, 'My Batches', 3, activeIdx),
          _buildDrawerItem(context, Icons.videocam_outlined, 'Live Classes', 4, activeIdx),
          _buildDrawerItem(context, Icons.assignment_outlined, 'Assignments', 5, activeIdx),
          _buildDrawerItem(context, Icons.remove_red_eye_outlined, 'Observations', 6, activeIdx),
          _buildDrawerItem(context, Icons.calendar_today_outlined, 'Attendance logs', 7, activeIdx),
          _buildDrawerItem(context, Icons.file_present_outlined, 'Study Materials', 8, activeIdx),
          _buildDrawerItem(context, Icons.chat_bubble_outline, 'Parent Connect', 9, activeIdx),
          _buildDrawerItem(context, Icons.account_balance_wallet_outlined, 'Earnings & Wallet', 10, activeIdx),
          _buildDrawerItem(context, Icons.card_giftcard_outlined, 'Referrals & Rewards', 11, activeIdx),
          _buildDrawerItem(context, Icons.military_tech_outlined, 'My Level', 12, activeIdx),
          _buildDrawerItem(context, Icons.card_membership_outlined, 'Certificates', 13, activeIdx),
          _buildDrawerItem(context, Icons.person_outline, 'Profile settings', 14, activeIdx),
          _buildDrawerItem(context, Icons.folder_open_outlined, 'KYC Documents', 15, activeIdx),
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

  Widget _buildDrawerItem(BuildContext context, IconData icon, String title, int index, int activeIdx) {
    final isSelected = index == activeIdx;
    return ListTile(
      selected: isSelected,
      selectedTileColor: AppColors.teacherRole.withOpacity(0.08),
      selectedColor: AppColors.teacherRole,
      leading: Icon(icon, color: isSelected ? AppColors.teacherRole : Colors.grey.shade600),
      title: Text(title, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      onTap: () {
        Navigator.pop(context);
        controller.selectedIndex.value = index;
      },
    );
  }
}
