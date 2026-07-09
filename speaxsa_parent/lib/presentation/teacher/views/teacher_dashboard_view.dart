import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
import '../controllers/teacher_dashboard_controller.dart';
import 'teacher_sop_view.dart';
import 'teacher_batches_view.dart';
import 'teacher_wallet_view.dart';
import 'teacher_documents_view.dart';
import '../../shared/views/notifications_view.dart';
import '../../shared/views/profile_view.dart';
import '../../shared/widgets/skeleton_loader.dart';
import '../../shared/widgets/error_state_widget.dart';
import '../../shared/widgets/status_chip.dart';

class TeacherDashboardView extends GetView<TeacherDashboardController> {
  const TeacherDashboardView({super.key});

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
            const TeacherBatchesView(),
            const TeacherSopView(),
            const TeacherWalletView(),
            const TeacherDocumentsView(),
          ],
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: idx,
          onTap: (val) => controller.selectedIndex.value = val,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.teacherRole,
          unselectedItemColor: Colors.grey,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Home'),
            BottomNavigationBarItem(icon: Icon(Icons.class_outlined), activeIcon: Icon(Icons.class_), label: 'Batches'),
            BottomNavigationBarItem(icon: Icon(Icons.verified_user_outlined), activeIcon: Icon(Icons.verified_user), label: 'SOP Hub'),
            BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), activeIcon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
            BottomNavigationBarItem(icon: Icon(Icons.folder_outlined), activeIcon: Icon(Icons.folder), label: 'Documents'),
          ],
        ),
      );
    });
  }

  AppBar _buildAppBar(BuildContext context, int index) {
    final titles = ['Teacher Workspace', 'Batch Management', 'SOP & Compliance Hub', 'My Wallet & Ledger', 'KYC & Verification Docs'];
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
            accountName: Text(user?.name ?? 'Teacher', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            accountEmail: Text("Level: ${user?.teacherLevel ?? 'Junior Teacher'} • Rating: ${user?.rating ?? 5.0}★"),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(user?.name.substring(0, 1).toUpperCase() ?? 'T', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.teacherRole)),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_outlined),
            title: const Text('Dashboard'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 0; },
          ),
          ListTile(
            leading: const Icon(Icons.verified_user_outlined),
            title: const Text('SOP & Compliance'),
            onTap: () { Navigator.pop(context); controller.selectedIndex.value = 2; },
          ),
          ListTile(
            leading: const Icon(Icons.person_outlined),
            title: const Text('Profile Settings'),
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
        return ErrorStateWidget(errorMessage: controller.errorMessage.value, onRetry: controller.loadTeacherData);
      }

      final analytics = controller.analytics;
      final sop = controller.sopStatus.value;
      final batches = controller.batches;

      return RefreshIndicator(
        onRefresh: controller.loadTeacherData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Banner Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.heroGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            "Welcome, ${AuthService.to.currentUser.value?.name.split(' ').first ?? 'Teacher'}! 👨‍🏫",
                            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                          child: Text(
                            "${analytics['level'] ?? 'Verified Mentor'}",
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildHeroStat("Active Batches", "${analytics['activeBatches'] ?? 0}"),
                        _buildHeroStat("Students", "${analytics['totalStudents'] ?? 0}"),
                        _buildHeroStat("Rating", "${analytics['rating'] ?? 5.0}★"),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // SOP Verification Banner (if pending)
              if (sop == null || sop.status != 'approved' || !sop.agreementSigned) ...[
                Card(
                  color: AppColors.warning.withOpacity(0.1),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 36),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("SOP Verification Pending", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const SizedBox(height: 2),
                              Text(
                                sop?.agreementSigned == false && sop?.status == 'approved'
                                    ? "SOP approved! Sign the digital agreement to start teaching."
                                    : "Submit your technical SOP proofs for admin approval.",
                                style: const TextStyle(fontSize: 12, color: Colors.black87),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () => controller.selectedIndex.value = 2,
                          child: const Text("Action"),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Batches List Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("My Active Batches", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () => controller.selectedIndex.value = 1, child: const Text("Manage")),
                ],
              ),
              const SizedBox(height: 8),

              if (batches.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.class_outlined, size: 48, color: Colors.grey),
                          const SizedBox(height: 12),
                          const Text("No Batches Created Yet", style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          const Text("Complete SOP verification and create your first batch.", style: TextStyle(color: Colors.grey, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
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
                          backgroundColor: AppColors.teacherRole.withOpacity(0.1),
                          child: const Icon(Icons.menu_book, color: AppColors.teacherRole),
                        ),
                        title: Text(b.batchName, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text("Course: ${b.courseTitle ?? b.subject ?? 'Speaxa Batch'}\nStudents: ${b.seatsFilled}/${b.capacity}"),
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

  Widget _buildHeroStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}
