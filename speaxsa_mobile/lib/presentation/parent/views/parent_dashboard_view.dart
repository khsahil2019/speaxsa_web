import 'package:flutter/material.dart';
import 'package:get/get.dart';
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
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Overview'),
            BottomNavigationBarItem(icon: Icon(Icons.child_care_outlined), activeIcon: Icon(Icons.child_care), label: 'Child Details'),
            BottomNavigationBarItem(icon: Icon(Icons.add_link_outlined), activeIcon: Icon(Icons.add_link), label: 'Link Child'),
            BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline), activeIcon: Icon(Icons.chat_bubble), label: 'Connect'),
          ],
        ),
      );
    });
  }

  AppBar _buildAppBar(BuildContext context, int index) {
    final titles = ['Parent Portal', 'Child Performance Overview', 'Link Student Account', 'Parent-Teacher Connect'];
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
            accountName: Text(user?.name ?? 'Parent', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            accountEmail: Text("Linked Children: ${controller.children.length}"),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(user?.name.substring(0, 1).toUpperCase() ?? 'P', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.parentRole)),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_outlined),
            title: const Text('Overview'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 0; },
          ),
          ListTile(
            leading: const Icon(Icons.add_link_outlined),
            title: const Text('Link New Child'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 2; },
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
                color: AppColors.parentRole.withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.face, color: AppColors.parentRole),
                      const SizedBox(width: 12),
                      const Text("Select Child: ", style: TextStyle(fontWeight: FontWeight.bold)),
                      Expanded(
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: selKid?.id,
                            isExpanded: true,
                            items: kids.map((k) {
                              return DropdownMenuItem<String>(
                                value: k.id,
                                child: Text("${k.name} (Code: ${k.studentCode ?? 'N/A'})", style: const TextStyle(fontWeight: FontWeight.w600)),
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

              // Overview Cards Grid
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      "Attendance Rate",
                      "${overview['attendancePct'] ?? 0}%",
                      Icons.event_available,
                      AppColors.success,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      "Streak",
                      "${selKid?.learningStreak ?? 0} Days",
                      Icons.local_fire_department,
                      Colors.orange,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Recent Reports Card
              Card(
                child: ListTile(
                  leading: const Icon(Icons.analytics, color: AppColors.parentRole),
                  title: const Text("Monthly Reports & Feedback", style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text("View detailed performance reports for ${selKid?.name ?? 'child'}"),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => controller.selectedIndex.value = 1,
                ),
              ),
              const SizedBox(height: 12),

              // Direct Teacher Connect Card
              Card(
                child: ListTile(
                  leading: const Icon(Icons.chat_bubble_outline, color: AppColors.primary),
                  title: const Text("Teacher Connect Chat", style: TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: const Text("Send direct messages to child's teachers"),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => controller.selectedIndex.value = 3,
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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 36),
            const SizedBox(height: 8),
            Text(val, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
