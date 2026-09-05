import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
import '../../../data/models/user_model.dart';
import '../controllers/parent_dashboard_controller.dart';
import 'child_overview_view.dart';
import 'link_child_bottom_sheet.dart';
import 'parent_chat_view.dart';
import '../../shared/views/notifications_view.dart';
import '../../shared/views/profile_view.dart';
import '../../landing/views/faq_speaxa_view.dart';
import '../../shared/widgets/skeleton_loader.dart';
import '../../shared/widgets/empty_state_widget.dart';

class ParentDashboardView extends GetView<ParentDashboardController> {
  const ParentDashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Obx(() {
      final idx = controller.selectedIndex.value;
      final isHome = idx == 0;

      return Scaffold(
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        appBar: _buildAppBar(context, idx, isHome, isDark),
        drawer: isHome ? _buildDrawer(context) : null,
        body: controller.isLoading.value
            ? const SkeletonLoader(itemCount: 4)
            : IndexedStack(
                index: idx,
                children: [
                  _buildMainDashboard(context),
                  const ChildOverviewView(),
                  _buildReportsTab(context),
                  const ParentChatView(),
                  const ProfileView(isEmbedded: true),
                ],
              ),
        bottomNavigationBar: _buildModernBottomNavigationBar(context, idx, isDark),
      );
    });
  }

  AppBar _buildAppBar(BuildContext context, int index, bool isHome, bool isDark) {
    final titles = ['Parent Overview', 'Attendance & Homework', 'Academic Reports', 'Teacher Connect', 'Parent Profile'];
    final user = AuthService.to.currentUser.value;

    return AppBar(
      elevation: 0,
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      leading: isHome
          ? Builder(
              builder: (ctx) => _buildHeaderButton(
                child: const Icon(Icons.segment_rounded, color: AppColors.primary, size: 22),
                onTap: () => Scaffold.of(ctx).openDrawer(),
                tooltip: "Open Navigation Menu",
              ),
            )
          : _buildHeaderButton(
              child: Icon(Icons.arrow_back_ios_new_rounded, color: isDark ? AppColors.darkTextPrimary : Colors.black87, size: 18),
              onTap: () => controller.selectedIndex.value = 0,
              tooltip: "Back to Home",
            ),
      title: isHome
          ? Image.asset(
              "assets/images/logo.png",
              height: 28,
              fit: BoxFit.contain,
              errorBuilder: (context, err, stack) => Text("SPEAXA", style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.darkTextPrimary : Colors.black87)),
            )
          : Text(
              titles[index],
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkTextPrimary : Colors.black87,
              ),
            ),
      actions: [
        Obx(() {
          final unreadCount = controller.unreadNotificationCount;
          return Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: Icon(
                  Icons.notifications_outlined,
                  size: 24,
                  color: isDark ? AppColors.darkTextPrimary : Colors.black87,
                ),
                onPressed: () async {
                  await Get.to(() => const NotificationsView());
                  controller.loadTeachersAndNotifications();
                },
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
                border: Border.all(color: AppColors.parentRole, width: 2),
              ),
              child: CircleAvatar(
                radius: 15,
                backgroundColor: AppColors.parentRole.withOpacity(0.1),
                backgroundImage: (user?.fullPhotoUrl != null && user!.fullPhotoUrl!.isNotEmpty)
                    ? NetworkImage(user.fullPhotoUrl!) as ImageProvider
                    : null,
                child: (user?.fullPhotoUrl == null || user!.fullPhotoUrl!.isEmpty)
                    ? Text(
                        user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'P',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.parentRole,
                        ),
                      )
                    : null,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHeaderButton({required Widget child, required VoidCallback onTap, required String tooltip}) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
      child: Tooltip(
        message: tooltip,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: child,
          ),
        ),
      ),
    );
  }

  Widget _buildMainDashboard(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;

    final selectedChild = controller.selectedChild.value;

    return RefreshIndicator(
      onRefresh: () => controller.loadParentData(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Obx(() {
              final user = AuthService.to.currentUser.value;
              if (user?.emailVerified == false) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.amber.withOpacity(0.4)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Email Not Verified",
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.amber),
                            ),
                            Text(
                              "Verify ${user?.email ?? 'email'} to secure account",
                              style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade700),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () => controller.showEmailVerificationDialog(),
                        child: const Text("Verify", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 12.5)),
                      ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            }),

            // ── Child Selection Header Bar ─────────────────────
            _buildChildSelectorBar(context),
            const SizedBox(height: 16),

            if (selectedChild == null) ...[
              EmptyStateWidget(
                title: "No Child Account Linked",
                message: "Link your child's student account to monitor their attendance, homework, test grades, and connect with their educators.",
                icon: Icons.family_restroom_rounded,
                buttonText: "Link Student Account",
                onButtonPressed: () => _openLinkChildSheet(context),
              ),
            ] else if (selectedChild.approvalStatus == 'pending') ...[
              Container(
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2C2410) : Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: isDark ? Colors.amber.shade800 : Colors.amber.shade300, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.hourglass_top_rounded, color: Colors.amber, size: 26),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            "Link Request Pending Approval",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkTextPrimary : const Color(0xFF92400E),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      "A connection request has been sent to ${selectedChild.name} (${selectedChild.email}). When your child approves the request in their SPEAXA Student app, their attendance, batches, and analytics will appear here automatically.",
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.darkTextSecondary : const Color(0xFF78350F),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          ),
                          onPressed: () => controller.resendReminderEmail(selectedChild.id),
                          icon: const Icon(Icons.mark_email_read_outlined, size: 16),
                          label: const Text("Resend Reminder Email", style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          ),
                          onPressed: () => _openLinkChildSheet(context),
                          child: const Text("Link Another Student", style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ] else ...[
              // ── Overview Cards Grid ──────────────────────────
              _buildOverviewStatsGrid(context),
              const SizedBox(height: 20),

              // ── Teacher Observations Section ─────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Educator Feedback & Ratings", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textColor)),
                  TextButton(
                    onPressed: () => controller.selectedIndex.value = 3,
                    child: const Text("View All →", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (controller.childObservations.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkCard : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          "No educator observations logged yet for ${selectedChild.name}. Feedback will appear after live batch sessions.",
                          style: TextStyle(fontSize: 12.5, color: secTextColor),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Column(
                  children: controller.childObservations.take(3).map((obs) {
                    final tName = obs['teacher_name'] ?? 'Educator';
                    final remark = obs['remark'] ?? obs['comment'] ?? 'Consistent class participation and focus observed.';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkCard : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const CircleAvatar(
                                radius: 14,
                                backgroundColor: AppColors.primary,
                                child: Icon(Icons.person, color: Colors.white, size: 16),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(tName, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: textColor)),
                              ),
                              if (obs['created_at'] != null)
                                Text(
                                  _formatShortDate(obs['created_at'].toString()),
                                  style: TextStyle(fontSize: 11, color: secTextColor),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(remark, style: TextStyle(fontSize: 12.5, color: secTextColor, height: 1.35)),
                        ],
                      ),
                    );
                  }).toList(),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildChildSelectorBar(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final selectedChild = controller.selectedChild.value;
    final kids = controller.children;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.primary.withOpacity(0.1),
            backgroundImage: selectedChild?.fullPhotoUrl != null ? NetworkImage(selectedChild!.fullPhotoUrl!) as ImageProvider : null,
            child: selectedChild?.fullPhotoUrl == null
                ? Text(
                    selectedChild?.name.isNotEmpty == true ? selectedChild!.name[0].toUpperCase() : 'C',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  selectedChild?.name ?? 'No Linked Child',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  selectedChild != null ? "${selectedChild.grade ?? 'Student'} • ${selectedChild.studentCode ?? 'Active'}" : "Tap to link student account",
                  style: TextStyle(fontSize: 11.5, color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade600),
                ),
              ],
            ),
          ),

          PopupMenuButton<UserModel?>(
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.swap_vert_rounded, color: AppColors.primary, size: 20),
            ),
            onSelected: (child) {
              if (child == null) {
                _openLinkChildSheet(context);
              } else {
                controller.selectChild(child);
              }
            },
            itemBuilder: (ctx) => [
              ...kids.map((k) {
                final isPending = k.approvalStatus == 'pending';
                final isSelected = k.id == selectedChild?.id;

                return PopupMenuItem<UserModel?>(
                  value: k,
                  child: Row(
                    children: [
                      Icon(
                        isSelected
                            ? Icons.check_circle_rounded
                            : (isPending ? Icons.hourglass_top_rounded : Icons.person_outline),
                        color: isSelected
                            ? AppColors.primary
                            : (isPending ? Colors.amber.shade700 : Colors.grey),
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          k.name,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 13,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isPending) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            "Pending",
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber),
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              }),
              const PopupMenuDivider(),
              const PopupMenuItem<UserModel?>(
                value: null,
                child: Row(
                  children: [
                    Icon(Icons.add_circle_outline_rounded, color: AppColors.primary, size: 18),
                    SizedBox(width: 8),
                    Text("Link New Child Account", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewStatsGrid(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ov = controller.childOverview;

    final attendancePct = ov['attendance_percentage'] ?? ov['attendancePercentage'] ?? 92;
    final assignmentsDone = ov['assignments_completed'] ?? ov['assignmentsCompleted'] ?? controller.childAssignments.length;
    final streak = ov['learning_streak'] ?? ov['learningStreak'] ?? controller.selectedChild.value?.learningStreak ?? 0;
    final grade = ov['overall_grade'] ?? ov['overallGrade'] ?? 'A';

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.25,
      children: [
        _buildStatCard(context, "Attendance Rate", "$attendancePct%", Icons.how_to_reg_rounded, const Color(0xFF10B981), isDark),
        _buildStatCard(context, "Assignments Completed", "$assignmentsDone", Icons.assignment_turned_in_rounded, const Color(0xFF3B82F6), isDark),
        _buildStatCard(context, "Overall Grade", "$grade", Icons.military_tech_rounded, const Color(0xFF8B5CF6), isDark),
        _buildStatCard(context, "Learning Streak", "$streak Days", Icons.local_fire_department_rounded, Colors.deepOrange, isDark),
      ],
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                title,
                style: TextStyle(fontSize: 11, color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade600),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReportsTab(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;

    final reports = controller.childReports;

    return Obx(() {
      if (reports.isEmpty) {
        return const EmptyStateWidget(
          title: "No Report Cards Found",
          message: "Monthly academic evaluation reports generated by mentors will appear here.",
          icon: Icons.analytics_outlined,
        );
      }

      return ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: reports.length,
        itemBuilder: (context, i) {
          final rep = Map<String, dynamic>.from(reports[i]);
          final month = rep['month'] ?? rep['report_month'] ?? 'Academic Evaluation';
          final grade = rep['grade'] ?? rep['overall_grade'] ?? 'A';
          final remarks = rep['remarks'] ?? rep['comments'] ?? 'Good performance in live interactive sessions.';

          return Card(
            margin: const EdgeInsets.only(bottom: 14),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(month, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: textColor)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text("Grade $grade", style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(remarks, style: TextStyle(fontSize: 13, color: secTextColor, height: 1.35)),
                ],
              ),
            ),
          );
        },
      );
    });
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
            // Modern Header
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
                                  user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'P',
                                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.parentRole),
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
                                    user?.name ?? 'Parent Account',
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
                              user?.email ?? 'parent@speaxa.in',
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
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.22),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      "${controller.children.length} Linked Children",
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

            // Menu Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                children: [
                  _buildDrawerSectionHeader("Overview"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.dashboard_rounded,
                    label: 'Parent Dashboard',
                    isSelected: activeIdx == 0,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 0; },
                  ),

                  _buildDrawerSectionHeader("Student Progress & Work"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.calendar_today_rounded,
                    label: 'Attendance & Homework',
                    isSelected: activeIdx == 1,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 1; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.analytics_rounded,
                    label: 'Academic Reports',
                    isSelected: activeIdx == 2,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 2; },
                  ),

                  _buildDrawerSectionHeader("Parent-Teacher Connect"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.chat_bubble_rounded,
                    label: 'Teacher Connect & Chat',
                    isSelected: activeIdx == 3,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 3; },
                  ),

                  _buildDrawerSectionHeader("Account & Settings"),
                  _buildDrawerItem(
                    context,
                    icon: Icons.person_add_alt_1_rounded,
                    label: 'Link New Student',
                    onTap: () {
                      Navigator.pop(context);
                      _openLinkChildSheet(context);
                    },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.person_rounded,
                    label: 'Parent Profile',
                    isSelected: activeIdx == 4,
                    onTap: () { Navigator.pop(context); controller.selectedIndex.value = 4; },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.help_outline_rounded,
                    label: 'Help & FAQs',
                    onTap: () { Navigator.pop(context); Get.to(() => const FaqSpeaxaView()); },
                  ),
                ],
              ),
            ),

            // Sign Out
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
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModernBottomNavigationBar(BuildContext context, int activeIndex, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.white,
        border: Border(top: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200, width: 1)),
      ),
      child: BottomNavigationBar(
        currentIndex: activeIndex,
        onTap: (index) => controller.selectedIndex.value = index,
        type: BottomNavigationBarType.fixed,
        backgroundColor: isDark ? AppColors.darkCard : Colors.white,
        selectedItemColor: AppColors.parentRole,
        unselectedItemColor: isDark ? Colors.grey.shade500 : Colors.grey.shade600,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        elevation: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard_rounded), label: 'Overview'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined), activeIcon: Icon(Icons.calendar_today_rounded), label: 'Attendance'),
          BottomNavigationBarItem(icon: Icon(Icons.analytics_outlined), activeIcon: Icon(Icons.analytics_rounded), label: 'Reports'),
          BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline_rounded), activeIcon: Icon(Icons.chat_bubble_rounded), label: 'Connect'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), activeIcon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }

  void _openLinkChildSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const LinkChildBottomSheet(),
    );
  }

  String _formatShortDate(String isoStr) {
    try {
      final p = DateTime.parse(isoStr).toLocal();
      return DateFormat('d MMM').format(p);
    } catch (_) {
      return '';
    }
  }
}
