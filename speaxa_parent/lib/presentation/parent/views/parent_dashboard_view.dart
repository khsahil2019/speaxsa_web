import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
import '../controllers/parent_dashboard_controller.dart';
import 'child_overview_view.dart';
import 'link_child_view.dart';
import 'parent_chat_view.dart';
import '../../shared/views/notifications_view.dart';
import '../../shared/views/profile_view.dart';
import '../../shared/widgets/skeleton_loader.dart';
import '../../shared/widgets/error_state_widget.dart';
import '../../shared/widgets/empty_state_widget.dart';

class ParentDashboardView extends GetView<ParentDashboardController> {
  const ParentDashboardView({super.key});

  double scaleMetric(dynamic val) {
    if (val == null) return 0.0;
    final numVal = double.tryParse(val.toString()) ?? 0.0;
    if (numVal <= 0) return 0.0;
    return numVal > 10 ? numVal / 10 : numVal;
  }

  double calculateAverageScore() {
    if (controller.childAssignments.isEmpty) return 0.0;
    double total = 0;
    int count = 0;
    for (var a in controller.childAssignments) {
      if (a['marks_obtained'] != null) {
        final m = double.tryParse(a['marks_obtained'].toString()) ?? 0.0;
        total += m;
        count++;
      }
    }
    return count > 0 ? (total / count) : 0.0;
  }

  int getPendingAssignmentsCount() {
    return controller.childAssignments.where((a) => a['marks_obtained'] == null).length;
  }

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
            const ChildOverviewView(),
            const LinkChildView(),
            const ParentChatView(),
          ],
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: idx,
          onTap: (val) => controller.selectedIndex.value = val,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.parentRole,
          unselectedItemColor: Colors.grey,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Overview'),
            BottomNavigationBarItem(icon: Icon(Icons.analytics_outlined), activeIcon: Icon(Icons.analytics), label: 'Performance'),
            BottomNavigationBarItem(icon: Icon(Icons.add_link_outlined), activeIcon: Icon(Icons.add_link), label: 'Link Child'),
            BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: 'Connect'),
          ],
        ),
      );
    });
  }

  AppBar _buildAppBar(BuildContext context, int index) {
    final titles = ['Parent Dashboard', 'Child Performance Details', 'Link Student Account', 'Parent-Teacher Connect'];
    return AppBar(
      title: Text(titles[index], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
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
            accountName: Text(user?.name ?? 'Parent', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            accountEmail: Text("Linked Children: ${controller.children.length}"),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                user?.name.isNotEmpty == true ? user!.name.substring(0, 1).toUpperCase() : 'P',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.parentRole),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_outlined),
            title: const Text('Overview'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 0; },
          ),
          ListTile(
            leading: const Icon(Icons.analytics_outlined),
            title: const Text('Performance & Reports'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 1; },
          ),
          ListTile(
            leading: const Icon(Icons.add_link_outlined),
            title: const Text('Link New Child'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 2; },
          ),
          ListTile(
            leading: const Icon(Icons.chat_bubble_outline),
            title: const Text('Teacher Connect'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 3; },
          ),
          ListTile(
            leading: const Icon(Icons.person_outlined),
            title: const Text('My Profile Settings'),
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
        return ErrorStateWidget(errorMessage: controller.errorMessage.value, onRetry: controller.loadParentData);
      }

      final kids = controller.children;
      if (kids.isEmpty) {
        return EmptyStateWidget(
          title: "No Linked Children",
          message: "Link your child's student account using their unique Student Code or email to track their learning growth.",
          buttonText: "Link Child Now",
          onButtonPressed: () => controller.selectedIndex.value = 2,
        );
      }

      final selKid = controller.selectedChild.value;
      final overview = controller.childOverview;
      final avgScore = calculateAverageScore();
      final pendingCount = getPendingAssignmentsCount();

      // Retrieve observation ratings
      final ratings = overview['averageObservations'] ?? {};
      final curiosityVal = scaleMetric(ratings['curiosity']);
      final concentrationVal = scaleMetric(ratings['understanding']);
      final consistencyVal = scaleMetric(ratings['consistency']);
      final communicationVal = scaleMetric(ratings['communication']);

      // Latest report remarks
      final List reportsList = controller.childReports;
      final remarksVal = (reportsList.isNotEmpty && reportsList.first['remarks'] != null)
          ? reportsList.first['remarks'].toString()
          : 'No specific monthly report remarks recorded yet. Daily speech behavior metrics indicate stable performance trends.';

      return RefreshIndicator(
        onRefresh: controller.loadParentData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Child Switcher Dropdown Header
              Card(
                elevation: 0,
                color: AppColors.parentRole.withOpacity(0.08),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: AppColors.parentRole.withOpacity(0.15)),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.face_retouching_natural, color: AppColors.parentRole),
                      const SizedBox(width: 12),
                      const Text("Student: ", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.parentRole)),
                      Expanded(
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selKid?.id,
                            isExpanded: true,
                            icon: const Icon(Icons.arrow_drop_down, color: AppColors.parentRole),
                            style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.black87, fontSize: 14),
                            items: kids.map((k) {
                              return DropdownMenuItem<String>(
                                value: k.id,
                                child: Text("${k.name} (${k.grade ?? 'N/A'})", style: const TextStyle(fontWeight: FontWeight.bold)),
                              );
                            }).toList(),
                            onChanged: (id) {
                              if (id != null) {
                                final child = kids.firstWhere((element) => element.id == id);
                                controller.selectedChild.value = child;
                                controller.loadChildOverview(id);
                              }
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Overview Cards Grid (4 items)
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.35,
                children: [
                  _buildMetricCard(
                    "Attendance Rate",
                    "${overview['attendancePct'] ?? 0}%",
                    Icons.event_available,
                    AppColors.success,
                  ),
                  _buildMetricCard(
                    "Speech Streak",
                    "${selKid?.learningStreak ?? 0} Days",
                    Icons.local_fire_department,
                    Colors.orange,
                  ),
                  _buildMetricCard(
                    "Average Score",
                    avgScore > 0 ? "${avgScore.toStringAsFixed(0)}%" : "—",
                    Icons.assignment_turned_in_outlined,
                    AppColors.primary,
                  ),
                  _buildMetricCard(
                    "Pending Tasks",
                    "$pendingCount Tasks",
                    Icons.pending_actions,
                    AppColors.warning,
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Cognitive & Learning Progress Bars
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Cognitive & Speech Development",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 16),
                      _buildProgressMeter("Curiosity / Inquisitiveness", curiosityVal),
                      const SizedBox(height: 12),
                      _buildProgressMeter("Concentration / Focus", concentrationVal),
                      const SizedBox(height: 12),
                      _buildProgressMeter("Consistency / Regularity", consistencyVal),
                      const SizedBox(height: 12),
                      _buildProgressMeter("Speech & Communication", communicationVal),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // AI Insights / Therapist Remarks Box
              Card(
                color: AppColors.primary.withOpacity(0.04),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: AppColors.primary.withOpacity(0.1)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.auto_awesome, color: AppColors.primary, size: 18),
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            "Therapist AI Insights",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        remarksVal,
                        style: const TextStyle(fontSize: 13, height: 1.4, color: Colors.black87),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Recent Activity Log
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Recent Activity Logs",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          TextButton(
                            child: const Text("View Details"),
                            onPressed: () => controller.selectedIndex.value = 1,
                          ),
                        ],
                      ),
                      const Divider(height: 1),
                      const SizedBox(height: 8),
                      if (controller.childAttendance.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(
                            child: Text("No recent sessions logged.", style: TextStyle(color: Colors.grey, fontSize: 13)),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: controller.childAttendance.length > 4 ? 4 : controller.childAttendance.length,
                          separatorBuilder: (context, index) => const Divider(height: 1),
                          itemBuilder: (context, i) {
                            final log = controller.childAttendance[i];
                            final status = log['status']?.toString().toLowerCase() ?? 'absent';
                            
                            DateTime? date;
                            try {
                              date = DateTime.parse(log['attendance_date'].toString());
                            } catch (_) {}

                            final dateStr = date != null ? DateFormat('dd MMM yyyy').format(date) : 'N/A';

                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: status == 'present'
                                        ? AppColors.success.withOpacity(0.1)
                                        : AppColors.error.withOpacity(0.1),
                                    child: Icon(
                                      status == 'present' ? Icons.videocam : Icons.videocam_off,
                                      size: 16,
                                      color: status == 'present' ? AppColors.success : AppColors.error,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          log['class_title']?.toString() ?? log['batch_name']?.toString() ?? 'Live Session',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(dateStr, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: status == 'present'
                                          ? AppColors.success.withOpacity(0.1)
                                          : status == 'late'
                                              ? AppColors.warning.withOpacity(0.1)
                                              : AppColors.error.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      status.toUpperCase(),
                                      style: TextStyle(
                                        color: status == 'present'
                                            ? AppColors.success
                                            : status == 'late'
                                                ? AppColors.warning
                                                : AppColors.error,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
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
        ),
      );
    });
  }

  Widget _buildMetricCard(String label, String val, IconData icon, Color color) {
    return Card(
      elevation: 1,
      shadowColor: Colors.black.withOpacity(0.04),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
                Icon(icon, color: color, size: 20),
              ],
            ),
            Text(val, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressMeter(String label, double val) {
    final displayScore = val * 10;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87)),
            Text(
              displayScore > 0 ? "${displayScore.toStringAsFixed(1)}/10" : "—",
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: val,
            minHeight: 6,
            backgroundColor: Colors.grey.shade200,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
      ],
    );
  }
}
